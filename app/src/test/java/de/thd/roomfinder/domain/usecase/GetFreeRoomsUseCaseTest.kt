package de.thd.roomfinder.domain.usecase

import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.repository.FakeRoomRepository
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDateTime

class GetFreeRoomsUseCaseTest {

    private lateinit var fakeRepository: FakeRoomRepository
    private lateinit var useCase: GetFreeRoomsUseCase

    private val queryTime = LocalDateTime.of(2025, 1, 15, 10, 30)

    @Before
    fun setUp() {
        fakeRepository = FakeRoomRepository()
        useCase = GetFreeRoomsUseCase(fakeRepository)
    }

    @Test
    fun `returns all rooms as free when no events exist`() = runTest {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "I112", building = "I"),
            TestFixtures.room(id = 2, ident = "C102", building = "C"),
            TestFixtures.room(id = 3, ident = "A008", building = "A"),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val result = useCase(queryTime)

        assertTrue(result.isSuccess)
        assertEquals(3, result.getOrThrow().size)
    }

    @Test
    fun `excludes rooms with ongoing events`() = runTest {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "I112"),
            TestFixtures.room(id = 2, ident = "C102"),
        )
        val events = listOf(
            TestFixtures.event(
                roomIdent = "I112",
                startDateTime = LocalDateTime.of(2025, 1, 15, 10, 0),
                durationMinutes = 90,
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        assertEquals(1, result.size)
        assertEquals("C102", result[0].room.ident)
    }

    @Test
    fun `includes rooms where event has ended`() = runTest {
        val rooms = listOf(TestFixtures.room(id = 1, ident = "I112"))
        val events = listOf(
            TestFixtures.event(
                roomIdent = "I112",
                startDateTime = LocalDateTime.of(2025, 1, 15, 8, 0),
                durationMinutes = 90, // ends at 9:30, before query at 10:30
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        assertEquals(1, result.size)
        assertEquals("I112", result[0].room.ident)
    }

    @Test
    fun `computes freeUntil as next event start time`() = runTest {
        val rooms = listOf(TestFixtures.room(id = 1, ident = "I112"))
        val nextEventStart = LocalDateTime.of(2025, 1, 15, 14, 0)
        val events = listOf(
            TestFixtures.event(
                roomIdent = "I112",
                startDateTime = nextEventStart,
                durationMinutes = 90,
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        assertEquals(nextEventStart, result[0].freeUntil)
    }

    @Test
    fun `freeUntil is null when no future events for room`() = runTest {
        val rooms = listOf(TestFixtures.room(id = 1, ident = "I112"))
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val result = useCase(queryTime).getOrThrow()

        assertNull(result[0].freeUntil)
    }

    @Test
    fun `sorts rooms with null freeUntil first`() = runTest {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "A001", building = "A", name = "A001"),
            TestFixtures.room(id = 2, ident = "B001", building = "B", name = "B001"),
        )
        val events = listOf(
            TestFixtures.event(
                roomIdent = "A001",
                startDateTime = LocalDateTime.of(2025, 1, 15, 14, 0),
                durationMinutes = 60,
            ),
            // B001 has no events, so freeUntil=null (free all day)
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        // B001 (null freeUntil) should come first
        assertNull(result[0].freeUntil)
        assertEquals("B001", result[0].room.ident)
        assertEquals("A001", result[1].room.ident)
    }

    @Test
    fun `priority rooms outrank lower bucket rooms before freeUntil sorting`() = runTest {
        val rooms = listOf(
            TestFixtures.room(
                id = 1,
                ident = "A215",
                name = "A215 - Besprechungsraum",
                building = "A",
                displayName = "Besprechungsraum",
            ),
            TestFixtures.room(
                id = 2,
                ident = "C102",
                name = "C102",
                building = "C",
                displayName = "C102",
            ),
        )
        val events = listOf(
            TestFixtures.event(
                roomIdent = "C102",
                startDateTime = LocalDateTime.of(2025, 1, 15, 11, 0),
                durationMinutes = 60,
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        assertEquals("C102", result[0].room.ident)
        assertEquals("A215", result[1].room.ident)
    }

    @Test
    fun `priority labs outrank special spaces in the same building`() = runTest {
        val rooms = listOf(
            TestFixtures.room(
                id = 1,
                ident = "A009",
                name = "A009 - Besprechungsraum",
                building = "A",
                displayName = "Besprechungsraum",
            ),
            TestFixtures.room(
                id = 2,
                ident = "A008",
                name = "A008 - Labor",
                building = "A",
                displayName = "Labor",
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val result = useCase(queryTime).getOrThrow()

        assertEquals("A008", result[0].room.ident)
        assertEquals("A009", result[1].room.ident)
    }

    @Test
    fun `excluded rooms stay in the lower bucket even when free all day`() = runTest {
        val rooms = listOf(
            TestFixtures.room(
                id = 1,
                ident = "ITC-HS2",
                name = "ITC 2: HS 2",
                building = "ITC",
                displayName = "HS 2",
            ),
            TestFixtures.room(
                id = 2,
                ident = "J007",
                name = "J007 - Fernsehstudio",
                building = "J",
                displayName = "Fernsehstudio",
            ),
        )
        val events = listOf(
            TestFixtures.event(
                roomIdent = "ITC-HS2",
                startDateTime = LocalDateTime.of(2025, 1, 15, 12, 0),
                durationMinutes = 60,
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        assertEquals("ITC-HS2", result[0].room.ident)
        assertEquals("J007", result[1].room.ident)
    }

    @Test
    fun `sorts rooms with freeUntil descending`() = runTest {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "A001", building = "A", name = "A001"),
            TestFixtures.room(id = 2, ident = "A002", building = "A", name = "A002"),
        )
        val events = listOf(
            TestFixtures.event(
                roomIdent = "A001",
                startDateTime = LocalDateTime.of(2025, 1, 15, 14, 0),
                durationMinutes = 60,
            ),
            TestFixtures.event(
                roomIdent = "A002",
                startDateTime = LocalDateTime.of(2025, 1, 15, 16, 0),
                durationMinutes = 60,
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        // A002 free until 16:00 should come before A001 free until 14:00
        assertEquals("A002", result[0].room.ident)
        assertEquals("A001", result[1].room.ident)
    }

    @Test
    fun `sorts by building then name as tiebreaker within a bucket`() = runTest {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "C102", building = "C", name = "C102"),
            TestFixtures.room(id = 2, ident = "A008", building = "A", name = "A008"),
            TestFixtures.room(id = 3, ident = "A001", building = "A", name = "A001"),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(emptyList())

        val result = useCase(queryTime).getOrThrow()

        // All are priority rooms with null freeUntil, so sorted by building then name
        assertEquals("A001", result[0].room.ident)
        assertEquals("A008", result[1].room.ident)
        assertEquals("C102", result[2].room.ident)
    }

    @Test
    fun `returns empty list when all rooms are occupied`() = runTest {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "I112"),
            TestFixtures.room(id = 2, ident = "C102"),
        )
        val events = listOf(
            TestFixtures.event(
                roomIdent = "I112",
                startDateTime = LocalDateTime.of(2025, 1, 15, 10, 0),
                durationMinutes = 90,
            ),
            TestFixtures.event(
                roomIdent = "C102",
                startDateTime = LocalDateTime.of(2025, 1, 15, 10, 0),
                durationMinutes = 90,
            ),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.success(events)

        val result = useCase(queryTime).getOrThrow()

        assertTrue(result.isEmpty())
    }

    @Test
    fun `propagates failure from getAllRooms`() = runTest {
        fakeRepository.roomsResult = Result.failure(RuntimeException("Network error"))

        val result = useCase(queryTime)

        assertTrue(result.isFailure)
    }

    @Test
    fun `returns all rooms as free when getScheduledEvents fails`() = runTest {
        val rooms = listOf(
            TestFixtures.room(id = 1, ident = "I112"),
            TestFixtures.room(id = 2, ident = "C102"),
        )
        fakeRepository.roomsResult = Result.success(rooms)
        fakeRepository.eventsResult = Result.failure(RuntimeException("Network error"))

        val result = useCase(queryTime).getOrThrow()

        // All rooms returned as free since events defaulted to emptyList()
        assertEquals(2, result.size)
        result.forEach { assertNull(it.freeUntil) }
    }
}
