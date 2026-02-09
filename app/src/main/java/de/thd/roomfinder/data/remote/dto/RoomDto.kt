package de.thd.roomfinder.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class RoomDto(
    val id: Int,
    val ident: String,
    val name: String,
    val seatsRegular: Int? = null,
    val seatsExam: Int? = null,
    val facilities: String? = null,
    val accessNames: String? = null,
    val changedBy: String? = null,
    val state: Int? = null,
    val unitsId: String? = null,
    val untisLongname: String? = null,
    val bookable: Boolean? = null,
    val inCharge: InChargeDto? = null,
    val numCollisions: Int? = null,
    val collisions: List<String>? = null,
    val numReservations: Int? = null,
    val reservations: List<String>? = null,
)
