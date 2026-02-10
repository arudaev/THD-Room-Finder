package de.thd.roomfinder.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.domain.model.FreeRoom
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.ui.component.BuildingFilterRow
import de.thd.roomfinder.ui.component.RoomCard
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme
import de.thd.roomfinder.ui.viewmodel.RoomListUiState
import java.time.LocalDateTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RoomListScreen(
    uiState: RoomListUiState,
    onBuildingSelected: (String?) -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Free Rooms") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
            )
        },
        modifier = modifier,
    ) { innerPadding ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.errorMessage != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Text(
                            text = uiState.errorMessage,
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error,
                        )
                        Button(onClick = onRetry) {
                            Text("Retry")
                        }
                    }
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                ) {
                    BuildingFilterRow(
                        buildings = uiState.buildings,
                        selectedBuilding = uiState.selectedBuilding,
                        onBuildingSelected = onBuildingSelected,
                    )

                    if (uiState.filteredRooms.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = if (uiState.selectedBuilding != null) {
                                    "No free rooms in building ${uiState.selectedBuilding}"
                                } else {
                                    "No free rooms right now"
                                },
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(
                                horizontal = 16.dp,
                                vertical = 8.dp,
                            ),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(
                                items = uiState.filteredRooms,
                                key = { it.room.id },
                            ) { freeRoom ->
                                RoomCard(freeRoom = freeRoom)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun RoomListScreenPreview() {
    THDRoomFinderTheme {
        RoomListScreen(
            uiState = RoomListUiState(
                isLoading = false,
                filteredRooms = listOf(
                    FreeRoom(
                        room = Room(
                            id = 1, ident = "I112", name = "I 112", building = "I",
                            floor = 1, displayName = "I 112", seatsRegular = 40,
                            seatsExam = 20, facilities = emptyList(), bookable = true,
                            inChargeName = null, inChargeEmail = null,
                        ),
                        freeUntil = LocalDateTime.of(2026, 2, 10, 14, 30),
                    ),
                    FreeRoom(
                        room = Room(
                            id = 2, ident = "A008", name = "A 008", building = "A",
                            floor = 0, displayName = "A 008", seatsRegular = 60,
                            seatsExam = 30, facilities = emptyList(), bookable = true,
                            inChargeName = null, inChargeEmail = null,
                        ),
                        freeUntil = null,
                    ),
                ),
                buildings = listOf("A", "I"),
            ),
            onBuildingSelected = {},
            onRetry = {},
            onNavigateBack = {},
        )
    }
}
