package family.md.sabry.engine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for MDSabryRuleEngine — the core policy decision class.
 *
 * Tests cover:
 *   - Hostname categorization (adult, gambling, social, education, etc.)
 *   - Web category rule evaluation
 *   - URL exceptions (override categories)
 *   - Family pause (block everything except whitelisted)
 *   - App blocking (always-allowed, daily-limit exceeded, blocked)
 *   - Usage tracking + daily reset
 *   - Policy version management
 */
class MDSabryRuleEngineTest {

    private lateinit var engine: MDSabryRuleEngine

    @Before
    fun setUp() {
        engine = MDSabryRuleEngine()
    }

    // ─── Web category rule evaluation ──────────────────

    @Test
    fun `default action is allow when no rules loaded`() {
        val action = engine.evaluateHost("example.com")
        assertEquals("allow", action)
    }

    @Test
    fun `blocked category returns block`() {
        engine.updateWebCategories(mapOf("adult" to "block"))
        val action = engine.evaluateHost("porn.example.com")
        assertEquals("block", action)
    }

    @Test
    fun `alerted category returns alert`() {
        engine.updateWebCategories(mapOf("social" to "alert"))
        val action = engine.evaluateHost("facebook.com")
        assertEquals("alert", action)
    }

    @Test
    fun `allowed category returns allow`() {
        engine.updateWebCategories(mapOf("education" to "allow"))
        val action = engine.evaluateHost("khanacademy.org")
        assertEquals("allow", action)
    }

    // ─── URL exceptions override categories ────────────

    @Test
    fun `url exception overrides blocked category`() {
        engine.updateWebCategories(mapOf("adult" to "block"))
        engine.updateUrlExceptions(mapOf("educational-porn.example.com" to "allow"))

        val action = engine.evaluateHost("educational-porn.example.com")
        assertEquals("allow", action)  // exception wins over category
    }

    @Test
    fun `url exception can block an otherwise-allowed host`() {
        engine.updateUrlExceptions(mapOf("example.com" to "block"))
        val action = engine.evaluateHost("example.com")
        assertEquals("block", action)
    }

    // ─── Family pause ──────────────────────────────────

    @Test
    fun `family pause blocks everything except whitelisted`() {
        engine.updateUrlExceptions(mapOf("trusted.example.com" to "allow"))
        engine.setFamilyPause(true)

        assertEquals("block", engine.evaluateHost("facebook.com"))
        assertEquals("block", engine.evaluateHost("random.example.com"))
        assertEquals("allow", engine.evaluateHost("trusted.example.com"))  // whitelisted
    }

    @Test
    fun `family pause off allows normal rule evaluation`() {
        engine.updateWebCategories(mapOf("adult" to "block"))
        engine.setFamilyPause(false)

        assertEquals("block", engine.evaluateHost("porn.example.com"))
        assertEquals("allow", engine.evaluateHost("example.com"))
    }

    // ─── App blocking ──────────────────────────────────

    @Test
    fun `blocked package returns true`() {
        engine.updateBlockedPackages(setOf("com.tiktok", "com.snapchat"))
        assertTrue(engine.isPackageBlocked("com.tiktok"))
        assertTrue(engine.isPackageBlocked("com.snapchat"))
    }

    @Test
    fun `non-blocked package returns false`() {
        engine.updateBlockedPackages(setOf("com.tiktok"))
        assertFalse(engine.isPackageBlocked("com.whatsapp"))
    }

    @Test
    fun `daily limit exceeded blocks the app`() {
        engine.updateAppLimits(mapOf("com.game" to 60))
        engine.recordUsage("com.game", 60)  // exactly the limit
        assertTrue(engine.isPackageBlocked("com.game"))
    }

    @Test
    fun `daily limit not yet reached allows the app`() {
        engine.updateAppLimits(mapOf("com.game" to 60))
        engine.recordUsage("com.game", 30)  // half the limit
        assertFalse(engine.isPackageBlocked("com.game"))
    }

    @Test
    fun `daily reset clears usage counters`() {
        engine.updateAppLimits(mapOf("com.game" to 60))
        engine.recordUsage("com.game", 60)
        assertTrue(engine.isPackageBlocked("com.game"))

        engine.resetDailyUsage()
        assertFalse(engine.isPackageBlocked("com.game"))
    }

    // ─── Hostname categorization ───────────────────────

    @Test
    fun `categorization detects adult content keywords`() {
        engine.updateWebCategories(mapOf("adult" to "block"))
        assertEquals("block", engine.evaluateHost("pornhub.com"))
        assertEquals("block", engine.evaluateHost("xxx-videos.example.com"))
        assertEquals("block", engine.evaluateHost("adult-content.example.org"))
    }

    @Test
    fun `categorization detects gambling keywords`() {
        engine.updateWebCategories(mapOf("gambling" to "block"))
        assertEquals("block", engine.evaluateHost("casino.example.com"))
        assertEquals("block", engine.evaluateHost("poker.example.com"))
        assertEquals("block", engine.evaluateHost("bet365.com"))
    }

    @Test
    fun `categorization detects social media`() {
        engine.updateWebCategories(mapOf("social" to "alert"))
        assertEquals("alert", engine.evaluateHost("facebook.com"))
        assertEquals("alert", engine.evaluateHost("instagram.com"))
        assertEquals("alert", engine.evaluateHost("tiktok.com"))
        assertEquals("alert", engine.evaluateHost("whatsapp.com"))
    }

    @Test
    fun `categorization detects education sites`() {
        engine.updateWebCategories(mapOf("education" to "allow"))
        assertEquals("allow", engine.evaluateHost("khanacademy.org"))
        assertEquals("allow", engine.evaluateHost("wikipedia.org"))
        assertEquals("allow", engine.evaluateHost("coursera.org"))
    }

    @Test
    fun `categorization detects games`() {
        engine.updateWebCategories(mapOf("games" to "alert"))
        assertEquals("alert", engine.evaluateHost("roblox.com"))
        assertEquals("alert", engine.evaluateHost("minecraft.net"))
    }

    // ─── Policy version management ─────────────────────

    @Test
    fun `policy version starts at zero`() {
        assertEquals(0, engine.policyVersion)
    }

    @Test
    fun `policy version can be updated`() {
        engine.setPolicyVersion(5)
        assertEquals(5, engine.policyVersion)
    }

    // ─── Cache invalidation ───────────────────────────

    @Test
    fun `updating web categories invalidates the host cache`() {
        engine.updateWebCategories(mapOf("adult" to "block"))
        assertEquals("block", engine.evaluateHost("porn.example.com"))  // populates cache

        engine.updateWebCategories(mapOf("adult" to "allow"))
        assertEquals("allow", engine.evaluateHost("porn.example.com"))  // cache should be invalidated
    }

    @Test
    fun `toggling family pause invalidates the host cache`() {
        engine.updateWebCategories(mapOf("adult" to "block"))
        engine.setFamilyPause(true)
        assertEquals("block", engine.evaluateHost("example.com"))  // blocked due to pause

        engine.setFamilyPause(false)
        assertEquals("allow", engine.evaluateHost("example.com"))  // now allowed
    }

    // ─── Dump state (debugging) ───────────────────────

    @Test
    fun `dumpState returns non-empty string with engine info`() {
        val state = engine.dumpState()
        assertTrue(state.contains("MDSabryRuleEngine state:"))
        assertTrue(state.contains("policyVersion: 0"))
    }
}
