package de.thd.roomfinder.data.repository

import de.thd.roomfinder.TestFixtures
import de.thd.roomfinder.data.local.dao.CacheMetadataDao
import de.thd.roomfinder.data.local.dao.RoomDao
import de.thd.roomfinder.data.local.dao.ScheduledEventDao
import de.thd.roomfinder.data.local.entity.CacheMetadataEntity
import de.thd.roomfinder.data.local.entity.RoomEntity
import de.thd.roomfinder.data.local.entity.ScheduledEventEntity
import de.thd.roomfinder.data.local.mapper.toDomainModel
import de.thd.roomfinder.data.local.mapper.toEntity
import de.thd.roomfinder.data.remote.api.ThabellaApiService
import de.thd.roomfinder.data.remote.dto.FindByDateRequestBody
import de.thd.roomfinder.data.remote.dto.PeriodDto
import de.thd.roomfinder.data.remote.dto.RoomDto
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDateTime

class RoomRepositoryImplTest {

    private lateinit var fakeApi: FakeThabellaApiService
    private lateinit var fakeRoomDao: FakeRoomDao
    private lateinit var fakeEventDao: FakeScheduledEventDao
    private lateinit var fakeMetadataDao: FakeCacheMetadataDao
    private lateinit var repository: RoomRepositoryImpl

    @Before
    fun setUp() {
        fakeApi = FakeThabellaApiService()
        fakeRoomDao = FakeRoomDao()
        fakeEventDao = FakeScheduledEventDao()
        fakeMetadataDao = FakeCacheMetadataDao()
        repository = RoomRepositoryImpl(fakeApi, fakeRoomDao, fakeEventDao, fakeMetadataDao)
    }

    // ── getAllRooms ─────────────────────────────────────────────────────────────

    @Test
    fun `getAllRooms fetches from network when cache is stale`() = runTest {
        val networkRoom = roomDto(id = 1)
        fakeApi.roomsResult = listOf(networkRoom)

        val result = repository.getAllRooms()

        assertTrue(result.isSuccess)
        assertEquals(1, result.getOrThrow().size)
        assertEquals(1, fakeApi.findRoomsCallCount)
    }

    @Test
    fun `getAllRooms saves rooms to DB after network fetch`() = runTest {
        fakeApi.roomsResult = listOf(roomDto(id = 1), roomDto(id = 2))

        repository.getAllRooms()

        assertEquals(2, fakeRoomDao.rooms.size)
    }

    @Test
    fun `getAllRooms reads from DB when cache is fresh and in-memory is empty`() = runTest {
        val room = TestFixtures.room(id = 1)
        fakeRoomDao.rooms[1] = room.toEntity()
        fakeMetadataDao.setFresh("rooms")

        val result = repository.getAllRooms()

        assertTrue(result.isSuccess)
        assertEquals(0, fakeApi.findRoomsCallCount)
        assertEquals(1, result.getOrThrow().size)
    }

    @Test
    fun `getAllRooms skips DB when in-memory is populated and cache is fresh`() = runTest {
        fakeApi.roomsResult = listOf(roomDto(id = 1))
        repository.getAllRooms() // first call populates in-memory + DB
        fakeMetadataDao.setFresh("rooms")
        val initialDbCallCount = fakeRoomDao.getAllRoomsCallCount

        repository.getAllRooms() // second call should hit in-memory only

        assertEquals(1, fakeApi.findRoomsCallCount) // no second network call
        assertEquals(initialDbCallCount, fakeRoomDao.getAllRoomsCallCount) // no extra DB call
    }

    @Test
    fun `getAllRooms falls back to DB on network failure`() = runTest {
        val room = TestFixtures.room(id = 5)
        fakeRoomDao.rooms[5] = room.toEntity()
        fakeApi.roomsError = RuntimeException("No network")

        val result = repository.getAllRooms()

        assertTrue(result.isSuccess)
        assertEquals(5, result.getOrThrow().first().id)
    }

    @Test
    fun `getAllRooms rethrows when network fails and DB is empty`() = runTest {
        fakeApi.roomsError = RuntimeException("No network")

        val result = repository.getAllRooms()

        assertTrue(result.isFailure)
    }

    // ── getScheduledEvents ──────────────────────────────────────────────────────

    @Test
    fun `getScheduledEvents fetches from network when cache is stale`() = runTest {
        fakeApi.periodsResult = listOf(periodDto())
        val dateTime = LocalDateTime.of(2025, 6, 10, 10, 0)

        val result = repository.getScheduledEvents(dateTime)

        assertTrue(result.isSuccess)
        assertEquals(1, fakeApi.findPeriodsByDateCallCount)
    }

    @Test
    fun `getScheduledEvents reads from DB when events cache is fresh`() = runTest {
        val dateKey = "2025-06-10"
        val eventEntity = TestFixtures.event().toEntity(dateKey)
        fakeEventDao.eventsByDate[dateKey] = mutableListOf(eventEntity)
        fakeMetadataDao.setFresh("events_$dateKey")
        val dateTime = LocalDateTime.of(2025, 6, 10, 10, 0)

        val result = repository.getScheduledEvents(dateTime)

        assertTrue(result.isSuccess)
        assertEquals(0, fakeApi.findPeriodsByDateCallCount)
    }

    @Test
    fun `getScheduledEvents falls back to DB events on network failure`() = runTest {
        val dateKey = "2025-06-10"
        val eventEntity = TestFixtures.event().toEntity(dateKey)
        fakeEventDao.eventsByDate[dateKey] = mutableListOf(eventEntity)
        fakeApi.periodsError = RuntimeException("No network")
        val dateTime = LocalDateTime.of(2025, 6, 10, 10, 0)

        val result = repository.getScheduledEvents(dateTime)

        assertTrue(result.isSuccess)
    }

    @Test
    fun `getScheduledEvents rethrows when network fails and no cached events`() = runTest {
        fakeApi.periodsError = RuntimeException("No network")
        val dateTime = LocalDateTime.of(2025, 6, 10, 10, 0)

        val result = repository.getScheduledEvents(dateTime)

        assertTrue(result.isFailure)
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private fun roomDto(id: Int = 1) = RoomDto(
        id = id,
        ident = "R$id",
        name = "Room $id",
    )

    private fun periodDto() = PeriodDto(
        id = 1,
        startDateTime = "2025-06-10 10:00",
        duration = 90,
        roomIdent = mapOf("I112" to "I 112"),
        eventTypeDescription = "Vorlesung",
        titleText = null,
    )
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

private class FakeThabellaApiService : ThabellaApiService {
    var roomsResult: List<RoomDto> = emptyList()
    var roomsError: Throwable? = null
    var periodsResult: List<PeriodDto> = emptyList()
    var periodsError: Throwable? = null

    var findRoomsCallCount = 0
    var findPeriodsByDateCallCount = 0

    override suspend fun findRooms(body: Map<String, String>): List<RoomDto> {
        findRoomsCallCount++
        roomsError?.let { throw it }
        return roomsResult
    }

    override suspend fun findPeriodsByDate(dateTime: String, body: FindByDateRequestBody): List<PeriodDto> {
        findPeriodsByDateCallCount++
        periodsError?.let { throw it }
        return periodsResult
    }
}

private class FakeRoomDao : RoomDao {
    val rooms = mutableMapOf<Int, RoomEntity>()
    var getAllRoomsCallCount = 0

    override suspend fun getAllRooms(): List<RoomEntity> {
        getAllRoomsCallCount++
        return rooms.values.toList()
    }

    override suspend fun getRoomById(id: Int): RoomEntity? = rooms[id]

    override suspend fun insertAll(rooms: List<RoomEntity>) {
        rooms.forEach { this.rooms[it.id] = it }
    }

    override suspend fun deleteAll() = rooms.clear()
}

private class FakeScheduledEventDao : ScheduledEventDao {
    val eventsByDate = mutableMapOf<String, MutableList<ScheduledEventEntity>>()

    override suspend fun getEventsByDate(dateKey: String): List<ScheduledEventEntity> =
        eventsByDate[dateKey] ?: emptyList()

    override suspend fun insertAll(events: List<ScheduledEventEntity>) {
        events.forEach { event ->
            eventsByDate.getOrPut(event.dateKey) { mutableListOf() }.add(event)
        }
    }

    override suspend fun deleteByDate(dateKey: String) {
        eventsByDate.remove(dateKey)
    }

    override suspend fun deleteAll() = eventsByDate.clear()
}

private class FakeCacheMetadataDao : CacheMetadataDao {
    private val store = mutableMapOf<String, CacheMetadataEntity>()

    fun setFresh(key: String) {
        store[key] = CacheMetadataEntity(key, System.currentTimeMillis())
    }

    override suspend fun get(key: String): CacheMetadataEntity? = store[key]

    override suspend fun set(metadata: CacheMetadataEntity) {
        store[metadata.key] = metadata
    }
}
