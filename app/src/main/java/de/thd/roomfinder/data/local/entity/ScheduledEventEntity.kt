package de.thd.roomfinder.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "scheduled_events")
data class ScheduledEventEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val eventId: Int,
    val roomIdent: String,
    val roomName: String,
    val startDateTime: String,
    val endDateTime: String,
    val durationMinutes: Int,
    val eventType: String,
    val title: String,
    val dateKey: String,
)
