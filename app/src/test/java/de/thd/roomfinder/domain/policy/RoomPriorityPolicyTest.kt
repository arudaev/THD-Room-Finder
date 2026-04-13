package de.thd.roomfinder.domain.policy

import de.thd.roomfinder.TestFixtures
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RoomPriorityPolicyTest {

    @Test
    fun `identifies labs in allowlisted buildings as priority`() {
        val room = TestFixtures.room(
            name = "A008 - Labor",
            building = "A",
            displayName = "Labor",
        )

        assertTrue(RoomPriorityPolicy.isPriority(room))
    }

    @Test
    fun `identifies building I rooms as lecture-hall priority`() {
        val room = TestFixtures.room(
            name = "I108",
            building = "I",
            displayName = "I108",
        )

        assertTrue(RoomPriorityPolicy.isPriority(room))
    }

    @Test
    fun `identifies normal classroom prefixes in main-campus buildings as priority`() {
        val room = TestFixtures.room(
            name = "C102",
            building = "C",
            displayName = "C102",
        )

        assertTrue(RoomPriorityPolicy.isPriority(room))
    }

    @Test
    fun `excludes meeting rooms from the priority bucket`() {
        val room = TestFixtures.room(
            name = "A215 - Besprechungsraum",
            building = "A",
            displayName = "Besprechungsraum",
        )

        assertFalse(RoomPriorityPolicy.isPriority(room))
    }

    @Test
    fun `keeps non-main-campus rooms in the lower bucket`() {
        val room = TestFixtures.room(
            name = "LA 27-0.01 Labor",
            building = "LA",
            displayName = "Labor",
        )

        assertFalse(RoomPriorityPolicy.isPriority(room))
    }
}
