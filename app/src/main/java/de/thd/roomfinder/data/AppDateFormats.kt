package de.thd.roomfinder.data

import java.time.format.DateTimeFormatter

internal object AppDateFormats {
    val EVENT_DATE_TIME: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    val DATE_KEY: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
}
