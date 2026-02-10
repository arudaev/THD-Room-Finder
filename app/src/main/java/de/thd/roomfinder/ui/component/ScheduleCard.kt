package de.thd.roomfinder.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.domain.model.ScheduledEvent
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

@Composable
internal fun ScheduleCard(
    event: ScheduledEvent,
    modifier: Modifier = Modifier,
) {
    OutlinedCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${event.startDateTime.format(timeFormatter)} – ${event.endDateTime.format(timeFormatter)}",
                    style = MaterialTheme.typography.titleSmall,
                )
                if (event.eventType.isNotBlank()) {
                    Text(
                        text = event.eventType,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Text(
                text = "${event.durationMinutes} min",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ScheduleCardPreview() {
    THDRoomFinderTheme {
        ScheduleCard(
            event = ScheduledEvent(
                id = 1,
                roomIdent = "I112",
                roomName = "I 112",
                startDateTime = LocalDateTime.of(2026, 2, 10, 8, 0),
                endDateTime = LocalDateTime.of(2026, 2, 10, 9, 30),
                durationMinutes = 90,
                eventType = "Vorlesung",
                title = "",
            ),
            modifier = Modifier.padding(16.dp),
        )
    }
}
