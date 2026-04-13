import Foundation
import SwiftUI

struct RoomListViewState: Equatable {
    var isLoading = true
    var freeRooms: [FreeRoom] = []
    var filteredRooms: [FreeRoom] = []
    var buildings: [String] = []
    var selectedBuilding: String?
    var selectedDate = Date()
    var isCustomTime = false
    var errorMessage: String?
}

@MainActor
final class RoomListViewModel: ObservableObject {
    @Published private(set) var state: RoomListViewState

    private let repository: any RoomRepositoryProviding
    private var refreshTask: Task<Void, Never>?

    init(
        repository: any RoomRepositoryProviding,
        initialQuery: RoomListQuery
    ) {
        self.repository = repository
        self.state = RoomListViewState(
            isLoading: true,
            selectedBuilding: initialQuery.selectedBuilding,
            selectedDate: initialQuery.selectedDate,
            isCustomTime: initialQuery.isCustomTime
        )

        Task { await loadFreeRooms() }
        startAutoRefresh()
    }

    deinit {
        refreshTask?.cancel()
    }

    func loadFreeRooms() async {
        state.isLoading = true
        state.errorMessage = nil

        do {
            let freeRooms = try await repository.freeRooms(at: state.selectedDate)
            applyLoadedRooms(freeRooms, selectedDate: state.selectedDate)
        } catch {
            state.isLoading = false
            state.errorMessage = "Failed to load free rooms: \(error.localizedDescription)"
        }
    }

    func apply(query: RoomListQuery) async {
        state.selectedDate = query.selectedDate
        state.selectedBuilding = query.selectedBuilding
        state.isCustomTime = query.isCustomTime
        await loadFreeRooms()
    }

    func selectBuilding(_ building: String?) {
        state.selectedBuilding = building
        state.filteredRooms = filterRooms(state.freeRooms, selectedBuilding: building)
    }

    func setDate(_ date: Date) async {
        state.selectedDate = date
        state.isCustomTime = true
        await loadFreeRooms()
    }

    func resetToNow() async {
        state.selectedDate = Date()
        state.isCustomTime = false
        await loadFreeRooms()
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
        let effectiveDate = state.isCustomTime ? state.selectedDate : Date()
        guard let freeRooms = try? await repository.freeRooms(at: effectiveDate) else { return }
        applyLoadedRooms(freeRooms, selectedDate: effectiveDate)
    }

    private func applyLoadedRooms(_ freeRooms: [FreeRoom], selectedDate: Date) {
        let buildings = Array(Set(freeRooms.map { $0.room.building })).sorted()
        let filteredRooms = filterRooms(freeRooms, selectedBuilding: state.selectedBuilding)

        state.isLoading = false
        state.freeRooms = freeRooms
        state.filteredRooms = filteredRooms
        state.buildings = buildings
        state.selectedDate = selectedDate
    }

    private func filterRooms(_ freeRooms: [FreeRoom], selectedBuilding: String?) -> [FreeRoom] {
        guard let selectedBuilding else {
            return freeRooms
        }
        return freeRooms.filter { $0.room.building == selectedBuilding }
    }
}

struct RoomListScene: View {
    @StateObject private var viewModel: RoomListViewModel
    @State private var datePickerSheet: RoomTimePickerPresentation?

    private let onRoomSelected: (Room, Date) -> Void

    init(
        repository: any RoomRepositoryProviding,
        initialQuery: RoomListQuery,
        onRoomSelected: @escaping (Room, Date) -> Void
    ) {
        _viewModel = StateObject(
            wrappedValue: RoomListViewModel(repository: repository, initialQuery: initialQuery)
        )
        self.onRoomSelected = onRoomSelected
    }

    var body: some View {
        ZStack {
            RoomFinderScreenBackground()
            content
        }
        .navigationTitle("Free Rooms")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    datePickerSheet = RoomTimePickerPresentation(
                        selectedDate: viewModel.state.selectedDate
                    )
                } label: {
                    Label("Pick date and time", systemImage: "calendar.badge.clock")
                }
            }
        }
        .sheet(item: $datePickerSheet) { presentation in
            RoomTimePickerSheet(selectedDate: presentation.selectedDate) { date in
                Task { await viewModel.setDate(date) }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.state.isLoading {
            ProgressView("Loading free rooms...")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let errorMessage = viewModel.state.errorMessage {
            RoomListErrorState(errorMessage: errorMessage) {
                Task { await viewModel.loadFreeRooms() }
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    RoomListSummaryCard(
                        state: viewModel.state,
                        onResetToNow: { Task { await viewModel.resetToNow() } }
                    )

                    BuildingFilterBar(
                        buildings: viewModel.state.buildings,
                        selectedBuilding: viewModel.state.selectedBuilding,
                        onBuildingSelected: viewModel.selectBuilding
                    )

                    if viewModel.state.filteredRooms.isEmpty {
                        RoomListEmptyStateCard(message: emptyMessage)
                    } else {
                        LazyVStack(spacing: 14) {
                            ForEach(viewModel.state.filteredRooms) { freeRoom in
                                Button {
                                    onRoomSelected(freeRoom.room, viewModel.state.selectedDate)
                                } label: {
                                    RoomCardView(freeRoom: freeRoom)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 24)
                    }
                }
                .padding(.top, 20)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
        }
    }

    private var emptyMessage: String {
        if let selectedBuilding = viewModel.state.selectedBuilding {
            return "No free rooms in building \(selectedBuilding) for the selected time."
        }
        if viewModel.state.isCustomTime {
            return "No free rooms at the selected time."
        }
        return "No free rooms are available right now."
    }
}

private struct RoomTimePickerPresentation: Identifiable {
    let id = UUID()
    let selectedDate: Date
}

private struct RoomListSummaryCard: View {
    let state: RoomListViewState
    let onResetToNow: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("\(state.filteredRooms.count)")
                .font(.system(size: 58, weight: .bold, design: .rounded))

            Text(state.isCustomTime ? "rooms free at the selected time" : "rooms free right now")
                .font(.title3.weight(.semibold))

            Text(summaryDescription)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 10) {
                RoomListMetaPill(icon: "clock", title: selectedTimeText)
                RoomListMetaPill(
                    icon: "building.2",
                    title: state.selectedBuilding.map { "Building \($0)" } ?? "All buildings"
                )
            }

            if state.isCustomTime {
                RoomListResetButton(action: onResetToNow)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 30, tint: .teal.opacity(0.16))
        .padding(.horizontal, 20)
    }

    private var summaryDescription: String {
        if state.isCustomTime {
            return "Browsing a scheduled snapshot instead of the live feed."
        }
        return "Live results update against the current time when you refresh."
    }

    private var selectedTimeText: String {
        if state.isCustomTime {
            return state.selectedDate.formatted(
                .dateTime.weekday(.abbreviated).day().month(.abbreviated).hour().minute()
            )
        }
        return "Now"
    }
}

private struct RoomListMetaPill: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.footnote.weight(.semibold))

            Text(title)
                .font(.footnote.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
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

private struct RoomListResetButton: View {
    let action: () -> Void

    var body: some View {
        Button("Back to Now", action: action)
            .buttonStyle(.bordered)
    }
}

private struct RoomListEmptyStateCard: View {
    let message: String

    var body: some View {
        ContentUnavailableView(
            "No Rooms Found",
            systemImage: "magnifyingglass",
            description: Text(message)
        )
        .padding(24)
        .frame(maxWidth: .infinity)
        .roomFinderSurface(cornerRadius: 28, tint: Color.white.opacity(0.12))
        .padding(.horizontal, 20)
    }
}

private struct RoomListErrorState: View {
    let errorMessage: String
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("We couldn't load the room list.")
                .font(.title3.weight(.semibold))

            Text(errorMessage)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button("Retry", action: onRetry)
                .buttonStyle(.borderedProminent)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 30, tint: .red.opacity(0.10))
    }
}

private struct RoomTimePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var draftDate: Date

    let onApply: (Date) -> Void

    init(selectedDate: Date, onApply: @escaping (Date) -> Void) {
        _draftDate = State(initialValue: selectedDate)
        self.onApply = onApply
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker(
                    "Date and Time",
                    selection: $draftDate,
                    displayedComponents: [.date, .hourAndMinute]
                )
            }
            .navigationTitle("Select Time")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Apply") {
                        onApply(draftDate)
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview("Room List") {
    NavigationStack {
        ZStack {
            RoomFinderScreenBackground()

            RoomListSummaryCard(
                state: RoomListViewState(
                    isLoading: false,
                    freeRooms: [],
                    filteredRooms: [],
                    buildings: ["A", "B", "C"],
                    selectedBuilding: "B",
                    selectedDate: .now,
                    isCustomTime: true,
                    errorMessage: nil
                ),
                onResetToNow: {}
            )
            .padding()
        }
    }
}
