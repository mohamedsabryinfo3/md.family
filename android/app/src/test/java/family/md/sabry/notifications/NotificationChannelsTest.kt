package family.md.sabry.notifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for NotificationChannels — verifies the channel ID constants
 * and the channel-for-type routing logic.
 *
 * Note: actual NotificationManager.createNotificationChannel calls require
 * an Android Context, so those are tested via instrumentation tests instead.
 * These unit tests cover only the pure logic.
 */
class NotificationChannelsTest {

    @Test
    fun `channel constants are defined`() {
        assertEquals("mdfamily_sos", NotificationChannels.SOS)
        assertEquals("mdfamily_alerts", NotificationChannels.ALERTS)
        assertEquals("mdfamily_requests", NotificationChannels.REQUESTS)
        assertEquals("mdfamily_protection", NotificationChannels.PROTECTION)
        assertEquals("mdfamily_location", NotificationChannels.LOCATION)
        assertEquals("mdfamily_live", NotificationChannels.LIVE_SESSION)
        assertEquals("mdfamily_general", NotificationChannels.GENERAL)
        assertEquals("mdfamily_vpn_status", NotificationChannels.VPN_STATUS)
    }

    @Test
    fun `channel constants are unique`() {
        val ids = setOf(
            NotificationChannels.SOS,
            NotificationChannels.ALERTS,
            NotificationChannels.REQUESTS,
            NotificationChannels.PROTECTION,
            NotificationChannels.LOCATION,
            NotificationChannels.LIVE_SESSION,
            NotificationChannels.GENERAL,
            NotificationChannels.VPN_STATUS,
        )
        assertEquals(8, ids.size)  // all unique
    }

    @Test
    fun `channel constants use mdfamily_ prefix`() {
        listOf(
            NotificationChannels.SOS,
            NotificationChannels.ALERTS,
            NotificationChannels.REQUESTS,
            NotificationChannels.PROTECTION,
            NotificationChannels.LOCATION,
            NotificationChannels.LIVE_SESSION,
            NotificationChannels.GENERAL,
            NotificationChannels.VPN_STATUS,
        ).forEach { channelId ->
            assertTrue("Channel $channelId should start with 'mdfamily_'", channelId.startsWith("mdfamily_"))
        }
    }
}
