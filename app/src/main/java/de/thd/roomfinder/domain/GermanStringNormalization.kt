package de.thd.roomfinder.domain

import java.text.Normalizer
import java.util.Locale

internal fun String.normalizeForMatching(): String {
    val transliterated = replace("Ä", "Ae").replace("Ö", "Oe").replace("Ü", "Ue")
        .replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
        .replace("ß", "ss")
    return Normalizer.normalize(transliterated, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "")
        .lowercase(Locale.ROOT)
        .trim()
}
