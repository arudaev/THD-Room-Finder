package de.thd.roomfinder.domain.usecase

import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDateTime

class GetRoomScheduleUseCaseTest {

    private lateinit var fakeRepository: FakeRoomRepository
    private lateinit var useCase: GetRoomScheduleUseCase

    private val queryTime = LocalDateTime.of(2025, 1, 15, 10, 0)

    @Before
    fun setUp() {
        fakeRepository = FakeRoomRepository()
        useCase = GetRoomScheduleUseCase(fakeRepository)
    }

    @Test
    fun `returns events for specified room only`() = runTest {
        val events = listOf(
            TestFixtures.event(id = 1, roomIdent = "I112", title = "Math"),
            TestFixtures.event(id = 2, roomIdent = "C102", title = "Physics"),
            TestFixtures.event(id = 3, roomIdent = "I112", title = "Chemistry"),
        )
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase("I112", queryTime).getOrThrow()

        assertEquals(2, result.size)
        assertTrue(result.all { it.roomIdent == "I112" })
    }

    @Test
    fun `returns events sorted by start time`() = runTest {
        val events = listOf(
            TestFixtures.event(
                id = 1,
                roomIdent = "I112",
                startDateTime = LocalDateTime.of(2025, 1, 15, 14, 0),
            ),
            TestFixtures.event(
                id = 2,
                roomIdent = "I112",
                startDateTime = LocalDateTime.of(2025, 1, 15, 10, 0),
            ),
            TestFixtures.event(
                id = 3,
                roomIdent = "I112",
                startDateTime = LocalDateTime.of(2025, 1, 15, 12, 0),
            ),
        )
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase("I112", queryTime).getOrThrow()

        assertEquals(
            LocalDateTime.of(2025, 1, 15, 10, 0),
            result[0].startDateTime,
        )
        assertEquals(
            LocalDateTime.of(2025, 1, 15, 12, 0),
            result[1].startDateTime,
        )
        assertEquals(
            LocalDateTime.of(2025, 1, 15, 14, 0),
            result[2].startDateTime,
        )
    }

    @Test
    fun `returns empty list when no events for room`() = runTest {
        val events = listOf(
            TestFixtures.event(id = 1, roomIdent = "C102"),
        )
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase("I112", queryTime).getOrThrow()

        assertTrue(result.isEmpty())
    }

    @Test
    fun `returns empty list when no events at all`() = runTest {
        fakeRepository.eventsResult = Result.success(emptyList())

        val result = useCase("I112", queryTime).getOrThrow()

        assertTrue(result.isEmpty())
    }

    @Test
    fun `propagates failure from repository`() = runTest {
        fakeRepository.eventsResult = Result.failure(RuntimeException("Network error"))

        val result = useCase("I112", queryTime)

        assertTrue(result.isFailure)
    }

    @Test
    fun `passes correct dateTime to repository`() = runTest {
        fakeRepository.eventsResult = Result.success(emptyList())
        val specificTime = LocalDateTime.of(2025, 6, 20, 15, 30)

        useCase("I112", specificTime)

        assertEquals(specificTime, fakeRepository.lastRequestedDateTime)
    }
}
