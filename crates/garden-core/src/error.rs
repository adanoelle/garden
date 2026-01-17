//! Error types for the Garden domain.

use thiserror::Error;

use crate::models::{BlockId, ChannelId};

/// Errors that can occur in domain operations.
#[derive(Debug, Error)]
pub enum DomainError {
    /// Channel not found.
    #[error("channel not found: {0}")]
    ChannelNotFound(ChannelId),

    /// Block not found.
    #[error("block not found: {0}")]
    BlockNotFound(BlockId),

    /// Connection not found.
    #[error("connection not found: block {0} in channel {1}")]
    ConnectionNotFound(BlockId, ChannelId),

    /// Invalid input.
    #[error("invalid input: {0}")]
    InvalidInput(String),

    /// Repository error.
    #[error("repository error: {0}")]
    Repository(#[from] RepoError),
}

/// Errors that can occur in repository operations.
#[derive(Debug, Error)]
pub enum RepoError {
    /// Record not found.
    #[error("not found")]
    NotFound,

    /// Duplicate record.
    #[error("duplicate record")]
    Duplicate,

    /// Database error.
    #[error("database error: {0}")]
    Database(String),

    /// Serialization error.
    #[error("serialization error: {0}")]
    Serialization(String),
}

impl RepoError {
    /// Create a database error from any error type.
    pub fn database(err: impl std::fmt::Display) -> Self {
        Self::Database(err.to_string())
    }

    /// Create a serialization error from any error type.
    pub fn serialization(err: impl std::fmt::Display) -> Self {
        Self::Serialization(err.to_string())
    }
}

/// Result type for domain operations.
pub type DomainResult<T> = Result<T, DomainError>;

/// Result type for repository operations.
pub type RepoResult<T> = Result<T, RepoError>;
