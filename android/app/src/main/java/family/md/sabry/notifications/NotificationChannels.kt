package family.md.sabry.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.content.edit

/**
 * Centralized notification channel management for MD.Family.
 *
 * The channels are described in the backend at `/api/v1/notifications/channels`
 * and the Android side must register them with the NotificationManager.
 * We create all of them at app startup so that incoming FCM messages can
 * target any channel without runtime failures.
 *
 * Channel importance levels (Android API 26+):
 *  - HIGH:    pops heads-up, makes sound, vibrates (SOS, safety alerts)
 *  - DEFAULT:  shows in shade, makes sound (extension requests, live sessions)
 *  - LOW:      shows in shade, no sound (protection status)
 *  - MIN:      shows collapsed (battery usage, etc.)
 *
 * Per engineering blueprint §8 — protection notifications are always LOW importance
 * to avoid annoying the user, while SOS / safety alerts are HIGH importance.
 */
object NotificationChannels {

    const val SOS = "mdfamily_sos"
    const val ALERTS = "mdfamily_alerts"
    const val REQUESTS = "mdfamily_requests"
    const val PROTECTION = "mdfamily_protection"
    const val LOCATION = "mdfamily_location"
    const val LIVE_SESSION = "mdfamily_live"
    const val GENERAL = "mdfamily_general"
    const val VPN_STATUS = "mdfamily_vpn_status"  // used by VpnService foreground notification
    const val PROTECTION_STATUS = "mdfamily_protection"  // same as PROTECTION

    /** Create all notification channels. Call this at app startup (e.g. in Application.onCreate). */
    fun createAll(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channels = listOf(
            NotificationChannel(SOS, "استغاثات SOS", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "تنبيهات استغاثة SOS من الأطفال"
                enableVibration(true)
                enableLights(true)
                lightColor = 0xFFFF3B30.toInt()
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            },
            NotificationChannel(ALERTS, "تنبيهات السلامة", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "تنبيهات السلامة الاجتماعية (تنمر، محتوى غير مناسب)"
                enableVibration(true)
                enableLights(true)
                lightColor = 0xFFFF9500.toInt()
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            },
            NotificationChannel(REQUESTS, "طلبات وقت إضافي", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "طلبات الوقت الإضافي وقرارات الوالد"
                enableVibration(true)
                setShowBadge(true)
            },
            NotificationChannel(PROTECTION, "حالة الحماية", NotificationManager.IMPORTANCE_LOW).apply {
                description = "حالة محرك الحماية (MD-Sabry) وتحديثات السياسات"
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            },
            NotificationChannel(LOCATION, "أحداث الموقع", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "دخول/خروج المنطقة الآمنة"
                enableVibration(true)
                setShowBadge(true)
            },
            NotificationChannel(LIVE_SESSION, "الجلسات الحية", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "بدء/إنهاء جلسة مشاهدة الشاشة أو الصوت"
                enableVibration(true)
                enableLights(true)
                lightColor = 0xFF3182CE.toInt()
                setShowBadge(true)
            },
            NotificationChannel(GENERAL, "عام", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "إشعارات عامة (ربط جهاز، تأكيدات)"
                enableVibration(true)
                setShowBadge(true)
            },
            NotificationChannel(VPN_STATUS, "حالة VPN", NotificationManager.IMPORTANCE_LOW).apply {
                description = "حالة فلترة الويب (MD-Sabry VPN)"
                enableVibration(false)
                setShowBadge(false)
                // VPN foreground notifications are non-dismissible while VPN is active
                lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            },
        )

        channels.forEach { nm.createNotificationChannel(it) }
    }
}
