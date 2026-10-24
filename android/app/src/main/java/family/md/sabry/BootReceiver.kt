package family.md.sabry

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * MD-Sabry Protection Service — auto-restart on device boot.
 *
 * This receiver fires when:
 *  - BOOT_COMPLETED: device just finished booting
 *  - MY_PACKAGE_REPLACED: MD.Family APK was updated
 *
 * It re-launches the foreground protection service so the rules engine
 * (web filter, app policies, geofences) resumes without requiring the
 * parent to open the app. The foreground service shows a persistent
 * notification indicating "MD.Family protection active" — this is always
 * visible to the user, never covert (per §8 of the engineering blueprint).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                val svc = Intent(context, ProtectionService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(svc)
                } else {
                    context.startService(svc)
                }
            }
        }
    }
}
