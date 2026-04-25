package de.thd.roomfinder.domain.presentation

import kotlinx.serialization.Serializable

@Serializable
data class RoomTaxonomy(
    val version: Int,
    val campuses: List<TaxonomyCampus>,
    val sites: List<TaxonomySite>,
    val buildings: List<TaxonomyBuilding>,
    val roomCodePatterns: List<String>,
    val roomKinds: List<TaxonomyRoomKind>,
    val visibilityRules: List<TaxonomyVisibilityRule>,
    val exceptionRules: List<TaxonomyExceptionRule>,
)

@Serializable
data class TaxonomyCampus(
    val key: String,
    val label: String,
    val sortOrder: Int,
    val aliases: List<String>,
)

@Serializable
data class TaxonomySite(
    val key: String,
    val campusKey: String,
    val label: String,
    val sortOrder: Int,
    val aliases: List<String>,
)

@Serializable
data class TaxonomyBuilding(
    val key: String,
    val campusKey: String,
    val siteKey: String,
    val label: String,
    val isMainCampus: Boolean = false,
    val patterns: List<String>,
    val aliases: List<String>,
)

@Serializable
data class TaxonomyRoomKind(
    val key: String,
    val label: String,
    val keywords: List<String>,
)

@Serializable
data class TaxonomyVisibilityRule(
    val key: String,
    val visibilityClass: String,
    val patterns: List<String>,
)

@Serializable
data class TaxonomyExceptionRule(
    val pattern: String,
    val buildingLabel: String? = null,
    val roomKindKey: String? = null,
    val visibilityClass: String? = null,
    val campusKey: String? = null,
    val siteKey: String? = null,
)
