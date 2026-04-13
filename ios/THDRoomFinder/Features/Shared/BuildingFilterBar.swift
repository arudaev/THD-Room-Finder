import SwiftUI

struct BuildingFilterBar: View {
    let buildings: [String]
    let selectedBuilding: String?
    let onBuildingSelected: (String?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            Group {
                if #available(iOS 26, *) {
                    GlassEffectContainer(spacing: 10) {
                        chipRow
                    }
                } else {
                    chipRow
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 4)
        }
        .scrollIndicators(.hidden)
    }

    private var chipRow: some View {
        HStack(spacing: 10) {
            FilterChip(
                title: "All",
                isSelected: selectedBuilding == nil,
                action: { onBuildingSelected(nil) }
            )

            ForEach(buildings, id: \.self) { building in
                FilterChip(
                    title: building,
                    isSelected: selectedBuilding == building,
                    action: { onBuildingSelected(building) }
                )
            }
        }
    }
}

private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .roomFinderCapsuleSurface(
                    fill: isSelected ? Color.accentColor.opacity(0.30) : Color.white.opacity(0.10),
                    stroke: isSelected ? Color.accentColor.opacity(0.40) : Color.white.opacity(0.18),
                    interactive: true
                )
        }
        .buttonStyle(.plain)
    }
}

#Preview("Building Filter Bar") {
    ZStack {
        RoomFinderScreenBackground()

        BuildingFilterBar(
            buildings: ["A", "B", "C", "D"],
            selectedBuilding: "B",
            onBuildingSelected: { _ in }
        )
        .padding()
    }
}
