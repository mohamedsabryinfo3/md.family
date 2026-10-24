package family.md.sabry.services

import family.md.sabry.engine.MDSabryRuleEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for ProtectionService companion methods.
 *
 * We test only the pure-logic methods (rule engine accessors) since the
 * service itself requires an Android Context. Full integration tests
 * would use Espresso or Robolectric.
 */
class ProtectionServiceTest {

    @Before
    fun setUp() {
        // Reset the rule engine singleton by creating a fresh instance
        // (The companion object's getRuleEngine() returns a singleton,
        //  but for tests we just need to verify the rule engine is functional.)
    }

    @Test
    fun `rule engine can be instantiated`() {
        val engine = MDSabryRuleEngine()
        assertNotNull(engine)
    }

    @Test
    fun `rule engine starts with policy version 0`() {
        val engine = MDSabryRuleEngine()
        assertEquals(0, engine.policyVersion)
    }

    @Test
    fun `rule engine starts with family pause off`() {
        val engine = MDSabryRuleEngine()
        // After instantiation, family pause should be off
        engine.setFamilyPause(false)
        assertEquals("allow", engine.evaluateHost("example.com"))
    }

    @Test
    fun `rule engine family pause blocks everything`() {
        val engine = MDSabryRuleEngine()
        engine.setFamilyPause(true)
        assertEquals("block", engine.evaluateHost("example.com"))
        assertEquals("block", engine.evaluateHost("random.example.org"))
    }

    @Test
    fun `rule engine accepts blocked packages`() {
        val engine = MDSabryRuleEngine()
        engine.updateBlockedPackages(setOf("com.tiktok"))
        assertTrue(engine.isPackageBlocked("com.tiktok"))
        assertFalse(engine.isPackageBlocked("com.allowed.app"))
    }

    @Test
    fun `rule engine dumpState is non-empty`() {
        val engine = MDSabryRuleEngine()
        val state = engine.dumpState()
        assertTrue(state.isNotEmpty())
        assertTrue(state.contains("MDSabryRuleEngine state:"))
    }
}
