package de.thd.roomfinder.domain.presentation

import de.thd.roomfinder.TestFixtures
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RoomPresentationFormatterTest {

    private lateinit var formatter: RoomPresentationFormatter

    @Before
    fun setUp() {
        formatter = RoomPresentationFormatter.fromRepositoryRoot()
    }

    @Test
    fun `normalizes representative THabella names`() {
        val cases = listOf(
            Triple("A008 - Labor", "A008", RoomVisibilityClass.TEACHING_ROOM),
            Triple("ITC 2+ 1.31 (Labor Cyber Resilience)", "ITC 2+ 1.31", RoomVisibilityClass.TEACHING_ROOM),
            Triple("EC.B 1.06 a (Hörsaal)", "EC.B 1.06 a", RoomVisibilityClass.TEACHING_ROOM),
            Triple("LA 27-2.13 Seminar-/EDV-Raum", "LA 27-2.13", RoomVisibilityClass.TEACHING_ROOM),
            Triple("Deggs 2.06 (HPC Labor)", "Deggs 2.06", RoomVisibilityClass.TEACHING_ROOM),
            Triple("Vorplatz Geb. A", "Vorplatz Geb. A", RoomVisibilityClass.EXCLUDE_DEFAULT),
            Triple("Turnhalle Schulzentrum", "Turnhalle Schulzentrum", RoomVisibilityClass.EXCLUDE_DEFAULT),
            Triple("Kulturraum (nur bis 31.03.25!)", "Kulturraum", RoomVisibilityClass.SECONDARY_VENUE),
            Triple("Konferenzsaal (= 0.02 + 0.03 + 0.04)", "Konferenzsaal", RoomVisibilityClass.SECONDARY_VENUE),
            Triple("--", "--", RoomVisibilityClass.EXCLUDE_DEFAULT),
            Triple("50.2.19", "50.2.19", RoomVisibilityClass.EXCLUDE_DEFAULT),
        )

        cases.forEach { (rawName, expectedPrimary, expectedVisibility) ->
            val presentation = formatter.present(
                TestFixtures.room(
                    name = rawName,
                    displayName = rawName,
                ),
            )

            assertEquals(expectedPrimary, presentation.primaryLabel)
            assertEquals(expectedVisibility, presentation.location.visibilityClass)
        }
    }

    @Test
    fun `derives exception-based building labels from shared taxonomy`() {
        val presentation = formatter.present(
            TestFixtures.room(
                name = "Vorplatz Geb. A",
                displayName = "Vorplatz Geb. A",
            ),
        )

        assertEquals("A", presentation.location.building)
        assertEquals("A", presentation.location.groupLabel)
    }

    @Test
    fun `suppresses duplicate and unknown schedule titles`() {
        assertNull(
            formatter.meaningfulTitle(
                TestFixtures.event(title = "Vorlesung", eventType = "Vorlesung"),
            ),
        )
        assertNull(
            formatter.meaningfulTitle(
                TestFixtures.event(title = "Unknown", eventType = "Vorlesung"),
            ),
        )
        assertEquals(
            "Mathematik I",
            formatter.meaningfulTitle(
                TestFixtures.event(title = "Mathematik I", eventType = "Vorlesung"),
            ),
        )
    }

    @Test
    fun `builds student facing secondary label without raw ident`() {
        val presentation = formatter.present(
                TestFixtures.room(
                    ident = "r000000126",
                    name = "EC.B 1.06 a (Hörsaal)",
                    building = "EC.B",
                    displayName = "Hörsaal",
                ),
            )

        assertEquals("EC.B 1.06 a", presentation.primaryLabel)
        assertTrue(presentation.secondaryLabel.contains("Lecture hall"))
        assertTrue(presentation.secondaryLabel.contains("Pfarrkirchen / ECRI"))
    }
}
