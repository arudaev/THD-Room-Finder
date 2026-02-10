package de.thd.roomfinder.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import de.thd.roomfinder.data.local.entity.ScheduledEventEntity

@Dao
interface ScheduledEventDao {

    @Query("SELECT * FROM scheduled_events WHERE dateKey = :dateKey")
    suspend fun getEventsByDate(dateKey: String): List<ScheduledEventEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(events: List<ScheduledEventEntity>)

    @Query("DELETE FROM scheduled_events WHERE dateKey = :dateKey")
    suspend fun deleteByDate(dateKey: String)

    @Query("DELETE FROM scheduled_events")
    suspend fun deleteAll()
}
