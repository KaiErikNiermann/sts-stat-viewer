//! STS Stat Viewer Application
//!
//! This application provides:
//! - Tauri desktop application for viewing Slay the Spire statistics
//! - Rust backend with automatic OpenAPI documentation (utoipa)
//! - REST API with axum for serving run data
//! - Frontend with Svelte 5, Observable Plot, and Effect-TS

pub mod api;
pub mod sts;

use std::path::PathBuf;
use std::thread;
use serde::Serialize;

/// Tauri command to greet a user (direct IPC)
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Tauri command to get the API server URL
#[tauri::command]
fn get_api_url() -> String {
    "http://127.0.0.1:3030".to_string()
}

/// Tauri command to get the OpenAPI spec as JSON
#[tauri::command]
fn get_openapi_spec() -> String {
    api::get_openapi_json()
}

/// Tauri command to get all runs directly (without HTTP)
#[tauri::command]
fn get_runs() -> Vec<sts::RunMetrics> {
    sts::load_all_runs()
}

/// Tauri command to get character stats directly
#[tauri::command]
fn get_stats() -> Vec<sts::CharacterStats> {
    let runs = sts::load_all_runs();
    sts::calculate_character_stats(&runs)
}

/// Tauri command to get export data directly
#[tauri::command]
fn get_export_data() -> sts::ExportData {
    sts::get_export_data()
}

/// Response containing runs path information
#[derive(Serialize)]
pub struct RunsPathInfo {
    /// Currently active path (custom if set and valid, otherwise auto-detected)
    pub current_path: Option<String>,
    /// Whether a custom path is currently set
    pub is_custom: bool,
    /// The auto-detected path (if any)
    pub auto_detected_path: Option<String>,
    /// Whether the current path exists and is valid
    pub path_exists: bool,
}

/// Tauri command to get runs path info
#[tauri::command]
fn get_runs_path_info() -> RunsPathInfo {
    let (current, is_custom, auto_detected) = sts::get_runs_path_info();
    let current_path = current.as_ref().map(|p| p.to_string_lossy().to_string());
    let path_exists = current.as_ref().map(|p| p.exists()).unwrap_or(false);
    
    RunsPathInfo {
        current_path,
        is_custom,
        auto_detected_path: auto_detected.map(|p| p.to_string_lossy().to_string()),
        path_exists,
    }
}

/// Tauri command to set a custom runs path
#[tauri::command]
fn set_runs_path(path: String) -> Result<RunsPathInfo, String> {
    let path_buf = PathBuf::from(&path);
    
    // Validate the path exists
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    if !path_buf.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    sts::set_custom_runs_path(Some(path_buf));
    Ok(get_runs_path_info())
}

/// Tauri command to clear the custom runs path and revert to auto-detection
#[tauri::command]
fn clear_runs_path() -> RunsPathInfo {
    sts::set_custom_runs_path(None);
    get_runs_path_info()
}

/// Start the API server in a background thread
fn start_api_server() {
    thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            if let Err(e) = api::start_server(3030).await {
                eprintln!("API server error: {}", e);
            }
        });
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start the API server before Tauri
    start_api_server();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_api_url,
            get_openapi_spec,
            get_runs,
            get_stats,
            get_export_data,
            get_runs_path_info,
            set_runs_path,
            clear_runs_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greet_command() {
        let result = greet("Test");
        assert!(result.contains("Test"));
        assert!(result.contains("Rust"));
    }

    #[test]
    fn test_get_api_url() {
        let url = get_api_url();
        assert!(url.contains("127.0.0.1"));
        assert!(url.contains("3030"));
    }

    #[test]
    fn test_get_openapi_spec() {
        let spec = get_openapi_spec();
        assert!(spec.contains("openapi"));
        assert!(spec.contains("3.1"));
    }
}

