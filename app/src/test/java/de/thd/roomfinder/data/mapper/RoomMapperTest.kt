package de.thd.roomfinder.data.mapper

import de.thd.roomfinder.data.remote.dto.InChargeDto
import de.thd.roomfinder.data.remote.dto.RoomDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoomMapperTest {

    @Test
    fun `maps room with standard name format`() {
        val dto = roomDto(name = "I112 - Seminar Room")
        val result = dto.toDomainModel()

        assertEquals("I", result.building)
        assertEquals(1, result.floor)
        assertEquals("Seminar Room", result.displayName)
    }

    @Test
    fun `parses multi-letter building code`() {
        val dto = roomDto(name = "ITC 2: HS 2")
        val result = dto.toDomainModel()

        assertEquals("ITC", result.building)
    }

    @Test
    fun `parses floor from first digit in room code`() {
        val dtoFloor0 = roomDto(name = "A008 - Labor")
        assertEquals(0, dtoFloor0.toDomainModel().floor)

        val dtoFloor1 = roomDto(name = "C102 - Vorlesungsraum")
        assertEquals(1, dtoFloor1.toDomainModel().floor)

        val dtoFloor3 = roomDto(name = "B301")
        assertEquals(3, dtoFloor3.toDomainModel().floor)
    }

    @Test
    fun `returns null floor when no digits in name`() {
        val dto = roomDto(name = "Aula")
        assertNull(dto.toDomainModel().floor)
    }

    @Test
    fun `returns full name as display name when no separator`() {
        val dto = roomDto(name = "C102")
        assertEquals("C102", dto.toDomainModel().displayName)
    }

    @Test
    fun `handles null seats as zero`() {
        val dto = roomDto(seatsRegular = null, seatsExam = null)
        val result = dto.toDomainModel()

        assertEquals(0, result.seatsRegular)
        assertEquals(0, result.seatsExam)
    }

    @Test
    fun `maps non-null seats correctly`() {
        val dto = roomDto(seatsRegular = 50, seatsExam = 30)
        val result = dto.toDomainModel()

        assertEquals(50, result.seatsRegular)
        assertEquals(30, result.seatsExam)
    }

    @Test
    fun `parses comma-separated facilities`() {
        val dto = roomDto(facilities = "Beamer,Whiteboard,PC")
        val result = dto.toDomainModel()

        assertEquals(listOf("Beamer", "Whiteboard", "PC"), result.facilities)
    }

    @Test
    fun `trims whitespace from facility names`() {
        val dto = roomDto(facilities = " Beamer , Whiteboard ")
        val result = dto.toDomainModel()

        assertEquals(listOf("Beamer", "Whiteboard"), result.facilities)
    }

    @Test
    fun `handles null facilities as empty list`() {
        val dto = roomDto(facilities = null)
        assertEquals(emptyList<String>(), dto.toDomainModel().facilities)
    }

    @Test
    fun `handles blank facilities as empty list`() {
        val dto = roomDto(facilities = "  ")
        assertEquals(emptyList<String>(), dto.toDomainModel().facilities)
    }

    @Test
    fun `maps inCharge name from firstname and lastname`() {
        val dto = roomDto(
            inCharge = InChargeDto(
                firstname = "Max",
                lastname = "Mueller",
                email = "max@th-deg.de",
            ),
        )
        val result = dto.toDomainModel()

        assertEquals("Max Mueller", result.inChargeName)
        assertEquals("max@th-deg.de", result.inChargeEmail)
    }

    @Test
    fun `handles null inCharge`() {
        val dto = roomDto(inCharge = null)
        val result = dto.toDomainModel()

        assertNull(result.inChargeName)
        assertNull(result.inChargeEmail)
    }

    @Test
    fun `handles inCharge with blank names`() {
        val dto = roomDto(
            inCharge = InChargeDto(firstname = null, lastname = null, email = null),
        )
        val result = dto.toDomainModel()

        assertNull(result.inChargeName)
        assertNull(result.inChargeEmail)
    }

    @Test
    fun `handles null bookable as false`() {
        val dto = roomDto(bookable = null)
        assertFalse(dto.toDomainModel().bookable)
    }

    @Test
    fun `maps bookable true correctly`() {
        val dto = roomDto(bookable = true)
        assertTrue(dto.toDomainModel().bookable)
    }

    @Test
    fun `maps id and ident correctly`() {
        val dto = roomDto(id = 42, ident = "A008")
        val result = dto.toDomainModel()

        assertEquals(42, result.id)
        assertEquals("A008", result.ident)
    }

    private fun roomDto(
        id: Int = 1,
        ident: String = "I112",
        name: String = "I112 - Seminar Room",
        seatsRegular: Int? = 30,
        seatsExam: Int? = 20,
        facilities: String? = "Beamer",
        bookable: Boolean? = true,
        inCharge: InChargeDto? = null,
    ): RoomDto = RoomDto(
        id = id,
        ident = ident,
        name = name,
        seatsRegular = seatsRegular,
        seatsExam = seatsExam,
        facilities = facilities,
        bookable = bookable,
        inCharge = inCharge,
    )
}
