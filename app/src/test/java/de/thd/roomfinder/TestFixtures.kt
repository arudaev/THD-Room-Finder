package de.thd.roomfinder

import de.thd.roomfinder.domain.model.FreeRoom
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.model.ScheduledEvent
import java.time.LocalDateTime

object TestFixtures {

    fun room(
        id: Int = 1,
        ident: String = "I112",
        name: String = "I112 - Seminar Room",
        building: String = "I",
        floor: Int? = 1,
        displayName: String = "Seminar Room",
        seatsRegular: Int = 30,
        seatsExam: Int = 20,
        facilities: List<String> = listOf("Beamer", "Whiteboard"),
        bookable: Boolean = true,
        inChargeName: String? = "Max Mueller",
        inChargeEmail: String? = "max.mueller@th-deg.de",
        untisLongname: String? = null,
    ): Room = Room(
        id = id,
        ident = ident,
        name = name,
        building = building,
        floor = floor,
        displayName = displayName,
        seatsRegular = seatsRegular,
        seatsExam = seatsExam,
        facilities = facilities,
        bookable = bookable,
        inChargeName = inChargeName,
        inChargeEmail = inChargeEmail,
        untisLongname = untisLongname,
    )

    fun event(
        id: Int = 1,
        roomIdent: String = "I112",
        roomName: String = "I 112",
        startDateTime: LocalDateTime = LocalDateTime.of(2025, 1, 15, 10, 0),
        durationMinutes: Int = 90,
        endDateTime: LocalDateTime = startDateTime.plusMinutes(durationMinutes.toLong()),
        eventType: String = "Vorlesung",
        title: String = "Mathematik I",
    ): ScheduledEvent = ScheduledEvent(
        id = id,
        roomIdent = roomIdent,
        roomName = roomName,
        startDateTime = startDateTime,
        endDateTime = endDateTime,
        durationMinutes = durationMinutes,
        eventType = eventType,
        title = title,
    )

    fun freeRoom(
        room: Room = room(),
        freeUntil: LocalDateTime? = null,
    ): FreeRoom = FreeRoom(
        room = room,
        freeUntil = freeUntil,
    )
}
