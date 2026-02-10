package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.thd.roomfinder.domain.repository.RoomRepository
import de.thd.roomfinder.domain.usecase.GetFreeRoomsUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val freeRoomCount: Int = 0,
    val totalRoomCount: Int = 0,
    val currentTime: LocalDateTime = LocalDateTime.now(),
    val errorMessage: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getFreeRoomsUseCase: GetFreeRoomsUseCase,
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

            val now = LocalDateTime.now()
            val allRoomsResult = roomRepository.getAllRooms()
            val freeRoomsResult = getFreeRoomsUseCase(now)

            allRoomsResult.fold(
                onSuccess = { allRooms ->
                    val freeCount = freeRoomsResult.getOrNull()?.size ?: 0

                    _uiState.value = HomeUiState(
                        isLoading = false,
                        freeRoomCount = freeCount,
                        totalRoomCount = allRooms.size,
                        currentTime = now,
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
