package de.thd.roomfinder.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.R
import de.thd.roomfinder.ui.UiDateFormats
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme
import de.thd.roomfinder.ui.viewmodel.HomeUiState
import java.time.LocalDateTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun HomeScreen(
    uiState: HomeUiState,
    onRetry: () -> Unit,
    onNavigateToRoomList: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(text = stringResource(R.string.app_name)) },
            )
        },
        modifier = modifier,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.Center,
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator()
                }
                uiState.errorMessage != null -> {
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
                else -> {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = "${uiState.freeRoomCount}",
                            style = MaterialTheme.typography.displayLarge,
                        )
                        Text(
                            text = "rooms available right now",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        Text(
                            text = "out of ${uiState.totalRoomCount} total rooms",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = "As of ${uiState.currentTime.format(UiDateFormats.TIME)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        FilledTonalButton(onClick = onNavigateToRoomList) {
                            Text("Find a Free Room")
                        }
                        Button(onClick = onRetry) {
                            Text("Refresh")
                        }
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenLoadingPreview() {
    THDRoomFinderTheme {
        HomeScreen(
            uiState = HomeUiState(isLoading = true),
            onRetry = {},
            onNavigateToRoomList = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenSuccessPreview() {
    THDRoomFinderTheme {
        HomeScreen(
            uiState = HomeUiState(
                isLoading = false,
                freeRoomCount = 150,
                totalRoomCount = 289,
                currentTime = LocalDateTime.of(2026, 2, 10, 10, 30),
            ),
            onRetry = {},
            onNavigateToRoomList = {},
        )
    }
}
