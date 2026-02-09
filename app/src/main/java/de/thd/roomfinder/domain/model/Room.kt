package de.thd.roomfinder.domain.model

data class Room(
    val id: Int,
    val ident: String,
    val name: String,
    val building: String,
    val floor: Int?,
    val displayName: String,
    val seatsRegular: Int,
    val seatsExam: Int,
    val facilities: List<String>,
    val bookable: Boolean,
    val inChargeName: String?,
    val inChargeEmail: String?,
)
