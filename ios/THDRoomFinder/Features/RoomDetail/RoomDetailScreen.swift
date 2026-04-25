import Foundation
import SwiftUI

struct RoomDetailViewState: Equatable {
    var isLoading = true
    var roomPresentation: StudentFacingRoomPresentation?
    var events: [ScheduledEvent] = []
    var isFreeNow = false
    var freeUntil: Date?
    var occupiedUntil: Date?
    var queryDate = Date()
    var errorMessage: String?
}

@MainActor
final class RoomDetailViewModel: ObservableObject {
    @Published private(set) var state: RoomDetailViewState

    private let repository: any RoomRepositoryProviding
    private let formatter: RoomPresentationFormatter
    private var roomID: Int
    private var refreshTask: Task<Void, Never>?

    init(
        repository: any RoomRepositoryProviding,
        formatter: RoomPresentationFormatter = .shared,
        query: RoomDetailQuery
    ) {
        self.repository = repository
        self.formatter = formatter
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
            let currentEvent = events.first {
                $0.startDateTime <= state.queryDate && $0.endDateTime > state.queryDate
            }
            let freeUntil = currentEvent == nil
                ? events
                    .filter { $0.startDateTime > state.queryDate }
                    .min(by: { $0.startDateTime < $1.startDateTime })?
                    .startDateTime
                : nil

            state = RoomDetailViewState(
                isLoading: false,
                roomPresentation: formatter.present(room),
                events: events,
                isFreeNow: currentEvent == nil,
                freeUntil: freeUntil,
                occupiedUntil: currentEvent?.endDateTime,
                queryDate: state.queryDate
            )
        } catch {
            state = RoomDetailViewState(
                isLoading: false,
                roomPresentation: nil,
                events: [],
                isFreeNow: false,
                freeUntil: nil,
                occupiedUntil: nil,
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
        guard let room = state.roomPresentation?.room,
              let events = try? await repository.roomSchedule(for: room.ident, at: state.queryDate) else {
            return
        }

        let currentEvent = events.first {
            $0.startDateTime <= state.queryDate && $0.endDateTime > state.queryDate
        }
        let freeUntil = currentEvent == nil
            ? events
                .filter { $0.startDateTime > state.queryDate }
                .min(by: { $0.startDateTime < $1.startDateTime })?
                .startDateTime
            : nil

        state.events = events
        state.isFreeNow = currentEvent == nil
        state.freeUntil = freeUntil
        state.occupiedUntil = currentEvent?.endDateTime
    }
}

struct RoomDetailScene: View {
    @StateObject private var viewModel: RoomDetailViewModel

    init(
        repository: any RoomRepositoryProviding,
        formatter: RoomPresentationFormatter = .shared,
        query: RoomDetailQuery
    ) {
        _viewModel = StateObject(
            wrappedValue: RoomDetailViewModel(repository: repository, formatter: formatter, query: query)
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
                } else if let roomPresentation = viewModel.state.roomPresentation {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            RoomInfoCard(roomPresentation: roomPresentation)

                            AvailabilityCard(
                                isFreeNow: viewModel.state.isFreeNow,
                                freeUntil: viewModel.state.freeUntil,
                                occupiedUntil: viewModel.state.occupiedUntil
                            )

                            RoomScheduleSection(
                                formatter: .shared,
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
        .navigationTitle(viewModel.state.roomPresentation?.primaryLabel ?? "Room Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct RoomInfoCard: View {
    let roomPresentation: StudentFacingRoomPresentation

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(roomPresentation.primaryLabel)
                        .font(.title2.weight(.bold))

                    Text(roomPresentation.secondaryLabel)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 12)

                Text(roomPresentation.location.groupLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .roomFinderCapsuleSurface(
                        fill: Color.white.opacity(0.10),
                        stroke: Color.white.opacity(0.18)
                    )
            }

            Text(roomPresentation.location.detailPath)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("Original THabella label: \(roomPresentation.rawLabel)")
                .font(.footnote)
                .foregroundStyle(.secondary)

            let details = buildDetails(roomPresentation.room)
            if !details.isEmpty {
                Text(details.joined(separator: " | "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if !roomPresentation.room.facilities.isEmpty {
                RoomDetailFactBlock(
                    title: "Facilities",
                    value: roomPresentation.room.facilities.joined(separator: " | ")
                )
            }

            if let inChargeName = roomPresentation.room.inChargeName {
                RoomDetailFactBlock(title: "In charge", value: inChargeName)
            }

            if let inChargeEmail = roomPresentation.room.inChargeEmail {
                RoomDetailFactBlock(title: "Contact", value: inChargeEmail)
            }
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 28, tint: Color.white.opacity(0.12))
    }

    private func buildDetails(_ room: Room) -> [String] {
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
    let occupiedUntil: Date?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(isFreeNow ? "Free now" : "Occupied now")
                .font(.title3.weight(.semibold))

            if isFreeNow {
                Text(RoomPresentationFormatter.shared.availabilityLabel(freeUntil: freeUntil))
                    .font(.subheadline)
            } else {
                Text(RoomPresentationFormatter.shared.occupiedLabel(until: occupiedUntil))
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
    let formatter: RoomPresentationFormatter
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
                        ScheduleRow(
                            formatter: formatter,
                            event: event
                        )
                    }
                }
            }
        }
    }
}

private struct ScheduleRow: View {
    let formatter: RoomPresentationFormatter
    let event: ScheduledEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(
                "\(event.startDateTime.formatted(date: .omitted, time: .shortened)) - \(event.endDateTime.formatted(date: .omitted, time: .shortened))"
            )
            .font(.headline)

            if !event.eventType.isEmpty, event.eventType != "Unknown" {
                Text(event.eventType)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let title = formatter.meaningfulTitle(for: event) {
                Text(title)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
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

            Button("Retry", action: onRetry)
                .buttonStyle(.borderedProminent)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 30, tint: .red.opacity(0.10))
    }
}
