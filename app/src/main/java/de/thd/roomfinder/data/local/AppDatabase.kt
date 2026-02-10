package de.thd.roomfinder.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import de.thd.roomfinder.data.local.dao.CacheMetadataDao
import de.thd.roomfinder.data.local.dao.RoomDao
import de.thd.roomfinder.data.local.dao.ScheduledEventDao
import de.thd.roomfinder.data.local.entity.CacheMetadataEntity
import de.thd.roomfinder.data.local.entity.RoomEntity
import de.thd.roomfinder.data.local.entity.ScheduledEventEntity

@Database(
    entities = [
        RoomEntity::class,
        ScheduledEventEntity::class,
        CacheMetadataEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun roomDao(): RoomDao
    abstract fun scheduledEventDao(): ScheduledEventDao
    abstract fun cacheMetadataDao(): CacheMetadataDao
}
