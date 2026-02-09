package de.thd.roomfinder.domain.model

import java.time.LocalDateTime

data class ScheduledEvent(
    val id: Int,
    val roomIdent: String,
    val roomName: String,
    val startDateTime: LocalDateTime,
    val endDateTime: LocalDateTime,
    val durationMinutes: Int,
    val eventType: String,
    val title: String,
)
