package de.thd.roomfinder.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
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
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.ui.component.RoomInfoSection
import de.thd.roomfinder.ui.component.ScheduleCard
import de.thd.roomfinder.ui.viewmodel.RoomDetailUiState
import java.text.Normalizer
import java.time.format.DateTimeFormatter
import java.util.Locale

private val dateFormatter = DateTimeFormatter.ofPattern("EEEE, d MMMM")
private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RoomDetailScreen(
    uiState: RoomDetailUiState,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.roomPresentation?.primaryLabel ?: "Room Details") },
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
            uiState.roomPresentation != null -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = PaddingValues(bottom = 16.dp),
                ) {
                    item {
                        RoomInfoSection(roomPresentation = uiState.roomPresentation)
                    }

                    item {
                        ElevatedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            colors = CardDefaults.elevatedCardColors(
                                containerColor = if (uiState.isFreeNow) {
                                    MaterialTheme.colorScheme.primaryContainer
                                } else {
                                    MaterialTheme.colorScheme.errorContainer
                                },
                            ),
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = if (uiState.isFreeNow) "Free now" else "Occupied now",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(
                                    text = when {
                                        uiState.isFreeNow && uiState.freeUntil != null ->
                                            "Free until ${uiState.freeUntil.format(timeFormatter)}"
                                        uiState.isFreeNow -> "Free all day"
                                        uiState.occupiedUntil != null ->
                                            "Occupied until ${uiState.occupiedUntil.format(timeFormatter)}"
                                        else -> "Occupied now"
                                    },
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                    }

                    item {
                        Text(
                            text = "Schedule - ${uiState.queryDateTime.format(dateFormatter)}",
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(16.dp),
                        )
                    }

                    if (uiState.events.isEmpty()) {
                        item {
                            Text(
                                text = "No events scheduled",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 16.dp),
                            )
                        }
                    } else {
                        items(
                            items = uiState.events,
                            key = { "${it.id}_${it.startDateTime}" },
                        ) { event ->
                            ScheduleCard(
                                event = event,
                                displayTitle = meaningfulTitle(event.title, event.eventType),
                                modifier = Modifier.padding(
                                    horizontal = 16.dp,
                                    vertical = 4.dp,
                                ),
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun meaningfulTitle(title: String, eventType: String): String? {
    val normalizedTitle = normalizeForComparison(title)
    val normalizedType = normalizeForComparison(eventType)
    if (normalizedTitle.isBlank() || normalizedTitle == "unknown" || normalizedTitle == normalizedType) {
        return null
    }
    return title.trim()
}

private fun normalizeForComparison(value: String): String =
    Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "")
        .replace("ß", "ss")
        .lowercase(Locale.ROOT)
        .trim()
