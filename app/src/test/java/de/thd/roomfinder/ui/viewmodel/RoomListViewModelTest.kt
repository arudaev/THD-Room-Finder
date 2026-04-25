package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.viewModelScope
import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import de.thd.roomfinder.domain.presentation.RoomPresentationFormatter
import de.thd.roomfinder.domain.presentation.RoomVisibilityMode
import de.thd.roomfinder.domain.usecase.GetFreeRoomsUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import de.thd.roomfinder.util.Constants
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDateTime

@OptIn(ExperimentalCoroutinesApi::class)
class RoomListViewModelTest {

    private lateinit var fakeRepository: FakeRoomRepository
    private lateinit var useCase: GetFreeRoomsUseCase
    private lateinit var formatter: RoomPresentationFormatter
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        fakeRepository = FakeRoomRepository()
        useCase = GetFreeRoomsUseCase(fakeRepository)
        formatter = RoomPresentationFormatter.fromRepositoryRoot()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial load defaults to Deggendorf teaching rooms`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(
            listOf(
                TestFixtures.room(
                    id = 1,
                    ident = "A008",
                    name = "A008 - Labor",
                    building = "A",
                    displayName = "Labor",
                ),
                TestFixtures.room(
                    id = 2,
                    ident = "ecri106",
                    name = "EC.B 1.06 a (Hoersaal)",
                    building = "EC.B",
                    displayName = "Hoersaal",
                ),
                TestFixtures.room(
                    id = 3,
                    ident = "A215",
                    name = "A215 - Besprechungsraum",
                    building = "A",
                    displayName = "Besprechungsraum",
                ),
            ),
        )
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase, formatter)
        try {
            runCurrent()
            val state = viewModel.uiState.value

            assertFalse(state.isLoading)
            assertEquals("deggendorf", state.selectedCampusKey)
            assertEquals(RoomVisibilityMode.TEACHING_ONLY, state.visibilityMode)
            assertEquals(listOf("A008"), state.visibleRooms.map { it.presentation.primaryLabel })
            assertEquals(listOf("A"), state.sections.map { it.groupLabel })
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }

    @Test
    fun `selectCampus switches to ECRI rooms`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(
            listOf(
                TestFixtures.room(
                    id = 1,
                    ident = "A008",
                    name = "A008 - Labor",
                    building = "A",
                    displayName = "Labor",
                ),
                TestFixtures.room(
                    id = 2,
                    ident = "ecri106",
                    name = "EC.B 1.06 a (Hoersaal)",
                    building = "EC.B",
                    displayName = "Hoersaal",
                ),
            ),
        )
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase, formatter)
        try {
            runCurrent()

            viewModel.selectCampus("pfarrkirchen_ecri")
            val state = viewModel.uiState.value

            assertEquals("pfarrkirchen_ecri", state.selectedCampusKey)
            assertEquals(listOf("EC.B 1.06 a"), state.visibleRooms.map { it.presentation.primaryLabel })
            assertEquals(listOf("ECRI · EC.B"), state.sections.map { it.groupLabel })
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }

    @Test
    fun `include secondary venues reveals meeting rooms`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(
            listOf(
                TestFixtures.room(
                    id = 1,
                    ident = "A008",
                    name = "A008 - Labor",
                    building = "A",
                    displayName = "Labor",
                ),
                TestFixtures.room(
                    id = 2,
                    ident = "A215",
                    name = "A215 - Besprechungsraum",
                    building = "A",
                    displayName = "Besprechungsraum",
                ),
            ),
        )
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase, formatter)
        try {
            runCurrent()
            assertEquals(listOf("A008"), viewModel.uiState.value.visibleRooms.map { it.presentation.primaryLabel })

            viewModel.selectVisibilityMode(RoomVisibilityMode.INCLUDE_SECONDARY)
            val state = viewModel.uiState.value

            assertEquals(RoomVisibilityMode.INCLUDE_SECONDARY, state.visibilityMode)
            assertEquals(
                listOf("A008", "A215"),
                state.visibleRooms.map { it.presentation.primaryLabel },
            )
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }

    @Test
    fun `auto-refresh fires after interval and triggers a second use case call`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(
            listOf(TestFixtures.room(id = 1, ident = "A008", name = "A008 - Labor", building = "A", displayName = "Labor")),
        )
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase, formatter)
        try {
            runCurrent()
            val callsAfterInit = fakeRepository.getScheduledEventsCallCount

            advanceTimeBy(Constants.AUTO_REFRESH_INTERVAL_MS + 1)
            runCurrent()

            assertTrue(
                "Expected a second getScheduledEvents call after interval, count was ${fakeRepository.getScheduledEventsCallCount}",
                fakeRepository.getScheduledEventsCallCount > callsAfterInit,
            )
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }

    @Test
    fun `cancelling scope stops auto-refresh loop`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(emptyList())
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = RoomListViewModel(useCase, formatter)
        try {
            runCurrent()
            viewModel.viewModelScope.cancel()
            val callCountAfterCancel = fakeRepository.getScheduledEventsCallCount

            advanceTimeBy(Constants.AUTO_REFRESH_INTERVAL_MS * 3)
            runCurrent()

            assertEquals(
                "No more calls expected after scope cancelled",
                callCountAfterCancel,
                fakeRepository.getScheduledEventsCallCount,
            )
        } finally {
            // scope already cancelled
        }
    }

    @Test
    fun `selectGroup keeps best-room ordering inside the section`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(
            listOf(
                TestFixtures.room(
                    id = 1,
                    ident = "A101",
                    name = "A101",
                    building = "A",
                    displayName = "A101",
                ),
                TestFixtures.room(
                    id = 2,
                    ident = "A102",
                    name = "A102",
                    building = "A",
                    displayName = "A102",
                ),
                TestFixtures.room(
                    id = 3,
                    ident = "B001",
                    name = "B001",
                    building = "B",
                    displayName = "B001",
                ),
            ),
        )
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "A101",
                    startDateTime = LocalDateTime.of(2025, 1, 15, 14, 0),
                ),
                TestFixtures.event(
                    roomIdent = "A102",
                    startDateTime = LocalDateTime.of(2025, 1, 15, 16, 0),
                ),
            ),
        )

        val viewModel = RoomListViewModel(useCase, formatter)
        try {
            runCurrent()
            viewModel.setDateTime(LocalDateTime.of(2025, 1, 15, 10, 30))
            runCurrent()
            viewModel.selectGroup("deggendorf_a")

            val state = viewModel.uiState.value
            assertEquals("deggendorf_a", state.selectedGroupKey)
            assertEquals(
                listOf("A102", "A101"),
                state.visibleRooms.map { it.presentation.primaryLabel },
            )
        } finally {
            viewModel.viewModelScope.cancel()
        }
    }
}
