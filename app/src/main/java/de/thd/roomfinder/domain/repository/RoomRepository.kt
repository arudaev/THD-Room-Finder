package de.thd.roomfinder.domain.repository

import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import java.time.LocalDateTime

interface RoomRepository {

    suspend fun getAllRooms(): Result<List<Room>>

    suspend fun getRoomById(id: Int): Result<Room>

    suspend fun getScheduledEvents(dateTime: LocalDateTime): Result<List<ScheduledEvent>>
}
