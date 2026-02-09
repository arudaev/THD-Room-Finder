package de.thd.roomfinder.data.remote.api

import de.thd.roomfinder.data.remote.dto.FindByDateRequestBody
import de.thd.roomfinder.data.remote.dto.PeriodDto
import de.thd.roomfinder.data.remote.dto.RoomDto
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path

internal interface ThabellaApiService {

    @POST("room/findRooms")
    suspend fun findRooms(
        @Body body: Map<String, String> = emptyMap(),
    ): List<RoomDto>

    @POST("period/findByDate/{dateTime}")
    suspend fun findPeriodsByDate(
        @Path("dateTime", encoded = true) dateTime: String,
        @Body body: FindByDateRequestBody,
    ): List<PeriodDto>
}
