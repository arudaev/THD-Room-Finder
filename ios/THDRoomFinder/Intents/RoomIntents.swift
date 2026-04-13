import AppIntents
import Foundation

struct FindFreeRoomsIntent: AppIntent {
    static let title: LocalizedStringResource = "Find Free Rooms"
    static let description = IntentDescription("Open the app to the prioritized list of free rooms.")
    static let openAppWhenRun = true

    @Parameter(title: "When")
    var dateTime: Date?

    @Parameter(title: "Building")
    var building: BuildingIntentValue?

    func perform() async throws -> some IntentResult {
        let selectedDate = dateTime ?? Date()
        let query = RoomListQuery(
            selectedDate: selectedDate,
            selectedBuilding: building?.rawValue,
            isCustomTime: dateTime != nil
        )

        await MainActor.run {
            AppIntentRouter.shared.routeToRoomList(query: query)
        }
        return .result()
    }
}

struct OpenRoomIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Room"
    static let description = IntentDescription("Open the app to a room detail view.")
    static let openAppWhenRun = true

    @Parameter(title: "Room")
    var room: RoomEntity

    @Parameter(title: "When")
    var dateTime: Date?

    func perform() async throws -> some IntentResult {
        let query = RoomDetailQuery(
            roomID: room.room.id,
            selectedDate: dateTime ?? Date()
        )

        await MainActor.run {
            AppIntentRouter.shared.routeToRoomDetail(query: query)
        }
        return .result()
    }
}
