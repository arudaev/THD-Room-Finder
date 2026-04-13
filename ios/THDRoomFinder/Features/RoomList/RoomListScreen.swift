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
    @State private var isShowingDatePicker = false
    @State private var draftDate: Date

    private let onRoomSelected: (Room, Date) -> Void

    init(
        repository: any RoomRepositoryProviding,
        initialQuery: RoomListQuery,
        onRoomSelected: @escaping (Room, Date) -> Void
    ) {
        _viewModel = StateObject(
            wrappedValue: RoomListViewModel(repository: repository, initialQuery: initialQuery)
        )
        _draftDate = State(initialValue: initialQuery.selectedDate)
        self.onRoomSelected = onRoomSelected
    }

    var body: some View {
        Group {
            if viewModel.state.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let errorMessage = viewModel.state.errorMessage {
                VStack(spacing: 16) {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)

                    Button("Retry") {
                        Task { await viewModel.loadFreeRooms() }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if viewModel.state.isCustomTime {
                            CustomTimeBanner(
                                selectedDate: viewModel.state.selectedDate,
                                onReset: { Task { await viewModel.resetToNow() } }
                            )
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                        }

                        BuildingFilterBar(
                            buildings: viewModel.state.buildings,
                            selectedBuilding: viewModel.state.selectedBuilding,
                            onBuildingSelected: viewModel.selectBuilding
                        )

                        if viewModel.state.filteredRooms.isEmpty {
                            Text(emptyMessage)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.top, 48)
                                .padding(.horizontal, 24)
                        } else {
                            LazyVStack(spacing: 12) {
                                ForEach(viewModel.state.filteredRooms) { freeRoom in
                                    Button {
                                        onRoomSelected(freeRoom.room, viewModel.state.selectedDate)
                                    } label: {
                                        RoomCardView(freeRoom: freeRoom)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 24)
                        }
                    }
                }
            }
        }
        .navigationTitle("Free Rooms")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    draftDate = viewModel.state.selectedDate
                    isShowingDatePicker = true
                } label: {
                    Label("Pick date and time", systemImage: "calendar")
                }
            }
        }
        .sheet(isPresented: $isShowingDatePicker) {
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
                            isShowingDatePicker = false
                        }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Apply") {
                            isShowingDatePicker = false
                            Task { await viewModel.setDate(draftDate) }
                        }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private var emptyMessage: String {
        if let selectedBuilding = viewModel.state.selectedBuilding {
            return "No free rooms in building \(selectedBuilding)"
        }
        if viewModel.state.isCustomTime {
            return "No free rooms at the selected time"
        }
        return "No free rooms right now"
    }
}

private struct CustomTimeBanner: View {
    let selectedDate: Date
    let onReset: () -> Void

    var body: some View {
        HStack {
            Text(
                selectedDate,
                format: .dateTime.weekday(.abbreviated).day().month(.abbreviated).hour().minute()
            )
            .font(.subheadline.weight(.medium))

            Spacer()

            Button("Now", action: onReset)
                .buttonStyle(.bordered)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        )
    }
}
