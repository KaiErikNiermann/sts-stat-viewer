//! API request handlers
//!
//! These handlers implement the OpenAPI-documented endpoints.

use axum::{
    extract::Path,
    http::StatusCode,
    Json,
};
use chrono::Utc;

use super::types::{ApiError, GreetRequest, GreetResponse, HealthResponse, HealthStatus};

/// Health check endpoint
///
/// Returns the current health status of the API.
#[utoipa::path(
    get,
    path = "/api/health",
    tag = "health",
    responses(
        (status = 200, description = "API is healthy", body = HealthResponse)
    )
)]
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: HealthStatus::Healthy,
        timestamp: Utc::now(),
        version: Some(env!("CARGO_PKG_VERSION").to_string()),
    })
}

/// Greet endpoint (POST)
///
/// Returns a personalized greeting message based on the request body.
#[utoipa::path(
    post,
    path = "/api/greet",
    tag = "greeting",
    request_body = GreetRequest,
    responses(
        (status = 200, description = "Successful greeting", body = GreetResponse),
        (status = 400, description = "Invalid request", body = ApiError)
    )
)]
pub async fn greet(
    Json(payload): Json<GreetRequest>,
) -> Result<Json<GreetResponse>, (StatusCode, Json<ApiError>)> {
    // Validate name
    if payload.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::new("Name cannot be empty", "VALIDATION_ERROR")),
        ));
    }

    if payload.name.len() > 100 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::with_details(
                "Name is too long",
                "VALIDATION_ERROR",
                "Name must be 100 characters or less",
            )),
        ));
    }

    Ok(Json(GreetResponse {
        message: format!("Hello, {}! You've been greeted from Rust!", payload.name),
        timestamp: Utc::now(),
    }))
}

/// Greet by path parameter endpoint (GET)
///
/// Returns a personalized greeting using the name from the URL path.
#[utoipa::path(
    get,
    path = "/api/greet/{name}",
    tag = "greeting",
    params(
        ("name" = String, Path, description = "Name of the person to greet")
    ),
    responses(
        (status = 200, description = "Successful greeting", body = GreetResponse),
        (status = 400, description = "Invalid request", body = ApiError)
    )
)]
pub async fn greet_by_path(
    Path(name): Path<String>,
) -> Result<Json<GreetResponse>, (StatusCode, Json<ApiError>)> {
    // Validate name
    if name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::new("Name cannot be empty", "VALIDATION_ERROR")),
        ));
    }

    if name.len() > 100 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError::with_details(
                "Name is too long",
                "VALIDATION_ERROR",
                "Name must be 100 characters or less",
            )),
        ));
    }

    Ok(Json(GreetResponse {
        message: format!("Hello, {}! You've been greeted from Rust!", name),
        timestamp: Utc::now(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check() {
        let response = health_check().await;
        assert_eq!(response.status, HealthStatus::Healthy);
        assert!(response.version.is_some());
    }

    #[tokio::test]
    async fn test_greet_valid_name() {
        let request = GreetRequest {
            name: "World".to_string(),
        };
        let result = greet(Json(request)).await;
        assert!(result.is_ok());
        
        let response = result.unwrap();
        assert!(response.message.contains("World"));
    }

    #[tokio::test]
    async fn test_greet_empty_name() {
        let request = GreetRequest {
            name: "   ".to_string(),
        };
        let result = greet(Json(request)).await;
        assert!(result.is_err());
        
        let (status, error) = result.unwrap_err();
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(error.code, "VALIDATION_ERROR");
    }

    #[tokio::test]
    async fn test_greet_by_path_valid() {
        let result = greet_by_path(Path("Rust".to_string())).await;
        assert!(result.is_ok());
        
        let response = result.unwrap();
        assert!(response.message.contains("Rust"));
    }

    #[tokio::test]
    async fn test_greet_by_path_empty() {
        let result = greet_by_path(Path("".to_string())).await;
        assert!(result.is_err());
    }
}
