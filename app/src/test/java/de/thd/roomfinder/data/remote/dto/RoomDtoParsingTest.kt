package de.thd.roomfinder.data.remote.dto

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoomDtoParsingTest {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    @Test
    fun `deserializes complete room JSON`() {
        val jsonString = """
            {
                "id": 42,
                "ident": "I112",
                "name": "I112 - Seminar Room",
                "seatsRegular": 50,
                "seatsExam": 30,
                "facilities": "Beamer,Whiteboard",
                "bookable": true,
                "inCharge": {
                    "id": 1,
                    "uid": "mmuel",
                    "firstname": "Max",
                    "lastname": "Mueller",
                    "email": "max@th-deg.de",
                    "phone": "+49 991 123"
                },
                "state": 1,
                "numCollisions": 0
            }
        """.trimIndent()

        val dto = json.decodeFromString<RoomDto>(jsonString)

        assertEquals(42, dto.id)
        assertEquals("I112", dto.ident)
        assertEquals("I112 - Seminar Room", dto.name)
        assertEquals(50, dto.seatsRegular)
        assertEquals(30, dto.seatsExam)
        assertEquals("Beamer,Whiteboard", dto.facilities)
        assertTrue(dto.bookable == true)
        assertEquals("Max", dto.inCharge?.firstname)
        assertEquals("Mueller", dto.inCharge?.lastname)
        assertEquals("max@th-deg.de", dto.inCharge?.email)
    }

    @Test
    fun `deserializes room with minimal fields`() {
        val jsonString = """
            {
                "id": 1,
                "ident": "A008",
                "name": "A008"
            }
        """.trimIndent()

        val dto = json.decodeFromString<RoomDto>(jsonString)

        assertEquals(1, dto.id)
        assertEquals("A008", dto.ident)
        assertEquals("A008", dto.name)
        assertNull(dto.seatsRegular)
        assertNull(dto.seatsExam)
        assertNull(dto.facilities)
        assertNull(dto.bookable)
        assertNull(dto.inCharge)
    }

    @Test
    fun `ignores unknown keys`() {
        val jsonString = """
            {
                "id": 1,
                "ident": "A008",
                "name": "A008",
                "someNewField": "value",
                "anotherField": 123
            }
        """.trimIndent()

        val dto = json.decodeFromString<RoomDto>(jsonString)
        assertEquals(1, dto.id)
    }

    @Test
    fun `handles null optional fields`() {
        val jsonString = """
            {
                "id": 1,
                "ident": "A008",
                "name": "A008",
                "seatsRegular": null,
                "seatsExam": null,
                "facilities": null,
                "bookable": null,
                "inCharge": null
            }
        """.trimIndent()

        val dto = json.decodeFromString<RoomDto>(jsonString)

        assertNull(dto.seatsRegular)
        assertNull(dto.seatsExam)
        assertNull(dto.facilities)
        assertNull(dto.bookable)
        assertNull(dto.inCharge)
    }

    @Test
    fun `deserializes list of rooms`() {
        val jsonString = """
            [
                {"id": 1, "ident": "A008", "name": "A008"},
                {"id": 2, "ident": "I112", "name": "I112 - Seminar"}
            ]
        """.trimIndent()

        val dtos = json.decodeFromString<List<RoomDto>>(jsonString)
        assertEquals(2, dtos.size)
        assertEquals("A008", dtos[0].ident)
        assertEquals("I112", dtos[1].ident)
    }
}
