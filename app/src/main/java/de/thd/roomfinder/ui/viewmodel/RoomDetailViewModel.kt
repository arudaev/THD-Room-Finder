package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.domain.presentation.RoomPresentationFormatter
import de.thd.roomfinder.domain.presentation.StudentFacingRoomPresentation
import de.thd.roomfinder.domain.repository.RoomRepository
import de.thd.roomfinder.domain.usecase.GetRoomScheduleUseCase
import de.thd.roomfinder.util.Constants
import kotlinx.coroutines.delay
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
    val roomPresentation: StudentFacingRoomPresentation? = null,
    val events: List<ScheduledEvent> = emptyList(),
    val isFreeNow: Boolean = false,
    val freeUntil: LocalDateTime? = null,
    val occupiedUntil: LocalDateTime? = null,
    val queryDateTime: LocalDateTime = LocalDateTime.now(),
    val errorMessage: String? = null,
)

@HiltViewModel
class RoomDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val roomRepository: RoomRepository,
    private val getRoomScheduleUseCase: GetRoomScheduleUseCase,
    private val roomPresentationFormatter: RoomPresentationFormatter,
) : ViewModel() {

    private val roomId: Int = checkNotNull(savedStateHandle["roomId"])
    private val dateTimeEpoch: Long = checkNotNull(savedStateHandle["dateTimeEpoch"])

    private val _uiState = MutableStateFlow(RoomDetailUiState())
    val uiState: StateFlow<RoomDetailUiState> = _uiState.asStateFlow()

    init {
        loadData()
        startAutoRefresh()
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

            val events = getRoomScheduleUseCase(room.ident, queryDateTime).getOrDefault(emptyList())
            val occupancy = computeOccupancy(events, queryDateTime)

            _uiState.value = RoomDetailUiState(
                isLoading = false,
                roomPresentation = roomPresentationFormatter.present(room),
                events = events,
                isFreeNow = !occupancy.isOccupied,
                freeUntil = occupancy.freeUntil,
                occupiedUntil = occupancy.occupiedUntil,
                queryDateTime = queryDateTime,
            )
        }
    }

    private fun startAutoRefresh() {
        viewModelScope.launch {
            while (true) {
                delay(Constants.AUTO_REFRESH_INTERVAL_MS)
                refreshSilently()
            }
        }
    }

    private suspend fun refreshSilently() {
        val room = _uiState.value.roomPresentation?.room ?: return
        val queryDateTime = _uiState.value.queryDateTime

        getRoomScheduleUseCase(room.ident, queryDateTime).onSuccess { events ->
            val occupancy = computeOccupancy(events, queryDateTime)
            val current = _uiState.value
            if (events == current.events &&
                !occupancy.isOccupied == current.isFreeNow &&
                occupancy.freeUntil == current.freeUntil &&
                occupancy.occupiedUntil == current.occupiedUntil
            ) return@onSuccess
            _uiState.value = current.copy(
                events = events,
                isFreeNow = !occupancy.isOccupied,
                freeUntil = occupancy.freeUntil,
                occupiedUntil = occupancy.occupiedUntil,
            )
        }
    }

    private data class OccupancySnapshot(
        val isOccupied: Boolean,
        val freeUntil: LocalDateTime?,
        val occupiedUntil: LocalDateTime?,
    )

    private fun computeOccupancy(events: List<ScheduledEvent>, queryDateTime: LocalDateTime): OccupancySnapshot {
        val currentEvent = events.firstOrNull { it.startDateTime <= queryDateTime && it.endDateTime > queryDateTime }
        val isOccupied = currentEvent != null
        val freeUntil = if (!isOccupied) {
            events.filter { it.startDateTime > queryDateTime }.minByOrNull { it.startDateTime }?.startDateTime
        } else {
            null
        }
        return OccupancySnapshot(isOccupied, freeUntil, currentEvent?.endDateTime)
    }
}
