package de.thd.roomfinder.domain.presentation

import android.content.Context
import de.thd.roomfinder.domain.model.FreeRoom
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import java.io.File
import java.text.Normalizer
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

enum class RoomVisibilityClass {
    TEACHING_ROOM,
    SECONDARY_VENUE,
    EXCLUDE_DEFAULT,
    UNKNOWN,
    ;

    companion object {
        fun fromRaw(value: String?): RoomVisibilityClass = when (value?.lowercase(Locale.ROOT)) {
            "teaching_room" -> TEACHING_ROOM
            "secondary_venue" -> SECONDARY_VENUE
            "exclude_default" -> EXCLUDE_DEFAULT
            else -> UNKNOWN
        }
    }
}

enum class RoomVisibilityMode(val label: String) {
    TEACHING_ONLY("Teaching rooms"),
    INCLUDE_SECONDARY("Include secondary venues"),
    SHOW_ALL("Show all THabella spaces"),
    ;

    fun includes(visibilityClass: RoomVisibilityClass): Boolean = when (this) {
        TEACHING_ONLY -> visibilityClass == RoomVisibilityClass.TEACHING_ROOM
        INCLUDE_SECONDARY -> visibilityClass == RoomVisibilityClass.TEACHING_ROOM ||
            visibilityClass == RoomVisibilityClass.SECONDARY_VENUE
        SHOW_ALL -> true
    }
}

enum class RoomKind(val label: String, val rawKey: String) {
    LECTURE_HALL("Lecture hall", "lecture_hall"),
    COMPUTER_ROOM("Computer room", "computer_room"),
    LAB("Lab", "lab"),
    SEMINAR_ROOM("Seminar room", "seminar_room"),
    CLASSROOM("Classroom", "classroom"),
    MEETING_ROOM("Meeting room", "meeting_room"),
    FOYER("Foyer", "foyer"),
    CAFETERIA("Cafeteria", "cafeteria"),
    OUTDOOR_AREA("Outdoor area", "outdoor_area"),
    SPORTS_FACILITY("Sports facility", "sports_facility"),
    LIBRARY("Library", "library"),
    EVENT_VENUE("Event venue", "event_venue"),
    WORKSPACE("Workspace", "workspace"),
    UNKNOWN("Room", "unknown"),
    ;

    companion object {
        fun fromRaw(value: String?): RoomKind =
            entries.firstOrNull { it.rawKey == value } ?: UNKNOWN
    }
}

data class NormalizedRoomLocation(
    val campusKey: String,
    val campus: String,
    val siteKey: String,
    val site: String,
    val buildingKey: String?,
    val building: String?,
    val groupKey: String,
    val groupLabel: String,
    val roomCode: String?,
    val roomKind: RoomKind,
    val visibilityClass: RoomVisibilityClass,
    val friendlyLabel: String,
    val sortKey: String,
    val detailPath: String,
)

data class StudentFacingRoomPresentation(
    val room: Room,
    val location: NormalizedRoomLocation,
    val primaryLabel: String,
    val secondaryLabel: String,
    val friendlyRoomKind: String,
    val rawLabel: String,
)

data class PresentedFreeRoom(
    val freeRoom: FreeRoom,
    val presentation: StudentFacingRoomPresentation,
    val availabilityLabel: String,
)

data class RoomFilterOption(
    val key: String?,
    val label: String,
    val count: Int,
)

data class RoomListSection(
    val campusKey: String,
    val campusLabel: String,
    val groupKey: String,
    val groupLabel: String,
    val rooms: List<PresentedFreeRoom>,
)

data class RoomListPresentation(
    val campusFilters: List<RoomFilterOption>,
    val groupFilters: List<RoomFilterOption>,
    val sections: List<RoomListSection>,
    val visibleRooms: List<PresentedFreeRoom>,
)

class RoomPresentationFormatter(
    private val taxonomy: RoomTaxonomy,
) {

    private val campusesByKey = taxonomy.campuses.associateBy { it.key }
    private val sitesByKey = taxonomy.sites.associateBy { it.key }
    private val roomKinds = taxonomy.roomKinds.map { CompiledRoomKind(it) }
    private val visibilityRules = taxonomy.visibilityRules.map { CompiledVisibilityRule(it) }
    private val exceptionRules = taxonomy.exceptionRules.map { CompiledExceptionRule(it) }
    private val roomCodePatterns = taxonomy.roomCodePatterns.map {
        Regex(it, setOf(RegexOption.IGNORE_CASE))
    }
    private val buildingRules = taxonomy.buildings.map { rule ->
        CompiledBuildingRule(
            rule = rule,
            patterns = rule.patterns.map { pattern ->
                Regex(pattern, setOf(RegexOption.IGNORE_CASE))
            },
        )
    }

    fun buildRoomListPresentation(
        freeRooms: List<FreeRoom>,
        selectedCampusKey: String,
        selectedGroupKey: String?,
        visibilityMode: RoomVisibilityMode,
    ): RoomListPresentation {
        val visibleByMode = freeRooms
            .map { present(it) }
            .filter { visibilityMode.includes(it.presentation.location.visibilityClass) }

        val campusFilters = taxonomy.campuses
            .sortedBy { it.sortOrder }
            .map { campus ->
                RoomFilterOption(
                    key = campus.key,
                    label = campus.label,
                    count = visibleByMode.count { it.presentation.location.campusKey == campus.key },
                )
            }

        val roomsForCampus = visibleByMode.filter {
            it.presentation.location.campusKey == selectedCampusKey
        }

        val groupFilters = roomsForCampus
            .groupBy { it.presentation.location.groupKey }
            .values
            .sortedBy { sectionSortKey(it.first().presentation.location) }
            .map { items ->
                RoomFilterOption(
                    key = items.first().presentation.location.groupKey,
                    label = items.first().presentation.location.groupLabel,
                    count = items.size,
                )
            }

        val visibleRooms = if (selectedGroupKey == null) {
            roomsForCampus
        } else {
            roomsForCampus.filter { it.presentation.location.groupKey == selectedGroupKey }
        }

        val sections = visibleRooms
            .groupBy { it.presentation.location.groupKey }
            .values
            .sortedBy { sectionSortKey(it.first().presentation.location) }
            .map { items ->
                RoomListSection(
                    campusKey = items.first().presentation.location.campusKey,
                    campusLabel = items.first().presentation.location.campus,
                    groupKey = items.first().presentation.location.groupKey,
                    groupLabel = items.first().presentation.location.groupLabel,
                    rooms = items.sortedBy { it.presentation.location.sortKey },
                )
            }

        return RoomListPresentation(
            campusFilters = campusFilters,
            groupFilters = groupFilters,
            sections = sections,
            visibleRooms = visibleRooms.sortedBy { it.presentation.location.sortKey },
        )
    }

    fun present(room: Room): StudentFacingRoomPresentation {
        val rawLabel = room.name.trim().ifBlank { room.displayName.ifBlank { "Unknown room" } }
        val normalizedLabel = normalizeForMatching(rawLabel)
        val roomCode = extractRoomCode(rawLabel)
        val exceptionMatch = exceptionRules.firstOrNull { it.regex.containsMatchIn(normalizedLabel) }
        val buildingRule = matchBuildingRule(normalizedLabel, roomCode)
        val campus = resolveCampus(normalizedLabel, buildingRule, exceptionMatch)
        val site = resolveSite(normalizedLabel, buildingRule, campus, exceptionMatch)
        val buildingLabel = resolveBuildingLabel(buildingRule, exceptionMatch, normalizedLabel)
        val roomKind = resolveRoomKind(room, normalizedLabel, roomCode, exceptionMatch)
        val visibilityClass = resolveVisibility(normalizedLabel, roomCode, roomKind, exceptionMatch)
        val groupLabel = buildGroupLabel(site.label, buildingLabel)
        val groupKey = buildGroupKey(site.key, buildingRule?.rule?.key, buildingLabel, site.label)
        val friendlyKind = roomKind.label
        val secondaryLabel = listOf(friendlyKind, groupLabel, campus.label)
            .filter { it.isNotBlank() }
            .distinct()
            .joinToString(" · ")
        val detailPath = listOf(campus.label, site.label, buildingLabel)
            .filterNotNull()
            .filter { it.isNotBlank() }
            .distinct()
            .joinToString(" > ")
        val primaryLabel = roomCode ?: fallbackPrimaryLabel(rawLabel)
        val sectionOrder = sectionSortKey(campus, site, groupLabel)
        val location = NormalizedRoomLocation(
            campusKey = campus.key,
            campus = campus.label,
            siteKey = site.key,
            site = site.label,
            buildingKey = buildingRule?.rule?.key,
            building = buildingLabel,
            groupKey = groupKey,
            groupLabel = groupLabel,
            roomCode = roomCode,
            roomKind = roomKind,
            visibilityClass = visibilityClass,
            friendlyLabel = secondaryLabel,
            sortKey = "$sectionOrder|${primaryLabel.lowercase(Locale.ROOT)}",
            detailPath = detailPath,
        )
        return StudentFacingRoomPresentation(
            room = room,
            location = location,
            primaryLabel = primaryLabel,
            secondaryLabel = secondaryLabel,
            friendlyRoomKind = friendlyKind,
            rawLabel = rawLabel,
        )
    }

    fun present(freeRoom: FreeRoom): PresentedFreeRoom {
        val presentation = present(freeRoom.room)
        val descendingFreeUntilKey = freeRoom.freeUntil?.format(SORT_TIME_FORMATTER)
            ?.toIntOrNull()
            ?.let { 9999 - it }
            ?.toString()
            ?.padStart(4, '0')
            ?: "0000"
        val availabilitySortKey = if (freeRoom.freeUntil == null) {
            "00|9999|${presentation.primaryLabel.lowercase(Locale.ROOT)}"
        } else {
            "01|$descendingFreeUntilKey|${presentation.primaryLabel.lowercase(Locale.ROOT)}"
        }
        return PresentedFreeRoom(
            freeRoom = freeRoom,
            presentation = presentation.copy(
                location = presentation.location.copy(
                    sortKey = "${sectionSortKey(presentation.location)}|$availabilitySortKey",
                ),
            ),
            availabilityLabel = availabilityLabel(freeRoom.freeUntil),
        )
    }

    fun availabilityLabel(freeUntil: LocalDateTime?): String = when (freeUntil) {
        null -> "Free all day"
        else -> "Free until ${freeUntil.format(TIME_FORMATTER)}"
    }

    fun occupiedUntilLabel(occupiedUntil: LocalDateTime?): String = when (occupiedUntil) {
        null -> "Occupied now"
        else -> "Occupied until ${occupiedUntil.format(TIME_FORMATTER)}"
    }

    fun meaningfulTitle(event: ScheduledEvent): String? {
        val normalizedTitle = normalizeForMatching(event.title)
        val normalizedType = normalizeForMatching(event.eventType)
        if (normalizedTitle.isBlank() || normalizedTitle == "unknown" || normalizedTitle == normalizedType) {
            return null
        }
        return event.title.trim()
    }

    companion object {
        private const val ASSET_NAME = "thd-room-taxonomy.json"
        private val json = Json {
            ignoreUnknownKeys = true
        }
        private val TIME_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
        private val SORT_TIME_FORMATTER: DateTimeFormatter = DateTimeFormatter.ofPattern("HHmm")

        fun fromAsset(context: Context): RoomPresentationFormatter {
            val content = context.assets.open(ASSET_NAME).bufferedReader().use { it.readText() }
            return RoomPresentationFormatter(json.decodeFromString(content))
        }

        fun fromRepositoryRoot(
            root: File = File(System.getProperty("user.dir") ?: "."),
        ): RoomPresentationFormatter {
            val taxonomyPath = generateSequence(root) { current ->
                current.parentFile
            }.map { candidate ->
                candidate.resolve("shared").resolve(ASSET_NAME)
            }.firstOrNull { it.exists() }
                ?: throw java.io.FileNotFoundException("Could not locate shared/$ASSET_NAME from ${root.absolutePath}")
            val content = taxonomyPath.readText()
            return RoomPresentationFormatter(json.decodeFromString(content))
        }
    }

    private fun resolveRoomKind(
        room: Room,
        normalizedLabel: String,
        roomCode: String?,
        exceptionMatch: CompiledExceptionRule?,
    ): RoomKind {
        exceptionMatch?.rule?.roomKindKey?.let { return RoomKind.fromRaw(it) }

        val searchableText = normalizeForMatching(
            listOf(
                room.name,
                room.displayName,
                room.untisLongname.orEmpty(),
                room.facilities.joinToString(" "),
            ).joinToString(" "),
        )

        roomKinds.firstOrNull { compiled ->
            compiled.rule.key != RoomKind.UNKNOWN.rawKey &&
                compiled.keywords.any(searchableText::contains)
        }?.let { return RoomKind.fromRaw(it.rule.key) }

        return if (roomCode != null) RoomKind.CLASSROOM else RoomKind.UNKNOWN
    }

    private fun resolveVisibility(
        normalizedLabel: String,
        roomCode: String?,
        roomKind: RoomKind,
        exceptionMatch: CompiledExceptionRule?,
    ): RoomVisibilityClass {
        exceptionMatch?.rule?.visibilityClass?.let { return RoomVisibilityClass.fromRaw(it) }

        visibilityRules.firstOrNull { compiled ->
            compiled.patterns.any { it.containsMatchIn(normalizedLabel) }
        }?.let { return RoomVisibilityClass.fromRaw(it.rule.visibilityClass) }

        return if (roomCode != null || roomKind == RoomKind.CLASSROOM) {
            RoomVisibilityClass.TEACHING_ROOM
        } else {
            RoomVisibilityClass.UNKNOWN
        }
    }

    private fun resolveCampus(
        normalizedLabel: String,
        buildingRule: CompiledBuildingRule?,
        exceptionMatch: CompiledExceptionRule?,
    ): TaxonomyCampus {
        exceptionMatch?.rule?.campusKey?.let { campusesByKey[it] }?.let { return it }
        buildingRule?.rule?.campusKey?.let { campusesByKey[it] }?.let { return it }

        val detectedKey = when {
            normalizedLabel.contains("badstrasse") || normalizedLabel.contains("badstra") -> "cham"
            normalizedLabel.startsWith("ec") -> "pfarrkirchen_ecri"
            normalizedLabel.contains("deggs") || normalizedLabel.contains("degg's") -> "deggendorf"
            normalizedLabel.contains("veilchengasse") -> "deggendorf"
            normalizedLabel.contains("la 25") || normalizedLabel.contains("la 27") ||
                normalizedLabel.contains("dms") || normalizedLabel.contains("gib") ||
                normalizedLabel.contains("tcw") || normalizedLabel.startsWith("am ") -> "deggendorf"
            else -> "other_sites"
        }
        return campusesByKey.getValue(detectedKey)
    }

    private fun resolveSite(
        normalizedLabel: String,
        buildingRule: CompiledBuildingRule?,
        campus: TaxonomyCampus,
        exceptionMatch: CompiledExceptionRule?,
    ): TaxonomySite {
        exceptionMatch?.rule?.siteKey?.let { sitesByKey[it] }?.let { return it }
        buildingRule?.rule?.siteKey?.let { sitesByKey[it] }?.let { return it }

        val detectedKey = when {
            normalizedLabel.contains("deggs") || normalizedLabel.contains("degg's") -> "deggs"
            normalizedLabel.contains("veilchengasse") -> "veilchengasse"
            normalizedLabel.contains("la 25") || normalizedLabel.contains("la 27") ||
                normalizedLabel.contains("dms") || normalizedLabel.contains("gib") ||
                normalizedLabel.contains("tcw") -> "land_au"
            normalizedLabel.startsWith("am ") || normalizedLabel.contains("am stadtpark") -> "am_stadtpark"
            campus.key == "pfarrkirchen_ecri" -> "pfarrkirchen_campus"
            campus.key == "cham" -> "cham_campus"
            campus.key == "deggendorf" -> "deggendorf_main"
            else -> "other_sites_general"
        }
        return sitesByKey.getValue(detectedKey)
    }

    private fun resolveBuildingLabel(
        buildingRule: CompiledBuildingRule?,
        exceptionMatch: CompiledExceptionRule?,
        normalizedLabel: String,
    ): String? {
        exceptionMatch?.let { compiled ->
            compiled.rule.buildingLabel?.let { rawReplacement ->
                val match = compiled.regex.find(normalizedLabel)
                if (match != null) {
                    return rawReplacement.replace("$1", match.groupValues.getOrNull(1).orEmpty())
                        .uppercase(Locale.ROOT)
                        .ifBlank { null }
                }
            }
        }
        return buildingRule?.rule?.label
    }

    private fun matchBuildingRule(
        normalizedLabel: String,
        roomCode: String?,
    ): CompiledBuildingRule? {
        val prioritizedCampus = when {
            normalizedLabel.contains("badstrasse") || normalizedLabel.contains("badstra") -> "cham"
            normalizedLabel.startsWith("ec") -> "pfarrkirchen_ecri"
            else -> null
        }
        val orderedRules = if (prioritizedCampus == null) {
            buildingRules
        } else {
            buildingRules.filter { it.rule.campusKey == prioritizedCampus } +
                buildingRules.filter { it.rule.campusKey != prioritizedCampus }
        }
        val normalizedRoomCode = roomCode?.let(::normalizeForMatching)
        return orderedRules.firstOrNull { compiled ->
            compiled.patterns.any { regex ->
                regex.containsMatchIn(normalizedLabel) ||
                    (normalizedRoomCode != null && regex.containsMatchIn(normalizedRoomCode))
            }
        }
    }

    private fun extractRoomCode(rawLabel: String): String? {
        roomCodePatterns.forEach { regex ->
            val match = regex.find(rawLabel) ?: return@forEach
            return normalizeRoomCode(match.value)
        }
        return null
    }

    private fun normalizeRoomCode(value: String): String = value
        .replace(Regex("\\s+"), " ")
        .trim()

    private fun buildGroupLabel(siteLabel: String, buildingLabel: String?): String = when {
        buildingLabel.isNullOrBlank() -> siteLabel
        siteLabel == "Main campus" -> buildingLabel
        buildingLabel == siteLabel -> siteLabel
        else -> "$siteLabel · $buildingLabel"
    }

    private fun buildGroupKey(
        siteKey: String,
        buildingKey: String?,
        buildingLabel: String?,
        siteLabel: String,
    ): String = when {
        buildingKey != null && siteLabel == "Main campus" -> buildingKey
        buildingKey != null -> "$siteKey:$buildingKey"
        buildingLabel != null -> "$siteKey:${buildingLabel.lowercase(Locale.ROOT)}"
        else -> siteKey
    }

    private fun fallbackPrimaryLabel(rawLabel: String): String = rawLabel
        .substringBefore(" (")
        .substringBefore(" =")
        .trim()
        .ifBlank { rawLabel }

    private fun sectionSortKey(location: NormalizedRoomLocation): String {
        val campus = campusesByKey.getValue(location.campusKey)
        val site = sitesByKey.getValue(location.siteKey)
        return sectionSortKey(campus, site, location.groupLabel)
    }

    private fun sectionSortKey(
        campus: TaxonomyCampus,
        site: TaxonomySite,
        groupLabel: String,
    ): String = "%02d|%02d|%s".format(
        Locale.ROOT,
        campus.sortOrder,
        site.sortOrder,
        groupLabel.lowercase(Locale.ROOT),
    )

    private fun normalizeForMatching(value: String): String {
        val transliterated = value
            .replace("\u00c4", "Ae")
            .replace("\u00d6", "Oe")
            .replace("\u00dc", "Ue")
            .replace("\u00e4", "ae")
            .replace("\u00f6", "oe")
            .replace("\u00fc", "ue")
            .replace("\u00df", "ss")
        val decomposed = Normalizer.normalize(transliterated, Normalizer.Form.NFD)
        return decomposed
            .replace(Regex("\\p{M}+"), "")
            .lowercase(Locale.ROOT)
            .trim()
    }

    private data class CompiledBuildingRule(
        val rule: TaxonomyBuilding,
        val patterns: List<Regex>,
    )

    private data class CompiledRoomKind(
        val rule: TaxonomyRoomKind,
    ) {
        val keywords: List<String> = rule.keywords.map { keyword ->
            Normalizer.normalize(keyword, Normalizer.Form.NFD)
                .replace(Regex("\\p{M}+"), "")
                .replace("ß", "ss")
                .lowercase(Locale.ROOT)
        }
    }

    private data class CompiledVisibilityRule(
        val rule: TaxonomyVisibilityRule,
    ) {
        val patterns: List<Regex> = rule.patterns.map { pattern ->
            Regex(pattern, setOf(RegexOption.IGNORE_CASE))
        }
    }

    private data class CompiledExceptionRule(
        val rule: TaxonomyExceptionRule,
    ) {
        val regex: Regex = Regex(rule.pattern, setOf(RegexOption.IGNORE_CASE))
    }
}

@Serializable
data class RoomTaxonomy(
    val version: Int,
    val campuses: List<TaxonomyCampus>,
    val sites: List<TaxonomySite>,
    val buildings: List<TaxonomyBuilding>,
    val roomCodePatterns: List<String>,
    val roomKinds: List<TaxonomyRoomKind>,
    val visibilityRules: List<TaxonomyVisibilityRule>,
    val exceptionRules: List<TaxonomyExceptionRule>,
)

@Serializable
data class TaxonomyCampus(
    val key: String,
    val label: String,
    val sortOrder: Int,
    val aliases: List<String>,
)

@Serializable
data class TaxonomySite(
    val key: String,
    val campusKey: String,
    val label: String,
    val sortOrder: Int,
    val aliases: List<String>,
)

@Serializable
data class TaxonomyBuilding(
    val key: String,
    val campusKey: String,
    val siteKey: String,
    val label: String,
    val patterns: List<String>,
    val aliases: List<String>,
)

@Serializable
data class TaxonomyRoomKind(
    val key: String,
    val label: String,
    val keywords: List<String>,
)

@Serializable
data class TaxonomyVisibilityRule(
    val key: String,
    val visibilityClass: String,
    val patterns: List<String>,
)

@Serializable
data class TaxonomyExceptionRule(
    val pattern: String,
    val buildingLabel: String? = null,
    val roomKindKey: String? = null,
    val visibilityClass: String? = null,
    val campusKey: String? = null,
    val siteKey: String? = null,
)
