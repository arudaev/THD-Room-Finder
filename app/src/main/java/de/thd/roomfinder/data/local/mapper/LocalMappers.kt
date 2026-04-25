package de.thd.roomfinder.data.local.mapper

import de.thd.roomfinder.data.AppDateFormats
import de.thd.roomfinder.data.local.entity.RoomEntity
import de.thd.roomfinder.data.local.entity.ScheduledEventEntity
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import java.time.LocalDateTime

internal fun Room.toEntity(): RoomEntity = RoomEntity(
    id = id,
    ident = ident,
    name = name,
    building = building,
    floor = floor,
    displayName = displayName,
    seatsRegular = seatsRegular,
    seatsExam = seatsExam,
    facilities = facilities.joinToString(","),
    bookable = bookable,
    inChargeName = inChargeName,
    inChargeEmail = inChargeEmail,
    untisLongname = untisLongname,
)

internal fun RoomEntity.toDomainModel(): Room = Room(
    id = id,
    ident = ident,
    name = name,
    building = building,
    floor = floor,
    displayName = displayName,
    seatsRegular = seatsRegular,
    seatsExam = seatsExam,
    facilities = if (facilities.isBlank()) emptyList()
    else facilities.split(",").map { it.trim() }.filter { it.isNotBlank() },
    bookable = bookable,
    inChargeName = inChargeName,
    inChargeEmail = inChargeEmail,
    untisLongname = untisLongname,
)

internal fun ScheduledEvent.toEntity(dateKey: String): ScheduledEventEntity =
    ScheduledEventEntity(
        eventId = id,
        roomIdent = roomIdent,
        roomName = roomName,
        startDateTime = startDateTime.format(AppDateFormats.EVENT_DATE_TIME),
        endDateTime = endDateTime.format(AppDateFormats.EVENT_DATE_TIME),
        durationMinutes = durationMinutes,
        eventType = eventType,
        title = title,
        dateKey = dateKey,
    )

internal fun ScheduledEventEntity.toDomainModel(): ScheduledEvent = ScheduledEvent(
    id = eventId,
    roomIdent = roomIdent,
    roomName = roomName,
    startDateTime = LocalDateTime.parse(startDateTime, AppDateFormats.EVENT_DATE_TIME),
    endDateTime = LocalDateTime.parse(endDateTime, AppDateFormats.EVENT_DATE_TIME),
    durationMinutes = durationMinutes,
    eventType = eventType,
    title = title,
)
