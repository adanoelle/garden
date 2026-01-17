//! Database error types.

use garden_core::error::RepoError;
use thiserror::Error;

/// Database-specific errors.
#[derive(Debug, Error)]
pub enum DbError {
    /// SQLx database error.
    #[error("database error: {0}")]
    Sqlx(#[from] sqlx::Error),

    /// Migration error.
    #[error("migration error: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),

    /// JSON serialization error.
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Record not found.
    #[error("record not found")]
    NotFound,

    /// Duplicate record.
    #[error("duplicate record")]
    Duplicate,

    /// Connection pool error.
    #[error("connection pool error: {0}")]
    Pool(String),

    /// Invalid datetime format in database.
    #[error("invalid datetime format in field '{field}': {value}")]
    InvalidDatetime { field: &'static str, value: String },

    /// Schema validation failed.
    #[error("database schema invalid: {0}")]
    SchemaInvalid(String),
}

/// Result type for database operations.
pub type DbResult<T> = Result<T, DbError>;

impl From<DbError> for RepoError {
    fn from(err: DbError) -> Self {
        match err {
            DbError::NotFound => RepoError::NotFound,
            DbError::Duplicate => RepoError::Duplicate,
            DbError::Sqlx(e) => {
                // Check for specific SQLite errors
                let msg = e.to_string();
                if msg.contains("UNIQUE constraint failed") {
                    RepoError::Duplicate
                } else {
                    RepoError::Database(msg)
                }
            }
            other => RepoError::Database(other.to_string()),
        }
    }
}
