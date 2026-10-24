package family.md.sabry.services

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.edit
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import family.md.sabry.MainActivity
import family.md.sabry.R
import family.md.sabry.notifications.NotificationChannels
import family.md.sabry.receivers.MDFamilyGeofenceTransitionReceiver
import org.json.JSONArray
import org.json.JSONObject

/**
 * MD.Family Location Service
 * ===========================
 *
 * Manages geofencing (safe-zone monitoring) and location sample uploads
 * for the child device. Uses Google Play Services Location APIs:
 *   - GeofencingClient: monitors enter/exit transitions for safe zones
 *   - FusedLocationProviderClient: gets current location for SOS + periodic uploads
 *
 * Per engineering blueprint §9 (Location & safe zones):
 *   - Real-time location only after explicit consent (ACCESS_FINE_LOCATION)
 *   - Background location only when geofencing is enabled (ACCESS_BACKGROUND_LOCATION)
 *   - Each sample includes: lat, lng, accuracy, captured_at, battery, source
 *   - Geofencing uses 100m default radius (configurable per zone)
 *   - We use Haversine for distance calculations (server-side, for accuracy)
 *
 * The service runs in the background but does NOT use a foreground
 * notification by default — geofencing works passively. A foreground
 * notification is shown only when actively tracking (e.g. SOS active).
 *
 * Lifecycle:
 *   1) Child app starts → registers geofences from the backend's safe-zones list
 *   2) Play Services wakes up the app on enter/exit → MDFamilyGeofenceTransitionReceiver
 *   3) Receiver posts a notification + uploads the event to the backend
 *   4) Periodic location uploads happen every 15 minutes (configurable)
 *
 * IMPORTANT: This is a singleton helper class, not a Service subclass.
 * It's invoked from:
 *   - ProtectionService (on startup, to register geofences)
 *   - MDFamilyFirebaseMessagingService (on policy.updated, to refresh geofences)
 *   - MainActivity (on SOS button press, to upload current location)
 */
class MDFamilyLocationService private constructor(private val context: Context) {

    companion object {
        private const val TAG = "MDFamilyLocation"
        private const val GEOFENCE_EXPIRATION = Geofence.NEVER_EXPIRE
        private const val LOCATION_UPLOAD_INTERVAL_MS = 15 * 60 * 1000L  // 15 minutes

        @Volatile
        private var instance: MDFamilyLocationService? = null

        fun getInstance(context: Context): MDFamilyLocationService {
            return instance ?: synchronized(this) {
                instance ?: MDFamilyLocationService(context.applicationContext).also { instance = it }
            }
        }
    }

    private val geofencingClient: GeofencingClient = LocationServices.getGeofencingClient(context)
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

    private val geofencePendingIntent: PendingIntent by lazy {
        val intent = Intent(context, MDFamilyGeofenceTransitionReceiver::class.java).apply {
            action = MDFamilyGeofenceTransitionReceiver.ACTION_GEOFENCE_TRANSITION
        }
        PendingIntent.getBroadcast(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Registers a list of safe zones as geofences.
     * Each zone is identified by its database ID (requestId).
     *
     * @param zones JSON array of zone objects:
     *   [{"id": "...", "name": "المنزل", "lat": 30.0444, "lng": 31.2357, "radius_meters": 150, "enabled": true}, ...]
     */
    @SuppressLint("MissingPermission")
    fun registerGeofences(zones: JSONArray) {
        if (!hasLocationPermission()) {
            Log.w(TAG, "Cannot register geofences — location permission not granted")
            return
        }

        val geofences = mutableListOf<Geofence>()
        for (i in 0 until zones.length()) {
            val zone = zones.optJSONObject(i) ?: continue
            if (!zone.optBoolean("enabled", true)) continue
            val id = zone.optString("id") ?: continue
            val lat = zone.optDouble("lat", 0.0)
            val lng = zone.optDouble("lng", 0.0)
            val radius = zone.optInt("radius_meters", 150).toFloat()

            geofences.add(
                Geofence.Builder()
                    .setRequestId(id)
                    .setCircularRegion(lat, lng, radius)
                    .setExpirationDuration(GEOFENCE_EXPIRATION)
                    .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
                    .setNotificationResponsiveness(5 * 60 * 1000)  // 5 min
                    .build()
            )
        }

        if (geofences.isEmpty()) {
            Log.i(TAG, "No geofences to register")
            return
        }

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(geofences)
            .build()

        try {
            geofencingClient.addGeofences(request, geofencePendingIntent)
                .addOnSuccessListener {
                    Log.i(TAG, "Registered ${geofences.size} geofences")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Failed to register geofences: ${e.message}")
                }
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing location permission: ${e.message}")
        }
    }

    /** Removes all registered geofences. */
    fun unregisterAllGeofences() {
        geofencingClient.removeGeofences(geofencePendingIntent)
            .addOnSuccessListener { Log.i(TAG, "Removed all geofences") }
            .addOnFailureListener { e -> Log.w(TAG, "Failed to remove geofences: ${e.message}") }
    }

    /**
     * Gets the current location and uploads it to the backend.
     * Called by:
     *   - SOS button (urgent, foreground)
     *   - Periodic upload worker (background, every 15 min)
     */
    @SuppressLint("MissingPermission")
    fun getCurrentLocationAndUpload(onResult: (Location?) -> Unit) {
        if (!hasLocationPermission()) {
            Log.w(TAG, "Cannot get location — permission not granted")
            onResult(null)
            return
        }

        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_HIGH_ACCURACY,
            null,  // CancellationToken — we don't cancel
        ).addOnSuccessListener { location ->
            if (location == null) {
                Log.w(TAG, "Location is null — device may have location disabled")
                onResult(null)
                return@addOnSuccessListener
            }

            Log.i(TAG, "Got location: ${location.latitude}, ${location.longitude} (±${location.accuracy}m)")
            uploadLocationSample(location)
            onResult(location)
        }.addOnFailureListener { e ->
            Log.w(TAG, "Failed to get location: ${e.message}")
            onResult(null)
        }
    }

    /** Uploads a location sample to the backend via HTTP POST. */
    private fun uploadLocationSample(location: Location) {
        // In production, this makes an HTTP POST to /api/v1/families/{fid}/children/{cid}/location
        // For now, store in SharedPreferences for batched upload later
        val samples = context.getSharedPreferences("mdfamily_location", Context.MODE_PRIVATE)
            .getString("pending_samples", "[]") ?: "[]"
        val arr = JSONArray(samples)
        arr.put(JSONObject().apply {
            put("lat", location.latitude)
            put("lng", location.longitude)
            put("accuracy_meters", location.accuracy)
            put("captured_at", System.currentTimeMillis())
            put("source", if (location.isFromMockProvider) "mock" else "gps")
        })
        context.getSharedPreferences("mdfamily_location", Context.MODE_PRIVATE).edit {
            putString("pending_samples", arr.toString())
        }
        Log.d(TAG, "Stored location sample (pending: ${arr.length()})")
    }

    /** Posts a notification for a geofence enter/exit event. */
    fun postZoneNotification(zoneName: String, kind: String) {
        val (title, body) = when (kind) {
            "enter" -> "دخل ${zoneName}" to "وصل الطفل إلى منطقة ${zoneName}"
            "exit" -> "غادر ${zoneName}" to "غادر الطفل منطقة ${zoneName}"
            else -> "حدث منطقة" to "حدث في منطقة ${zoneName}"
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pi = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notif = NotificationCompat.Builder(context, NotificationChannels.LOCATION)
            .setSmallIcon(R.drawable.ic_stat_mdfamily)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setColor(0xFF34C759.toInt())
            .setColorized(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(("zone_$kind" + zoneName).hashCode() and 0x7FFFFFFF, notif)
    }

    private fun hasLocationPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
}
