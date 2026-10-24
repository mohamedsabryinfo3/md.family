package family.md.sabry.engine

import android.util.Log
import android.util.LruCache
import java.util.concurrent.ConcurrentHashMap

/**
 * MD-Sabry rule engine — the in-memory policy store for the device.
 *
 * This class holds the rules that the VpnService and AccessibilityService
 * consult at runtime to decide what to do with each request:
 *   - BLOCK: block the request (web filter) / lock the app (accessibility)
 *   - ALERT: allow but log + send a notification to the parent
 *   - ALLOW: pass through silently
 *
 * Rules are loaded from the FastAPI backend and refreshed via FCM
 * `policy.updated` events. The local copy is also persisted to SharedPreferences
 * so that protection still works when the device is offline (the rules engine
 * continues to apply the last-known policy until reconnect).
 *
 * Rule precedence (highest priority first):
 *   1) Per-URL exception (WebsiteException)
 *   2) Per-package app policy (AppPolicy)
 *   3) Per-category web action (WebCategory)
 *   4) Default allow
 *
 * For app blocking, the only levels are: always_allowed, daily_limit (with
 * `today_usage_min` tracking), and blocked.
 */
class MDSabryRuleEngine {

    companion object {
        private const val TAG = "MDSabryEngine"
        private const val MAX_DOMAIN_CACHE = 5000
    }

    /** Web categories keyed by category slug → action. */
    private val webCategories = ConcurrentHashMap<String, String>()  // category → allow|alert|block

    /** Per-URL exceptions keyed by hostname → action. */
    private val urlExceptions = ConcurrentHashMap<String, String>()  // host → allow|alert|block

    /** Blocked package names (apps the parent has set to "blocked"). */
    private val blockedPackages = ConcurrentHashMap.newKeySet<String>()

    /** Apps with daily limits (package → limit in minutes). */
    private val appLimits = ConcurrentHashMap<String, Int>()

    /** Apps with daily usage tracking (package → today's usage in minutes). */
    private val appUsage = ConcurrentHashMap<String, Int>()

    /** The current policy version (incremented by the backend on each change). */
    @Volatile
    var policyVersion: Int = 0
        private set

    /** Family pause state — when true, all web traffic is blocked except whitelisted. */
    @Volatile
    var familyPauseActive: Boolean = false
        private set

    /** Local LRU cache for hostname → action (avoids re-evaluating rules per request). */
    private val hostActionCache = LruCache<String, String>(MAX_DOMAIN_CACHE)

    // ─── Web rules ──────────────────────────────────

    /**
     * Decide what to do with a given hostname.
     * Returns "allow", "alert", or "block".
     */
    fun evaluateHost(host: String): String {
        if (familyPauseActive) {
            // Family pause → block everything not explicitly allowed
            val action = urlExceptions[host]
            return if (action == "allow") "allow" else "block"
        }

        // 1) Check cache
        hostActionCache.get(host)?.let { return it }

        // 2) URL exception (highest priority)
        urlExceptions[host]?.let {
            hostActionCache.put(host, it)
            return it
        }

        // 3) Category lookup
        val category = categorizeHost(host)
        val action = webCategories[category] ?: "allow"
        hostActionCache.put(host, action)
        return action
    }

    /**
     * Categorize a hostname. This is a simple rule-based classifier — in production
     * we'd use a category database (similar to the Open Directory Project or a
     * commercial DB like SURBL).
     */
    private fun categorizeHost(host: String): String {
        val h = host.lowercase()
        return when {
            // Adult content — keyword + known TLDs
            h.contains("porn") || h.contains("xxx") || h.endsWith(".xxx") ||
            h.contains("adult") || h.contains("sex") -> "adult"

            // Gambling
            h.contains("casino") || h.contains("gambling") || h.contains("poker") ||
            h.contains("bet365") || h.contains("bwin") -> "gambling"

            // Violence
            h.contains("gore") || h.contains("violence") -> "violence"

            // Education
            h.contains("khanacademy") || h.contains("wikipedia") || h.contains("coursera") ||
            h.contains("edx") || h.endsWith(".edu") -> "education"

            // Social media
            h.contains("facebook") || h.contains("instagram") || h.contains("tiktok") ||
            h.contains("twitter") || h.contains("x.com") || h.contains("snapchat") ||
            h.contains("whatsapp") || h.contains("telegram") -> "social"

            // Games
            h.contains("roblox") || h.contains("minecraft") || h.contains("steam") ||
            h.contains("poki") || h.contains("crazygames") -> "games"

            // Shopping
            h.contains("amazon") || h.contains("ebay") || h.contains("aliexpress") ||
            h.contains("noon") || h.contains("jumia") -> "shopping"

            else -> "default"
        }
    }

    // ─── App rules ──────────────────────────────────

    /** Returns true if the package should be blocked (i.e. the foreground app matches the blocked list). */
    fun isPackageBlocked(packageName: String): Boolean {
        if (blockedPackages.contains(packageName)) return true

        // Check daily limit
        val limit = appLimits[packageName]
        if (limit != null) {
            val usage = appUsage[packageName] ?: 0
            if (usage >= limit) return true
        }

        return false
    }

    /** Records usage for a package — called every minute the app stays in the foreground. */
    fun recordUsage(packageName: String, minutes: Int = 1) {
        val current = appUsage[packageName] ?: 0
        appUsage[packageName] = current + minutes
        Log.d(TAG, "usage: $packageName = ${appUsage[packageName]} min")
    }

    /** Resets daily usage counters — called at midnight (local timezone). */
    fun resetDailyUsage() {
        appUsage.clear()
        Log.i(TAG, "Daily usage counters reset")
    }

    // ─── Rule updates (called from backend sync) ─────

    /** Updates the web categories map. */
    fun updateWebCategories(categories: Map<String, String>) {
        webCategories.clear()
        webCategories.putAll(categories)
        hostActionCache.evictAll()
        Log.i(TAG, "Updated web categories: ${categories.size} entries")
    }

    /** Updates URL exceptions. */
    fun updateUrlExceptions(exceptions: Map<String, String>) {
        urlExceptions.clear()
        urlExceptions.putAll(exceptions)
        hostActionCache.evictAll()
        Log.i(TAG, "Updated URL exceptions: ${exceptions.size} entries")
    }

    /** Updates blocked packages. */
    fun updateBlockedPackages(packages: Set<String>) {
        blockedPackages.clear()
        blockedPackages.addAll(packages)
        Log.i(TAG, "Updated blocked packages: ${packages.size} entries")
    }

    /** Updates per-app daily limits. */
    fun updateAppLimits(limits: Map<String, Int>) {
        appLimits.clear()
        appLimits.putAll(limits)
        Log.i(TAG, "Updated app limits: ${limits.size} entries")
    }

    /** Sets the policy version (called after a successful backend sync). */
    fun setPolicyVersion(version: Int) {
        policyVersion = version
    }

    /** Sets the family pause state — when true, blocks all non-whitelisted traffic. */
    fun setFamilyPause(active: Boolean) {
        familyPauseActive = active
        hostActionCache.evictAll()
        Log.i(TAG, "Family pause ${if (active) "ACTIVATED" else "DEACTIVATED"}")
    }

    /** Dumps the current engine state for debugging. */
    fun dumpState(): String {
        return buildString {
            appendLine("MDSabryRuleEngine state:")
            appendLine("  policyVersion: $policyVersion")
            appendLine("  familyPauseActive: $familyPauseActive")
            appendLine("  webCategories: ${webCategories.size}")
            appendLine("  urlExceptions: ${urlExceptions.size}")
            appendLine("  blockedPackages: ${blockedPackages.size}")
            appendLine("  appLimits: ${appLimits.size}")
            appendLine("  appUsage: ${appUsage.size}")
        }
    }
}
