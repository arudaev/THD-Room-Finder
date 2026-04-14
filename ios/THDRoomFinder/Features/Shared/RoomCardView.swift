import SwiftUI

struct RoomCardView: View {
    let presentedRoom: PresentedFreeRoom

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(presentedRoom.presentation.primaryLabel)
                        .font(.headline)

                    Text(presentedRoom.presentation.secondaryLabel)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 12)

                Text(presentedRoom.presentation.location.groupLabel)
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
                Image(systemName: presentedRoom.freeRoom.freeUntil == nil ? "sparkles" : "clock")
                    .font(.footnote.weight(.semibold))

                Text(presentedRoom.availabilityLabel)
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
    func roomFinderSurface(
        cornerRadius: CGFloat = 24,
        tint: Color = Color.white.opacity(0.10),
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        return self
            .background(.ultraThinMaterial, in: shape)
            .background(tint, in: shape)
            .overlay(
                shape.strokeBorder(Color.white.opacity(0.16), lineWidth: 1)
            )
    }

    func roomFinderCapsuleSurface(
        fill: Color = Color.white.opacity(0.10),
        stroke: Color = Color.white.opacity(0.16),
    ) -> some View {
        self
            .background(.ultraThinMaterial, in: Capsule())
            .background(fill, in: Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(stroke, lineWidth: 1)
            )
    }
}
