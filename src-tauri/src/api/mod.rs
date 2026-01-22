//! API module
//!
//! Contains types, handlers, and server configuration for the REST API.

pub mod handlers;
pub mod sts_handlers;
pub mod types;

use axum::{routing::get, Router};
use tower_http::cors::{Any, CorsLayer};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use handlers::{greet, greet_by_path, health_check};
use sts_handlers::{get_character_runs, get_character_stats, get_characters, get_export, get_runs, get_stats};
use types::{ApiError, GreetRequest, GreetResponse, HealthResponse, HealthStatus};
use crate::sts::{CharacterStats, ExportData, RunMetrics};

/// OpenAPI documentation structure
#[derive(OpenApi)]
#[openapi(
    info(
        title = "STS Stat Viewer API",
        description = "API for Slay the Spire run statistics and analysis",
        version = "1.0.0",
        contact(name = "API Support")
    ),
    paths(
        handlers::health_check,
        handlers::greet,
        handlers::greet_by_path,
        sts_handlers::get_runs,
        sts_handlers::get_character_runs,
        sts_handlers::get_stats,
        sts_handlers::get_character_stats,
        sts_handlers::get_export,
        sts_handlers::get_characters,
    ),
    components(
        schemas(
            HealthResponse, HealthStatus, GreetRequest, GreetResponse, ApiError,
            RunMetrics, CharacterStats, ExportData
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "greeting", description = "Greeting endpoints"),
        (name = "sts", description = "Slay the Spire data endpoints")
    )
)]
pub struct ApiDoc;

/// Create the API router with all routes and OpenAPI documentation
pub fn create_router() -> Router {
    use axum::routing::post;
    
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // Health and greeting endpoints
        .route("/api/health", get(health_check))
        .route("/api/greet", post(greet))
        .route("/api/greet/{name}", get(greet_by_path))
        // STS data endpoints
        .route("/api/runs", get(get_runs))
        .route("/api/runs/{character}", get(get_character_runs))
        .route("/api/stats", get(get_stats))
        .route("/api/stats/{character}", get(get_character_stats))
        .route("/api/export", get(get_export))
        .route("/api/characters", get(get_characters))
        // OpenAPI documentation
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .layer(cors)
}

/// Start the API server on the specified port
pub async fn start_server(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let router = create_router();
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    
    println!("🚀 API server running at http://127.0.0.1:{}", port);
    println!("📚 Swagger UI available at http://127.0.0.1:{}/swagger-ui/", port);
    println!("📄 OpenAPI spec at http://127.0.0.1:{}/api-docs/openapi.json", port);
    
    axum::serve(listener, router).await?;
    Ok(())
}

/// Export the OpenAPI spec as JSON string
pub fn get_openapi_json() -> String {
    ApiDoc::openapi().to_pretty_json().unwrap()
}

/// Export the OpenAPI spec as YAML string
pub fn get_openapi_yaml() -> String {
    serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_openapi_generation() {
        let json = get_openapi_json();
        assert!(json.contains("STS Stat Viewer API"));
        assert!(json.contains("/api/health"));
        assert!(json.contains("/api/runs"));
        assert!(json.contains("HealthResponse"));
        assert!(json.contains("RunMetrics"));
    }

    #[test]
    fn test_router_creation() {
        let _router = create_router();
        // Router creation should not panic
    }
}
