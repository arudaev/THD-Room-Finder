package de.thd.roomfinder.ui.navigation

sealed class Route(val route: String) {
    data object Home : Route("home")
    data object RoomList : Route("room_list")
    data object RoomDetail : Route("room_detail/{roomId}/{dateTimeEpoch}") {
        fun createRoute(roomId: Int, dateTimeEpoch: Long): String =
            "room_detail/$roomId/$dateTimeEpoch"
    }
}
