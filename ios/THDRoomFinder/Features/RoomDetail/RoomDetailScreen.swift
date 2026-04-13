import Foundation
import SwiftUI

struct RoomDetailViewState: Equatable {
    var isLoading = true
    var room: Room?
    var events: [ScheduledEvent] = []
    var isFreeNow = false
    var freeUntil: Date?
    var queryDate = Date()
    var errorMessage: String?
}

@MainActor
final class RoomDetailViewModel: ObservableObject {
    @Published private(set) var state: RoomDetailViewState

    private let repository: any RoomRepositoryProviding
    private var roomID: Int
    private var refreshTask: Task<Void, Never>?

    init(
        repository: any RoomRepositoryProviding,
        query: RoomDetailQuery
    ) {
        self.repository = repository
        self.roomID = query.roomID
        self.state = RoomDetailViewState(
            isLoading: true,
            queryDate: query.selectedDate
        )

        Task { await loadData() }
        startAutoRefresh()
    }

    deinit {
        refreshTask?.cancel()
    }

    func apply(query: RoomDetailQuery) async {
        roomID = query.roomID
        state.queryDate = query.selectedDate
        await loadData()
    }

    func loadData() async {
        state.isLoading = true
        state.errorMessage = nil

        do {
            let room = try await repository.room(id: roomID)
            let events = (try? await repository.roomSchedule(for: room.ident, at: state.queryDate)) ?? []
            let isOccupied = events.contains {
                $0.startDateTime <= state.queryDate && $0.endDateTime > state.queryDate
            }
            let freeUntil = isOccupied ? nil : events
                .filter { $0.startDateTime > state.queryDate }
                .min(by: { $0.startDateTime < $1.startDateTime })?
                .startDateTime

            state = RoomDetailViewState(
                isLoading: false,
                room: room,
                events: events,
                isFreeNow: !isOccupied,
                freeUntil: freeUntil,
                queryDate: state.queryDate
            )
        } catch {
            state = RoomDetailViewState(
                isLoading: false,
                room: nil,
                events: [],
                isFreeNow: false,
                freeUntil: nil,
                queryDate: state.queryDate,
                errorMessage: "Room not found: \(error.localizedDescription)"
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
        guard let room = state.room,
              let events = try? await repository.roomSchedule(for: room.ident, at: state.queryDate) else {
            return
        }

        let isOccupied = events.contains {
            $0.startDateTime <= state.queryDate && $0.endDateTime > state.queryDate
        }
        let freeUntil = isOccupied ? nil : events
            .filter { $0.startDateTime > state.queryDate }
            .min(by: { $0.startDateTime < $1.startDateTime })?
            .startDateTime

        state.events = events
        state.isFreeNow = !isOccupied
        state.freeUntil = freeUntil
    }
}

struct RoomDetailScene: View {
    @StateObject private var viewModel: RoomDetailViewModel
    init(
        repository: any RoomRepositoryProviding,
        query: RoomDetailQuery
    ) {
        _viewModel = StateObject(
            wrappedValue: RoomDetailViewModel(repository: repository, query: query)
        )
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
                        Task { await viewModel.loadData() }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let room = viewModel.state.room {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        RoomInfoCard(room: room)

                        AvailabilityCard(
                            isFreeNow: viewModel.state.isFreeNow,
                            freeUntil: viewModel.state.freeUntil
                        )

                        VStack(alignment: .leading, spacing: 12) {
                            Text(
                                "Schedule - \(viewModel.state.queryDate.formatted(date: .complete, time: .omitted))"
                            )
                            .font(.headline)

                            if viewModel.state.events.isEmpty {
                                Text("No events scheduled")
                                    .foregroundStyle(.secondary)
                            } else {
                                ForEach(viewModel.state.events) { event in
                                    ScheduleRow(event: event)
                                }
                            }
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .navigationTitle(viewModel.state.room?.displayName ?? "Room Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct RoomInfoCard: View {
    let room: Room

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(room.displayName)
                .font(.title2.weight(.bold))

            Text("Building \(room.building)")
                .foregroundStyle(.secondary)

            let details = buildDetails()
            if !details.isEmpty {
                Text(details.joined(separator: " · "))
                    .foregroundStyle(.secondary)
            }

            if !room.facilities.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Facilities")
                        .font(.headline)
                    Text(room.facilities.joined(separator: " · "))
                        .foregroundStyle(.secondary)
                }
            }

            if let inChargeName = room.inChargeName {
                Text("In charge: \(inChargeName)")
                    .foregroundStyle(.secondary)
            }

            if let inChargeEmail = room.inChargeEmail {
                Text(inChargeEmail)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        )
    }

    private func buildDetails() -> [String] {
        var details: [String] = []
        if let floor = room.floor {
            details.append("Floor \(floor)")
        }
        if room.seatsRegular > 0 {
            details.append("\(room.seatsRegular) seats")
        }
        if room.seatsExam > 0 {
            details.append("\(room.seatsExam) exam seats")
        }
        return details
    }
}

private struct AvailabilityCard: View {
    let isFreeNow: Bool
    let freeUntil: Date?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(isFreeNow ? "Available" : "Occupied")
                .font(.headline)

            if isFreeNow, let freeUntil {
                Text("Free until \(freeUntil.formatted(date: .omitted, time: .shortened))")
            } else if isFreeNow {
                Text("Free for the rest of the day")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(isFreeNow ? Color.teal.opacity(0.18) : Color.red.opacity(0.16))
        )
    }
}

private struct ScheduleRow: View {
    let event: ScheduledEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(event.title)
                .font(.headline)
            Text(event.eventType)
                .foregroundStyle(.secondary)
            Text(
                "\(event.startDateTime.formatted(date: .omitted, time: .shortened)) - \(event.endDateTime.formatted(date: .omitted, time: .shortened))"
            )
            .font(.subheadline.weight(.medium))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        )
    }
}
