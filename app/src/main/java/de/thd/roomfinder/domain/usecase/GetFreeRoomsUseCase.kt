package de.thd.roomfinder.domain.usecase

import de.thd.roomfinder.domain.model.FreeRoom
import de.thd.roomfinder.domain.repository.RoomRepository
import java.time.LocalDateTime
import javax.inject.Inject

class GetFreeRoomsUseCase @Inject constructor(
    private val roomRepository: RoomRepository,
) {

    suspend operator fun invoke(dateTime: LocalDateTime): Result<List<FreeRoom>> {
        val roomsResult = roomRepository.getAllRooms()
        val rooms = roomsResult.getOrElse { return Result.failure(it) }

        val events = roomRepository.getScheduledEvents(dateTime).getOrDefault(emptyList())

        val occupiedIdents = events
            .filter { it.startDateTime <= dateTime && it.endDateTime > dateTime }
            .map { it.roomIdent }
            .toSet()

        val freeRooms = rooms
            .filter { it.ident !in occupiedIdents }
            .map { room ->
                val nextEvent = events
                    .filter { it.roomIdent == room.ident && it.startDateTime > dateTime }
                    .minByOrNull { it.startDateTime }

                FreeRoom(
                    room = room,
                    freeUntil = nextEvent?.startDateTime,
                )
            }
            .sortedWith(
                compareBy<FreeRoom> { it.freeUntil != null }
                    .thenByDescending { it.freeUntil }
                    .thenBy { it.room.building }
                    .thenBy { it.room.name },
            )

        return Result.success(freeRooms)
    }
}
