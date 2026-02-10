package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import de.thd.roomfinder.domain.usecase.GetRoomScheduleUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

// TODO: Fix tests hanging due to auto-refresh while(true) coroutine in ViewModels
@Ignore("ViewModel auto-refresh causes test process to hang — needs coroutine test fix")
@OptIn(ExperimentalCoroutinesApi::class)
class RoomDetailViewModelTest {

    private lateinit var fakeRepository: FakeRoomRepository
    private lateinit var useCase: GetRoomScheduleUseCase
    private val testDispatcher = StandardTestDispatcher()

    private val queryDateTime = LocalDateTime.of(2025, 1, 15, 10, 30)
    private val queryEpoch = queryDateTime.atZone(ZoneId.systemDefault()).toEpochSecond()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeRepository = FakeRoomRepository()
        useCase = GetRoomScheduleUseCase(fakeRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(roomId: Int = 1): RoomDetailViewModel {
        val savedStateHandle = SavedStateHandle(
            mapOf(
                "roomId" to roomId,
                "dateTimeEpoch" to queryEpoch,
            ),
        )
        return RoomDetailViewModel(savedStateHandle, fakeRepository, useCase)
    }

    @Test
    fun `loads room and schedule from arguments`() = runTest(testDispatcher) {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "I112",
                    startDateTime = LocalDateTime.of(2025, 1, 15, 14, 0),
                    durationMinutes = 90,
                ),
            ),
        )

        val viewModel = createViewModel(roomId = 1)
        advanceUntilIdle()
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertNotNull(state.room)
        assertEquals("I112", state.room!!.ident)
        assertEquals(1, state.events.size)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `isFreeNow is true when no ongoing event`() = runTest(testDispatcher) {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "I112",
                    startDateTime = LocalDateTime.of(2025, 1, 15, 14, 0),
                    durationMinutes = 90,
                ),
            ),
        )

        val viewModel = createViewModel()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isFreeNow)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `isFreeNow is false when room is occupied`() = runTest(testDispatcher) {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "I112",
                    startDateTime = LocalDateTime.of(2025, 1, 15, 10, 0),
                    durationMinutes = 90,
                ),
            ),
        )

        val viewModel = createViewModel()
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isFreeNow)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `freeUntil is next event start when room is free`() = runTest(testDispatcher) {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        val nextEventStart = LocalDateTime.of(2025, 1, 15, 14, 0)
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "I112",
                    startDateTime = nextEventStart,
                    durationMinutes = 90,
                ),
            ),
        )

        val viewModel = createViewModel()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isFreeNow)
        assertEquals(nextEventStart, viewModel.uiState.value.freeUntil)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `freeUntil is null when room is occupied`() = runTest(testDispatcher) {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "I112",
                    startDateTime = LocalDateTime.of(2025, 1, 15, 10, 0),
                    durationMinutes = 90,
                ),
            ),
        )

        val viewModel = createViewModel()
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isFreeNow)
        assertNull(viewModel.uiState.value.freeUntil)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `freeUntil is null when no future events`() = runTest(testDispatcher) {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = createViewModel()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isFreeNow)
        assertNull(viewModel.uiState.value.freeUntil)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `error when room not found`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(emptyList())

        val viewModel = createViewModel(roomId = 999)
        advanceUntilIdle()
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("not found"))

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `filters events to only show current room`() = runTest(testDispatcher) {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(id = 1, roomIdent = "I112", title = "Math"),
                TestFixtures.event(id = 2, roomIdent = "C102", title = "Physics"),
                TestFixtures.event(id = 3, roomIdent = "I112", title = "Chemistry"),
            ),
        )

        val viewModel = createViewModel()
        advanceUntilIdle()
        val state = viewModel.uiState.value

        assertEquals(2, state.events.size)
        assertTrue(state.events.all { it.roomIdent == "I112" })

        viewModel.viewModelScope.cancel()
    }
}
