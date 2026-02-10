package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import de.thd.roomfinder.domain.usecase.GetRoomScheduleUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
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
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

@OptIn(ExperimentalCoroutinesApi::class)
class RoomDetailViewModelTest {

    private lateinit var fakeRepository: FakeRoomRepository
    private lateinit var useCase: GetRoomScheduleUseCase
    private val testDispatcher = UnconfinedTestDispatcher()

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
    fun `loads room and schedule from arguments`() = runTest {
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
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertNotNull(state.room)
        assertEquals("I112", state.room!!.ident)
        assertEquals(1, state.events.size)
    }

    @Test
    fun `isFreeNow is true when no ongoing event`() = runTest {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        // Event is in the future, not at query time
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
        val state = viewModel.uiState.value

        assertTrue(state.isFreeNow)
    }

    @Test
    fun `isFreeNow is false when room is occupied`() = runTest {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        // Event spans the query time (10:00-11:30 covers 10:30)
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
        val state = viewModel.uiState.value

        assertFalse(state.isFreeNow)
    }

    @Test
    fun `freeUntil is next event start when room is free`() = runTest {
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
        val state = viewModel.uiState.value

        assertTrue(state.isFreeNow)
        assertEquals(nextEventStart, state.freeUntil)
    }

    @Test
    fun `freeUntil is null when room is occupied`() = runTest {
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
        val state = viewModel.uiState.value

        assertFalse(state.isFreeNow)
        assertNull(state.freeUntil)
    }

    @Test
    fun `freeUntil is null when no future events`() = runTest {
        val room = TestFixtures.room(id = 1, ident = "I112")
        fakeRepository.roomsResult = Result.success(listOf(room))
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = createViewModel()
        val state = viewModel.uiState.value

        assertTrue(state.isFreeNow)
        assertNull(state.freeUntil)
    }

    @Test
    fun `error when room not found`() = runTest {
        fakeRepository.roomsResult = Result.success(emptyList())

        val viewModel = createViewModel(roomId = 999)
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("not found"))
    }

    @Test
    fun `filters events to only show current room`() = runTest {
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
        val state = viewModel.uiState.value

        assertEquals(2, state.events.size)
        assertTrue(state.events.all { it.roomIdent == "I112" })
    }
}
