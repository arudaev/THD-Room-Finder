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
        ZStack {
            RoomFinderScreenBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HomeHeroCard(state: state, onRetry: onRetry)

                    if !state.isLoading, state.errorMessage == nil {
                        HomeActionCard(
                            onRetry: onRetry,
                            onNavigateToRoomList: onNavigateToRoomList
                        )

                        HomeHighlightsCard()
                    }
                }
                .padding(20)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
        }
        .navigationTitle("THD Room Finder")
    }
}

private struct HomeHeroCard: View {
    let state: HomeViewState
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Label("Live availability", systemImage: "sparkles.rectangle.stack")
                .font(.headline)
                .foregroundStyle(.secondary)

            if state.isLoading {
                VStack(alignment: .leading, spacing: 14) {
                    ProgressView()
                    Text("Checking which rooms are open right now.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else if let errorMessage = state.errorMessage {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Room status is temporarily unavailable.")
                        .font(.title3.weight(.semibold))

                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    HomeSecondaryButton(title: "Retry", action: onRetry)
                }
            } else {
                VStack(alignment: .leading, spacing: 14) {
                    Text("\(state.summary.freeRoomCount)")
                        .font(.system(size: 72, weight: .bold, design: .rounded))

                    Text("rooms free right now")
                        .font(.title3.weight(.semibold))

                    Text("Out of \(state.summary.totalRoomCount) rooms currently tracked.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                HomeMetricsRow(summary: state.summary)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 32, tint: .teal.opacity(0.18))
    }
}

private struct HomeMetricsRow: View {
    let summary: HomeSummary

    var body: some View {
        metricRow
    }

    private var metricRow: some View {
        HStack(spacing: 10) {
            HomeMetricPill(
                icon: "clock",
                title: summary.currentTime.formatted(
                    .dateTime.hour(.twoDigits(amPM: .omitted)).minute()
                )
            )

            HomeMetricPill(
                icon: "arrow.clockwise",
                title: "Auto refreshes"
            )
        }
    }
}

private struct HomeMetricPill: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.footnote.weight(.semibold))

            Text(title)
                .font(.footnote.weight(.semibold))
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .roomFinderCapsuleSurface(
            fill: Color.white.opacity(0.10),
            stroke: Color.white.opacity(0.18)
        )
    }
}

private struct HomeActionCard: View {
    let onRetry: () -> Void
    let onNavigateToRoomList: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Start exploring")
                .font(.title3.weight(.semibold))

            Text("Jump into the live room list, filter by building, and drill into room details from there.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                HomeProminentButton(title: "Find a Free Room", action: onNavigateToRoomList)
                HomeSecondaryButton(title: "Refresh Snapshot", action: onRetry)
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 28, tint: .accentColor.opacity(0.16))
    }
}

private struct HomeHighlightsCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Built for quick decisions")
                .font(.title3.weight(.semibold))

            VStack(alignment: .leading, spacing: 14) {
                HomeHighlightRow(
                    icon: "building.2",
                    title: "Building filters stay close",
                    detail: "Jump between buildings without losing the live room list."
                )
                HomeHighlightRow(
                    icon: "calendar.badge.clock",
                    title: "Time-travel when you need it",
                    detail: "Switch from now to a custom date and keep that context all the way to room details."
                )
                HomeHighlightRow(
                    icon: "rectangle.stack.person.crop",
                    title: "Room detail stays focused",
                    detail: "Open a room to see facilities, occupancy, and the rest of the schedule."
                )
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 28, tint: Color.white.opacity(0.12))
    }
}

private struct HomeHighlightRow: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.headline)
                .frame(width: 28, height: 28)
                .foregroundStyle(.teal)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))

                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct HomeProminentButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
    }
}

private struct HomeSecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
    }
}

#Preview("Home Screen") {
    NavigationStack {
        HomeScreen(
            state: HomeViewState(
                isLoading: false,
                summary: HomeSummary(
                    freeRoomCount: 14,
                    totalRoomCount: 58,
                    currentTime: .now
                )
            ),
            onRetry: {},
            onNavigateToRoomList: {}
        )
    }
}
