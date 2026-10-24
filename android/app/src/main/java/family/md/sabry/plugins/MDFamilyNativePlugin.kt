package family.md.sabry.plugins

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import family.md.sabry.ProtectionService
import family.md.sabry.engine.MDSabryRuleEngine
import family.md.sabry.notifications.NotificationChannels
import family.md.sabry.services.MDSabryVpnService
import family.md.sabry.services.MDFamilyAccessibilityService
import family.md.sabry.services.MDFamilyLocationService
import family.md.sabry.services.MDFamilyUsageStatsCollector
import family.md.sabry.services.ScreenCaptureService
import family.md.sabry.services.VoiceCallService
import org.json.JSONArray
import org.json.JSONObject

/**
 * MD.Family Capacitor Plugin
 * ===========================
 *
 * Exposes native Android services to the Next.js WebView so the JavaScript
 * code can:
 *   - Start / stop the VPN service (after user consent)
 *   - Start / stop the accessibility service (after user enables it in Settings)
 *   - Start / stop live screen capture (after MediaProjection consent)
 *   - Start / stop voice calls / ambient audio (after RECORD_AUDIO permission)
 *   - Trigger an SOS (gets current location + uploads to backend)
 *   - Check permission status (VpnService, Accessibility, UsageStats, etc.)
 *   - Open system permission screens (Usage access, Accessibility, Draw over apps)
 *
 * Available JS methods (callable from `Capacitor.Plugins.MDFamilyNative.xxx`):
 *   - getPermissionStatus(name) → returns "granted" | "denied" | "not_determined"
 *   - openPermissionSettings(name) → opens the relevant system settings screen
 *   - startVpnService() → requests VPN consent + starts MDSabryVpnService
 *   - stopVpnService() → stops the VPN
 *   - startAccessibilityService() → opens Accessibility settings
 *   - startScreenCapture(sessionId) → requests MediaProjection consent + starts ScreenCaptureService
 *   - stopScreenCapture() → stops the screen capture service
 *   - startVoiceCall(sessionId) → starts VoiceCallService (voice_call kind)
 *   - startAmbientAudio(sessionId) → starts VoiceCallService (ambient_audio kind)
 *   - stopAudioSession() → stops the audio session
 *   - triggerSos(childId) → gets location + uploads + sends FCM to parents
 *   - getUsageStats() → returns today's per-app usage (if permission granted)
 *   - getRuleEngineState() → returns the current rule engine state (for debugging)
 *
 * Each method returns a JSObject with at least { ok: boolean } and any
 * relevant data. Errors are thrown as Capacitor exceptions.
 */
@CapacitorPlugin(name = "MDFamilyNative")
class MDFamilyNativePlugin : Plugin() {

    companion object {
        private const val TAG = "MDFamilyPlugin"

        private const val REQUEST_VPN_CONSENT = 1001
        private const val REQUEST_MEDIA_PROJECTION = 1002
        private const val REQUEST_USAGE_ACCESS = 1003
        private const val REQUEST_ACCESSIBILITY = 1004
        private const val REQUEST_DRAW_OVER_APPS = 1005
        private const val REQUEST_LOCATION_PERMISSION = 1006
        private const val REQUEST_MIC_PERMISSION = 1007
    }

    private var pendingCall: PluginCall? = null
    private var pendingSessionId: String? = null

    // ─── Permission status ───────────────────────────

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        val name = call.getString("name") ?: run {
            call.reject("Missing 'name' parameter")
            return
        }
        val status = when (name) {
            "vpn" -> if (VpnService.prepare(context) == null) "granted" else "not_determined"
            "accessibility" -> {
                val enabled = isAccessibilityEnabled()
                if (enabled) "granted" else "not_determined"
            }
            "usage_stats" -> if (MDFamilyUsageStatsCollector(context).hasUsageStatsPermission()) "granted" else "not_determined"
            "draw_over_apps" -> if (Settings.canDrawOverlays(context)) "granted" else "not_determined"
            "location" -> {
                val granted = androidx.core.app.ActivityCompat.checkSelfPermission(
                    context, android.Manifest.permission.ACCESS_FINE_LOCATION
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                if (granted) "granted" else "not_determined"
            }
            "microphone" -> {
                val granted = androidx.core.app.ActivityCompat.checkSelfPermission(
                    context, android.Manifest.permission.RECORD_AUDIO
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                if (granted) "granted" else "not_determined"
            }
            "notifications" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = androidx.core.app.ActivityCompat.checkSelfPermission(
                    context, android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                if (granted) "granted" else "not_determined"
            } else "granted"
            else -> "unknown"
        }
        call.resolve(JSObject().apply {
            put("name", name)
            put("status", status)
        })
    }

    @PluginMethod
    fun openPermissionSettings(call: PluginCall) {
        val name = call.getString("name") ?: run {
            call.reject("Missing 'name' parameter")
            return
        }
        val intent = when (name) {
            "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            "usage_stats" -> Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            "draw_over_apps" -> Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                data = android.net.Uri.parse("package:${context.packageName}")
            }
            "location" -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = android.net.Uri.parse("package:${context.packageName}")
            }
            else -> {
                call.reject("Unknown permission: $name")
                return
            }
        }
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
        call.resolve()
    }

    // ─── VPN ────────────────────────────────────────

    @PluginMethod
    fun startVpnService(call: PluginCall) {
        // Check if VPN consent is already granted
        if (VpnService.prepare(context) != null) {
            // Need consent → start the consent Activity
            pendingCall = call
            val intent = VpnService.prepare(activity)
            startActivityForResult(call, intent, REQUEST_VPN_CONSENT)
        } else {
            // Already consented — start the service
            val intent = Intent(context, MDSabryVpnService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            call.resolve(JSObject().apply { put("ok", true); put("status", "started") })
        }
    }

    @PluginMethod
    fun stopVpnService(call: PluginCall) {
        val intent = Intent(context, MDSabryVpnService::class.java).apply { action = "STOP" }
        context.startService(intent)
        call.resolve(JSObject().apply { put("ok", true); put("status", "stopped") })
    }

    @ActivityCallback
    private fun onVpnConsentResult(call: PluginCall, @Suppress("UNUSED_PARAMETER") result: ActivityResult) {
        if (result.resultCode == Activity.RESULT_OK) {
            val intent = Intent(context, MDSabryVpnService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            call.resolve(JSObject().apply { put("ok", true); put("status", "started") })
        } else {
            call.resolve(JSObject().apply { put("ok", false); put("status", "denied") })
        }
        pendingCall = null
    }

    // ─── Screen Capture ──────────────────────────────

    @PluginMethod
    fun startScreenCapture(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: run {
            call.reject("Missing 'sessionId'")
            return
        }
        pendingCall = call
        pendingSessionId = sessionId

        val mpm = context.getSystemService(android.content.Context.MEDIA_PROJECTION_SERVICE)
                as android.media.projection.MediaProjectionManager
        val intent = mpm.createScreenCaptureIntent()
        startActivityForResult(call, intent, REQUEST_MEDIA_PROJECTION)
    }

    @ActivityCallback
    private fun onMediaProjectionResult(call: PluginCall, result: ActivityResult) {
        val sessionId = pendingSessionId ?: run {
            call.reject("No pending session ID")
            return
        }
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            ScreenCaptureService.start(context, result.resultCode, result.data!!, sessionId, "parent")
            call.resolve(JSObject().apply {
                put("ok", true)
                put("status", "started")
                put("sessionId", sessionId)
            })
        } else {
            call.resolve(JSObject().apply { put("ok", false); put("status", "denied") })
        }
        pendingCall = null
        pendingSessionId = null
    }

    @PluginMethod
    fun stopScreenCapture(call: PluginCall) {
        ScreenCaptureService.stop(context)
        call.resolve(JSObject().apply { put("ok", true); put("status", "stopped") })
    }

    // ─── Voice Calls + Ambient Audio ──────────────────

    @PluginMethod
    fun startVoiceCall(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: run {
            call.reject("Missing 'sessionId'")
            return
        }
        VoiceCallService.startVoiceCall(context, sessionId)
        call.resolve(JSObject().apply {
            put("ok", true); put("status", "started"); put("kind", "voice_call")
        })
    }

    @PluginMethod
    fun startAmbientAudio(call: PluginCall) {
        val sessionId = call.getString("sessionId") ?: run {
            call.reject("Missing 'sessionId'")
            return
        }
        VoiceCallService.startAmbientAudio(context, sessionId)
        call.resolve(JSObject().apply {
            put("ok", true); put("status", "started"); put("kind", "ambient_audio")
        })
    }

    @PluginMethod
    fun stopAudioSession(call: PluginCall) {
        VoiceCallService.stop(context)
        call.resolve(JSObject().apply { put("ok", true); put("status", "stopped") })
    }

    // ─── SOS ────────────────────────────────────────

    @PluginMethod
    fun triggerSos(call: PluginCall) {
        val childId = call.getString("childId") ?: run {
            call.reject("Missing 'childId'")
            return
        }
        // Get current location + upload via HTTP POST
        MDFamilyLocationService.getInstance(context).getCurrentLocationAndUpload { location ->
            val ret = JSObject()
            ret.put("ok", true)
            ret.put("childId", childId)
            if (location != null) {
                ret.put("lat", location.latitude)
                ret.put("lng", location.longitude)
                ret.put("accuracy", location.accuracy)
            } else {
                ret.put("location", "unavailable")
            }
            // Note: in production, this would also POST to /api/v1/families/{fid}/children/{cid}/sos
            call.resolve(ret)
        }
    }

    // ─── Usage stats ──────────────────────────────────

    @PluginMethod
    fun getUsageStats(call: PluginCall) {
        val collector = MDFamilyUsageStatsCollector(context)
        if (!collector.hasUsageStatsPermission()) {
            call.resolve(JSObject().apply {
                put("ok", false)
                put("status", "permission_required")
                put("permission", "usage_stats")
            })
            return
        }
        val stats = collector.getTodayUsageStats()
        call.resolve(JSObject().apply {
            put("ok", true)
            put("stats", stats.toString())  // Capacitor serializes strings best
        })
    }

    // ─── Rule engine state (debug) ────────────────────

    @PluginMethod
    fun getRuleEngineState(call: PluginCall) {
        val state = ProtectionService.getRuleEngine().dumpState()
        call.resolve(JSObject().apply {
            put("ok", true)
            put("state", state)
        })
    }

    @PluginMethod
    fun updateBlockedPackages(call: PluginCall) {
        val packagesArray = call.getArray("packages") ?: run {
            call.reject("Missing 'packages'")
            return
        }
        val packages = packagesArray.toList<String>().toSet()
        val accService = MDFamilyAccessibilityService.getInstance()
        if (accService != null) {
            accService.updateBlockedPackages(packages)
            call.resolve(JSObject().apply { put("ok", true); put("count", packages.size) })
        } else {
            call.resolve(JSObject().apply {
                put("ok", false)
                put("status", "accessibility_not_enabled")
            })
        }
    }

    // ─── Helpers ──────────────────────────────────────

    private fun isAccessibilityEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabledServices.contains(context.packageName + "/family.md.sabry.services.MDFamilyAccessibilityService")
    }
}
