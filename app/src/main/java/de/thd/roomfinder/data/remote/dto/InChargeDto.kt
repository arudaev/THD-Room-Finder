package de.thd.roomfinder.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class InChargeDto(
    val id: Int? = null,
    val uid: String? = null,
    val firstname: String? = null,
    val lastname: String? = null,
    val email: String? = null,
    val phone: String? = null,
)
