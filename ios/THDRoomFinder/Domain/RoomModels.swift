import Foundation

struct Room: Identifiable, Codable, Hashable {
    let id: Int
    let ident: String
    let name: String
    let building: String
    let floor: Int?
    let displayName: String
    let seatsRegular: Int
    let seatsExam: Int
    let facilities: [String]
    let bookable: Bool
    let inChargeName: String?
    let inChargeEmail: String?
    let untisLongname: String?
}

struct FreeRoom: Identifiable, Hashable {
    let room: Room
    let freeUntil: Date?

    var id: Int { room.id }
}

struct ScheduledEvent: Identifiable, Codable, Hashable {
    let id: Int
    let roomIdent: String
    let roomName: String
    let startDateTime: Date
    let endDateTime: Date
    let durationMinutes: Int
    let eventType: String
    let title: String
}

struct RoomListQuery: Hashable {
    let selectedDate: Date
    let selectedCampusKey: String
    let selectedGroupKey: String?
    let visibilityMode: RoomVisibilityMode
    let isCustomTime: Bool

    init(
        selectedDate: Date = Date(),
        selectedCampusKey: String = "deggendorf",
        selectedGroupKey: String? = nil,
        visibilityMode: RoomVisibilityMode = .teachingOnly,
        isCustomTime: Bool = false
    ) {
        self.selectedDate = selectedDate
        self.selectedCampusKey = selectedCampusKey
        self.selectedGroupKey = selectedGroupKey
        self.visibilityMode = visibilityMode
        self.isCustomTime = isCustomTime
    }
}

struct RoomDetailQuery: Hashable {
    let roomID: Int
    let selectedDate: Date
}

struct HomeSummary: Equatable {
    let freeRoomCount: Int
    let totalRoomCount: Int
    let currentTime: Date
}

