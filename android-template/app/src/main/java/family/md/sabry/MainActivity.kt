package family.md.sabry

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.getcapacitor.BridgeActivity

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
 */
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Capacitor bridge is initialized by the parent; we just register
        // any additional native plugins here if/when they are added.
        // registerPlugin(ProtectionServicePlugin::class.java)

        // Wire Android hardware back button to the JS navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Tell JS about the back press; JS will call native exit if at root
                bridge?.triggerWindowEvent("backbutton")
            }
        })
    }
}
