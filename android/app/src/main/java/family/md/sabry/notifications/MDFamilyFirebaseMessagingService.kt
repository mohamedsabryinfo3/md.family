package family.md.sabry.notifications

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import family.md.sabry.MainActivity
import family.md.sabry.R
import family.md.sabry.ProtectionService
import org.json.JSONObject

/**
 * MD.Family Firebase Messaging Service
 * ====================================
 *
 * Receives push notifications from the FastAPI backend and:
 *   1. Posts a high-priority notification to the system tray
 *   2. Forwards the payload to any open WebView via the Capacitor bridge
 *   3. Triggers the appropriate ProtectionService action when applicable
 *
 * Notification routing (data-only messages from backend):
 *   - sos.triggered           → channel=SOS, opens MainActivity at the SOS alert view
 *   - alert.created           → channel=ALERTS, opens SafetyAlertsScreen
 *   - extension.requested    → channel=REQUESTS, opens ScreenTimeScreen (for parent)
 *   - extension.decided      → channel=REQUESTS, opens ChildApp with a banner
 *   - policy.updated         → triggers ProtectionService.refreshPolicies(), no visible notification
 *   - pairing.linked         → channel=GENERAL, opens Dashboard
 *   - zone.enter / zone.exit → channel=LOCATION, opens LocationScreen
 *   - session.requested / active / ended → channel=LIVE_SESSION
 *   - family_pause_activated / _deactivated → triggers ProtectionService.setFamilyPause()
 *
 * The FCM token is sent to the backend at app launch via the
 * `POST /api/v1/me/register-token` (parent app) or
 * `POST /api/v1/devices/{id}/register-token` (child app) endpoints.
 *
 * SECURITY NOTE: Notifications are NOT end-to-end encrypted. For sensitive
 * alerts (e.g. safety alerts with potentially identifying content), the
 * backend includes only the alert ID; the client then fetches the full
 * alert via an authenticated GET /alerts/{id} call. This prevents leaking
 * content via the FCM payload itself.
 */
class MDFamilyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "MDFamilyFCM"

        const val ACTION_FCM_EVENT = "family.md.sabry.action.FCM_EVENT"
        const val EXTRA_EVENT_TYPE = "event_type"
        const val EXTRA_EVENT_PAYLOAD = "event_payload"

        /** Called from Application.onCreate to make sure channels exist before any notification arrives. */
        fun ensureChannels(context: Context) {
            NotificationChannels.createAll(context)
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i(TAG, "FCM token refreshed: ${token.take(20)}...")
        // Persist the new token locally — the LoginActivity will read it and POST to /me/register-token
        val editor = getSharedPreferences("mdfamily", Context.MODE_PRIVATE).edit()
        editor.putString("fcm_token", token)
        editor.putLong("fcm_token_registered_at", System.currentTimeMillis())
        editor.apply()
        // Trigger a broadcast so any active Activity can refresh registration
        val intent = Intent("family.md.sabry.FCM_TOKEN_REFRESHED").apply {
            setPackage(packageName)
            putExtra("token", token)
        }
        sendBroadcast(intent)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.i(TAG, "FCM message received: from=${message.from} data=${message.data}")

        val data = message.data
        val type = data["type"] ?: return
        val payload = JSONObject(data.toMap())

        // 1) Forward to WebView (if app is open)
        forwardToWebView(type, payload)

        // 2) Trigger native side-effects (e.g. refresh policies)
        triggerNativeAction(type, payload)

        // 3) Show notification (unless type is policy.updated which is silent)
        if (type != "policy.updated" && type != "family_pause_activated" && type != "family_pause_deactivated") {
            showNotification(type, payload)
        }
    }

    /** Posts a notification to the system tray with the appropriate channel & priority. */
    private fun showNotification(type: String, payload: JSONObject) {
        val title = payload.optString("title", "MD.Family")
        val body = payload.optString("body", "")
        val channelId = channelForType(type)
        val smallIcon = R.drawable.ic_stat_mdfamily

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            // Pass the event so MainActivity can route to the right screen
            putExtra(EXTRA_EVENT_TYPE, type)
            putExtra(EXTRA_EVENT_PAYLOAD, payload.toString())
        }
        val tapPi = PendingIntent.getActivity(
            this, type.hashCode(), tapIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(smallIcon)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(tapPi)
            .setAutoCancel(true)
            .setColor(0xFF005C9E.toInt())
            .setColorized(true)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))

        // Priority + sound depending on type
        when (channelId) {
            NotificationChannels.SOS -> {
                builder.priority = NotificationCompat.PRIORITY_MAX
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
                builder.setVibrate(longArrayOf(0, 500, 250, 500, 250, 500))
            }
            NotificationChannels.ALERTS, NotificationChannels.LIVE_SESSION -> {
                builder.priority = NotificationCompat.PRIORITY_HIGH
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            }
            NotificationChannels.PROTECTION -> {
                builder.priority = NotificationCompat.PRIORITY_LOW
            }
            else -> {
                builder.priority = NotificationCompat.PRIORITY_DEFAULT
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            }
        }

        // Tag — lets us update an existing notification of the same type
        val tag = type
        val notifId = type.hashCode() and 0x7FFFFFFF

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(tag, notifId, builder.build())
    }

    /** Maps an event type to its notification channel ID. */
    private fun channelForType(type: String): String = when {
        type.startsWith("sos") -> NotificationChannels.SOS
        type.startsWith("alert") -> NotificationChannels.ALERTS
        type.startsWith("extension") -> NotificationChannels.REQUESTS
        type.startsWith("policy") -> NotificationChannels.PROTECTION
        type.startsWith("zone") -> NotificationChannels.LOCATION
        type.startsWith("session") -> NotificationChannels.LIVE_SESSION
        type.startsWith("family_pause") -> NotificationChannels.PROTECTION
        else -> NotificationChannels.GENERAL
    }

    /** Forwards the event to any open WebView via the Capacitor event system. */
    private fun forwardToWebView(type: String, payload: JSONObject) {
        val intent = Intent(ACTION_FCM_EVENT).apply {
            setPackage(packageName)
            putExtra(EXTRA_EVENT_TYPE, type)
            putExtra(EXTRA_EVENT_PAYLOAD, payload.toString())
        }
        sendBroadcast(intent)
        // Also notify the ProtectionService if it's running
        ProtectionService.onFcmEvent(this, type, payload)
    }

    /** Triggers native side-effects based on the event type. */
    private fun triggerNativeAction(type: String, payload: JSONObject) {
        when (type) {
            "policy.updated" -> {
                // Refresh policies from the backend — the ProtectionService will
                // pull the latest rules and apply them locally
                val intent = Intent(this, ProtectionService::class.java).apply {
                    action = ProtectionService.ACTION_REFRESH_POLICIES
                    putExtra("policy_version", payload.optInt("policy_version", -1))
                }
                startServiceSafely(intent)
            }
            "family_pause_activated" -> {
                val intent = Intent(this, ProtectionService::class.java).apply {
                    action = ProtectionService.ACTION_PAUSE_INTERNET
                }
                startServiceSafely(intent)
            }
            "family_pause_deactivated" -> {
                val intent = Intent(this, ProtectionService::class.java).apply {
                    action = ProtectionService.ACTION_RESUME_INTERNET
                }
                startServiceSafely(intent)
            }
        }
    }

    /** Starts a service safely across Android versions (foreground vs background). */
    private fun startServiceSafely(intent: Intent) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to start service: ${e.message}")
        }
    }
}
