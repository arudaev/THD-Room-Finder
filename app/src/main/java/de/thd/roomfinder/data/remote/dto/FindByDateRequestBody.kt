package de.thd.roomfinder.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class FindByDateRequestBody(
    val sqlDate: String,
)
