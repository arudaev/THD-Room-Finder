package de.thd.roomfinder.ui

import java.time.format.DateTimeFormatter

internal object UiDateFormats {
    val TIME: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
    val DATE_HEADER: DateTimeFormatter = DateTimeFormatter.ofPattern("EEEE, d MMMM")
    val DATE_TIME_PICKER: DateTimeFormatter = DateTimeFormatter.ofPattern("EEE, d MMM - HH:mm")
}
