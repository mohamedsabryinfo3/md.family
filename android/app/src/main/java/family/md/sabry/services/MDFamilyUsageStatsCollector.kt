package family.md.sabry.services

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * MD.Family Usage Stats Collector
 * ================================
 *
 * Reads per-app usage statistics from the Android system (UsageStatsManager)
 * and uploads them to the backend so the parent can see how much time the
 * child spent in each app today.
 *
 * Per engineering blueprint §6 (Screen time):
 *   - Reads only the minimum necessary: per-package foreground time
 *   - Requires the PACKAGE_USAGE_STATS permission (granted via Settings →
 *     "Apps with usage access" — user must enable manually, not via runtime dialog)
 *   - We upload aggregated daily stats, NOT individual sessions or screen content
 *   - Stats are uploaded once per hour (configurable)
 *
 * If the user has NOT granted usage access:
 *   - We can't read stats → return an empty list
 *   - The parent app shows a "Please grant usage access" prompt
 *
 * Stats are read via:
 *   UsageStatsManager.queryUsageStats(INTERVAL_DAILY, startTime, endTime)
 *
 * Each stat has:
 *   - packageName: the app's package name (e.g. "com.whatsapp")
 *   - totalTimeInForeground: ms spent in foreground during the window
 *   - firstTimeStamp / lastTimeStamp: the window's bounds
 *   - lastTimeUsed: timestamp of last foreground use
 */
class MDFamilyUsageStatsCollector(private val context: Context) {

    companion object {
        private const val TAG = "UsageStats"
    }

    /** Returns true if the user has granted PACKAGE_USAGE_STATS permission. */
    fun hasUsageStatsPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return false
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
        }
        return mode == android.app.AppOpsManager.MODE_ALLOWED
    }

    /** Opens the system "Usage access" settings screen so the user can grant permission. */
    fun openUsageAccessSettings() {
        val intent = android.content.Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    /**
     * Reads today's per-app usage stats.
     *
     * Returns a JSON array of objects:
     *   [{"package_name": "com.whatsapp", "app_name": "WhatsApp",
     *     "usage_minutes": 24, "last_used": 1234567890}, ...]
     *
     * Sorted by usage_minutes descending (most-used first).
     */
    fun getTodayUsageStats(): JSONArray {
        if (!hasUsageStatsPermission()) {
            Log.w(TAG, "Usage stats permission not granted — returning empty list")
            return JSONArray()
        }

        val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val startOfDay = getStartOfDayMillis()

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startOfDay,
            now
        ) ?: return JSONArray()

        // Aggregate by package (the system may return multiple intervals per package)
        val byPackage = mutableMapOf<String, android.app.usage.UsageStats>()
        for (stat in stats) {
            val existing = byPackage[stat.packageName]
            if (existing == null || stat.lastTimeUsed > existing.lastTimeUsed) {
                byPackage[stat.packageName] = stat
            }
        }

        val pm = context.packageManager
        val result = JSONArray()
        for ((_, stat) in byPackage) {
            val minutes = TimeUnit.MILLISECONDS.toMinutes(stat.totalTimeInForeground).toInt()
            if (minutes == 0) continue  // skip apps not used today

            val appName = try {
                pm.getApplicationLabel(pm.getApplicationInfo(stat.packageName, 0)).toString()
            } catch (e: PackageManager.NameNotFoundException) {
                stat.packageName  // fallback to package name
            }

            result.put(JSONObject().apply {
                put("package_name", stat.packageName)
                put("app_name", appName)
                put("usage_minutes", minutes)
                put("last_used", stat.lastTimeUsed)
            })
        }

        // Sort by usage descending
        val sorted = (0 until result.length()).map { result.optJSONObject(it) }
            .sortedByDescending { it.optInt("usage_minutes", 0) }
        val sortedArray = JSONArray()
        sorted.forEach { sortedArray.put(it) }
        return sortedArray
    }

    /** Returns the timestamp (ms) of the start of today (midnight local time). */
    private fun getStartOfDayMillis(): Long {
        val cal = java.util.Calendar.getInstance()
        cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
        cal.set(java.util.Calendar.MINUTE, 0)
        cal.set(java.util.Calendar.SECOND, 0)
        cal.set(java.util.Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }
}
