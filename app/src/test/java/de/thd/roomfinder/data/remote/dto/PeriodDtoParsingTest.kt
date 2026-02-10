package de.thd.roomfinder.data.remote.dto

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PeriodDtoParsingTest {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    @Test
    fun `deserializes complete period JSON`() {
        val jsonString = """
            {
                "id": 100,
                "eventId": null,
                "startDateTime": "2025-01-15 10:00",
                "room_ident": {"I112": "I 112"},
                "room_names": ["I 112"],
                "duration": 90,
                "eventTypeDescription": "Vorlesung",
                "titleText": "Mathematik I",
                "color": "#FF0000",
                "priority": 1
            }
        """.trimIndent()

        val dto = json.decodeFromString<PeriodDto>(jsonString)

        assertEquals(100, dto.id)
        assertNull(dto.eventId)
        assertEquals("2025-01-15 10:00", dto.startDateTime)
        assertEquals(mapOf("I112" to "I 112"), dto.roomIdent)
        assertEquals(listOf("I 112"), dto.roomNames)
        assertEquals(90, dto.duration)
        assertEquals("Vorlesung", dto.eventTypeDescription)
        assertEquals("Mathematik I", dto.titleText)
    }

    @Test
    fun `room_ident deserializes as map with multiple entries`() {
        val jsonString = """
            {
                "id": 1,
                "startDateTime": "2025-01-15 10:00",
                "room_ident": {"I112": "I 112", "C102": "C 102"},
                "duration": 90
            }
        """.trimIndent()

        val dto = json.decodeFromString<PeriodDto>(jsonString)

        assertEquals(2, dto.roomIdent.size)
        assertEquals("I 112", dto.roomIdent["I112"])
        assertEquals("C 102", dto.roomIdent["C102"])
    }

    @Test
    fun `handles empty room_ident map`() {
        val jsonString = """
            {
                "id": 1,
                "startDateTime": "2025-01-15 10:00",
                "room_ident": {},
                "duration": 90
            }
        """.trimIndent()

        val dto = json.decodeFromString<PeriodDto>(jsonString)
        assertTrue(dto.roomIdent.isEmpty())
    }

    @Test
    fun `ignores unknown keys in period`() {
        val jsonString = """
            {
                "id": 1,
                "startDateTime": "2025-01-15 10:00",
                "room_ident": {"I112": "I 112"},
                "duration": 90,
                "brandNewField": "unexpected"
            }
        """.trimIndent()

        val dto = json.decodeFromString<PeriodDto>(jsonString)
        assertEquals(1, dto.id)
    }

    @Test
    fun `handles null optional fields in period`() {
        val jsonString = """
            {
                "id": 1,
                "startDateTime": "2025-01-15 10:00",
                "duration": 90,
                "eventId": null,
                "description": null,
                "organiser": null,
                "participants": null,
                "eventTypeDescription": null,
                "titleText": null
            }
        """.trimIndent()

        val dto = json.decodeFromString<PeriodDto>(jsonString)

        assertNull(dto.eventId)
        assertNull(dto.description)
        assertNull(dto.organiser)
        assertNull(dto.participants)
        assertNull(dto.eventTypeDescription)
        assertNull(dto.titleText)
    }

    @Test
    fun `deserializes list of periods`() {
        val jsonString = """
            [
                {"id": 1, "startDateTime": "2025-01-15 08:00", "room_ident": {"A008": "A 008"}, "duration": 60},
                {"id": 2, "startDateTime": "2025-01-15 10:00", "room_ident": {"I112": "I 112"}, "duration": 90}
            ]
        """.trimIndent()

        val dtos = json.decodeFromString<List<PeriodDto>>(jsonString)
        assertEquals(2, dtos.size)
        assertEquals(60, dtos[0].duration)
        assertEquals(90, dtos[1].duration)
    }
}
