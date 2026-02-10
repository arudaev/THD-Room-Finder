package de.thd.roomfinder.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.domain.model.FreeRoom
import de.thd.roomfinder.domain.model.Room
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

@Composable
internal fun RoomCard(
    freeRoom: FreeRoom,
    modifier: Modifier = Modifier,
) {
    ElevatedCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = freeRoom.room.displayName,
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = freeRoom.room.building,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            val details = buildList {
                freeRoom.room.floor?.let { add("Floor $it") }
                if (freeRoom.room.seatsRegular > 0) add("${freeRoom.room.seatsRegular} seats")
            }.joinToString(" · ")

            if (details.isNotEmpty()) {
                Text(
                    text = details,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            val availabilityText = if (freeRoom.freeUntil != null) {
                "Free until ${freeRoom.freeUntil.format(timeFormatter)}"
            } else {
                "Free all day"
            }
            Text(
                text = availabilityText,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.tertiary,
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun RoomCardPreview() {
    THDRoomFinderTheme {
        RoomCard(
            freeRoom = FreeRoom(
                room = Room(
                    id = 1,
                    ident = "I112",
                    name = "I 112",
                    building = "I",
                    floor = 1,
                    displayName = "I 112",
                    seatsRegular = 40,
                    seatsExam = 20,
                    facilities = listOf("Beamer", "Whiteboard"),
                    bookable = true,
                    inChargeName = null,
                    inChargeEmail = null,
                ),
                freeUntil = LocalDateTime.of(2026, 2, 10, 14, 30),
            ),
            modifier = Modifier.padding(16.dp),
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun RoomCardFreeAllDayPreview() {
    THDRoomFinderTheme {
        RoomCard(
            freeRoom = FreeRoom(
                room = Room(
                    id = 2,
                    ident = "A008",
                    name = "A 008",
                    building = "A",
                    floor = 0,
                    displayName = "A 008",
                    seatsRegular = 60,
                    seatsExam = 30,
                    facilities = emptyList(),
                    bookable = true,
                    inChargeName = null,
                    inChargeEmail = null,
                ),
                freeUntil = null,
            ),
            modifier = Modifier.padding(16.dp),
        )
    }
}
