package de.thd.roomfinder

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import dagger.hilt.android.AndroidEntryPoint
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme
import de.thd.roomfinder.ui.viewmodel.HomeUiState
import de.thd.roomfinder.ui.viewmodel.HomeViewModel

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            THDRoomFinderTheme {
                RoomFinderApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomFinderApp(
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(text = stringResource(R.string.app_name)) },
            )
        },
    ) { innerPadding ->
        HomeContent(
            uiState = uiState,
            onRetry = viewModel::loadData,
            modifier = Modifier.padding(innerPadding),
        )
    }
}

@Composable
private fun HomeContent(
    uiState: HomeUiState,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
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
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "${uiState.freeRoomCount} free rooms",
                        style = MaterialTheme.typography.headlineLarge,
                    )
                    Text(
                        text = "out of ${uiState.totalRoomCount} total rooms",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        text = "${uiState.events.size} events scheduled today",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeContentLoadingPreview() {
    THDRoomFinderTheme {
        HomeContent(
            uiState = HomeUiState(isLoading = true),
            onRetry = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeContentSuccessPreview() {
    THDRoomFinderTheme {
        HomeContent(
            uiState = HomeUiState(
                isLoading = false,
                freeRoomCount = 150,
                totalRoomCount = 289,
            ),
            onRetry = {},
        )
    }
}
