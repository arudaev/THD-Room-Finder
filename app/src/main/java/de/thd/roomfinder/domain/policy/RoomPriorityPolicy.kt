package de.thd.roomfinder.domain.policy

import de.thd.roomfinder.domain.model.Room
import java.util.Locale

internal object RoomPriorityPolicy {

    private val mainCampusBuildings = setOf("A", "B", "C", "D", "E", "I", "ITC", "J")
    private val excludedMarkers = listOf(
        "besprechungsraum",
        "vorplatz",
        "turnhalle",
        "stadthalle",
        "fernsehstudio",
        "glashaus",
        "coworking",
        "co-working",
    )

    fun isPriority(room: Room): Boolean {
        if (room.building !in mainCampusBuildings) return false

        val normalizedText = room.searchableText()
        if (excludedMarkers.any(normalizedText::contains)) return false

        return isLab(normalizedText) || isLectureHall(room, normalizedText) || isClassroomLike(room)
    }

    private fun isLab(normalizedText: String): Boolean =
        normalizedText.contains("labor") || normalizedText.contains("lab")

    private fun isLectureHall(room: Room, normalizedText: String): Boolean =
        room.building == "I" ||
            containsWord(normalizedText, "hs") ||
            normalizedText.contains("hoersaal")

    private fun isClassroomLike(room: Room): Boolean {
        val prefix = room.name.substringBefore(" - ").trim()
        if (!prefix.startsWith(room.building, ignoreCase = true)) return false
        return prefix.any(Char::isDigit)
    }

    private fun Room.searchableText(): String =
        listOf(name, displayName, building, facilities.joinToString(" "))
            .joinToString(" ")
            .normalizeForMatching()

    private fun String.normalizeForMatching(): String =
        lowercase(Locale.ROOT)
            .replace("ä", "ae")
            .replace("ö", "oe")
            .replace("ü", "ue")
            .replace("ß", "ss")

    private fun containsWord(text: String, word: String): Boolean =
        Regex("""(^|\W)${Regex.escape(word)}($|\W)""").containsMatchIn(text)
}
