package de.thd.roomfinder.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import de.thd.roomfinder.data.local.entity.RoomEntity

@Dao
interface RoomDao {

    @Query("SELECT * FROM rooms")
    suspend fun getAllRooms(): List<RoomEntity>

    @Query("SELECT * FROM rooms WHERE id = :id")
    suspend fun getRoomById(id: Int): RoomEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(rooms: List<RoomEntity>)

    @Query("DELETE FROM rooms")
    suspend fun deleteAll()
}
