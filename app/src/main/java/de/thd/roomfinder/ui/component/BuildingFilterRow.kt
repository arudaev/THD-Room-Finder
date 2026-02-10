package de.thd.roomfinder.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.ui.theme.THDRoomFinderTheme

@Composable
internal fun BuildingFilterRow(
    buildings: List<String>,
    selectedBuilding: String?,
    onBuildingSelected: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            FilterChip(
                selected = selectedBuilding == null,
                onClick = { onBuildingSelected(null) },
                label = { Text("All") },
            )
        }
        items(buildings) { building ->
            FilterChip(
                selected = selectedBuilding == building,
                onClick = { onBuildingSelected(building) },
                label = { Text(building) },
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun BuildingFilterRowPreview() {
    THDRoomFinderTheme {
        BuildingFilterRow(
            buildings = listOf("A", "B", "C", "D", "I", "ITC"),
            selectedBuilding = "I",
            onBuildingSelected = {},
        )
    }
}
