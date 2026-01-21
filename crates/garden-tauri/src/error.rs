//! Error types for Tauri IPC.
//!
//! This module provides serializable error types for the frontend.
//! Errors are converted from domain errors and include machine-readable
//! codes for programmatic handling.

use garden_core::error::{DomainError, RepoError};
use serde::Serialize;
use ts_rs::TS;

/// Machine-readable error codes for the frontend.
///
/// These codes allow the frontend to programmatically handle errors
/// without parsing error messages.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    /// A requested channel was not found.
    ChannelNotFound,
    /// A requested block was not found.
    BlockNotFound,
    /// A requested connection was not found.
    ConnectionNotFound,
    /// Input validation failed.
    ValidationError,
    /// A duplicate record was detected.
    DuplicateError,
    /// A database operation failed.
    DatabaseError,
    /// Application initialization failed.
    InitializationError,
    /// A media operation failed (import, download, etc.).
    MediaError,
    /// An unexpected internal error occurred.
    InternalError,
}

/// Serializable error for Tauri IPC responses.
///
/// This error type is designed to be serialized to JSON and consumed
/// by the frontend. It includes:
/// - A machine-readable `code` for programmatic handling
/// - A human-readable `message` for display
/// - Optional `entity_id` for context (e.g., the ID that wasn't found)
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TauriError {
    /// Machine-readable error code.
    pub code: ErrorCode,
    /// Human-readable error message.
    pub message: String,
    /// Optional entity ID for context.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub entity_id: Option<String>,
}

impl TauriError {
    /// Create a new TauriError with the given code and message.
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            entity_id: None,
        }
    }

    /// Create a TauriError with an associated entity ID.
    pub fn with_entity(
        code: ErrorCode,
        message: impl Into<String>,
        entity_id: impl Into<String>,
    ) -> Self {
        Self {
            code,
            message: message.into(),
            entity_id: Some(entity_id.into()),
        }
    }

    /// Create an initialization error.
    pub fn initialization(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InitializationError, message)
    }

    /// Create an internal error (for unexpected failures).
    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::InternalError, message)
    }

    /// Create a media error (for import/download/file operations).
    pub fn media(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::MediaError, message)
    }
}

impl From<DomainError> for TauriError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::ChannelNotFound(id) => Self::with_entity(
                ErrorCode::ChannelNotFound,
                format!("Channel not found: {}", id.0),
                id.0,
            ),
            DomainError::BlockNotFound(id) => Self::with_entity(
                ErrorCode::BlockNotFound,
                format!("Block not found: {}", id.0),
                id.0,
            ),
            DomainError::ConnectionNotFound(block_id, channel_id) => Self::new(
                ErrorCode::ConnectionNotFound,
                format!(
                    "Connection not found: block {} in channel {}",
                    block_id.0, channel_id.0
                ),
            ),
            DomainError::InvalidInput(msg) => Self::new(ErrorCode::ValidationError, msg),
            DomainError::Repository(repo_err) => repo_err.into(),
        }
    }
}

impl From<RepoError> for TauriError {
    fn from(err: RepoError) -> Self {
        match err {
            RepoError::NotFound => Self::new(ErrorCode::DatabaseError, "Record not found"),
            RepoError::Duplicate => Self::new(ErrorCode::DuplicateError, "Record already exists"),
            RepoError::Database(msg) => Self::new(ErrorCode::DatabaseError, msg),
            RepoError::Serialization(msg) => Self::new(
                ErrorCode::InternalError,
                format!("Serialization error: {}", msg),
            ),
        }
    }
}

impl From<garden_db::error::DbError> for TauriError {
    fn from(err: garden_db::error::DbError) -> Self {
        Self::new(ErrorCode::DatabaseError, err.to_string())
    }
}

/// Result type for Tauri commands.
pub type CommandResult<T> = Result<T, TauriError>;

// Implement IntoResponse for Tauri's invoke system
impl std::fmt::Display for TauriError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{:?}] {}", self.code, self.message)
    }
}

impl std::error::Error for TauriError {}

#[cfg(test)]
mod tests {
    use super::*;
    use garden_core::models::{BlockId, ChannelId};

    #[test]
    fn channel_not_found_includes_id() {
        let channel_id = ChannelId("test-123".to_string());
        let domain_err = DomainError::ChannelNotFound(channel_id);
        let tauri_err: TauriError = domain_err.into();

        assert_eq!(tauri_err.code, ErrorCode::ChannelNotFound);
        assert_eq!(tauri_err.entity_id, Some("test-123".to_string()));
        assert!(tauri_err.message.contains("test-123"));
    }

    #[test]
    fn block_not_found_includes_id() {
        let block_id = BlockId("block-456".to_string());
        let domain_err = DomainError::BlockNotFound(block_id);
        let tauri_err: TauriError = domain_err.into();

        assert_eq!(tauri_err.code, ErrorCode::BlockNotFound);
        assert_eq!(tauri_err.entity_id, Some("block-456".to_string()));
    }

    #[test]
    fn validation_error_preserves_message() {
        let domain_err = DomainError::InvalidInput("Title cannot be empty".to_string());
        let tauri_err: TauriError = domain_err.into();

        assert_eq!(tauri_err.code, ErrorCode::ValidationError);
        assert_eq!(tauri_err.message, "Title cannot be empty");
        assert!(tauri_err.entity_id.is_none());
    }

    #[test]
    fn duplicate_error_from_repo() {
        let repo_err = RepoError::Duplicate;
        let tauri_err: TauriError = repo_err.into();

        assert_eq!(tauri_err.code, ErrorCode::DuplicateError);
    }

    #[test]
    fn serializes_to_json() {
        let err =
            TauriError::with_entity(ErrorCode::ChannelNotFound, "Channel not found", "chan-123");

        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("\"code\":\"CHANNEL_NOT_FOUND\""));
        assert!(json.contains("\"entityId\":\"chan-123\""));
    }

    #[test]
    fn skips_none_entity_id_in_json() {
        let err = TauriError::new(ErrorCode::ValidationError, "Invalid input");

        let json = serde_json::to_string(&err).unwrap();
        assert!(!json.contains("entityId"));
    }
}
