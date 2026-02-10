package de.thd.roomfinder.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun RoomInfoSection(
    room: Room,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = room.name,
            style = MaterialTheme.typography.headlineMedium,
        )

        Text(
            text = buildString {
                append("Building ${room.building}")
                room.floor?.let { append(" · Floor $it") }
            },
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (room.seatsRegular > 0 || room.seatsExam > 0) {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                if (room.seatsRegular > 0) {
                    Text(
                        text = "${room.seatsRegular} regular seats",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                if (room.seatsExam > 0) {
                    Text(
                        text = "${room.seatsExam} exam seats",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }

        if (room.facilities.isNotEmpty()) {
            Text(
                text = "Facilities",
                style = MaterialTheme.typography.labelLarge,
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                room.facilities.forEach { facility ->
                    AssistChip(
                        onClick = {},
                        label = { Text(facility) },
                    )
                }
            }
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

@Preview(showBackground = true)
@Composable
private fun RoomInfoSectionPreview() {
    THDRoomFinderTheme {
        RoomInfoSection(
            room = Room(
                id = 1,
                ident = "I112",
                name = "I 112",
                building = "I",
                floor = 1,
                displayName = "I 112",
                seatsRegular = 40,
                seatsExam = 20,
                facilities = listOf("Beamer", "Whiteboard", "Mikrofon"),
                bookable = true,
                inChargeName = "Prof. Dr. Müller",
                inChargeEmail = "mueller@th-deg.de",
            ),
        )
    }
}
