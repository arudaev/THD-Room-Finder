import Foundation
import SwiftUI

struct RoomListViewState: Equatable {
    var isLoading = true
    var freeRooms: [FreeRoom] = []
    var visibleRooms: [PresentedFreeRoom] = []
    var sections: [RoomPresentationSection] = []
    var campusFilters: [RoomFilterOption] = []
    var groupFilters: [RoomFilterOption] = []
    var selectedCampusKey = "deggendorf"
    var selectedGroupKey: String?
    var visibilityMode: RoomVisibilityMode = .teachingOnly
    var selectedDate = Date()
    var isCustomTime = false
    var errorMessage: String?
}

@MainActor
final class RoomListViewModel: ObservableObject {
    @Published private(set) var state: RoomListViewState

    private let repository: any RoomRepositoryProviding
    private let formatter: RoomPresentationFormatter
    private var refreshTask: Task<Void, Never>?

    init(
        repository: any RoomRepositoryProviding,
        formatter: RoomPresentationFormatter = .shared,
        initialQuery: RoomListQuery
    ) {
        self.repository = repository
        self.formatter = formatter
        self.state = RoomListViewState(
            isLoading: true,
            selectedCampusKey: initialQuery.selectedCampusKey,
            selectedGroupKey: initialQuery.selectedGroupKey,
            visibilityMode: initialQuery.visibilityMode,
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
            state = rebuildPresentation(
                from: state,
                freeRooms: freeRooms,
                selectedCampusKey: state.selectedCampusKey,
                selectedGroupKey: state.selectedGroupKey,
                visibilityMode: state.visibilityMode
            )
            state.isLoading = false
        } catch {
            state.isLoading = false
            state.errorMessage = "Failed to load free rooms: \(error.localizedDescription)"
        }
    }

    func apply(query: RoomListQuery) async {
        state.selectedDate = query.selectedDate
        state.selectedCampusKey = query.selectedCampusKey
        state.selectedGroupKey = query.selectedGroupKey
        state.visibilityMode = query.visibilityMode
        state.isCustomTime = query.isCustomTime
        await loadFreeRooms()
    }

    func selectCampus(_ campusKey: String) {
        state = rebuildPresentation(
            from: state,
            freeRooms: state.freeRooms,
            selectedCampusKey: campusKey,
            selectedGroupKey: nil,
            visibilityMode: state.visibilityMode
        )
    }

    func selectGroup(_ groupKey: String?) {
        state = rebuildPresentation(
            from: state,
            freeRooms: state.freeRooms,
            selectedCampusKey: state.selectedCampusKey,
            selectedGroupKey: groupKey,
            visibilityMode: state.visibilityMode
        )
    }

    func selectVisibilityMode(_ visibilityMode: RoomVisibilityMode) {
        state = rebuildPresentation(
            from: state,
            freeRooms: state.freeRooms,
            selectedCampusKey: state.selectedCampusKey,
            selectedGroupKey: state.selectedGroupKey,
            visibilityMode: visibilityMode
        )
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
        state = rebuildPresentation(
            from: state,
            freeRooms: freeRooms,
            selectedCampusKey: state.selectedCampusKey,
            selectedGroupKey: state.selectedGroupKey,
            visibilityMode: state.visibilityMode
        )
        state.selectedDate = effectiveDate
    }

    private func rebuildPresentation(
        from state: RoomListViewState,
        freeRooms: [FreeRoom],
        selectedCampusKey: String,
        selectedGroupKey: String?,
        visibilityMode: RoomVisibilityMode
    ) -> RoomListViewState {
        let presentation = formatter.buildRoomListPresentation(
            freeRooms: freeRooms,
            selectedCampusKey: selectedCampusKey,
            selectedGroupKey: selectedGroupKey,
            visibilityMode: visibilityMode
        )

        var newState = state
        newState.freeRooms = freeRooms
        newState.visibleRooms = presentation.visibleRooms
        newState.sections = presentation.sections
        newState.campusFilters = presentation.campusFilters
        newState.groupFilters = presentation.groupFilters
        newState.selectedCampusKey = selectedCampusKey
        newState.selectedGroupKey = selectedGroupKey.flatMap { key in
            presentation.groupFilters.contains(where: { $0.key == key }) ? key : nil
        }
        newState.visibilityMode = visibilityMode
        return newState
    }
}

struct RoomListScene: View {
    @StateObject private var viewModel: RoomListViewModel
    @State private var datePickerSheet: RoomTimePickerPresentation?

    private let onRoomSelected: (Room, Date) -> Void

    init(
        repository: any RoomRepositoryProviding,
        formatter: RoomPresentationFormatter = .shared,
        initialQuery: RoomListQuery,
        onRoomSelected: @escaping (Room, Date) -> Void
    ) {
        _viewModel = StateObject(
            wrappedValue: RoomListViewModel(
                repository: repository,
                formatter: formatter,
                initialQuery: initialQuery
            )
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

                    FilterOptionBar(
                        options: viewModel.state.campusFilters,
                        selectedKey: viewModel.state.selectedCampusKey,
                        allLabel: "",
                        showsAllOption: false,
                        onSelectionChanged: { key in
                            if let key {
                                viewModel.selectCampus(key)
                            }
                        }
                    )

                    if !viewModel.state.groupFilters.isEmpty {
                        FilterOptionBar(
                            options: viewModel.state.groupFilters,
                            selectedKey: viewModel.state.selectedGroupKey,
                            allLabel: "All buildings and sites",
                            showsAllOption: true,
                            onSelectionChanged: viewModel.selectGroup
                        )
                    }

                    VisibilityModeBar(
                        selectedMode: viewModel.state.visibilityMode,
                        onModeSelected: viewModel.selectVisibilityMode
                    )

                    if viewModel.state.sections.isEmpty {
                        RoomListEmptyStateCard(message: emptyMessage)
                    } else {
                        LazyVStack(alignment: .leading, spacing: 18) {
                            ForEach(viewModel.state.sections, id: \.groupKey) { section in
                                RoomListSectionView(
                                    section: section,
                                    onRoomSelected: { freeRoom in
                                        onRoomSelected(freeRoom.freeRoom.room, viewModel.state.selectedDate)
                                    }
                                )
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
        let campusLabel = viewModel.state.campusFilters.first(where: { $0.key == viewModel.state.selectedCampusKey })?.label ?? "Deggendorf"
        if let selectedGroupKey = viewModel.state.selectedGroupKey,
           let groupLabel = viewModel.state.groupFilters.first(where: { $0.key == selectedGroupKey })?.label {
            return "No free rooms match \(groupLabel) right now."
        }
        if viewModel.state.isCustomTime {
            return "No free rooms match \(campusLabel) at the selected time."
        }
        return "No free rooms match \(campusLabel) right now."
    }
}

private struct RoomListSectionView: View {
    let section: RoomPresentationSection
    let onRoomSelected: (PresentedFreeRoom) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(section.groupLabel)
                .font(.title3.weight(.semibold))

            Text(section.campusLabel)
                .font(.footnote)
                .foregroundStyle(.secondary)

            ForEach(section.rooms) { freeRoom in
                Button {
                    onRoomSelected(freeRoom)
                } label: {
                    RoomCardView(presentedRoom: freeRoom)
                }
                .buttonStyle(.plain)
            }
        }
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
            Text("\(state.visibleRooms.count)")
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
                    title: selectedCampusLabel
                )
                RoomListMetaPill(
                    icon: "line.3.horizontal.decrease.circle",
                    title: state.visibilityMode.label
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
        return "Deggendorf teaching rooms stay front and center until you switch campus or visibility."
    }

    private var selectedTimeText: String {
        if state.isCustomTime {
            return state.selectedDate.formatted(
                .dateTime.weekday(.abbreviated).day().month(.abbreviated).hour().minute()
            )
        }
        return "Now"
    }

    private var selectedCampusLabel: String {
        state.campusFilters.first(where: { $0.key == state.selectedCampusKey })?.label ?? "Deggendorf"
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

private struct VisibilityModeBar: View {
    let selectedMode: RoomVisibilityMode
    let onModeSelected: (RoomVisibilityMode) -> Void

    var body: some View {
        HStack(spacing: 10) {
            ForEach(RoomVisibilityMode.allCases, id: \.self) { mode in
                SelectionChip(
                    title: mode.label,
                    isSelected: selectedMode == mode,
                    action: { onModeSelected(mode) }
                )
            }
        }
        .padding(.horizontal, 20)
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
