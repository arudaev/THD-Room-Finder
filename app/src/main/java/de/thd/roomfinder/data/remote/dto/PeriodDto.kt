package de.thd.roomfinder.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PeriodDto(
    val id: Int,
    val eventId: Int? = null,
    val ident: String? = null,
    val description: String? = null,
    val eventType: String? = null,
    val organiser: String? = null,
    val participants: String? = null,
    val numParticipants: Int? = null,
    val recurrenceType: String? = null,
    val orgNotes: String? = null,
    val startDateTime: String,
    @SerialName("room_ident")
    val roomIdent: Map<String, String> = emptyMap(),
    @SerialName("room_names")
    val roomNames: List<String> = emptyList(),
    val duration: Int,
    val color: String? = null,
    val priority: Int? = null,
    val eventTypeDescription: String? = null,
    val descriptionText: String? = null,
    val organiserText: String? = null,
    val participantsText: String? = null,
    val titleText: String? = null,
    val linkText: String? = null,
)
