package de.thd.roomfinder.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.thd.roomfinder.domain.presentation.RoomFilterOption

@Composable
internal fun RoomFilterChipRow(
    label: String,
    options: List<RoomFilterOption>,
    selectedKey: String?,
    allLabel: String,
    onSelectionChanged: (String?) -> Unit,
    showAllOption: Boolean = true,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (showAllOption) {
            item {
                FilterChip(
                    selected = selectedKey == null,
                    onClick = { onSelectionChanged(null) },
                    label = { Text(allLabel) },
                )
            }
        }
        items(options, key = { it.key ?: "${label}_${it.label}" }) { option ->
            FilterChip(
                selected = selectedKey == option.key,
                onClick = { onSelectionChanged(option.key) },
                label = {
                    Text("${option.label} (${option.count})")
                },
            )
        }
    }
}
