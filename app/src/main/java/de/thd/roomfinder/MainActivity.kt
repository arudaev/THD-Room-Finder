package de.thd.roomfinder

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import de.thd.roomfinder.ui.navigation.RoomFinderNavHost
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme

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

@Composable
private fun RoomFinderApp() {
    val navController = rememberNavController()
    RoomFinderNavHost(navController = navController)
}
