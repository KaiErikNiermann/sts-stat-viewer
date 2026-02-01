//! API types and schemas with OpenAPI documentation
//!
//! These types are automatically documented using utoipa macros.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Health status of the API
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    /// API is operating normally
    Healthy,
    /// API is experiencing issues
    Unhealthy,
}

/// Response from the health check endpoint
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HealthResponse {
    /// Current health status
    pub status: HealthStatus,
    /// Timestamp of the health check
    pub timestamp: DateTime<Utc>,
    /// API version
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

/// Request body for greeting endpoint
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GreetRequest {
    /// Name of the person to greet
    #[schema(min_length = 1, max_length = 100)]
    pub name: String,
}

/// Response from greeting endpoints
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GreetResponse {
    /// The greeting message
    pub message: String,
    /// Timestamp when the greeting was generated
    pub timestamp: DateTime<Utc>,
}

/// API error response
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApiError {
    /// Error message
    pub error: String,
    /// Error code
    pub code: String,
    /// Additional error details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

impl ApiError {
    /// Create a new API error
    pub fn new(error: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            code: code.into(),
            details: None,
        }
    }

    /// Create a new API error with details
    pub fn with_details(
        error: impl Into<String>,
        code: impl Into<String>,
        details: impl Into<String>,
    ) -> Self {
        Self {
            error: error.into(),
            code: code.into(),
            details: Some(details.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_response_serialization() {
        let response = HealthResponse {
            status: HealthStatus::Healthy,
            timestamp: Utc::now(),
            version: Some("1.0.0".to_string()),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("healthy"));
        assert!(json.contains("1.0.0"));
    }

    #[test]
    fn test_greet_request_serialization() {
        let request = GreetRequest {
            name: "World".to_string(),
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("World"));

        let deserialized: GreetRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "World");
    }

    #[test]
    fn test_api_error_creation() {
        let error = ApiError::new("Not found", "NOT_FOUND");
        assert_eq!(error.error, "Not found");
        assert_eq!(error.code, "NOT_FOUND");
        assert!(error.details.is_none());

        let error_with_details =
            ApiError::with_details("Validation failed", "VALIDATION_ERROR", "Name is required");
        assert!(error_with_details.details.is_some());
    }
}
