import SwiftUI

@main
struct THDRoomFinderApp: App {
    @StateObject private var router = AppRouter()
    @StateObject private var appIntentRouter = AppIntentRouter.shared

    var body: some Scene {
        WindowGroup {
            RootView(router: router, appIntentRouter: appIntentRouter)
        }
    }
}

private struct RootView: View {
    @ObservedObject var router: AppRouter
    @ObservedObject var appIntentRouter: AppIntentRouter

    var body: some View {
        NavigationStack(path: $router.path) {
            HomeScene(
                repository: RoomRepository.shared,
                onNavigateToRoomList: { router.showRoomList() }
            )
            .navigationDestination(for: AppRoute.self) { route in
                switch route {
                case .roomList(let query):
                    RoomListScene(
                        repository: RoomRepository.shared,
                        initialQuery: query,
                        onRoomSelected: { room, selectedDate in
                            router.pushRoomDetail(roomID: room.id, selectedDate: selectedDate)
                        }
                    )
                case .roomDetail(let query):
                    RoomDetailScene(
                        repository: RoomRepository.shared,
                        query: query
                    )
                }
            }
            .onReceive(appIntentRouter.$routedIntent.compactMap { $0 }) { routedIntent in
                router.handle(routedIntent.payload)
                appIntentRouter.clear(id: routedIntent.id)
            }
        }
    }
}
