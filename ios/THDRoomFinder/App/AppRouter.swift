import Combine
import Foundation

enum AppRoute: Hashable {
    case roomList(RoomListQuery)
    case roomDetail(RoomDetailQuery)
}

@MainActor
final class AppRouter: ObservableObject {
    @Published var path: [AppRoute] = []

    func showRoomList(query: RoomListQuery = RoomListQuery()) {
        path = [.roomList(query)]
    }

    func showRoomDetail(roomID: Int, selectedDate: Date) {
        let roomListQuery = RoomListQuery(
            selectedDate: selectedDate,
            isCustomTime: true
        )
        path = [
            .roomList(roomListQuery),
            .roomDetail(RoomDetailQuery(roomID: roomID, selectedDate: selectedDate)),
        ]
    }

    func pushRoomDetail(roomID: Int, selectedDate: Date) {
        path.append(.roomDetail(RoomDetailQuery(roomID: roomID, selectedDate: selectedDate)))
    }

    func handle(_ payload: AppIntentRouter.Payload) {
        switch payload {
        case .roomList(let query):
            showRoomList(query: query)
        case .roomDetail(let query):
            showRoomDetail(roomID: query.roomID, selectedDate: query.selectedDate)
        }
    }
}

final class AppIntentRouter: ObservableObject {
    struct RoutedIntent: Identifiable, Equatable {
        let id = UUID()
        let payload: Payload
    }

    enum Payload: Equatable {
        case roomList(RoomListQuery)
        case roomDetail(RoomDetailQuery)
    }

    static let shared = AppIntentRouter()

    @Published private(set) var routedIntent: RoutedIntent?

    private init() {}

    @MainActor
    func routeToRoomList(query: RoomListQuery) {
        routedIntent = RoutedIntent(payload: .roomList(query))
    }

    @MainActor
    func routeToRoomDetail(query: RoomDetailQuery) {
        routedIntent = RoutedIntent(payload: .roomDetail(query))
    }

    @MainActor
    func clear(id: UUID) {
        guard routedIntent?.id == id else { return }
        routedIntent = nil
    }
}

