import XCTest
@testable import THDRoomFinder

@MainActor
final class RoomListViewModelTests: XCTestCase {
    func testInitialQueryDefaultsToDeggendorfTeachingRooms() async {
        let mockRepository = MockRoomRepository()
        let formatter = RoomPresentationFormatter.shared
        mockRepository.freeRoomsResult = [
            FreeRoom(
                room: Room(
                    id: 2,
                    ident: "A008",
                    name: "A008 - Labor",
                    building: "A",
                    floor: 0,
                    displayName: "Labor",
                    seatsRegular: 24,
                    seatsExam: 12,
                    facilities: [],
                    bookable: true,
                    inChargeName: nil,
                    inChargeEmail: nil,
                    untisLongname: nil
                ),
                freeUntil: Date().addingTimeInterval(60 * 60)
            ),
            FreeRoom(
                room: Room(
                    id: 1,
                    ident: "A215",
                    name: "A215 - Besprechungsraum",
                    building: "A",
                    floor: 2,
                    displayName: "Besprechungsraum",
                    seatsRegular: 12,
                    seatsExam: 8,
                    facilities: [],
                    bookable: true,
                    inChargeName: nil,
                    inChargeEmail: nil,
                    untisLongname: nil
                ),
                freeUntil: nil
            ),
        ]

        let viewModel = RoomListViewModel(
            repository: mockRepository,
            formatter: formatter,
            initialQuery: RoomListQuery(
                selectedDate: Date(timeIntervalSince1970: 1_736_934_000),
                isCustomTime: true
            )
        )

        await viewModel.loadFreeRooms()

        XCTAssertEqual(viewModel.state.selectedCampusKey, "deggendorf")
        XCTAssertEqual(viewModel.state.visibilityMode, .teachingOnly)
        XCTAssertEqual(viewModel.state.visibleRooms.map(\.presentation.primaryLabel), ["A008"])
    }

    func testApplyQueryUpdatesCampusAndVisibility() async {
        let mockRepository = MockRoomRepository()
        let formatter = RoomPresentationFormatter.shared
        mockRepository.freeRoomsResult = [
            FreeRoom(
                room: Room(
                    id: 3,
                    ident: "ecri106",
                    name: "EC.B 1.06 a (Hoersaal)",
                    building: "EC.B",
                    floor: 1,
                    displayName: "Hoersaal",
                    seatsRegular: 100,
                    seatsExam: 60,
                    facilities: [],
                    bookable: true,
                    inChargeName: nil,
                    inChargeEmail: nil,
                    untisLongname: nil
                ),
                freeUntil: nil
            ),
        ]

        let viewModel = RoomListViewModel(
            repository: mockRepository,
            formatter: formatter,
            initialQuery: RoomListQuery()
        )
        let customDate = Date(timeIntervalSince1970: 1_736_950_200)

        await viewModel.apply(
            query: RoomListQuery(
                selectedDate: customDate,
                selectedCampusKey: "pfarrkirchen_ecri",
                visibilityMode: .showAll,
                isCustomTime: true
            )
        )

        XCTAssertEqual(viewModel.state.selectedDate, customDate)
        XCTAssertEqual(viewModel.state.selectedCampusKey, "pfarrkirchen_ecri")
        XCTAssertEqual(viewModel.state.visibilityMode, .showAll)
        XCTAssertEqual(viewModel.state.visibleRooms.map(\.presentation.primaryLabel), ["EC.B 1.06 a"])
    }
}

private final class MockRoomRepository: RoomRepositoryProviding {
    var roomsResult: [Room] = []
    var freeRoomsResult: [FreeRoom] = []
    var eventsResult: [ScheduledEvent] = []

    func allRooms() async throws -> [Room] {
        roomsResult
    }

    func room(id: Int) async throws -> Room {
        guard let room = roomsResult.first(where: { $0.id == id }) ?? freeRoomsResult.first(where: { $0.room.id == id })?.room else {
            throw RoomRepository.RepositoryError.roomNotFound(id)
        }
        return room
    }

    func scheduledEvents(at date: Date) async throws -> [ScheduledEvent] {
        eventsResult
    }

    func freeRooms(at date: Date) async throws -> [FreeRoom] {
        freeRoomsResult
    }

    func roomSchedule(for roomIdent: String, at date: Date) async throws -> [ScheduledEvent] {
        eventsResult.filter { $0.roomIdent == roomIdent }
    }

    func cachedRoomsForShortcuts() async -> [Room] {
        roomsResult
    }
}
