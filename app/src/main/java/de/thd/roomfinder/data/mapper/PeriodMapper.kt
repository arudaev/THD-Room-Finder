package de.thd.roomfinder.data.mapper

import de.thd.roomfinder.data.AppDateFormats
import de.thd.roomfinder.data.remote.dto.PeriodDto
import de.thd.roomfinder.domain.model.ScheduledEvent
import java.time.LocalDateTime

/**
 * Maps a single PeriodDto to a list of ScheduledEvents.
 * One PeriodDto can reference multiple rooms, so this produces
 * one ScheduledEvent per room entry in room_ident.
 */
internal fun PeriodDto.toDomainModels(): List<ScheduledEvent> {
    val start = try {
        LocalDateTime.parse(startDateTime, AppDateFormats.EVENT_DATE_TIME)
    } catch (_: Exception) {
        return emptyList()
    }
    val end = start.plusMinutes(duration.toLong())

    return roomIdent.map { (ident, name) ->
        ScheduledEvent(
            id = id,
            roomIdent = ident,
            roomName = name,
            startDateTime = start,
            endDateTime = end,
            durationMinutes = duration,
            eventType = eventTypeDescription ?: "Unknown",
            title = titleText ?: eventTypeDescription ?: "Unknown",
        )
    }
}
