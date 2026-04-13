import SwiftUI

struct BuildingFilterBar: View {
    let buildings: [String]
    let selectedBuilding: String?
    let onBuildingSelected: (String?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
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
            .padding(.horizontal, 16)
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
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? Color.accentColor : Color(.secondarySystemBackground))
                )
                .foregroundStyle(isSelected ? .white : .primary)
        }
        .buttonStyle(.plain)
    }
}
