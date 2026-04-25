package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import de.thd.roomfinder.domain.presentation.RoomPresentationFormatter
import de.thd.roomfinder.domain.usecase.GetRoomScheduleUseCase
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
    private lateinit var formatter: RoomPresentationFormatter
    private val testDispatcher = StandardTestDispatcher()

    private val queryDateTime = LocalDateTime.of(2025, 1, 15, 10, 30)
    private val queryEpoch = queryDateTime.atZone(ZoneId.systemDefault()).toEpochSecond()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeRepository = FakeRoomRepository()
        useCase = GetRoomScheduleUseCase(fakeRepository)
        formatter = RoomPresentationFormatter.fromRepositoryRoot()
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
        return RoomDetailViewModel(savedStateHandle, fakeRepository, useCase, formatter)
    }

    @Test
    fun `loads room presentation and schedule from arguments`() = runTest(testDispatcher) {
        val room = TestFixtures.room(
            id = 1,
            ident = "I112",
            name = "ITC 2+ 1.31 (Labor Cyber Resilience)",
            building = "ITC 2+",
            displayName = "Labor Cyber Resilience",
        )
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
        try {
            runCurrent()
            val state = viewModel.uiState.value

            assertFalse(state.isLoading)
            assertNotNull(state.roomPresentation)
            assertEquals("ITC 2+ 1.31", state.roomPresentation!!.primaryLabel)
            assertEquals(1, state.events.size)
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }

    @Test
    fun `occupied rooms expose occupiedUntil instead of freeUntil`() = runTest(testDispatcher) {
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
        try {
            runCurrent()

            assertFalse(viewModel.uiState.value.isFreeNow)
            assertNull(viewModel.uiState.value.freeUntil)
            assertEquals(
                LocalDateTime.of(2025, 1, 15, 11, 30),
                viewModel.uiState.value.occupiedUntil,
            )
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }

    @Test
    fun `free rooms expose next freeUntil`() = runTest(testDispatcher) {
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
        try {
            runCurrent()

            assertTrue(viewModel.uiState.value.isFreeNow)
            assertEquals(nextEventStart, viewModel.uiState.value.freeUntil)
            assertNull(viewModel.uiState.value.occupiedUntil)
        } finally {
            viewModel.viewModelScope.cancel()
        }
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
        try {
            runCurrent()
            val state = viewModel.uiState.value

            assertEquals(2, state.events.size)
            assertTrue(state.events.all { it.roomIdent == "I112" })
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }

    @Test
    fun `error when room not found`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(emptyList())

        val viewModel = createViewModel(roomId = 999)
        try {
            runCurrent()
            val state = viewModel.uiState.value

            assertFalse(state.isLoading)
            assertNotNull(state.errorMessage)
            assertTrue(state.errorMessage!!.contains("not found"))
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }
}
