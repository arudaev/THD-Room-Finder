package de.thd.roomfinder.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.domain.presentation.PresentedFreeRoom
import de.thd.roomfinder.domain.presentation.RoomListSection
import de.thd.roomfinder.domain.presentation.RoomVisibilityMode
import de.thd.roomfinder.ui.component.DateTimePickerDialog
import de.thd.roomfinder.ui.component.RoomCard
import de.thd.roomfinder.ui.UiDateFormats
import de.thd.roomfinder.ui.component.RoomFilterChipRow
import de.thd.roomfinder.ui.viewmodel.RoomListUiState
import java.time.LocalDateTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RoomListScreen(
    uiState: RoomListUiState,
    onCampusSelected: (String) -> Unit,
    onGroupSelected: (String?) -> Unit,
    onVisibilityModeSelected: (RoomVisibilityMode) -> Unit,
    onDateTimeSelected: (LocalDateTime) -> Unit,
    onResetToNow: () -> Unit,
    onRoomClicked: (PresentedFreeRoom) -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showDateTimePicker by remember { mutableStateOf(false) }

    if (showDateTimePicker) {
        DateTimePickerDialog(
            onDateTimeSelected = { dateTime ->
                onDateTimeSelected(dateTime)
                showDateTimePicker = false
            },
            onDismiss = { showDateTimePicker = false },
        )
    }

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
                actions = {
                    IconButton(onClick = { showDateTimePicker = true }) {
                        Icon(
                            imageVector = Icons.Filled.DateRange,
                            contentDescription = "Pick date and time",
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
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (uiState.isCustomTime) {
                        item {
                            Surface(
                                color = MaterialTheme.colorScheme.secondaryContainer,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = uiState.selectedDateTime.format(UiDateFormats.DATE_TIME_PICKER),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                                    )
                                    IconButton(onClick = onResetToNow) {
                                        Icon(
                                            imageVector = Icons.Filled.Close,
                                            contentDescription = "Reset to now",
                                            tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    item {
                        RoomListSummary(
                            freeRoomCount = uiState.visibleRooms.size,
                            campusLabel = selectedCampusLabel(uiState),
                            visibilityMode = uiState.visibilityMode,
                        )
                    }

                    item {
                        RoomFilterChipRow(
                            label = "Campus",
                            options = uiState.campusFilters,
                            selectedKey = uiState.selectedCampusKey,
                            allLabel = "",
                            showAllOption = false,
                            onSelectionChanged = { key ->
                                if (key != null) onCampusSelected(key)
                            },
                        )
                    }

                    if (uiState.groupFilters.isNotEmpty()) {
                        item {
                            RoomFilterChipRow(
                                label = "Building or site",
                                options = uiState.groupFilters,
                                selectedKey = uiState.selectedGroupKey,
                                allLabel = "All buildings and sites",
                                onSelectionChanged = onGroupSelected,
                            )
                        }
                    }

                    item {
                        VisibilityModeRow(
                            selectedMode = uiState.visibilityMode,
                            onModeSelected = onVisibilityModeSelected,
                        )
                    }

                    if (uiState.sections.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 40.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = emptyMessage(uiState),
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    } else {
                        items(
                            items = uiState.sections,
                            key = { it.groupKey },
                        ) { section ->
                            RoomListSectionBlock(
                                section = section,
                                onRoomClicked = onRoomClicked,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RoomListSummary(
    freeRoomCount: Int,
    campusLabel: String,
    visibilityMode: RoomVisibilityMode,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        tonalElevation = 2.dp,
        shape = MaterialTheme.shapes.large,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = "$freeRoomCount free rooms",
                style = MaterialTheme.typography.headlineSmall,
            )
            Text(
                text = "$campusLabel - ${visibilityMode.label}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun VisibilityModeRow(
    selectedMode: RoomVisibilityMode,
    onModeSelected: (RoomVisibilityMode) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(RoomVisibilityMode.entries.toList(), key = { it.name }) { mode ->
            FilterChip(
                selected = selectedMode == mode,
                onClick = { onModeSelected(mode) },
                label = { Text(mode.label) },
            )
        }
    }
}

@Composable
private fun RoomListSectionBlock(
    section: RoomListSection,
    onRoomClicked: (PresentedFreeRoom) -> Unit,
) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = section.groupLabel,
            style = MaterialTheme.typography.titleMedium,
        )
        Text(
            text = section.campusLabel,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        section.rooms.forEach { freeRoom ->
            RoomCard(
                presentedRoom = freeRoom,
                onClick = { onRoomClicked(freeRoom) },
            )
        }
    }
}

private fun selectedCampusLabel(uiState: RoomListUiState): String =
    uiState.campusFilters.firstOrNull { it.key == uiState.selectedCampusKey }?.label ?: "Deggendorf"

private fun emptyMessage(uiState: RoomListUiState): String {
    val campusLabel = selectedCampusLabel(uiState)
    uiState.selectedGroupKey?.let { selectedGroupKey ->
        val label = uiState.groupFilters.firstOrNull { it.key == selectedGroupKey }?.label ?: selectedGroupKey
        return "No free rooms match $label right now."
    }
    return if (uiState.isCustomTime) {
        "No free rooms match $campusLabel at the selected time."
    } else {
        "No free rooms match $campusLabel right now."
    }
}
