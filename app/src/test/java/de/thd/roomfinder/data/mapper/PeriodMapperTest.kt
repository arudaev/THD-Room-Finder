package de.thd.roomfinder.data.mapper

import de.thd.roomfinder.data.remote.dto.PeriodDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime

class PeriodMapperTest {

    @Test
    fun `maps single room period to one event`() {
        val dto = periodDto(roomIdent = mapOf("I112" to "I 112"))
        val events = dto.toDomainModels()

        assertEquals(1, events.size)
        assertEquals("I112", events[0].roomIdent)
        assertEquals("I 112", events[0].roomName)
    }

    @Test
    fun `maps multi-room period to multiple events`() {
        val dto = periodDto(
            roomIdent = mapOf(
                "I112" to "I 112",
                "C102" to "C 102",
                "A008" to "A 008",
            ),
        )
        val events = dto.toDomainModels()

        assertEquals(3, events.size)
        val idents = events.map { it.roomIdent }.toSet()
        assertEquals(setOf("I112", "C102", "A008"), idents)
    }

    @Test
    fun `computes endDateTime from start plus duration`() {
        val dto = periodDto(
            startDateTime = "2025-01-15 10:00",
            duration = 90,
        )
        val events = dto.toDomainModels()

        assertEquals(
            LocalDateTime.of(2025, 1, 15, 10, 0),
            events[0].startDateTime,
        )
        assertEquals(
            LocalDateTime.of(2025, 1, 15, 11, 30),
            events[0].endDateTime,
        )
        assertEquals(90, events[0].durationMinutes)
    }

    @Test
    fun `returns empty list for invalid date format`() {
        val dto = periodDto(startDateTime = "invalid-date")
        val events = dto.toDomainModels()

        assertTrue(events.isEmpty())
    }

    @Test
    fun `uses eventTypeDescription for eventType field`() {
        val dto = periodDto(eventTypeDescription = "Vorlesung")
        val events = dto.toDomainModels()

        assertEquals("Vorlesung", events[0].eventType)
    }

    @Test
    fun `uses titleText for title when available`() {
        val dto = periodDto(
            titleText = "Mathematik I",
            eventTypeDescription = "Vorlesung",
        )
        val events = dto.toDomainModels()

        assertEquals("Mathematik I", events[0].title)
    }

    @Test
    fun `falls back to eventTypeDescription when titleText is null`() {
        val dto = periodDto(
            titleText = null,
            eventTypeDescription = "Seminar",
        )
        val events = dto.toDomainModels()

        assertEquals("Seminar", events[0].title)
    }

    @Test
    fun `uses Unknown when both titleText and eventTypeDescription are null`() {
        val dto = periodDto(
            titleText = null,
            eventTypeDescription = null,
        )
        val events = dto.toDomainModels()

        assertEquals("Unknown", events[0].eventType)
        assertEquals("Unknown", events[0].title)
    }

    @Test
    fun `returns empty list when roomIdent map is empty`() {
        val dto = periodDto(roomIdent = emptyMap())
        val events = dto.toDomainModels()

        assertTrue(events.isEmpty())
    }

    @Test
    fun `maps period id to event id`() {
        val dto = periodDto(id = 42)
        val events = dto.toDomainModels()

        assertEquals(42, events[0].id)
    }

    private fun periodDto(
        id: Int = 1,
        startDateTime: String = "2025-01-15 10:00",
        duration: Int = 90,
        roomIdent: Map<String, String> = mapOf("I112" to "I 112"),
        eventTypeDescription: String? = "Vorlesung",
        titleText: String? = "Mathematik I",
    ): PeriodDto = PeriodDto(
        id = id,
        startDateTime = startDateTime,
        duration = duration,
        roomIdent = roomIdent,
        eventTypeDescription = eventTypeDescription,
        titleText = titleText,
    )
}
