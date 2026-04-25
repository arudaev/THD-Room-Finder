package de.thd.roomfinder.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import de.thd.roomfinder.ui.screen.HomeScreen
import de.thd.roomfinder.ui.screen.RoomDetailScreen
import de.thd.roomfinder.ui.screen.RoomListScreen
import de.thd.roomfinder.ui.viewmodel.HomeViewModel
import de.thd.roomfinder.ui.viewmodel.RoomDetailViewModel
import de.thd.roomfinder.ui.viewmodel.RoomListViewModel
import java.time.ZoneId

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
                onCampusSelected = viewModel::selectCampus,
                onGroupSelected = viewModel::selectGroup,
                onVisibilityModeSelected = viewModel::selectVisibilityMode,
                onDateTimeSelected = viewModel::setDateTime,
                onResetToNow = viewModel::resetToNow,
                onRoomClicked = { presentedFreeRoom ->
                    val epoch = uiState.selectedDateTime
                        .atZone(ZoneId.systemDefault())
                        .toEpochSecond()
                    navController.navigate(
                        Route.RoomDetail.createRoute(presentedFreeRoom.freeRoom.room.id, epoch),
                    )
                },
                onRetry = viewModel::loadFreeRooms,
                onNavigateBack = { navController.popBackStack() },
            )
        }
        composable(
            route = Route.RoomDetail.route,
            arguments = listOf(
                navArgument("roomId") { type = NavType.IntType },
                navArgument("dateTimeEpoch") { type = NavType.LongType },
            ),
        ) {
            val viewModel: RoomDetailViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            RoomDetailScreen(
                uiState = uiState,
                onRetry = viewModel::loadData,
                onNavigateBack = { navController.popBackStack() },
            )
        }
    }
}
