import AppIntents
import Foundation

enum BuildingIntentValue: String, AppEnum, CaseIterable {
    case A
    case B
    case C
    case D
    case E
    case I
    case ITC
    case J

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        "Building"
    }

    static var caseDisplayRepresentations: [BuildingIntentValue: DisplayRepresentation] {
        [
            .A: "A",
            .B: "B",
            .C: "C",
            .D: "D",
            .E: "E",
            .I: "I",
            .ITC: "ITC",
            .J: "J",
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
        DisplayRepresentation(
            title: "\(room.displayName)",
            subtitle: "\(room.building)"
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
        let lhsPriority = RoomPriorityPolicy.isPriority(lhs)
        let rhsPriority = RoomPriorityPolicy.isPriority(rhs)
        if lhsPriority != rhsPriority {
            return lhsPriority && !rhsPriority
        }
        if lhs.building != rhs.building {
            return lhs.building < rhs.building
        }
        return lhs.name < rhs.name
    }
}
