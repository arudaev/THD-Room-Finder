package de.thd.roomfinder.data.repository

import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.domain.repository.RoomRepository
import java.time.LocalDateTime

class FakeRoomRepository : RoomRepository {

    var roomsResult: Result<List<Room>> = Result.success(emptyList())
    var roomByIdResult: Result<Room>? = null
    var eventsResult: Result<List<ScheduledEvent>> = Result.success(emptyList())

    var getAllRoomsCallCount: Int = 0
        private set
    var getScheduledEventsCallCount: Int = 0
        private set
    var lastRequestedDateTime: LocalDateTime? = null
        private set

    override suspend fun getAllRooms(): Result<List<Room>> {
        getAllRoomsCallCount++
        return roomsResult
    }

    override suspend fun getRoomById(id: Int): Result<Room> {
        roomByIdResult?.let { return it }
        return roomsResult.map { rooms ->
            rooms.find { it.id == id }
                ?: throw NoSuchElementException("Room $id not found")
        }
    }

    override suspend fun getScheduledEvents(
        dateTime: LocalDateTime,
    ): Result<List<ScheduledEvent>> {
        getScheduledEventsCallCount++
        lastRequestedDateTime = dateTime
        return eventsResult
    }
}
