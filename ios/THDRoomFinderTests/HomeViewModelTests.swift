import XCTest
@testable import THDRoomFinder

@MainActor
final class HomeViewModelTests: XCTestCase {

    func testInitialLoadPopulatesRoomCounts() async {
        let mock = MockHomeRepository(rooms: makeRooms(count: 8), freeCount: 5)
        let viewModel = HomeViewModel(repository: mock)
        await viewModel.loadData()

        XCTAssertFalse(viewModel.state.isLoading)
        XCTAssertNil(viewModel.state.errorMessage)
        XCTAssertEqual(viewModel.state.summary.totalRoomCount, 8)
        XCTAssertEqual(viewModel.state.summary.freeRoomCount, 5)
    }

    func testLoadDataSetsErrorMessageOnFailure() async {
        let mock = MockHomeRepository(error: URLError(.notConnectedToInternet))
        let viewModel = HomeViewModel(repository: mock)
        await viewModel.loadData()

        XCTAssertFalse(viewModel.state.isLoading)
        XCTAssertNotNil(viewModel.state.errorMessage)
    }

    func testLoadDataSetsIsLoadingFalseOnSuccess() async {
        let mock = MockHomeRepository(rooms: [], freeCount: 0)
        let viewModel = HomeViewModel(repository: mock)
        await viewModel.loadData()

        XCTAssertFalse(viewModel.state.isLoading)
    }

    func testLoadDataSetsIsLoadingFalseOnFailure() async {
        let mock = MockHomeRepository(error: URLError(.badServerResponse))
        let viewModel = HomeViewModel(repository: mock)
        await viewModel.loadData()

        XCTAssertFalse(viewModel.state.isLoading)
    }

    func testFreeRoomCountIsZeroWhenAllRoomsOccupied() async {
        let mock = MockHomeRepository(rooms: makeRooms(count: 3), freeCount: 0)
        let viewModel = HomeViewModel(repository: mock)
        await viewModel.loadData()

        XCTAssertEqual(viewModel.state.summary.freeRoomCount, 0)
        XCTAssertEqual(viewModel.state.summary.totalRoomCount, 3)
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private func makeRooms(count: Int) -> [Room] {
        (0..<count).map { i in
            Room(id: i, ident: "R\(i)", name: "Room \(i)",
                 building: "A", floor: nil, displayName: "Room \(i)",
                 seatsRegular: 30, seatsExam: 20, facilities: [],
                 bookable: true, inChargeName: nil, inChargeEmail: nil, untisLongname: nil)
        }
    }
}

// ── Mock ─────────────────────────────────────────────────────────────────────

private final class MockHomeRepository: RoomRepositoryProviding {
    private let rooms: [Room]
    private let freeCount: Int
    private let error: Error?

    init(rooms: [Room] = [], freeCount: Int = 0, error: Error? = nil) {
        self.rooms = rooms
        self.freeCount = freeCount
        self.error = error
    }

    func allRooms() async throws -> [Room] {
        if let error { throw error }
        return rooms
    }

    func room(id: Int) async throws -> Room {
        guard let r = rooms.first(where: { $0.id == id }) else {
            throw RoomRepository.RepositoryError.roomNotFound(id)
        }
        return r
    }

    func scheduledEvents(at date: Date) async throws -> [ScheduledEvent] { [] }

    func freeRooms(at date: Date) async throws -> [FreeRoom] {
        if let error { throw error }
        return rooms.prefix(freeCount).map { FreeRoom(room: $0, freeUntil: nil) }
    }

    func roomSchedule(for roomIdent: String, at date: Date) async throws -> [ScheduledEvent] { [] }

    func cachedRoomsForShortcuts() async -> [Room] { rooms }
}
