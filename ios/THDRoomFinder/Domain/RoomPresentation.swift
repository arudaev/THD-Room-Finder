import Foundation

enum RoomVisibilityClass: String, Codable, Hashable {
    case teachingRoom = "teaching_room"
    case secondaryVenue = "secondary_venue"
    case excludeDefault = "exclude_default"
    case unknown
}

enum RoomVisibilityMode: String, Codable, CaseIterable, Hashable {
    case teachingOnly
    case includeSecondary
    case showAll

    var label: String {
        switch self {
        case .teachingOnly:
            return "Teaching rooms"
        case .includeSecondary:
            return "Include secondary venues"
        case .showAll:
            return "Show all THabella spaces"
        }
    }

    func includes(_ visibilityClass: RoomVisibilityClass) -> Bool {
        switch self {
        case .teachingOnly:
            return visibilityClass == .teachingRoom
        case .includeSecondary:
            return visibilityClass == .teachingRoom || visibilityClass == .secondaryVenue
        case .showAll:
            return true
        }
    }
}

enum RoomKind: String, Codable, Hashable {
    case lectureHall = "lecture_hall"
    case computerRoom = "computer_room"
    case lab = "lab"
    case seminarRoom = "seminar_room"
    case classroom = "classroom"
    case meetingRoom = "meeting_room"
    case foyer = "foyer"
    case cafeteria = "cafeteria"
    case outdoorArea = "outdoor_area"
    case sportsFacility = "sports_facility"
    case library = "library"
    case eventVenue = "event_venue"
    case workspace = "workspace"
    case unknown

    var label: String {
        switch self {
        case .lectureHall:
            return "Lecture hall"
        case .computerRoom:
            return "Computer room"
        case .lab:
            return "Lab"
        case .seminarRoom:
            return "Seminar room"
        case .classroom:
            return "Classroom"
        case .meetingRoom:
            return "Meeting room"
        case .foyer:
            return "Foyer"
        case .cafeteria:
            return "Cafeteria"
        case .outdoorArea:
            return "Outdoor area"
        case .sportsFacility:
            return "Sports facility"
        case .library:
            return "Library"
        case .eventVenue:
            return "Event venue"
        case .workspace:
            return "Workspace"
        case .unknown:
            return "Room"
        }
    }
}

struct NormalizedRoomLocation: Hashable {
    let campusKey: String
    let campus: String
    let siteKey: String
    let site: String
    let buildingKey: String?
    let building: String?
    let groupKey: String
    let groupLabel: String
    let roomCode: String?
    let roomKind: RoomKind
    let visibilityClass: RoomVisibilityClass
    let friendlyLabel: String
    let sortKey: String
    let detailPath: String

    func withSortKey(_ newSortKey: String) -> NormalizedRoomLocation {
        NormalizedRoomLocation(
            campusKey: campusKey, campus: campus,
            siteKey: siteKey, site: site,
            buildingKey: buildingKey, building: building,
            groupKey: groupKey, groupLabel: groupLabel,
            roomCode: roomCode, roomKind: roomKind,
            visibilityClass: visibilityClass, friendlyLabel: friendlyLabel,
            sortKey: newSortKey, detailPath: detailPath
        )
    }
}

struct StudentFacingRoomPresentation: Hashable {
    let room: Room
    let location: NormalizedRoomLocation
    let primaryLabel: String
    let secondaryLabel: String
    let friendlyRoomKind: String
    let rawLabel: String

    func withLocation(_ newLocation: NormalizedRoomLocation) -> StudentFacingRoomPresentation {
        StudentFacingRoomPresentation(
            room: room, location: newLocation,
            primaryLabel: primaryLabel, secondaryLabel: secondaryLabel,
            friendlyRoomKind: friendlyRoomKind, rawLabel: rawLabel
        )
    }
}

struct PresentedFreeRoom: Identifiable, Hashable {
    let freeRoom: FreeRoom
    let presentation: StudentFacingRoomPresentation
    let availabilityLabel: String

    var id: Int { freeRoom.id }
}

struct RoomFilterOption: Hashable {
    let key: String?
    let label: String
    let count: Int
}

struct RoomPresentationSection: Hashable {
    let campusKey: String
    let campusLabel: String
    let groupKey: String
    let groupLabel: String
    let rooms: [PresentedFreeRoom]
}

struct RoomListPresentation: Hashable {
    let campusFilters: [RoomFilterOption]
    let groupFilters: [RoomFilterOption]
    let sections: [RoomPresentationSection]
    let visibleRooms: [PresentedFreeRoom]
}

final class RoomPresentationFormatter {
    static let shared = RoomPresentationFormatter()

    private let taxonomy: RoomTaxonomy
    private let campusesByKey: [String: TaxonomyCampus]
    private let sitesByKey: [String: TaxonomySite]
    private let roomKindRules: [CompiledRoomKind]
    private let visibilityRules: [CompiledVisibilityRule]
    private let exceptionRules: [CompiledExceptionRule]
    private let roomCodePatterns: [NSRegularExpression]
    private let buildingRules: [CompiledBuildingRule]

    convenience init() {
        self.init(taxonomy: RoomPresentationFormatter.loadTaxonomy())
    }

    private init(taxonomy: RoomTaxonomy) {
        self.taxonomy = taxonomy
        self.campusesByKey = Dictionary(uniqueKeysWithValues: taxonomy.campuses.map { ($0.key, $0) })
        self.sitesByKey = Dictionary(uniqueKeysWithValues: taxonomy.sites.map { ($0.key, $0) })
        self.roomKindRules = taxonomy.roomKinds.map(CompiledRoomKind.init)
        self.visibilityRules = taxonomy.visibilityRules.map(CompiledVisibilityRule.init)
        self.exceptionRules = taxonomy.exceptionRules.map(CompiledExceptionRule.init)
        self.roomCodePatterns = taxonomy.roomCodePatterns.compactMap {
            try? NSRegularExpression(pattern: $0, options: [.caseInsensitive])
        }
        self.buildingRules = taxonomy.buildings.map(CompiledBuildingRule.init)
    }

    func buildRoomListPresentation(
        freeRooms: [FreeRoom],
        selectedCampusKey: String,
        selectedGroupKey: String?,
        visibilityMode: RoomVisibilityMode
    ) -> RoomListPresentation {
        let visibleByMode = freeRooms
            .map(present)
            .filter { visibilityMode.includes($0.presentation.location.visibilityClass) }

        let countByCampus = Dictionary(
            visibleByMode.map { ($0.presentation.location.campusKey, 1) },
            uniquingKeysWith: +
        )
        let campusFilters = taxonomy.campuses
            .sorted(by: { $0.sortOrder < $1.sortOrder })
            .map { campus in
                RoomFilterOption(key: campus.key, label: campus.label, count: countByCampus[campus.key] ?? 0)
            }

        let roomsForCampus = visibleByMode.filter { $0.presentation.location.campusKey == selectedCampusKey }
        let groupedForCampus = Dictionary(grouping: roomsForCampus, by: { $0.presentation.location.groupKey })

        let groupFilters = groupedForCampus.values
            .sorted(by: { sectionSortKey(for: $0[0].presentation.location) < sectionSortKey(for: $1[0].presentation.location) })
            .map { items in
                RoomFilterOption(
                    key: items[0].presentation.location.groupKey,
                    label: items[0].presentation.location.groupLabel,
                    count: items.count
                )
            }

        let safeGroupKey = selectedGroupKey.flatMap { key in
            groupFilters.contains(where: { $0.key == key }) ? key : nil
        }

        let visibleRooms = (safeGroupKey == nil
            ? roomsForCampus
            : roomsForCampus.filter { $0.presentation.location.groupKey == safeGroupKey })
            .sorted(by: { $0.presentation.location.sortKey < $1.presentation.location.sortKey })

        let sections = Dictionary(grouping: visibleRooms, by: { $0.presentation.location.groupKey })
            .values
            .sorted(by: { sectionSortKey(for: $0[0].presentation.location) < sectionSortKey(for: $1[0].presentation.location) })
            .map { items in
                RoomPresentationSection(
                    campusKey: items[0].presentation.location.campusKey,
                    campusLabel: items[0].presentation.location.campus,
                    groupKey: items[0].presentation.location.groupKey,
                    groupLabel: items[0].presentation.location.groupLabel,
                    rooms: items
                )
            }

        return RoomListPresentation(
            campusFilters: campusFilters,
            groupFilters: groupFilters,
            sections: sections,
            visibleRooms: visibleRooms
        )
    }

    func present(_ room: Room) -> StudentFacingRoomPresentation {
        let rawLabel = room.name.trimmingCharacters(in: .whitespacesAndNewlines).ifBlank(room.displayName.ifBlank("Unknown room"))
        let normalizedLabel = normalize(rawLabel)
        let roomCode = extractRoomCode(from: rawLabel)
        let exceptionMatch = exceptionRules.first(where: { $0.matches(normalizedLabel) })
        let buildingRule = matchBuildingRule(normalizedLabel: normalizedLabel, roomCode: roomCode)
        let campus = resolveCampus(normalizedLabel: normalizedLabel, buildingRule: buildingRule, exceptionRule: exceptionMatch)
        let site = resolveSite(normalizedLabel: normalizedLabel, buildingRule: buildingRule, campus: campus, exceptionRule: exceptionMatch)
        let buildingLabel = resolveBuildingLabel(buildingRule: buildingRule, exceptionRule: exceptionMatch, normalizedLabel: normalizedLabel)
        let roomKind = resolveRoomKind(room: room, normalizedLabel: normalizedLabel, roomCode: roomCode, exceptionRule: exceptionMatch)
        let visibilityClass = resolveVisibility(normalizedLabel: normalizedLabel, roomCode: roomCode, roomKind: roomKind, exceptionRule: exceptionMatch)
        let groupLabel = buildGroupLabel(siteLabel: site.label, buildingLabel: buildingLabel)
        let groupKey = buildGroupKey(siteKey: site.key, buildingKey: buildingRule?.rule.key, buildingLabel: buildingLabel, siteLabel: site.label)
        let secondaryLabel = [roomKind.label, groupLabel, campus.label]
            .filter { !$0.isEmpty }
            .removingDuplicates()
            .joined(separator: " · ")
        let detailPath = [campus.label, site.label, buildingLabel]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .removingDuplicates()
            .joined(separator: " > ")
        let primaryLabel = roomCode ?? fallbackPrimaryLabel(rawLabel)
        let location = NormalizedRoomLocation(
            campusKey: campus.key,
            campus: campus.label,
            siteKey: site.key,
            site: site.label,
            buildingKey: buildingRule?.rule.key,
            building: buildingLabel,
            groupKey: groupKey,
            groupLabel: groupLabel,
            roomCode: roomCode,
            roomKind: roomKind,
            visibilityClass: visibilityClass,
            friendlyLabel: secondaryLabel,
            sortKey: "\(sectionSortKey(campus: campus, site: site, groupLabel: groupLabel))|\(primaryLabel.lowercased())",
            detailPath: detailPath
        )
        return StudentFacingRoomPresentation(
            room: room,
            location: location,
            primaryLabel: primaryLabel,
            secondaryLabel: secondaryLabel,
            friendlyRoomKind: roomKind.label,
            rawLabel: rawLabel
        )
    }

    func present(_ freeRoom: FreeRoom) -> PresentedFreeRoom {
        let presentation = present(freeRoom.room)
        let descendingFreeUntilKey: String = {
            guard let freeUntil = freeRoom.freeUntil else { return "0000" }
            let value = Int(Self.sortTimeFormatter.string(from: freeUntil)) ?? 0
            return String(format: "%04d", 9999 - value)
        }()
        let availabilitySortKey: String = freeRoom.freeUntil == nil
            ? "00|9999|\(presentation.primaryLabel.lowercased())"
            : "01|\(descendingFreeUntilKey)|\(presentation.primaryLabel.lowercased())"

        let sortKey = "\(sectionSortKey(for: presentation.location))|\(availabilitySortKey)"
        return PresentedFreeRoom(
            freeRoom: freeRoom,
            presentation: presentation.withLocation(presentation.location.withSortKey(sortKey)),
            availabilityLabel: availabilityLabel(freeUntil: freeRoom.freeUntil)
        )
    }

    func availabilityLabel(freeUntil: Date?) -> String {
        guard let freeUntil else { return "Free all day" }
        return "Free until \(freeUntil.formatted(date: .omitted, time: .shortened))"
    }

    func occupiedLabel(until occupiedUntil: Date?) -> String {
        guard let occupiedUntil else { return "Occupied now" }
        return "Occupied until \(occupiedUntil.formatted(date: .omitted, time: .shortened))"
    }

    func meaningfulTitle(for event: ScheduledEvent) -> String? {
        let normalizedTitle = normalize(event.title)
        let normalizedType = normalize(event.eventType)
        if normalizedTitle.isEmpty || normalizedTitle == "unknown" || normalizedTitle == normalizedType {
            return nil
        }
        return event.title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func resolveRoomKind(
        room: Room,
        normalizedLabel: String,
        roomCode: String?,
        exceptionRule: CompiledExceptionRule?
    ) -> RoomKind {
        if let rawKey = exceptionRule?.rule.roomKindKey, let roomKind = RoomKind(rawValue: rawKey) {
            return roomKind
        }

        let searchableText = normalize([
            room.name,
            room.displayName,
            room.untisLongname ?? "",
            room.facilities.joined(separator: " ")
        ].joined(separator: " "))

        if let matchedRule = roomKindRules.first(where: { compiled in
            compiled.rule.key != RoomKind.unknown.rawValue && compiled.keywords.contains(where: searchableText.contains)
        }), let roomKind = RoomKind(rawValue: matchedRule.rule.key) {
            return roomKind
        }

        return roomCode == nil ? .unknown : .classroom
    }

    private func resolveVisibility(
        normalizedLabel: String,
        roomCode: String?,
        roomKind: RoomKind,
        exceptionRule: CompiledExceptionRule?
    ) -> RoomVisibilityClass {
        if let rawValue = exceptionRule?.rule.visibilityClass, let visibility = RoomVisibilityClass(rawValue: rawValue) {
            return visibility
        }

        if let matchedRule = visibilityRules.first(where: { $0.matches(normalizedLabel) }) {
            return RoomVisibilityClass(rawValue: matchedRule.rule.visibilityClass) ?? .unknown
        }

        return (roomCode != nil || roomKind == .classroom) ? .teachingRoom : .unknown
    }

    private func resolveCampus(
        normalizedLabel: String,
        buildingRule: CompiledBuildingRule?,
        exceptionRule: CompiledExceptionRule?
    ) -> TaxonomyCampus {
        if let campusKey = exceptionRule?.rule.campusKey, let campus = campusesByKey[campusKey] {
            return campus
        }
        if let campusKey = buildingRule?.rule.campusKey, let campus = campusesByKey[campusKey] {
            return campus
        }

        let detectedKey: String
        if normalizedLabel.contains("badstrasse") || normalizedLabel.contains("badstra") {
            detectedKey = "cham"
        } else if normalizedLabel.hasPrefix("ec") {
            detectedKey = "pfarrkirchen_ecri"
        } else if normalizedLabel.contains("deggs") || normalizedLabel.contains("degg's") ||
                    normalizedLabel.contains("veilchengasse") || normalizedLabel.contains("la 25") ||
                    normalizedLabel.contains("la 27") || normalizedLabel.contains("dms") ||
                    normalizedLabel.contains("gib") || normalizedLabel.contains("tcw") ||
                    normalizedLabel.hasPrefix("am ") {
            detectedKey = "deggendorf"
        } else {
            detectedKey = "other_sites"
        }

        return campusesByKey[detectedKey] ?? taxonomy.campuses[0]
    }

    private func resolveSite(
        normalizedLabel: String,
        buildingRule: CompiledBuildingRule?,
        campus: TaxonomyCampus,
        exceptionRule: CompiledExceptionRule?
    ) -> TaxonomySite {
        if let siteKey = exceptionRule?.rule.siteKey, let site = sitesByKey[siteKey] {
            return site
        }
        if let siteKey = buildingRule?.rule.siteKey, let site = sitesByKey[siteKey] {
            return site
        }

        let detectedKey: String
        if normalizedLabel.contains("deggs") || normalizedLabel.contains("degg's") {
            detectedKey = "deggs"
        } else if normalizedLabel.contains("veilchengasse") {
            detectedKey = "veilchengasse"
        } else if normalizedLabel.contains("la 25") || normalizedLabel.contains("la 27") ||
                    normalizedLabel.contains("dms") || normalizedLabel.contains("gib") ||
                    normalizedLabel.contains("tcw") {
            detectedKey = "land_au"
        } else if normalizedLabel.hasPrefix("am ") || normalizedLabel.contains("am stadtpark") {
            detectedKey = "am_stadtpark"
        } else if campus.key == "pfarrkirchen_ecri" {
            detectedKey = "pfarrkirchen_campus"
        } else if campus.key == "cham" {
            detectedKey = "cham_campus"
        } else if campus.key == "deggendorf" {
            detectedKey = "deggendorf_main"
        } else {
            detectedKey = "other_sites_general"
        }

        return sitesByKey[detectedKey] ?? taxonomy.sites[0]
    }

    private func resolveBuildingLabel(
        buildingRule: CompiledBuildingRule?,
        exceptionRule: CompiledExceptionRule?,
        normalizedLabel: String
    ) -> String? {
        if let exceptionRule, let buildingLabel = exceptionRule.rule.buildingLabel {
            return exceptionRule.applyingReplacement(buildingLabel, to: normalizedLabel)?.uppercased()
        }
        return buildingRule?.rule.label
    }

    private func matchBuildingRule(normalizedLabel: String, roomCode: String?) -> CompiledBuildingRule? {
        let prioritizedCampus: String?
        if normalizedLabel.contains("badstrasse") || normalizedLabel.contains("badstra") {
            prioritizedCampus = "cham"
        } else if normalizedLabel.hasPrefix("ec") {
            prioritizedCampus = "pfarrkirchen_ecri"
        } else {
            prioritizedCampus = nil
        }

        let orderedRules: [CompiledBuildingRule]
        if let prioritizedCampus {
            orderedRules = buildingRules.filter { $0.rule.campusKey == prioritizedCampus } +
                buildingRules.filter { $0.rule.campusKey != prioritizedCampus }
        } else {
            orderedRules = buildingRules
        }

        let normalizedRoomCode = roomCode.map(normalize)
        return orderedRules.first { rule in
            rule.matches(normalizedLabel) || (normalizedRoomCode.map(rule.matches) ?? false)
        }
    }

    private func extractRoomCode(from rawLabel: String) -> String? {
        for regex in roomCodePatterns {
            let range = NSRange(rawLabel.startIndex..<rawLabel.endIndex, in: rawLabel)
            guard let match = regex.firstMatch(in: rawLabel, options: [], range: range),
                  let matchRange = Range(match.range, in: rawLabel)
            else { continue }
            return rawLabel[matchRange].replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return nil
    }

    private func buildGroupLabel(siteLabel: String, buildingLabel: String?) -> String {
        guard let buildingLabel, !buildingLabel.isEmpty else { return siteLabel }
        if siteLabel == "Main campus" || buildingLabel == siteLabel {
            return buildingLabel
        }
        return "\(siteLabel) · \(buildingLabel)"
    }

    private func buildGroupKey(siteKey: String, buildingKey: String?, buildingLabel: String?, siteLabel: String) -> String {
        if let buildingKey, siteLabel == "Main campus" {
            return buildingKey
        }
        if let buildingKey {
            return "\(siteKey):\(buildingKey)"
        }
        if let buildingLabel {
            return "\(siteKey):\(buildingLabel.lowercased())"
        }
        return siteKey
    }

    private func fallbackPrimaryLabel(_ rawLabel: String) -> String {
        let trimmed = rawLabel
            .components(separatedBy: " (").first?
            .components(separatedBy: " =").first?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed?.isEmpty == false ? trimmed! : rawLabel
    }

    private func sectionSortKey(for location: NormalizedRoomLocation) -> String {
        let campus = campusesByKey[location.campusKey] ?? taxonomy.campuses[0]
        let site = sitesByKey[location.siteKey] ?? taxonomy.sites[0]
        return sectionSortKey(campus: campus, site: site, groupLabel: location.groupLabel)
    }

    private func sectionSortKey(campus: TaxonomyCampus, site: TaxonomySite, groupLabel: String) -> String {
        String(format: "%02d|%02d|%@", campus.sortOrder, site.sortOrder, groupLabel.lowercased())
    }

    private func normalize(_ value: String) -> String {
        value
            .replacingOccurrences(of: "\u{00C4}", with: "Ae")
            .replacingOccurrences(of: "\u{00D6}", with: "Oe")
            .replacingOccurrences(of: "\u{00DC}", with: "Ue")
            .replacingOccurrences(of: "\u{00E4}", with: "ae")
            .replacingOccurrences(of: "\u{00F6}", with: "oe")
            .replacingOccurrences(of: "\u{00FC}", with: "ue")
            .replacingOccurrences(of: "\u{00DF}", with: "ss")
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func loadTaxonomy() -> RoomTaxonomy {
        let decoder = JSONDecoder()

        if let bundledURL = Bundle.main.url(forResource: "thd-room-taxonomy", withExtension: "json"),
           let data = try? Data(contentsOf: bundledURL),
           let taxonomy = try? decoder.decode(RoomTaxonomy.self, from: data) {
            return taxonomy
        }

        let fileManager = FileManager.default
        var searchURL = URL(fileURLWithPath: fileManager.currentDirectoryPath, isDirectory: true)
        for _ in 0..<6 {
            let candidate = searchURL.appendingPathComponent("shared/thd-room-taxonomy.json")
            if let data = try? Data(contentsOf: candidate),
               let taxonomy = try? decoder.decode(RoomTaxonomy.self, from: data) {
                return taxonomy
            }
            searchURL.deleteLastPathComponent()
        }

        fatalError("Could not load shared/thd-room-taxonomy.json")
    }

    private static let sortTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HHmm"
        return formatter
    }()
}

private extension String {
    func ifBlank(_ fallback: String) -> String {
        trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? fallback : self
    }
}

private extension Array where Element: Hashable {
    func removingDuplicates() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}

private struct CompiledBuildingRule {
    let rule: TaxonomyBuilding
    let regexes: [NSRegularExpression]

    init(rule: TaxonomyBuilding) {
        self.rule = rule
        self.regexes = rule.patterns.compactMap {
            try? NSRegularExpression(pattern: $0, options: [.caseInsensitive])
        }
    }

    func matches(_ value: String) -> Bool {
        regexes.contains { regex in
            let range = NSRange(value.startIndex..<value.endIndex, in: value)
            return regex.firstMatch(in: value, options: [], range: range) != nil
        }
    }
}

private struct CompiledRoomKind {
    let rule: TaxonomyRoomKind
    let keywords: [String]

    init(rule: TaxonomyRoomKind) {
        self.rule = rule
        self.keywords = rule.keywords.map {
            $0.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "en_US_POSIX"))
                .replacingOccurrences(of: "ß", with: "ss")
                .lowercased()
        }
    }
}

private struct CompiledVisibilityRule {
    let rule: TaxonomyVisibilityRule
    let regexes: [NSRegularExpression]

    init(rule: TaxonomyVisibilityRule) {
        self.rule = rule
        self.regexes = rule.patterns.compactMap {
            try? NSRegularExpression(pattern: $0, options: [.caseInsensitive])
        }
    }

    func matches(_ value: String) -> Bool {
        regexes.contains { regex in
            let range = NSRange(value.startIndex..<value.endIndex, in: value)
            return regex.firstMatch(in: value, options: [], range: range) != nil
        }
    }
}

private struct CompiledExceptionRule {
    let rule: TaxonomyExceptionRule
    let regex: NSRegularExpression?

    init(rule: TaxonomyExceptionRule) {
        self.rule = rule
        self.regex = try? NSRegularExpression(pattern: rule.pattern, options: [.caseInsensitive])
    }

    func matches(_ value: String) -> Bool {
        guard let regex else { return false }
        let range = NSRange(value.startIndex..<value.endIndex, in: value)
        return regex.firstMatch(in: value, options: [], range: range) != nil
    }

    func applyingReplacement(_ replacement: String, to value: String) -> String? {
        guard let regex else { return nil }
        let range = NSRange(value.startIndex..<value.endIndex, in: value)
        guard regex.firstMatch(in: value, options: [], range: range) != nil else { return nil }
        return regex.stringByReplacingMatches(in: value, options: [], range: range, withTemplate: replacement)
    }
}

private struct RoomTaxonomy: Decodable {
    let version: Int
    let campuses: [TaxonomyCampus]
    let sites: [TaxonomySite]
    let buildings: [TaxonomyBuilding]
    let roomCodePatterns: [String]
    let roomKinds: [TaxonomyRoomKind]
    let visibilityRules: [TaxonomyVisibilityRule]
    let exceptionRules: [TaxonomyExceptionRule]
}

private struct TaxonomyCampus: Decodable {
    let key: String
    let label: String
    let sortOrder: Int
    let aliases: [String]
}

private struct TaxonomySite: Decodable {
    let key: String
    let campusKey: String
    let label: String
    let sortOrder: Int
    let aliases: [String]
}

private struct TaxonomyBuilding: Decodable {
    let key: String
    let campusKey: String
    let siteKey: String
    let label: String
    let patterns: [String]
    let aliases: [String]
}

private struct TaxonomyRoomKind: Decodable {
    let key: String
    let label: String
    let keywords: [String]
}

private struct TaxonomyVisibilityRule: Decodable {
    let key: String
    let visibilityClass: String
    let patterns: [String]
}

private struct TaxonomyExceptionRule: Decodable {
    let pattern: String
    let buildingLabel: String?
    let roomKindKey: String?
    let visibilityClass: String?
    let campusKey: String?
    let siteKey: String?
}
