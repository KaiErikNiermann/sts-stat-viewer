//! Slay the Spire data types and loader
//!
//! This module handles parsing STS run files from the game's save directory.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;
use utoipa::ToSchema;

/// Global custom runs path that can be set by the user
/// This takes precedence over auto-detection if set
static CUSTOM_RUNS_PATH: RwLock<Option<PathBuf>> = RwLock::new(None);

/// Set a custom path for loading runs
pub fn set_custom_runs_path(path: Option<PathBuf>) {
    let mut custom_path = CUSTOM_RUNS_PATH.write().unwrap();
    *custom_path = path;
}

/// Get the currently set custom runs path
pub fn get_custom_runs_path() -> Option<PathBuf> {
    CUSTOM_RUNS_PATH.read().unwrap().clone()
}

/// Available characters in Slay the Spire
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Character {
    Ironclad,
    #[serde(rename = "THE_SILENT")]
    TheSilent,
    Defect,
    Watcher,
}

impl Character {
    /// Get all playable characters
    pub fn all() -> &'static [Character] {
        &[
            Character::Ironclad,
            Character::TheSilent,
            Character::Defect,
            Character::Watcher,
        ]
    }

    /// Get the directory name for this character
    pub fn dir_name(&self) -> &'static str {
        match self {
            Character::Ironclad => "IRONCLAD",
            Character::TheSilent => "THE_SILENT",
            Character::Defect => "DEFECT",
            Character::Watcher => "WATCHER",
        }
    }

    /// Get the display name for this character
    pub fn display_name(&self) -> &'static str {
        match self {
            Character::Ironclad => "Ironclad",
            Character::TheSilent => "Silent",
            Character::Defect => "Defect",
            Character::Watcher => "Watcher",
        }
    }
}

/// Metrics extracted from a single run
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RunMetrics {
    pub play_id: String,
    pub character: String,
    pub floor_reached: i32,
    pub victory: bool,
    pub score: i32,
    pub ascension_level: i32,

    // Deck composition
    pub deck_size: i32,
    pub attack_count: i32,
    pub skill_count: i32,
    pub power_count: i32,
    pub upgraded_cards: i32,
    pub cards_removed: i32,

    // Progression
    pub relic_count: i32,
    pub relics: Vec<String>,
    pub master_deck: Vec<String>,
    pub elites_killed: i32,
    pub bosses_killed: i32,
    pub campfires_rested: i32,
    pub campfires_upgraded: i32,
    pub shops_visited: i32,
    pub cards_purchased: i32,
    pub potions_used: i32,

    // Combat stats
    pub total_damage_taken: i32,
    pub max_hp_at_end: i32,

    // Death info
    pub killed_by: Option<String>,
}

/// Aggregated statistics for a character
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CharacterStats {
    pub character: String,
    pub display_name: String,
    pub total_runs: i32,
    pub wins: i32,
    pub win_rate: f64,
    pub avg_score: f64,
    pub avg_floor: f64,
    pub max_floor: i32,
    pub avg_deck_size: f64,
    pub avg_relics: f64,
}

/// Complete export data structure
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExportData {
    pub runs: Vec<RunMetrics>,
    pub character_stats: Vec<CharacterStats>,
    pub export_timestamp: i64,
}

/// Raw run file structure (partial, for parsing)
#[derive(Debug, Deserialize)]
struct RawRunFile {
    play_id: Option<String>,
    #[serde(deserialize_with = "deserialize_number_option", default)]
    floor_reached: Option<i32>,
    victory: Option<bool>,
    #[serde(deserialize_with = "deserialize_number_option", default)]
    score: Option<i32>,
    #[serde(deserialize_with = "deserialize_number_option", default)]
    ascension_level: Option<i32>,
    master_deck: Option<Vec<String>>,
    relics: Option<Vec<String>>,
    campfire_choices: Option<Vec<CampfireChoice>>,
    path_per_floor: Option<Vec<Option<String>>>,
    items_purged: Option<Vec<String>>,
    items_purchased: Option<Vec<String>>,
    #[serde(default)]
    potions_floor_usage: Option<Vec<serde_json::Value>>,
    damage_taken: Option<Vec<DamageTaken>>,
    #[serde(default)]
    max_hp_per_floor: Option<Vec<serde_json::Value>>,
    killed_by: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CampfireChoice {
    key: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DamageTaken {
    #[serde(deserialize_with = "deserialize_number_option", default)]
    damage: Option<i32>,
}

/// Deserialize a number that could be either an integer or a float
fn deserialize_number_option<'de, D>(deserializer: D) -> Result<Option<i32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error;

    let value: Option<serde_json::Value> = Option::deserialize(deserializer)?;

    match value {
        None => Ok(None),
        Some(serde_json::Value::Number(n)) => {
            if let Some(i) = n.as_i64() {
                Ok(Some(i as i32))
            } else if let Some(f) = n.as_f64() {
                Ok(Some(f as i32))
            } else {
                Err(D::Error::custom("expected a number"))
            }
        }
        Some(_) => Err(D::Error::custom("expected a number")),
    }
}

/// Get the default STS runs directory (auto-detection only)
fn get_default_runs_path() -> Option<PathBuf> {
    // Linux Steam path
    if let Some(home) = dirs::home_dir() {
        let linux_path = home.join(".local/share/Steam/steamapps/common/SlayTheSpire/runs");
        if linux_path.exists() {
            return Some(linux_path);
        }

        // Windows path
        let windows_path = home.join("AppData/Local/Steam/steamapps/common/SlayTheSpire/runs");
        if windows_path.exists() {
            return Some(windows_path);
        }

        // Alternative Windows path
        let windows_alt =
            PathBuf::from("C:/Program Files (x86)/Steam/steamapps/common/SlayTheSpire/runs");
        if windows_alt.exists() {
            return Some(windows_alt);
        }
    }

    None
}

/// Get the STS runs directory, checking custom path first then falling back to auto-detection
pub fn get_runs_path() -> Option<PathBuf> {
    // First check for custom path
    if let Some(custom) = get_custom_runs_path() {
        if custom.exists() {
            return Some(custom);
        }
        // Custom path set but doesn't exist - still return it so caller can report error
        eprintln!("Custom runs path does not exist: {:?}", custom);
    }

    // Fall back to auto-detection
    get_default_runs_path()
}

/// Get info about the current runs path configuration
pub fn get_runs_path_info() -> (Option<PathBuf>, bool, Option<PathBuf>) {
    let custom = get_custom_runs_path();
    let auto_detected = get_default_runs_path();
    let is_custom = custom.is_some();
    let current = if let Some(ref c) = custom {
        if c.exists() {
            custom.clone()
        } else {
            None
        }
    } else {
        auto_detected.clone()
    };
    (current, is_custom, auto_detected)
}

/// Keywords for categorizing attack cards
const ATTACK_KEYWORDS: &[&str] = &[
    "strike",
    "bash",
    "anger",
    "cleave",
    "carnage",
    "eruption",
    "flying",
    "tantrum",
    "ragnarok",
    "conclude",
    "claw",
    "beam",
    "core",
    "doom",
    "electro",
    "ftl",
    "hyperbeam",
    "meteor",
    "rip",
    "sunder",
    "bludgeon",
    "sword",
    "shiv",
    "dagger",
    "slice",
    "neutralize",
    "riddle",
    "skewer",
    "grand finale",
    "glass knife",
    "backstab",
    "predator",
    "all-out",
    "ball lightning",
    "cold snap",
    "compile",
    "barrage",
    "blizzard",
];

/// Keywords for categorizing skill cards
const SKILL_KEYWORDS: &[&str] = &[
    "defend",
    "armament",
    "shrug",
    "true grit",
    "vigilance",
    "protect",
    "survivor",
    "dodge",
    "blur",
    "footwork",
    "charge",
    "coolhead",
    "glacier",
    "leap",
    "stack",
    "turbo",
    "entrench",
    "impervious",
];

/// Parse a single run file
fn parse_run_file(path: &std::path::Path, character: &str) -> Option<RunMetrics> {
    let content = std::fs::read_to_string(path).ok()?;
    let raw: RawRunFile = serde_json::from_str(&content).ok()?;

    let master_deck = raw.master_deck.unwrap_or_default();
    let relics = raw.relics.unwrap_or_default();
    let campfire_choices = raw.campfire_choices.unwrap_or_default();
    let path_per_floor = raw.path_per_floor.unwrap_or_default();
    let damage_taken = raw.damage_taken.unwrap_or_default();

    // Count card types
    let attack_count = master_deck
        .iter()
        .filter(|c| {
            let lower = c.to_lowercase();
            ATTACK_KEYWORDS.iter().any(|k| lower.contains(k))
        })
        .count() as i32;

    let skill_count = master_deck
        .iter()
        .filter(|c| {
            let lower = c.to_lowercase();
            SKILL_KEYWORDS.iter().any(|k| lower.contains(k))
        })
        .count() as i32;

    let power_count = master_deck.len() as i32 - attack_count - skill_count;

    Some(RunMetrics {
        play_id: raw.play_id.unwrap_or_else(|| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string()
        }),
        character: character.to_string(),
        floor_reached: raw.floor_reached.unwrap_or(0),
        victory: raw.victory.unwrap_or(false),
        score: raw.score.unwrap_or(0),
        ascension_level: raw.ascension_level.unwrap_or(0),
        deck_size: master_deck.len() as i32,
        attack_count,
        skill_count,
        power_count,
        upgraded_cards: master_deck.iter().filter(|c| c.contains('+')).count() as i32,
        cards_removed: raw.items_purged.map(|v| v.len()).unwrap_or(0) as i32,
        relic_count: relics.len() as i32,
        relics: relics,
        master_deck: master_deck.clone(),
        elites_killed: path_per_floor
            .iter()
            .filter(|p| p.as_deref() == Some("E"))
            .count() as i32,
        bosses_killed: path_per_floor
            .iter()
            .filter(|p| p.as_deref() == Some("BOSS"))
            .count() as i32,
        campfires_rested: campfire_choices
            .iter()
            .filter(|c| c.key.as_deref() == Some("REST"))
            .count() as i32,
        campfires_upgraded: campfire_choices
            .iter()
            .filter(|c| c.key.as_deref() == Some("SMITH"))
            .count() as i32,
        shops_visited: path_per_floor
            .iter()
            .filter(|p| p.as_deref() == Some("$"))
            .count() as i32,
        cards_purchased: raw.items_purchased.map(|v| v.len()).unwrap_or(0) as i32,
        potions_used: raw.potions_floor_usage.map(|v| v.len()).unwrap_or(0) as i32,
        total_damage_taken: damage_taken.iter().filter_map(|d| d.damage).sum(),
        max_hp_at_end: raw
            .max_hp_per_floor
            .and_then(|v| {
                v.last()
                    .and_then(|val| val.as_f64().or_else(|| val.as_i64().map(|i| i as f64)))
            })
            .map(|f| f as i32)
            .unwrap_or(72),
        killed_by: raw.killed_by,
    })
}

/// Load all runs from the STS directory
pub fn load_all_runs() -> Vec<RunMetrics> {
    let Some(runs_path) = get_runs_path() else {
        eprintln!("Could not find STS runs directory");
        return Vec::new();
    };

    let mut all_runs = Vec::new();

    for character in Character::all() {
        let char_dir = runs_path.join(character.dir_name());
        if !char_dir.exists() {
            continue;
        }

        if let Ok(entries) = std::fs::read_dir(&char_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "run").unwrap_or(false) {
                    if let Some(metrics) = parse_run_file(&path, character.dir_name()) {
                        all_runs.push(metrics);
                    }
                }
            }
        }
    }

    all_runs
}

/// Calculate aggregated stats for each character
pub fn calculate_character_stats(runs: &[RunMetrics]) -> Vec<CharacterStats> {
    let mut stats_map: HashMap<String, Vec<&RunMetrics>> = HashMap::new();

    for run in runs {
        stats_map
            .entry(run.character.clone())
            .or_default()
            .push(run);
    }

    let mut stats = Vec::new();

    for character in Character::all() {
        let char_name = character.dir_name();
        if let Some(char_runs) = stats_map.get(char_name) {
            let total = char_runs.len() as i32;
            let wins = char_runs.iter().filter(|r| r.victory).count() as i32;
            let scores: Vec<i32> = char_runs.iter().map(|r| r.score).collect();
            let floors: Vec<i32> = char_runs.iter().map(|r| r.floor_reached).collect();
            let deck_sizes: Vec<i32> = char_runs.iter().map(|r| r.deck_size).collect();
            let relics: Vec<i32> = char_runs.iter().map(|r| r.relic_count).collect();

            stats.push(CharacterStats {
                character: char_name.to_string(),
                display_name: character.display_name().to_string(),
                total_runs: total,
                wins,
                win_rate: if total > 0 {
                    wins as f64 / total as f64
                } else {
                    0.0
                },
                avg_score: if total > 0 {
                    scores.iter().sum::<i32>() as f64 / total as f64
                } else {
                    0.0
                },
                avg_floor: if total > 0 {
                    floors.iter().sum::<i32>() as f64 / total as f64
                } else {
                    0.0
                },
                max_floor: floors.into_iter().max().unwrap_or(0),
                avg_deck_size: if total > 0 {
                    deck_sizes.iter().sum::<i32>() as f64 / total as f64
                } else {
                    0.0
                },
                avg_relics: if total > 0 {
                    relics.iter().sum::<i32>() as f64 / total as f64
                } else {
                    0.0
                },
            });
        }
    }

    stats
}

/// Get complete export data
pub fn get_export_data() -> ExportData {
    let runs = load_all_runs();
    let character_stats = calculate_character_stats(&runs);

    ExportData {
        runs,
        character_stats,
        export_timestamp: chrono::Utc::now().timestamp(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_character_dir_names() {
        assert_eq!(Character::Ironclad.dir_name(), "IRONCLAD");
        assert_eq!(Character::TheSilent.dir_name(), "THE_SILENT");
        assert_eq!(Character::Defect.dir_name(), "DEFECT");
        assert_eq!(Character::Watcher.dir_name(), "WATCHER");
    }

    #[test]
    fn test_load_runs() {
        let runs = load_all_runs();
        // Just verify we can load runs without panicking
        // If runs exist, verify the stats can be calculated
        let stats = calculate_character_stats(&runs);
        assert!(stats.len() <= 4); // At most 4 characters
    }

    #[test]
    fn test_character_display_names() {
        assert_eq!(Character::Ironclad.display_name(), "Ironclad");
        assert_eq!(Character::TheSilent.display_name(), "Silent");
    }
}
