import AppIntents

struct THDRoomFinderShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: FindFreeRoomsIntent(),
            phrases: [
                "Find free rooms now in \(.applicationName)",
                "Find free rooms in \(.applicationName)",
            ],
            shortTitle: "Find Rooms",
            systemImageName: "door.left.hand.open"
        )
        AppShortcut(
            intent: FindFreeRoomsIntent(),
            phrases: [
                "Check rooms on \(\.$campus) with \(.applicationName)",
            ],
            shortTitle: "Check Campus",
            systemImageName: "building.2"
        )
        AppShortcut(
            intent: OpenRoomIntent(),
            phrases: [
                "Open room \(\.$room) in \(.applicationName)",
            ],
            shortTitle: "Open Room",
            systemImageName: "mappin.and.ellipse"
        )
    }
}
