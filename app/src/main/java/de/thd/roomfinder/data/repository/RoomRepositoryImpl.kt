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

    override suspend fun getAllRooms(): Result<List<Room>> = runCatching {
        apiService.findRooms()
            .map { it.toDomainModel() }
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
