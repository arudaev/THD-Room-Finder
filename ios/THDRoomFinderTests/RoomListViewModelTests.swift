import XCTest
@testable import THDRoomFinder

@MainActor
final class RoomListViewModelTests: XCTestCase {
    func testInitialQueryAppliesBuildingFilterAndPreservesOrder() async {
        let mockRepository = MockRoomRepository()
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
            initialQuery: RoomListQuery(
                selectedDate: Date(timeIntervalSince1970: 1_736_934_000),
                selectedBuilding: "A",
                isCustomTime: true
            )
        )

        await viewModel.loadFreeRooms()

        XCTAssertEqual(viewModel.state.selectedBuilding, "A")
        XCTAssertTrue(viewModel.state.isCustomTime)
        XCTAssertEqual(viewModel.state.filteredRooms.map(\.room.ident), ["A008", "A215"])
    }

    func testApplyQueryUpdatesSelectedDateAndBuilding() async {
        let mockRepository = MockRoomRepository()
        mockRepository.freeRoomsResult = [
            FreeRoom(
                room: Room(
                    id: 3,
                    ident: "B001",
                    name: "B001",
                    building: "B",
                    floor: 0,
                    displayName: "B001",
                    seatsRegular: 30,
                    seatsExam: 20,
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
            initialQuery: RoomListQuery()
        )
        let customDate = Date(timeIntervalSince1970: 1_736_950_200)

        await viewModel.apply(
            query: RoomListQuery(
                selectedDate: customDate,
                selectedBuilding: "B",
                isCustomTime: true
            )
        )

        XCTAssertEqual(viewModel.state.selectedDate, customDate)
        XCTAssertEqual(viewModel.state.selectedBuilding, "B")
        XCTAssertEqual(viewModel.state.filteredRooms.map(\.room.ident), ["B001"])
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
