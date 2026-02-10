package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.thd.roomfinder.domain.model.FreeRoom
import de.thd.roomfinder.domain.usecase.GetFreeRoomsUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class RoomListUiState(
    val isLoading: Boolean = true,
    val freeRooms: List<FreeRoom> = emptyList(),
    val filteredRooms: List<FreeRoom> = emptyList(),
    val buildings: List<String> = emptyList(),
    val selectedBuilding: String? = null,
    val errorMessage: String? = null,
)

@HiltViewModel
class RoomListViewModel @Inject constructor(
    private val getFreeRoomsUseCase: GetFreeRoomsUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RoomListUiState())
    val uiState: StateFlow<RoomListUiState> = _uiState.asStateFlow()

    init {
        loadFreeRooms()
    }

    fun loadFreeRooms() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            getFreeRoomsUseCase(LocalDateTime.now()).fold(
                onSuccess = { freeRooms ->
                    val buildings = freeRooms
                        .map { it.room.building }
                        .distinct()
                        .sorted()

                    _uiState.value = RoomListUiState(
                        isLoading = false,
                        freeRooms = freeRooms,
                        filteredRooms = freeRooms,
                        buildings = buildings,
                    )
                },
                onFailure = { error ->
                    _uiState.value = RoomListUiState(
                        isLoading = false,
                        errorMessage = "Failed to load free rooms: ${error.message}",
                    )
                },
            )
        }
    }

    fun selectBuilding(building: String?) {
        val current = _uiState.value
        val filtered = if (building == null) {
            current.freeRooms
        } else {
            current.freeRooms.filter { it.room.building == building }
        }
        _uiState.value = current.copy(
            selectedBuilding = building,
            filteredRooms = filtered,
        )
    }
}
