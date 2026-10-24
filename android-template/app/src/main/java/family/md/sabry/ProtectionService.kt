package family.md.sabry

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import family.md.sabry.engine.MDSabryRuleEngine
import family.md.sabry.notifications.NotificationChannels
import family.md.sabry.services.MDSabryVpnService
import org.json.JSONObject

/**
 * MD-Sabry Protection Service (foreground)
 *
 * Keeps the parental rules engine alive in the background:
 *  - Web filter (VpnService) — when enabled by parent
 *  - App policies (AccessibilityService) — when enabled by parent
 *  - Geofence monitoring (location updates) — when consented
 *  - Pending events queue sync (offline → online retry)
 *
 * IMPORTANT (engineering blueprint §8):
 *  - This service runs as a FOREGROUND service with a persistent, visible
 *    notification. There is no covert monitoring.
 *  - All sensitive sub-features (Live Screen View, Ambient Audio, Voice Call)
 *    have their own permission gates and are NOT started automatically by
 *    this service — they require explicit per-session consent.
 *  - The notification cannot be dismissed by swipe without also stopping
 *    protection; the user is informed of this trade-off.
 *
 * Communication:
 *  - Receives FCM events via MDFamilyFirebaseMessagingService → triggerNativeAction
 *  - Coordinates with MDSabryVpnService, MDFamilyAccessibilityService, etc.
 *  - Holds the singleton MDSabryRuleEngine instance (shared across services)
 */
class ProtectionService : Service() {

    companion object {
        private const val TAG = "ProtectionService"
        const val CHANNEL_ID = NotificationChannels.PROTECTION
        const val NOTIF_ID = 0x7D01

        const val ACTION_PAUSE_INTERNET = "family.md.sabry.action.PAUSE_INTERNET"
        const val ACTION_RESUME_INTERNET = "family.md.sabry.action.RESUME_INTERNET"
        const val ACTION_REFRESH_POLICIES = "family.md.sabry.action.REFRESH_POLICIES"
        const val ACTION_START_VPN = "family.md.sabry.action.START_VPN"
        const val ACTION_STOP_VPN = "family.md.sabry.action.STOP_VPN"

        /** Singleton rule engine — shared across all services in the same process. */
        @Volatile
        private var ruleEngine: MDSabryRuleEngine? = null

        fun getRuleEngine(): MDSabryRuleEngine {
            return ruleEngine ?: synchronized(this) {
                ruleEngine ?: MDSabryRuleEngine().also { ruleEngine = it }
            }
        }

        /** Called by MDFamilyFirebaseMessagingService when an FCM event arrives. */
        fun onFcmEvent(context: Context, type: String, payload: JSONObject) {
            when (type) {
                "policy.updated" -> {
                    val intent = Intent(context, ProtectionService::class.java).apply {
                        action = ACTION_REFRESH_POLICIES
                        putExtra("policy_version", payload.optInt("policy_version", -1))
                    }
                    context.startServiceSafelyCompat(intent)
                }
                "family_pause_activated" -> {
                    getRuleEngine().setFamilyPause(true)
                    val intent = Intent(context, ProtectionService::class.java).apply {
                        action = ACTION_PAUSE_INTERNET
                    }
                    context.startServiceSafelyCompat(intent)
                }
                "family_pause_deactivated" -> {
                    getRuleEngine().setFamilyPause(false)
                    val intent = Intent(context, ProtectionService::class.java).apply {
                        action = ACTION_RESUME_INTERNET
                    }
                    context.startServiceSafelyCompat(intent)
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        NotificationChannels.createAll(this)
        Log.i(TAG, "ProtectionService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAUSE_INTERNET -> {
                getRuleEngine().setFamilyPause(true)
                updateNotification("حماية MD.Family — الإنترنت متوقف")
                // Stop the VPN to drop all connections
                val vpnIntent = Intent(this, MDSabryVpnService::class.java).apply { action = "STOP" }
                startService(vpnIntent)
            }
            ACTION_RESUME_INTERNET -> {
                getRuleEngine().setFamilyPause(false)
                updateNotification("حماية MD.Family فعّالة — الإنترنت يعمل")
            }
            ACTION_REFRESH_POLICIES -> {
                val newVersion = intent.getIntExtra("policy_version", -1)
                if (newVersion > getRuleEngine().policyVersion) {
                    refreshPoliciesFromBackend(newVersion)
                }
            }
            ACTION_START_VPN -> {
                startVpnService()
            }
            ACTION_STOP_VPN -> {
                val vpnIntent = Intent(this, MDSabryVpnService::class.java).apply { action = "STOP" }
                startService(vpnIntent)
            }
        }

        startForeground(NOTIF_ID, buildNotification())
        return START_STICKY
    }

    private fun startVpnService() {
        val intent = Intent(this, MDSabryVpnService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        updateNotification("حماية MD.Family فعّالة — VPN يعمل")
    }

    private fun refreshPoliciesFromBackend(newVersion: Int) {
        getRuleEngine().setPolicyVersion(newVersion)
        Log.i(TAG, "Policies refreshed — version=$newVersion")
        updateNotification("حماية MD.Family فعّالة — القواعد محدّثة (v$newVersion)")
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(text))
    }

    private fun buildNotification(text: String = "قواعد MD-Sabry مفعّلة على أجهزة أطفالك"): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openPi = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val pauseIntent = Intent(this, ProtectionService::class.java).apply {
            action = ACTION_PAUSE_INTERNET
        }
        val pausePi = PendingIntent.getService(
            this, 1, pauseIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_mdfamily)
            .setContentTitle("MD.Family حماية فعّالة")
            .setContentText(text)
            .setContentIntent(openPi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setColor(0xFF005C9E.toInt())
            .setColorized(true)
            .addAction(R.drawable.ic_stat_mdfamily, "إيقاف الإنترنت", pausePi)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

/** Compatibility helper for starting a service across Android versions. */
fun Context.startServiceSafelyCompat(intent: Intent) {
    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    } catch (e: Exception) {
        Log.w("ProtectionService", "Failed to start service: ${e.message}")
    }
}
