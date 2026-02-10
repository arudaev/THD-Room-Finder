package de.thd.roomfinder.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import de.thd.roomfinder.data.local.AppDatabase
import de.thd.roomfinder.data.local.dao.CacheMetadataDao
import de.thd.roomfinder.data.local.dao.RoomDao
import de.thd.roomfinder.data.local.dao.ScheduledEventDao
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
internal object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "thd_roomfinder.db")
            .fallbackToDestructiveMigration(dropAllTables = true)
            .build()

    @Provides
    fun provideRoomDao(db: AppDatabase): RoomDao = db.roomDao()

    @Provides
    fun provideScheduledEventDao(db: AppDatabase): ScheduledEventDao =
        db.scheduledEventDao()

    @Provides
    fun provideCacheMetadataDao(db: AppDatabase): CacheMetadataDao =
        db.cacheMetadataDao()
}
