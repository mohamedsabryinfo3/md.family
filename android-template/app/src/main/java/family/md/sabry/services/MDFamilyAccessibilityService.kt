package family.md.sabry.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import family.md.sabry.engine.MDSabryRuleEngine
import java.util.concurrent.ConcurrentHashMap

/**
 * MD.Family Accessibility Service
 * ================================
 *
 * Monitors the foreground application and enforces per-app policies:
 *   - When a BLOCKED app comes to the foreground → show a lock overlay
 *   - When a DAILY_LIMIT app exceeds its limit → show a "Time's up" overlay
 *   - When the user opens an app that's currently allowed, count usage minutes
 *
 * Per engineering blueprint §7 (App policies):
 *   - This service is enabled ONLY when the user explicitly enables it in
 *     Android Settings → Accessibility → MD.Family.
 *   - We observe ONLY foreground-package-change events (no UI text scraping).
 *   - The lock overlay is shown via TYPE_APPLICATION_OVERLAY (requires
 *     SYSTEM_ALERT_WINDOW permission, also explicitly granted by the user).
 *   - We NEVER hijack system settings, prevent uninstallation, or scrape
 *     credentials. This is a non-covert, opt-in parental control.
 *
 * Lifecycle:
 *   - onServiceConnected: configure the service info (event types, capabilities)
 *   - onAccessibilityEvent: handle TYPE_WINDOW_STATE_CHANGED events
 *   - onInterrupt: no-op
 *   - onUnbind: clean up
 */
class MDFamilyAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "MDFamilyAccessibility"

        /** The currently-active lock overlay window (or null if none). */
        @Volatile
        private var activeLockOverlay: LockOverlay? = null

        /** Singleton reference so the Capacitor plugin can talk to us. */
        @Volatile
        private var instance: MDFamilyAccessibilityService? = null

        fun getInstance(): MDFamilyAccessibilityService? = instance
    }

    private val ruleEngine = MDSabryRuleEngine()

    /** Per-package usage tracking — records the timestamp when each app was last seen in foreground. */
    private val appForegroundTimestamps = ConcurrentHashMap<String, Long>()

    /** The package that's currently in the foreground (or null). */
    @Volatile
    private var currentForegroundPackage: String? = null

    /** Background thread that increments usage counters every 60s. */
    private var usageThread: Thread? = null
    private var usageThreadRunning = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this

        // Configure what events we want to receive
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            notificationTimeout = 200L  // ms
        }
        serviceInfo = info

        // Start the usage-tracking thread
        startUsageThread()

        Log.i(TAG, "MD.Family Accessibility Service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName == packageName) return  // ignore our own app
        if (packageName.startsWith("com.android.systemui")) return  // ignore system UI

        Log.d(TAG, "Foreground app changed: $packageName")

        // Update current foreground package
        val previousPackage = currentForegroundPackage
        currentForegroundPackage = packageName

        // Record timestamp for usage tracking
        appForegroundTimestamps[packageName] = System.currentTimeMillis()

        // Check if this package should be blocked
        if (ruleEngine.isPackageBlocked(packageName)) {
            Log.i(TAG, "App BLOCKED: $packageName — showing lock overlay")
            showLockOverlay(packageName, reason = "blocked")
        } else {
            // Dismiss any active overlay if the new app is allowed
            hideLockOverlay()
        }
    }

    override fun onInterrupt() {
        // No-op — accessibility services are not required to handle this
    }

    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        stopUsageThread()
        hideLockOverlay()
        Log.i(TAG, "MD.Family Accessibility Service unbound")
        return false
    }

    // ─── Usage tracking ──────────────────────────────

    /** Starts a background thread that ticks every 60s to record usage for the foreground app. */
    private fun startUsageThread() {
        if (usageThreadRunning) return
        usageThreadRunning = true
        usageThread = Thread {
            while (usageThreadRunning) {
                try {
                    Thread.sleep(60_000L)  // 1 minute
                    val pkg = currentForegroundPackage ?: continue
                    if (!ruleEngine.isPackageBlocked(pkg)) {
                        ruleEngine.recordUsage(pkg, minutes = 1)
                        // After recording usage, re-check if the app should now be blocked
                        if (ruleEngine.isPackageBlocked(pkg)) {
                            Log.i(TAG, "App $pkg exceeded its daily limit — blocking now")
                            showLockOverlay(pkg, reason = "time_limit")
                        }
                    }
                } catch (e: InterruptedException) {
                    break
                } catch (e: Exception) {
                    Log.w(TAG, "Usage thread error: ${e.message}")
                }
            }
        }.apply {
            name = "MDFamilyAccessibility-UsageThread"
            isDaemon = true
            start()
        }
    }

    private fun stopUsageThread() {
        usageThreadRunning = false
        usageThread?.interrupt()
        usageThread = null
    }

    // ─── Lock overlay ────────────────────────────────

    /** Shows a lock overlay on top of the blocked app. */
    private fun showLockOverlay(packageName: String, reason: String) {
        // Hide any existing overlay first
        hideLockOverlay()

        // Create the overlay
        val overlay = LockOverlay(this, packageName, reason) {
            // "Request more time" button callback — opens MD.Family with a request intent
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                putExtra("request_extension_for", packageName)
            }
            startActivity(intent)
            hideLockOverlay()
        }
        overlay.show()
        activeLockOverlay = overlay
    }

    private fun hideLockOverlay() {
        activeLockOverlay?.hide()
        activeLockOverlay = null
    }

    // ─── Public API (called from Capacitor plugin) ────

    /** Updates the rule engine with new blocked packages (called from the Capacitor plugin). */
    fun updateBlockedPackages(packages: Set<String>) {
        ruleEngine.updateBlockedPackages(packages)
        // If the currently-foreground app is now blocked, show the overlay
        currentForegroundPackage?.let { pkg ->
            if (packages.contains(pkg)) {
                showLockOverlay(pkg, reason = "blocked")
            }
        }
    }

    /** Returns the current rule engine state (for debugging). */
    fun dumpState(): String = ruleEngine.dumpState()
}
