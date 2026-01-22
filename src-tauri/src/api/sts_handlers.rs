//! STS-specific API handlers
//!
//! These handlers serve Slay the Spire run data to the frontend.

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use serde::Deserialize;

use crate::sts::{
    calculate_character_stats, get_export_data, load_all_runs, Character, CharacterStats,
    ExportData, RunMetrics,
};

use super::types::ApiError;

/// Query parameters for runs endpoint
#[derive(Debug, Deserialize)]
pub struct RunsQuery {
    /// Filter by character
    pub character: Option<String>,
    /// Filter by victory only
    pub victories_only: Option<bool>,
    /// Minimum ascension level
    pub min_ascension: Option<i32>,
}

/// Get all runs with optional filtering
#[utoipa::path(
    get,
    path = "/api/runs",
    tag = "sts",
    params(
        ("character" = Option<String>, Query, description = "Filter by character name"),
        ("victories_only" = Option<bool>, Query, description = "Only return victories"),
        ("min_ascension" = Option<i32>, Query, description = "Minimum ascension level")
    ),
    responses(
        (status = 200, description = "List of runs", body = Vec<RunMetrics>),
        (status = 500, description = "Server error", body = ApiError)
    )
)]
pub async fn get_runs(Query(params): Query<RunsQuery>) -> Json<Vec<RunMetrics>> {
    let mut runs = load_all_runs();

    // Apply filters
    if let Some(ref char) = params.character {
        runs.retain(|r| r.character.eq_ignore_ascii_case(char));
    }

    if params.victories_only.unwrap_or(false) {
        runs.retain(|r| r.victory);
    }

    if let Some(min_asc) = params.min_ascension {
        runs.retain(|r| r.ascension_level >= min_asc);
    }

    Json(runs)
}

/// Get runs for a specific character
#[utoipa::path(
    get,
    path = "/api/runs/{character}",
    tag = "sts",
    params(
        ("character" = String, Path, description = "Character name (IRONCLAD, THE_SILENT, DEFECT, WATCHER)")
    ),
    responses(
        (status = 200, description = "Character runs", body = Vec<RunMetrics>),
        (status = 404, description = "Character not found", body = ApiError)
    )
)]
pub async fn get_character_runs(
    Path(character): Path<String>,
) -> Result<Json<Vec<RunMetrics>>, (StatusCode, Json<ApiError>)> {
    // Validate character name
    let valid_chars: Vec<&str> = Character::all().iter().map(|c| c.dir_name()).collect();
    
    if !valid_chars.iter().any(|c| c.eq_ignore_ascii_case(&character)) {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError::with_details(
                "Character not found",
                "NOT_FOUND",
                format!("Valid characters: {}", valid_chars.join(", ")),
            )),
        ));
    }

    let runs: Vec<RunMetrics> = load_all_runs()
        .into_iter()
        .filter(|r| r.character.eq_ignore_ascii_case(&character))
        .collect();

    Ok(Json(runs))
}

/// Get aggregated stats for all characters
#[utoipa::path(
    get,
    path = "/api/stats",
    tag = "sts",
    responses(
        (status = 200, description = "Character statistics", body = Vec<CharacterStats>)
    )
)]
pub async fn get_stats() -> Json<Vec<CharacterStats>> {
    let runs = load_all_runs();
    let stats = calculate_character_stats(&runs);
    Json(stats)
}

/// Get stats for a specific character
#[utoipa::path(
    get,
    path = "/api/stats/{character}",
    tag = "sts",
    params(
        ("character" = String, Path, description = "Character name")
    ),
    responses(
        (status = 200, description = "Character statistics", body = CharacterStats),
        (status = 404, description = "Character not found", body = ApiError)
    )
)]
pub async fn get_character_stats(
    Path(character): Path<String>,
) -> Result<Json<CharacterStats>, (StatusCode, Json<ApiError>)> {
    let runs = load_all_runs();
    let stats = calculate_character_stats(&runs);

    stats
        .into_iter()
        .find(|s| s.character.eq_ignore_ascii_case(&character))
        .map(Json)
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::new("Character not found", "NOT_FOUND")),
            )
        })
}

/// Get complete export data (all runs + stats)
#[utoipa::path(
    get,
    path = "/api/export",
    tag = "sts",
    responses(
        (status = 200, description = "Complete export data", body = ExportData)
    )
)]
pub async fn get_export() -> Json<ExportData> {
    Json(get_export_data())
}

/// Get available characters
#[utoipa::path(
    get,
    path = "/api/characters",
    tag = "sts",
    responses(
        (status = 200, description = "List of characters", body = Vec<String>)
    )
)]
pub async fn get_characters() -> Json<Vec<serde_json::Value>> {
    let chars: Vec<serde_json::Value> = Character::all()
        .iter()
        .map(|c| {
            serde_json::json!({
                "id": c.dir_name(),
                "name": c.display_name()
            })
        })
        .collect();
    Json(chars)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_characters() {
        let result = get_characters().await;
        assert_eq!(result.0.len(), 4);
    }
}
