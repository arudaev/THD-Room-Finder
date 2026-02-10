package de.thd.roomfinder.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import de.thd.roomfinder.ui.screen.HomeScreen
import de.thd.roomfinder.ui.screen.RoomListScreen
import de.thd.roomfinder.ui.viewmodel.HomeViewModel
import de.thd.roomfinder.ui.viewmodel.RoomListViewModel

@Composable
internal fun RoomFinderNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = Route.Home.route,
        modifier = modifier,
    ) {
        composable(Route.Home.route) {
            val viewModel: HomeViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            HomeScreen(
                uiState = uiState,
                onRetry = viewModel::loadData,
                onNavigateToRoomList = { navController.navigate(Route.RoomList.route) },
            )
        }
        composable(Route.RoomList.route) {
            val viewModel: RoomListViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            RoomListScreen(
                uiState = uiState,
                onBuildingSelected = viewModel::selectBuilding,
                onRetry = viewModel::loadFreeRooms,
                onNavigateBack = { navController.popBackStack() },
            )
        }
    }
}
