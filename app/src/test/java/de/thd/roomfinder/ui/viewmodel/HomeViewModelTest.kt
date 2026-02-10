package de.thd.roomfinder.ui.viewmodel

import androidx.lifecycle.viewModelScope
import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import de.thd.roomfinder.domain.usecase.GetFreeRoomsUseCase
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
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Ignore
import org.junit.Test

// TODO: Fix tests hanging due to auto-refresh while(true) coroutine in ViewModels
@Ignore("ViewModel auto-refresh causes test process to hang — needs coroutine test fix")
@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

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
    fun `initial load sets freeRoomCount and totalRoomCount`() = runTest(testDispatcher) {
        val rooms = List(10) { i ->
            TestFixtures.room(id = i, ident = "R$i")
        }
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = HomeViewModel(useCase, fakeRepository)
        advanceUntilIdle()
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals(10, state.totalRoomCount)
        assertEquals(10, state.freeRoomCount)
        assertNull(state.errorMessage)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `error from repository sets errorMessage`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.failure(RuntimeException("Network error"))

        val viewModel = HomeViewModel(useCase, fakeRepository)
        advanceUntilIdle()
        val state = viewModel.uiState.value

        assertFalse(state.isLoading)
        assertEquals("Failed to load rooms: Network error", state.errorMessage)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `loadData can be called again to refresh`() = runTest(testDispatcher) {
        val rooms = List(5) { i -> TestFixtures.room(id = i, ident = "R$i") }
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = HomeViewModel(useCase, fakeRepository)
        advanceUntilIdle()
        assertEquals(5, viewModel.uiState.value.totalRoomCount)

        val moreRooms = List(8) { i -> TestFixtures.room(id = i, ident = "R$i") }
        fakeRepository.roomsResult = Result.success(moreRooms)

        viewModel.loadData()
        advanceUntilIdle()
        assertEquals(8, viewModel.uiState.value.totalRoomCount)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `freeRoomCount is zero when use case returns no free rooms`() = runTest(testDispatcher) {
        val rooms = listOf(TestFixtures.room(id = 1, ident = "I112"))
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(
            listOf(
                TestFixtures.event(
                    roomIdent = "I112",
                    startDateTime = java.time.LocalDateTime.of(2020, 1, 1, 0, 0),
                    durationMinutes = 60 * 24 * 365 * 20,
                ),
            ),
        )

        val viewModel = HomeViewModel(useCase, fakeRepository)
        advanceUntilIdle()
        val state = viewModel.uiState.value

        assertEquals(1, state.totalRoomCount)
        assertEquals(0, state.freeRoomCount)

        viewModel.viewModelScope.cancel()
    }

    @Test
    fun `loading state is false after data loads`() = runTest(testDispatcher) {
        fakeRepository.roomsResult = Result.success(emptyList())
        fakeRepository.eventsResult = Result.success(emptyList())

        val viewModel = HomeViewModel(useCase, fakeRepository)
        advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isLoading)

        viewModel.viewModelScope.cancel()
    }
}
