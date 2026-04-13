import SwiftUI

struct RoomCardView: View {
    let freeRoom: FreeRoom

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(freeRoom.room.displayName)
                        .font(.headline)

                    if !roomDetails.isEmpty {
                        Text(roomDetails)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 12)

                Text(freeRoom.room.building)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .roomFinderCapsuleSurface(
                        fill: Color.white.opacity(0.10),
                        stroke: Color.white.opacity(0.18)
                    )
            }

            HStack(spacing: 8) {
                Image(systemName: freeRoom.freeUntil == nil ? "sparkles" : "clock")
                    .font(.footnote.weight(.semibold))

                Text(availabilityText)
                    .font(.subheadline.weight(.semibold))

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .foregroundStyle(.teal)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .roomFinderSurface(cornerRadius: 24, tint: .teal.opacity(0.12))
    }

    private var roomDetails: String {
        var details: [String] = []
        if let floor = freeRoom.room.floor {
            details.append("Floor \(floor)")
        }
        if freeRoom.room.seatsRegular > 0 {
            details.append("\(freeRoom.room.seatsRegular) seats")
        }
        if freeRoom.room.seatsExam > 0 {
            details.append("\(freeRoom.room.seatsExam) exam seats")
        }
        return details.joined(separator: " | ")
    }

    private var availabilityText: String {
        if let freeUntil = freeRoom.freeUntil {
            return "Free until \(freeUntil.formatted(date: .omitted, time: .shortened))"
        }
        return "Free all day"
    }
}

struct RoomFinderScreenBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(uiColor: .systemBackground),
                    Color.teal.opacity(0.12),
                    Color.accentColor.opacity(0.16),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(Color.teal.opacity(0.20))
                .frame(width: 260, height: 260)
                .blur(radius: 50)
                .offset(x: -110, y: -240)

            Circle()
                .fill(Color.accentColor.opacity(0.18))
                .frame(width: 280, height: 280)
                .blur(radius: 70)
                .offset(x: 150, y: 260)
        }
        .ignoresSafeArea()
    }
}

extension View {
    @ViewBuilder
    func roomFinderSurface(
        cornerRadius: CGFloat = 24,
        tint: Color = Color.white.opacity(0.10),
        interactive: Bool = false
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        let outlined = self.overlay(
            shape.strokeBorder(Color.white.opacity(0.16), lineWidth: 1)
        )

        if #available(iOS 26, *) {
            if interactive {
                outlined
                    .glassEffect(
                        .regular.tint(tint).interactive(),
                        in: .rect(cornerRadius: cornerRadius)
                    )
            } else {
                outlined
                    .glassEffect(
                        .regular.tint(tint),
                        in: .rect(cornerRadius: cornerRadius)
                    )
            }
        } else {
            outlined
                .background(.ultraThinMaterial, in: shape)
        }
    }

    @ViewBuilder
    func roomFinderCapsuleSurface(
        fill: Color = Color.white.opacity(0.10),
        stroke: Color = Color.white.opacity(0.16),
        interactive: Bool = false
    ) -> some View {
        let outlined = self.overlay(
            Capsule()
                .strokeBorder(stroke, lineWidth: 1)
        )

        if #available(iOS 26, *) {
            if interactive {
                outlined
                    .glassEffect(.regular.tint(fill).interactive(), in: .capsule)
            } else {
                outlined
                    .glassEffect(.regular.tint(fill), in: .capsule)
            }
        } else {
            outlined
                .background(fill, in: Capsule())
        }
    }
}

#Preview("Room Card") {
    ZStack {
        RoomFinderScreenBackground()

        RoomCardView(
            freeRoom: FreeRoom(
                room: Room(
                    id: 1,
                    ident: "A-101",
                    name: "A101",
                    building: "A",
                    floor: 1,
                    displayName: "A 101",
                    seatsRegular: 32,
                    seatsExam: 24,
                    facilities: ["Projector"],
                    bookable: true,
                    inChargeName: nil,
                    inChargeEmail: nil,
                    untisLongname: nil
                ),
                freeUntil: Calendar.current.date(byAdding: .minute, value: 45, to: .now)
            )
        )
        .padding()
    }
}
