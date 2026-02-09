package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.domain.repository.RoomRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val rooms: List<Room> = emptyList(),
    val events: List<ScheduledEvent> = emptyList(),
    val freeRoomCount: Int = 0,
    val totalRoomCount: Int = 0,
    val errorMessage: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val roomRepository: RoomRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            val roomsResult = roomRepository.getAllRooms()
            val eventsResult = roomRepository.getScheduledEvents(LocalDateTime.now())

            roomsResult.fold(
                onSuccess = { rooms ->
                    val events = eventsResult.getOrDefault(emptyList())
                    val now = LocalDateTime.now()
                    val activeEvents = events.filter { it.startDateTime <= now && it.endDateTime > now }
                    val occupiedRoomIdents = activeEvents.map { it.roomIdent }.toSet()
                    val freeCount = rooms.count { it.ident !in occupiedRoomIdents }

                    _uiState.value = HomeUiState(
                        isLoading = false,
                        rooms = rooms,
                        events = events,
                        freeRoomCount = freeCount,
                        totalRoomCount = rooms.size,
                    )
                },
                onFailure = { error ->
                    _uiState.value = HomeUiState(
                        isLoading = false,
                        errorMessage = "Failed to load rooms: ${error.message}",
                    )
                },
            )
        }
    }
}
