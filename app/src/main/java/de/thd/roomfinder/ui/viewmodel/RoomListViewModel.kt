package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import de.thd.roomfinder.domain.model.FreeRoom
import de.thd.roomfinder.domain.presentation.PresentedFreeRoom
import de.thd.roomfinder.domain.presentation.RoomFilterOption
import de.thd.roomfinder.domain.presentation.RoomListPresentation
import de.thd.roomfinder.domain.presentation.RoomListSection
import de.thd.roomfinder.domain.presentation.RoomPresentationFormatter
import de.thd.roomfinder.domain.presentation.RoomVisibilityMode
import de.thd.roomfinder.domain.usecase.GetFreeRoomsUseCase
import de.thd.roomfinder.util.Constants
import de.thd.roomfinder.util.Constants.DEFAULT_CAMPUS_KEY
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class RoomListUiState(
    val isLoading: Boolean = true,
    val freeRooms: List<FreeRoom> = emptyList(),
    val visibleRooms: List<PresentedFreeRoom> = emptyList(),
    val sections: List<RoomListSection> = emptyList(),
    val campusFilters: List<RoomFilterOption> = emptyList(),
    val groupFilters: List<RoomFilterOption> = emptyList(),
    val selectedCampusKey: String = DEFAULT_CAMPUS_KEY,
    val selectedGroupKey: String? = null,
    val visibilityMode: RoomVisibilityMode = RoomVisibilityMode.TEACHING_ONLY,
    val selectedDateTime: LocalDateTime = LocalDateTime.now(),
    val isCustomTime: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class RoomListViewModel @Inject constructor(
    private val getFreeRoomsUseCase: GetFreeRoomsUseCase,
    private val roomPresentationFormatter: RoomPresentationFormatter,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RoomListUiState())
    val uiState: StateFlow<RoomListUiState> = _uiState.asStateFlow()

    init {
        loadFreeRooms()
        startAutoRefresh()
    }

    fun loadFreeRooms() {
        viewModelScope.launch {
            val dateTime = _uiState.value.selectedDateTime
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            getFreeRoomsUseCase(dateTime).fold(
                onSuccess = { freeRooms ->
                    _uiState.value = rebuildPresentation(
                        current = _uiState.value.copy(isLoading = false, freeRooms = freeRooms),
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Failed to load free rooms: ${error.message}",
                    )
                },
            )
        }
    }

    fun selectCampus(campusKey: String) {
        _uiState.value = rebuildPresentation(
            current = _uiState.value,
            selectedCampusKey = campusKey,
            selectedGroupKey = null,
        )
    }

    fun selectGroup(groupKey: String?) {
        _uiState.value = rebuildPresentation(
            current = _uiState.value,
            selectedGroupKey = groupKey,
        )
    }

    fun selectVisibilityMode(visibilityMode: RoomVisibilityMode) {
        _uiState.value = rebuildPresentation(
            current = _uiState.value,
            visibilityMode = visibilityMode,
        )
    }

    fun setDateTime(dateTime: LocalDateTime) {
        _uiState.value = _uiState.value.copy(
            selectedDateTime = dateTime,
            isCustomTime = true,
        )
        loadFreeRooms()
    }

    fun resetToNow() {
        _uiState.value = _uiState.value.copy(
            selectedDateTime = LocalDateTime.now(),
            isCustomTime = false,
        )
        loadFreeRooms()
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
        val currentState = _uiState.value
        val dateTime = if (currentState.isCustomTime) {
            currentState.selectedDateTime
        } else {
            LocalDateTime.now()
        }

        getFreeRoomsUseCase(dateTime).onSuccess { freeRooms ->
            _uiState.value = rebuildPresentation(
                current = _uiState.value.copy(
                    freeRooms = freeRooms,
                ),
            ).copy(
                selectedDateTime = dateTime,
            )
        }
    }

    private fun rebuildPresentation(
        current: RoomListUiState,
        selectedCampusKey: String = current.selectedCampusKey,
        selectedGroupKey: String? = current.selectedGroupKey,
        visibilityMode: RoomVisibilityMode = current.visibilityMode,
    ): RoomListUiState {
        val initialPresentation = roomPresentationFormatter.buildRoomListPresentation(
            freeRooms = current.freeRooms,
            selectedCampusKey = selectedCampusKey,
            selectedGroupKey = selectedGroupKey,
            visibilityMode = visibilityMode,
        )
        val safeCampusKey = sanitizeCampusKey(initialPresentation, selectedCampusKey)
        val safeGroupKey = sanitizeGroupKey(initialPresentation, selectedGroupKey)
        val presentation = if (safeCampusKey == selectedCampusKey && safeGroupKey == selectedGroupKey) {
            initialPresentation
        } else {
            roomPresentationFormatter.buildRoomListPresentation(
                freeRooms = current.freeRooms,
                selectedCampusKey = safeCampusKey,
                selectedGroupKey = safeGroupKey,
                visibilityMode = visibilityMode,
            )
        }

        return current.copy(
            visibleRooms = presentation.visibleRooms,
            sections = presentation.sections,
            campusFilters = presentation.campusFilters,
            groupFilters = presentation.groupFilters,
            selectedCampusKey = safeCampusKey,
            selectedGroupKey = safeGroupKey,
            visibilityMode = visibilityMode,
        )
    }

    private fun sanitizeCampusKey(
        presentation: RoomListPresentation,
        requestedCampusKey: String,
    ): String {
        val knownKeys = presentation.campusFilters.mapNotNull { it.key }.toSet()
        return if (requestedCampusKey in knownKeys) requestedCampusKey else DEFAULT_CAMPUS_KEY
    }

    private fun sanitizeGroupKey(
        presentation: RoomListPresentation,
        requestedGroupKey: String?,
    ): String? {
        if (requestedGroupKey == null) return null
        return requestedGroupKey.takeIf { key ->
            presentation.groupFilters.any { it.key == key }
        }
    }
}
