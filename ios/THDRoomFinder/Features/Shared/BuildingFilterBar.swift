import SwiftUI

struct FilterOptionBar: View {
    let options: [RoomFilterOption]
    let selectedKey: String?
    let allLabel: String
    let showsAllOption: Bool
    let onSelectionChanged: (String?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                if showsAllOption {
                    SelectionChip(
                        title: allLabel,
                        isSelected: selectedKey == nil,
                        action: { onSelectionChanged(nil) }
                    )
                }

                ForEach(options, id: \.label) { option in
                    SelectionChip(
                        title: "\(option.label) (\(option.count))",
                        isSelected: selectedKey == option.key,
                        action: { onSelectionChanged(option.key) }
                    )
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 4)
        }
        .scrollIndicators(.hidden)
    }
}

struct SelectionChip: View {
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
                    stroke: isSelected ? Color.accentColor.opacity(0.40) : Color.white.opacity(0.18)
                )
        }
        .buttonStyle(.plain)
    }
}
