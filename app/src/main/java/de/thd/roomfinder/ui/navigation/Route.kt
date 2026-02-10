package de.thd.roomfinder.ui.navigation

sealed class Route(val route: String) {
    data object Home : Route("home")
    data object RoomList : Route("room_list")
}
