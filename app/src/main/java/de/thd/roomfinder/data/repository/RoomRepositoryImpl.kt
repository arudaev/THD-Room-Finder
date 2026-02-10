package de.thd.roomfinder.data.repository

import de.thd.roomfinder.data.mapper.toDomainModel
import de.thd.roomfinder.data.mapper.toDomainModels
import de.thd.roomfinder.data.remote.api.ThabellaApiService
import de.thd.roomfinder.data.remote.dto.FindByDateRequestBody
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.domain.repository.RoomRepository
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
internal class RoomRepositoryImpl @Inject constructor(
    private val apiService: ThabellaApiService,
) : RoomRepository {

    private val dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    private var cachedRooms: List<Room>? = null

    override suspend fun getAllRooms(): Result<List<Room>> = runCatching {
        apiService.findRooms()
            .map { it.toDomainModel() }
            .also { cachedRooms = it }
    }

    override suspend fun getRoomById(id: Int): Result<Room> {
        val rooms = cachedRooms ?: getAllRooms().getOrElse { return Result.failure(it) }
        val room = rooms.find { it.id == id }
            ?: return Result.failure(NoSuchElementException("Room with id $id not found"))
        return Result.success(room)
    }

    override suspend fun getScheduledEvents(
        dateTime: LocalDateTime,
    ): Result<List<ScheduledEvent>> = runCatching {
        val formatted = dateTime.format(dateTimeFormatter)
        apiService.findPeriodsByDate(
            dateTime = formatted,
            body = FindByDateRequestBody(sqlDate = formatted),
        ).flatMap { it.toDomainModels() }
    }
}
