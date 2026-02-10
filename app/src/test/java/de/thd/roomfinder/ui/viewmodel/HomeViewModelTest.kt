package de.thd.roomfinder.ui.viewmodel

import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import de.thd.roomfinder.domain.usecase.GetFreeRoomsUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private lateinit var fakeRepository: FakeRoomRepository
    private lateinit var useCase: GetFreeRoomsUseCase
    private val testDispatcher = UnconfinedTestDispatcher()

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
    fun `initial load sets freeRoomCount and totalRoomCount`() = runTest {
        val rooms = List(10) { i ->
            TestFixtures.room(id = i, ident = "R$i")
        }
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = HomeViewModel(useCase, fakeRepository)
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals(10, state.totalRoomCount)
        assertEquals(10, state.freeRoomCount) // no events, all free
        assertNull(state.errorMessage)
    }

    @Test
    fun `error from repository sets errorMessage`() = runTest {
        fakeRepository.roomsResult = Result.failure(RuntimeException("Network error"))

        val viewModel = HomeViewModel(useCase, fakeRepository)
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals("Failed to load rooms: Network error", state.errorMessage)
    }

    @Test
    fun `loadData can be called again to refresh`() = runTest {
        val rooms = List(5) { i -> TestFixtures.room(id = i, ident = "R$i") }
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = HomeViewModel(useCase, fakeRepository)
        assertEquals(5, viewModel.uiState.value.totalRoomCount)

        // Update fake data
        val moreRooms = List(8) { i -> TestFixtures.room(id = i, ident = "R$i") }
        fakeRepository.roomsResult = Result.success(moreRooms)

        viewModel.loadData()
        assertEquals(8, viewModel.uiState.value.totalRoomCount)
    }

    @Test
    fun `freeRoomCount is zero when use case returns no free rooms`() = runTest {
        val rooms = listOf(TestFixtures.room(id = 1, ident = "I112"))
        fakeRepository.roomsResult = Result.success(rooms)
        // Event covers all time so the room is occupied
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "I112",
                    startDateTime = java.time.LocalDateTime.of(2020, 1, 1, 0, 0),
                    durationMinutes = 60 * 24 * 365 * 20, // very long event
                ),
            ),
        )

        val viewModel = HomeViewModel(useCase, fakeRepository)
        val state = viewModel.uiState.value

        assertEquals(1, state.totalRoomCount)
        assertEquals(0, state.freeRoomCount)
    }

    @Test
    fun `loading state is false after data loads`() = runTest {
        fakeRepository.roomsResult = Result.success(emptyList())
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = HomeViewModel(useCase, fakeRepository)

        assertFalse(viewModel.uiState.value.isLoading)
    }
}
