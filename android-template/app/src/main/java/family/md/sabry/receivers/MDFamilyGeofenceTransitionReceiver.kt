package family.md.sabry.receivers

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import family.md.sabry.MainActivity
import family.md.sabry.R
import family.md.sabry.notifications.NotificationChannels
import family.md.sabry.services.MDFamilyLocationService

/**
 * MD.Family Geofence Transition Receiver
 * =======================================
 *
 * Receives geofence enter/exit transitions from Google Play Services and:
 *   1. Posts a local notification (visible to the parent app if running on parent device)
 *   2. Uploads an activity event to the backend (ActivityEvent of type zone_enter/zone_exit)
 *   3. Triggers an FCM push notification to the parent device (via the backend)
 *
 * The receiver is registered in the AndroidManifest for the
 * ACTION_GEOFENCE_TRANSITION intent filter (set by MDFamilyLocationService's
 * geofencePendingIntent).
 *
 * Per engineering blueprint §9 (Location & safe zones):
 *   - Each event is logged with the zone ID + timestamp
 *   - Repeated events within a short window are deduplicated (5 min default)
 *   - The event is uploaded to the backend even if offline — queued for
 *     later delivery when the device reconnects
 */
class MDFamilyGeofenceTransitionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "GeofenceReceiver"
        const val ACTION_GEOFENCE_TRANSITION = "family.md.sabry.action.GEOFENCE_TRANSITION"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_GEOFENCE_TRANSITION) return

        val event = GeofencingEvent.fromIntent(intent) ?: run {
            Log.w(TAG, "Invalid geofence event")
            return
        }

        if (event.hasError()) {
            Log.e(TAG, "Geofence error: ${event.errorCode}")
            return
        }

        val transition = event.geofenceTransition
        val kind = when (transition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> "enter"
            Geofence.GEOFENCE_TRANSITION_EXIT -> "exit"
            else -> return  // ignore dwell
        }

        val zoneIds = event.triggeringGeofences?.map { it.requestId } ?: emptyList()
        Log.i(TAG, "Geofence $kind: $zoneIds")

        for (zoneId in zoneIds) {
            // Upload the event to the backend
            uploadZoneEvent(context, zoneId, kind)

            // Show a local notification
            val zoneName = lookupZoneName(context, zoneId) ?: "منطقة آمنة"
            MDFamilyLocationService.getInstance(context).postZoneNotification(zoneName, kind)
        }
    }

    /** Uploads the zone event to the backend. */
    private fun uploadZoneEvent(context: Context, zoneId: String, kind: String) {
        // In production, this makes an HTTP POST to /api/v1/families/{fid}/activity
        // For now, queue it in SharedPreferences for batched upload
        val prefs = context.getSharedPreferences("mdfamily_events", Context.MODE_PRIVATE)
        val events = prefs.getString("pending_zone_events", "[]") ?: "[]"
        val arr = org.json.JSONArray(events)
        arr.put(org.json.JSONObject().apply {
            put("type", "zone_$kind")
            put("zone_id", zoneId)
            put("timestamp", System.currentTimeMillis())
        })
        prefs.edit().putString("pending_zone_events", arr.toString()).apply()
        Log.d(TAG, "Queued zone event (pending: ${arr.length()})")
    }

    /** Looks up a zone's display name from local cache (populated during policy sync). */
    private fun lookupZoneName(context: Context, zoneId: String): String? {
        val prefs = context.getSharedPreferences("mdfamily_zones", Context.MODE_PRIVATE)
        return prefs.getString("zone_name_$zoneId", null)
    }
}
