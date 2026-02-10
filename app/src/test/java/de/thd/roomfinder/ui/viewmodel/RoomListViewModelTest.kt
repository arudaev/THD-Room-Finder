package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.viewModelScope
import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import de.thd.roomfinder.domain.usecase.GetFreeRoomsUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDateTime

@OptIn(ExperimentalCoroutinesApi::class)
class RoomListViewModelTest {

    private lateinit var fakeRepository: FakeRoomRepository
    private lateinit var useCase: GetFreeRoomsUseCase
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeRepository = FakeRoomRepository()
        useCase = GetFreeRoomsUseCase(fakeRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial load populates freeRooms and buildings`() = runTest(testDispatcher) {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "I112", building = "I"),
            TestFixtures.room(id = 2, ident = "C102", building = "C"),
            TestFixtures.room(id = 3, ident = "I113", building = "I"),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase)
        runCurrent()
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals(3, state.freeRooms.size)
        assertEquals(3, state.filteredRooms.size)
        assertEquals(listOf("C", "I"), state.buildings)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `selectBuilding filters rooms by building`() = runTest(testDispatcher) {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "I112", building = "I"),
            TestFixtures.room(id = 2, ident = "C102", building = "C"),
            TestFixtures.room(id = 3, ident = "I113", building = "I"),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase)
        runCurrent()
        viewModel.selectBuilding("I")

        val state = viewModel.uiState.value
        assertEquals("I", state.selectedBuilding)
        assertEquals(2, state.filteredRooms.size)
        assertTrue(state.filteredRooms.all { it.room.building == "I" })

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `selectBuilding null shows all rooms`() = runTest(testDispatcher) {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "I112", building = "I"),
            TestFixtures.room(id = 2, ident = "C102", building = "C"),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase)
        runCurrent()
        viewModel.selectBuilding("I")
        assertEquals(1, viewModel.uiState.value.filteredRooms.size)

        viewModel.selectBuilding(null)
        val state = viewModel.uiState.value
        assertNull(state.selectedBuilding)
        assertEquals(2, state.filteredRooms.size)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `setDateTime triggers reload with new time`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(emptyList())
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase)
        runCurrent()
        val futureTime = LocalDateTime.of(2025, 6, 15, 14, 0)

        viewModel.setDateTime(futureTime)
        runCurrent()
        val state = viewModel.uiState.value

        assertTrue(state.isCustomTime)
        assertEquals(futureTime, state.selectedDateTime)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `resetToNow clears custom time flag`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(emptyList())
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase)
        runCurrent()
        viewModel.setDateTime(LocalDateTime.of(2025, 6, 15, 14, 0))
        runCurrent()
        assertTrue(viewModel.uiState.value.isCustomTime)

        viewModel.resetToNow()
        runCurrent()
        val state = viewModel.uiState.value
        assertFalse(state.isCustomTime)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `error state set when use case fails`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.failure(RuntimeException("Network error"))
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase)
        runCurrent()
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals("Failed to load free rooms: Network error", state.errorMessage)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `filtered rooms update when building filter changes`() = runTest(testDispatcher) {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "A001", building = "A"),
            TestFixtures.room(id = 2, ident = "B001", building = "B"),
            TestFixtures.room(id = 3, ident = "C001", building = "C"),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase)
        runCurrent()

        viewModel.selectBuilding("A")
        assertEquals(1, viewModel.uiState.value.filteredRooms.size)

        viewModel.selectBuilding("B")
        assertEquals(1, viewModel.uiState.value.filteredRooms.size)
        assertEquals("B001", viewModel.uiState.value.filteredRooms[0].room.ident)

        viewModel.viewModelScope.cancel()
    }
}
