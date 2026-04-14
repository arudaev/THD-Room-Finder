import AppIntents
import Foundation

enum CampusIntentValue: String, AppEnum, CaseIterable {
    case deggendorf
    case pfarrkirchenECRI = "pfarrkirchen_ecri"
    case cham
    case otherSites = "other_sites"

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        "Campus"
    }

    static var caseDisplayRepresentations: [CampusIntentValue: DisplayRepresentation] {
        [
            .deggendorf: "Deggendorf",
            .pfarrkirchenECRI: "Pfarrkirchen / ECRI",
            .cham: "Cham",
            .otherSites: "Other sites",
        ]
    }
}

struct RoomEntity: AppEntity, Identifiable {
    let room: Room

    var id: String { String(room.id) }

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        "Room"
    }

    static var defaultQuery = RoomEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        let presentation = RoomPresentationFormatter.shared.present(room)
        DisplayRepresentation(
            title: "\(presentation.primaryLabel)",
            subtitle: "\(presentation.secondaryLabel)"
        )
    }
}

struct RoomEntityQuery: EntityQuery {
    func entities(for identifiers: [RoomEntity.ID]) async throws -> [RoomEntity] {
        let rooms = await RoomRepository.shared.cachedRoomsForShortcuts()
        return rooms
            .filter { identifiers.contains(String($0.id)) }
            .sorted(by: sortRooms)
            .map(RoomEntity.init)
    }

    func suggestedEntities() async throws -> [RoomEntity] {
        let rooms = await RoomRepository.shared.cachedRoomsForShortcuts()
        return Array(rooms.sorted(by: sortRooms).prefix(20)).map(RoomEntity.init)
    }

    func defaultResult() async -> RoomEntity? {
        let room = await RoomRepository.shared.cachedRoomsForShortcuts()
            .sorted(by: sortRooms)
            .first
        return room.map(RoomEntity.init)
    }

    private func sortRooms(lhs: Room, rhs: Room) -> Bool {
        let lhsPresentation = RoomPresentationFormatter.shared.present(lhs)
        let rhsPresentation = RoomPresentationFormatter.shared.present(rhs)
        return lhsPresentation.location.sortKey < rhsPresentation.location.sortKey
    }
}
