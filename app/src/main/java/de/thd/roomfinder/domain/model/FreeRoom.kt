package de.thd.roomfinder.domain.model

import java.time.LocalDateTime

data class FreeRoom(
    val room: Room,
    val freeUntil: LocalDateTime?,
)
