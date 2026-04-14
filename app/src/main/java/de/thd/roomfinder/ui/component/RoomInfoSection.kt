package de.thd.roomfinder.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.domain.presentation.StudentFacingRoomPresentation

@Composable
internal fun RoomInfoSection(
    roomPresentation: StudentFacingRoomPresentation,
    modifier: Modifier = Modifier,
) {
    val room = roomPresentation.room

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = roomPresentation.primaryLabel,
            style = MaterialTheme.typography.headlineMedium,
        )

        Text(
            text = roomPresentation.secondaryLabel,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (roomPresentation.location.detailPath.isNotBlank()) {
            Text(
                text = roomPresentation.location.detailPath,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Text(
            text = "Original THabella label: ${roomPresentation.rawLabel}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        val details = buildDetails(room)
        if (details.isNotEmpty()) {
            Text(
                text = details.joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        if (room.facilities.isNotEmpty()) {
            Text(
                text = "Facilities",
                style = MaterialTheme.typography.labelLarge,
            )
            Text(
                text = room.facilities.joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        if (room.inChargeName != null || room.inChargeEmail != null) {
            HorizontalDivider()
            Text(
                text = "Contact",
                style = MaterialTheme.typography.labelLarge,
            )
            room.inChargeName?.let {
                Text(text = it, style = MaterialTheme.typography.bodyMedium)
            }
            room.inChargeEmail?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

private fun buildDetails(room: Room): List<String> = buildList {
    room.floor?.let { add("Floor $it") }
    if (room.seatsRegular > 0) add("${room.seatsRegular} seats")
    if (room.seatsExam > 0) add("${room.seatsExam} exam seats")
}
