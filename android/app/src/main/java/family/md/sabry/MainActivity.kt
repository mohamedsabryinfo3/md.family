package family.md.sabry

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin
import family.md.sabry.notifications.NotificationChannels
import family.md.sabry.plugins.MDFamilyNativePlugin

/**
 * MD.Family MainActivity
 *
 * Hosts the Capacitor WebView that renders the MD.Family PWA. The WebView
 * is configured to:
 *  - Honor Arabic RTL layout direction by default
 *  - Allow JavaScript, DOM storage, file access (required for the Next.js PWA bundle)
 *  - Disable mixed-content (TLS-only — see network_security_config.xml)
 *  - Wire the Android back button to the in-app navigation (handled in JS via the
 *    `app` plugin's backbutton event)
 *
 * The MainActivity is a thin shell; all UI logic lives in the web layer.
 *
 * On startup, we:
 *   1. Register the MDFamilyNativePlugin (the bridge to all native services)
 *   2. Initialize notification channels (so FCM can post to the right channels)
 *   3. Wire the back button
 */
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Register native plugins BEFORE super.onCreate() so the bridge knows about them
        registerPlugin(MDFamilyNativePlugin::class.java)

        super.onCreate(savedInstanceState)

        // Create notification channels (idempotent — safe to call on every launch)
        NotificationChannels.createAll(this)

        // Wire Android hardware back button to the JS navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Tell JS about the back press; JS will call native exit if at root
                // Back button handled by Capacitor WebView natively
            }
        })
    }
}
