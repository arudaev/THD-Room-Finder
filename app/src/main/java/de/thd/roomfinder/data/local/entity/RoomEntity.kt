package de.thd.roomfinder.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "rooms")
data class RoomEntity(
    @PrimaryKey val id: Int,
    val ident: String,
    val name: String,
    val building: String,
    val floor: Int?,
    val displayName: String,
    val seatsRegular: Int,
    val seatsExam: Int,
    val facilities: String,
    val bookable: Boolean,
    val inChargeName: String?,
    val inChargeEmail: String?,
)
