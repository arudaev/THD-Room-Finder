package de.thd.roomfinder.domain.usecase

import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.domain.repository.RoomRepository
import java.time.LocalDateTime
import javax.inject.Inject

class GetRoomScheduleUseCase @Inject constructor(
    private val roomRepository: RoomRepository,
) {

    suspend operator fun invoke(
        roomIdent: String,
        dateTime: LocalDateTime,
    ): Result<List<ScheduledEvent>> {
        return roomRepository.getScheduledEvents(dateTime).map { allEvents ->
            allEvents
                .filter { it.roomIdent == roomIdent }
                .sortedBy { it.startDateTime }
        }
    }
}
