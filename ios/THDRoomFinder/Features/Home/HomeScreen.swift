import Foundation
import SwiftUI

struct HomeViewState: Equatable {
    var isLoading = true
    var summary = HomeSummary(freeRoomCount: 0, totalRoomCount: 0, currentTime: Date())
    var errorMessage: String?
}

@MainActor
final class HomeViewModel: ObservableObject {
    @Published private(set) var state = HomeViewState()

    private let repository: any RoomRepositoryProviding
    private var refreshTask: Task<Void, Never>?

    init(repository: any RoomRepositoryProviding) {
        self.repository = repository
        Task { await loadData() }
        startAutoRefresh()
    }

    deinit {
        refreshTask?.cancel()
    }

    func loadData() async {
        state.isLoading = true
        state.errorMessage = nil

        let now = Date()

        do {
            let allRooms = try await repository.allRooms()
            let freeRooms = (try? await repository.freeRooms(at: now)) ?? []

            state = HomeViewState(
                isLoading: false,
                summary: HomeSummary(
                    freeRoomCount: freeRooms.count,
                    totalRoomCount: allRooms.count,
                    currentTime: now
                )
            )
        } catch {
            state = HomeViewState(
                isLoading: false,
                summary: HomeSummary(freeRoomCount: 0, totalRoomCount: 0, currentTime: now),
                errorMessage: "Failed to load rooms: \(error.localizedDescription)"
            )
        }
    }

    private func startAutoRefresh() {
        refreshTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5 * 60 * 1_000_000_000)
                guard !Task.isCancelled else { return }
                await refreshSilently()
            }
        }
    }

    private func refreshSilently() async {
        let now = Date()
        guard let allRooms = try? await repository.allRooms() else { return }
        let freeRooms = (try? await repository.freeRooms(at: now)) ?? []

        state = HomeViewState(
            isLoading: false,
            summary: HomeSummary(
                freeRoomCount: freeRooms.count,
                totalRoomCount: allRooms.count,
                currentTime: now
            )
        )
    }
}

struct HomeScene: View {
    @StateObject private var viewModel: HomeViewModel
    private let onNavigateToRoomList: () -> Void

    init(
        repository: any RoomRepositoryProviding,
        onNavigateToRoomList: @escaping () -> Void
    ) {
        _viewModel = StateObject(wrappedValue: HomeViewModel(repository: repository))
        self.onNavigateToRoomList = onNavigateToRoomList
    }

    var body: some View {
        HomeScreen(
            state: viewModel.state,
            onRetry: { Task { await viewModel.loadData() } },
            onNavigateToRoomList: onNavigateToRoomList
        )
    }
}

private struct HomeScreen: View {
    let state: HomeViewState
    let onRetry: () -> Void
    let onNavigateToRoomList: () -> Void

    var body: some View {
        VStack {
            Spacer()

            if state.isLoading {
                ProgressView()
            } else if let errorMessage = state.errorMessage {
                VStack(spacing: 16) {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)

                    Button("Retry", action: onRetry)
                        .buttonStyle(.borderedProminent)
                }
                .padding(.horizontal, 24)
            } else {
                VStack(spacing: 8) {
                    Text("\(state.summary.freeRoomCount)")
                        .font(.system(size: 64, weight: .bold, design: .rounded))

                    Text("rooms available right now")
                        .font(.title3)

                    Text("out of \(state.summary.totalRoomCount) total rooms")
                        .foregroundStyle(.secondary)

                    Text(
                        state.summary.currentTime,
                        format: .dateTime.hour(.twoDigits(amPM: .omitted)).minute()
                    )
                    .foregroundStyle(.secondary)

                    VStack(spacing: 12) {
                        Button("Find a Free Room", action: onNavigateToRoomList)
                            .buttonStyle(.borderedProminent)

                        Button("Refresh", action: onRetry)
                            .buttonStyle(.bordered)
                    }
                    .padding(.top, 20)
                }
            }

            Spacer()
        }
        .padding(24)
        .navigationTitle("THD Room Finder")
    }
}
