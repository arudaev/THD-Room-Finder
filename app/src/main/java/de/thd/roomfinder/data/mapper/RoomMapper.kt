package de.thd.roomfinder.data.mapper

import de.thd.roomfinder.data.remote.dto.RoomDto
import de.thd.roomfinder.domain.model.Room

internal fun RoomDto.toDomainModel(): Room {
    val parsedBuilding = parseBuilding(name)
    val parsedFloor = parseFloor(name)
    val parsedDisplayName = parseDisplayName(name)

    return Room(
        id = id,
        ident = ident,
        name = name,
        building = parsedBuilding,
        floor = parsedFloor,
        displayName = parsedDisplayName,
        seatsRegular = seatsRegular ?: 0,
        seatsExam = seatsExam ?: 0,
        facilities = parseFacilities(facilities),
        bookable = bookable ?: false,
        inChargeName = inCharge?.let {
            "${it.firstname.orEmpty()} ${it.lastname.orEmpty()}".trim()
        }?.takeIf { it.isNotBlank() },
        inChargeEmail = inCharge?.email?.takeIf { it.isNotBlank() },
        untisLongname = untisLongname?.takeIf { it.isNotBlank() },
    )
}

/**
 * Extracts building code from room name.
 * Examples: "A008 - Labor" -> "A", "C102" -> "C", "ITC 2: HS 2" -> "ITC"
 */
private fun parseBuilding(name: String): String {
    val roomCode = name.split(" - ").first().trim()
    val firstPart = roomCode.split(" ").first()
    val letters = firstPart.takeWhile { it.isLetter() }
    return letters.ifEmpty { firstPart }
}

/**
 * Extracts floor number from room name.
 * The first digit after the building code represents the floor.
 * Examples: "A008" -> 0, "C102" -> 1
 */
private fun parseFloor(name: String): Int? {
    val roomCode = name.split(" - ").first().trim()
    val numberPart = roomCode.filter { it.isDigit() }
    return numberPart.firstOrNull()?.digitToInt()
}

/**
 * Extracts display name from room name.
 * Examples: "A008 - Labor" -> "Labor", "C102" -> "C102"
 */
private fun parseDisplayName(name: String): String {
    val parts = name.split(" - ", limit = 2)
    return if (parts.size > 1) parts[1].trim() else name.trim()
}

private fun parseFacilities(facilities: String?): List<String> {
    if (facilities.isNullOrBlank()) return emptyList()
    return facilities.split(",").map { it.trim() }.filter { it.isNotBlank() }
}
