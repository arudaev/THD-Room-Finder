import SwiftUI

struct RoomCardView: View {
    let freeRoom: FreeRoom

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(freeRoom.room.displayName)
                    .font(.headline)

                Spacer()

                Text(freeRoom.room.building)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            let details = roomDetails
            if !details.isEmpty {
                Text(details)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Text(availabilityText)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.teal)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        )
    }

    private var roomDetails: String {
        var details: [String] = []
        if let floor = freeRoom.room.floor {
            details.append("Floor \(floor)")
        }
        if freeRoom.room.seatsRegular > 0 {
            details.append("\(freeRoom.room.seatsRegular) seats")
        }
        return details.joined(separator: " · ")
    }

    private var availabilityText: String {
        if let freeUntil = freeRoom.freeUntil {
            return "Free until \(freeUntil.formatted(date: .omitted, time: .shortened))"
        }
        return "Free all day"
    }
}
