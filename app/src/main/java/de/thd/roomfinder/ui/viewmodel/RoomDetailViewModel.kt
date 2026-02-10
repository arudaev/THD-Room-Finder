package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.domain.repository.RoomRepository
import de.thd.roomfinder.domain.usecase.GetRoomScheduleUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import javax.inject.Inject

data class RoomDetailUiState(
    val isLoading: Boolean = true,
    val room: Room? = null,
    val events: List<ScheduledEvent> = emptyList(),
    val isFreeNow: Boolean = false,
    val freeUntil: LocalDateTime? = null,
    val queryDateTime: LocalDateTime = LocalDateTime.now(),
    val errorMessage: String? = null,
)

@HiltViewModel
class RoomDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val roomRepository: RoomRepository,
    private val getRoomScheduleUseCase: GetRoomScheduleUseCase,
) : ViewModel() {

    private val roomId: Int = checkNotNull(savedStateHandle["roomId"])
    private val dateTimeEpoch: Long = checkNotNull(savedStateHandle["dateTimeEpoch"])

    private val _uiState = MutableStateFlow(RoomDetailUiState())
    val uiState: StateFlow<RoomDetailUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            val queryDateTime = LocalDateTime.ofInstant(
                Instant.ofEpochSecond(dateTimeEpoch),
                ZoneId.systemDefault(),
            )

            val room = roomRepository.getRoomById(roomId).getOrElse {
                _uiState.value = RoomDetailUiState(
                    isLoading = false,
                    errorMessage = "Room not found: ${it.message}",
                )
                return@launch
            }

            val events = getRoomScheduleUseCase(room.ident, queryDateTime)
                .getOrDefault(emptyList())

            val isOccupied = events.any {
                it.startDateTime <= queryDateTime && it.endDateTime > queryDateTime
            }
            val freeUntil = if (!isOccupied) {
                events
                    .filter { it.startDateTime > queryDateTime }
                    .minByOrNull { it.startDateTime }
                    ?.startDateTime
            } else {
                null
            }

            _uiState.value = RoomDetailUiState(
                isLoading = false,
                room = room,
                events = events,
                isFreeNow = !isOccupied,
                freeUntil = freeUntil,
                queryDateTime = queryDateTime,
            )
        }
    }
}
