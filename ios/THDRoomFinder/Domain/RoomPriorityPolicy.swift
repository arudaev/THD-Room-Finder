import Foundation

enum RoomPriorityPolicy {
    private static let mainCampusBuildings: Set<String> = ["A", "B", "C", "D", "E", "I", "ITC", "J"]
    private static let excludedMarkers = [
        "besprechungsraum",
        "vorplatz",
        "turnhalle",
        "stadthalle",
        "fernsehstudio",
        "glashaus",
        "coworking",
        "co-working",
    ]

    static func isPriority(_ room: Room) -> Bool {
        guard mainCampusBuildings.contains(room.building) else {
            return false
        }

        let normalized = searchableText(for: room)
        guard excludedMarkers.allSatisfy({ !normalized.contains($0) }) else {
            return false
        }

        return isLab(normalized) || isLectureHall(room, normalized) || isClassroomLike(room)
    }

    private static func isLab(_ normalized: String) -> Bool {
        normalized.contains("labor") || normalized.contains("lab")
    }

    private static func isLectureHall(_ room: Room, _ normalized: String) -> Bool {
        room.building == "I" ||
            containsWord("hs", in: normalized) ||
            normalized.contains("hoersaal")
    }

    private static func isClassroomLike(_ room: Room) -> Bool {
        let prefix = room.name
            .components(separatedBy: " - ")
            .first?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? room.name

        guard prefix.uppercased().hasPrefix(room.building.uppercased()) else {
            return false
        }

        return prefix.contains(where: \.isNumber)
    }

    private static func searchableText(for room: Room) -> String {
        [
            room.name,
            room.displayName,
            room.building,
            room.untisLongname ?? "",
            room.facilities.joined(separator: " "),
        ]
        .joined(separator: " ")
        .normalizeForMatching()
    }

    private static func containsWord(_ word: String, in text: String) -> Bool {
        text
            .split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .contains { $0 == Substring(word) }
    }
}

private extension String {
    func normalizeForMatching() -> String {
        lowercased()
            .replacingOccurrences(of: "ä", with: "ae")
            .replacingOccurrences(of: "ö", with: "oe")
            .replacingOccurrences(of: "ü", with: "ue")
            .replacingOccurrences(of: "ß", with: "ss")
    }
}

