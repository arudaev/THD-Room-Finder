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
        ZStack {
            RoomFinderScreenBackground()

            Group {
                if viewModel.state.isLoading {
                    ProgressView("Loading room details...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage = viewModel.state.errorMessage {
                    RoomDetailErrorCard(errorMessage: errorMessage) {
                        Task { await viewModel.loadData() }
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let room = viewModel.state.room {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            RoomInfoCard(room: room)

                            AvailabilityCard(
                                isFreeNow: viewModel.state.isFreeNow,
                                freeUntil: viewModel.state.freeUntil
                            )

                            RoomScheduleSection(
                                queryDate: viewModel.state.queryDate,
                                events: viewModel.state.events
                            )
                        }
                        .padding(20)
                        .padding(.bottom, 24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .scrollIndicators(.hidden)
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
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(room.displayName)
                        .font(.title2.weight(.bold))

                    Text("Building \(room.building)")
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 12)

                Text(room.building)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .roomFinderCapsuleSurface(
                        fill: Color.white.opacity(0.10),
                        stroke: Color.white.opacity(0.18)
                    )
            }

            let details = buildDetails()
            if !details.isEmpty {
                Text(details.joined(separator: " | "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if !room.facilities.isEmpty {
                RoomDetailFactBlock(
                    title: "Facilities",
                    value: room.facilities.joined(separator: " | ")
                )
            }

            if let inChargeName = room.inChargeName {
                RoomDetailFactBlock(title: "In charge", value: inChargeName)
            }

            if let inChargeEmail = room.inChargeEmail {
                RoomDetailFactBlock(title: "Contact", value: inChargeEmail)
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 28, tint: Color.white.opacity(0.12))
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

private struct RoomDetailFactBlock: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.subheadline.weight(.semibold))

            Text(value)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

private struct AvailabilityCard: View {
    let isFreeNow: Bool
    let freeUntil: Date?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(isFreeNow ? "Available" : "Occupied")
                .font(.title3.weight(.semibold))

            if isFreeNow, let freeUntil {
                Text("Free until \(freeUntil.formatted(date: .omitted, time: .shortened))")
                    .font(.subheadline)
            } else if isFreeNow {
                Text("Free for the rest of the day")
                    .font(.subheadline)
            } else {
                Text("Currently in use at the selected time.")
                    .font(.subheadline)
            }
        }
        .foregroundStyle(isFreeNow ? .teal : .red)
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(
            cornerRadius: 28,
            tint: isFreeNow ? .teal.opacity(0.16) : .red.opacity(0.14)
        )
    }
}

private struct RoomScheduleSection: View {
    let queryDate: Date
    let events: [ScheduledEvent]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Schedule")
                .font(.title3.weight(.semibold))

            Text(queryDate.formatted(date: .complete, time: .omitted))
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if events.isEmpty {
                ContentUnavailableView(
                    "No Events Scheduled",
                    systemImage: "calendar",
                    description: Text("Nothing is booked for this room on the selected day.")
                )
                .padding(16)
                .frame(maxWidth: .infinity)
                .roomFinderSurface(cornerRadius: 24, tint: Color.white.opacity(0.10))
            } else {
                VStack(spacing: 12) {
                    ForEach(events) { event in
                        ScheduleRow(event: event)
                    }
                }
            }
        }
    }
}

private struct ScheduleRow: View {
    let event: ScheduledEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(event.title)
                .font(.headline)

            Text(event.eventType)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(
                "\(event.startDateTime.formatted(date: .omitted, time: .shortened)) - \(event.endDateTime.formatted(date: .omitted, time: .shortened))"
            )
            .font(.subheadline.weight(.medium))
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 24, tint: Color.white.opacity(0.10))
    }
}

private struct RoomDetailErrorCard: View {
    let errorMessage: String
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Room details are unavailable.")
                .font(.title3.weight(.semibold))

            Text(errorMessage)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Group {
                if #available(iOS 26, *) {
                    Button("Retry", action: onRetry)
                        .buttonStyle(.glassProminent)
                } else {
                    Button("Retry", action: onRetry)
                        .buttonStyle(.borderedProminent)
                }
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 30, tint: .red.opacity(0.10))
    }
}
