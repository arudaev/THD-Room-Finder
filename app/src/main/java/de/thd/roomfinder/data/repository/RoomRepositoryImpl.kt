package de.thd.roomfinder.data.repository

import de.thd.roomfinder.data.AppDateFormats
import de.thd.roomfinder.data.local.dao.CacheMetadataDao
import de.thd.roomfinder.data.local.dao.RoomDao
import de.thd.roomfinder.data.local.dao.ScheduledEventDao
import de.thd.roomfinder.data.local.entity.CacheMetadataEntity
import de.thd.roomfinder.data.local.mapper.toDomainModel
import de.thd.roomfinder.data.local.mapper.toEntity
import de.thd.roomfinder.data.mapper.toDomainModel
import de.thd.roomfinder.data.mapper.toDomainModels
import de.thd.roomfinder.data.remote.api.ThabellaApiService
import de.thd.roomfinder.data.remote.dto.FindByDateRequestBody
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.domain.repository.RoomRepository
import java.time.LocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
internal class RoomRepositoryImpl @Inject constructor(
    private val apiService: ThabellaApiService,
    private val roomDao: RoomDao,
    private val scheduledEventDao: ScheduledEventDao,
    private val cacheMetadataDao: CacheMetadataDao,
) : RoomRepository {

    companion object {
        private const val ROOMS_CACHE_KEY = "rooms"
        private const val EVENTS_CACHE_PREFIX = "events_"
        internal const val ROOMS_TTL_MS = 24 * 60 * 60 * 1000L
        internal const val EVENTS_TTL_MS = 5 * 60 * 1000L
    }

    private var cachedRooms: List<Room>? = null

    override suspend fun getAllRooms(): Result<List<Room>> {
        val metadata = cacheMetadataDao.get(ROOMS_CACHE_KEY)
        if (metadata != null && isFresh(metadata.timestamp, ROOMS_TTL_MS)) {
            cachedRooms?.let { return Result.success(it) }
            val localRooms = roomDao.getAllRooms().map { it.toDomainModel() }
            if (localRooms.isNotEmpty()) {
                cachedRooms = localRooms
                return Result.success(localRooms)
            }
        }

        return runCatching {
            apiService.findRooms().map { it.toDomainModel() }
        }.onSuccess { rooms ->
            cachedRooms = rooms
            roomDao.deleteAll()
            roomDao.insertAll(rooms.map { it.toEntity() })
            cacheMetadataDao.set(
                CacheMetadataEntity(ROOMS_CACHE_KEY, System.currentTimeMillis()),
            )
        }.recoverCatching { networkError ->
            val localRooms = roomDao.getAllRooms().map { it.toDomainModel() }
            if (localRooms.isNotEmpty()) {
                cachedRooms = localRooms
                localRooms
            } else {
                throw networkError
            }
        }
    }

    override suspend fun getRoomById(id: Int): Result<Room> {
        // Fast path: in-memory cache
        cachedRooms?.find { it.id == id }?.let { return Result.success(it) }

        // Try local DB
        roomDao.getRoomById(id)?.toDomainModel()?.let { return Result.success(it) }

        // Last resort: fetch all rooms and look up
        val rooms = getAllRooms().getOrElse { return Result.failure(it) }
        val room = rooms.find { it.id == id }
            ?: return Result.failure(NoSuchElementException("Room with id $id not found"))
        return Result.success(room)
    }

    override suspend fun getScheduledEvents(
        dateTime: LocalDateTime,
    ): Result<List<ScheduledEvent>> {
        val dateKey = dateTime.format(AppDateFormats.DATE_KEY)
        val cacheKey = "$EVENTS_CACHE_PREFIX$dateKey"

        val metadata = cacheMetadataDao.get(cacheKey)
        if (metadata != null && isFresh(metadata.timestamp, EVENTS_TTL_MS)) {
            return Result.success(scheduledEventDao.getEventsByDate(dateKey).map { it.toDomainModel() })
        }

        return runCatching {
            val formatted = dateTime.format(AppDateFormats.EVENT_DATE_TIME)
            apiService.findPeriodsByDate(
                dateTime = formatted,
                body = FindByDateRequestBody(sqlDate = formatted),
            ).flatMap { it.toDomainModels() }
        }.onSuccess { events ->
            scheduledEventDao.deleteByDate(dateKey)
            scheduledEventDao.insertAll(events.map { it.toEntity(dateKey) })
            cacheMetadataDao.set(
                CacheMetadataEntity(cacheKey, System.currentTimeMillis()),
            )
        }.recoverCatching { networkError ->
            val localEvents = scheduledEventDao.getEventsByDate(dateKey).map { it.toDomainModel() }
            if (localEvents.isNotEmpty()) localEvents else throw networkError
        }
    }

    private fun isFresh(timestamp: Long, ttlMs: Long): Boolean =
        System.currentTimeMillis() - timestamp < ttlMs
}
