//! SQLite database connection and management.

use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::path::Path;
use std::str::FromStr;
use tracing::{info, instrument};

use crate::error::DbResult;
use super::{SqliteBlockRepository, SqliteChannelRepository, SqliteConnectionRepository};

/// SQLite database connection manager.
///
/// Manages the connection pool and provides access to repositories.
#[derive(Clone)]
pub struct SqliteDatabase {
    pool: SqlitePool,
}

impl SqliteDatabase {
    /// Create a new database connection to a file.
    ///
    /// Creates the database file if it doesn't exist.
    #[instrument(skip_all, fields(path = %path.as_ref().display()))]
    pub async fn new(path: impl AsRef<Path>) -> DbResult<Self> {
        let path = path.as_ref();

        let options = SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .busy_timeout(std::time::Duration::from_secs(30))
            .foreign_keys(true); // Enable FK constraint enforcement

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        info!("Connected to SQLite database");
        Ok(Self { pool })
    }

    /// Create an in-memory database (useful for testing).
    #[instrument]
    pub async fn in_memory() -> DbResult<Self> {
        let options = SqliteConnectOptions::from_str(":memory:")?
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .foreign_keys(true); // Enable FK constraint enforcement

        let pool = SqlitePoolOptions::new()
            .max_connections(1) // In-memory DBs need single connection to persist
            .connect_with(options)
            .await?;

        info!("Connected to in-memory SQLite database");
        Ok(Self { pool })
    }

    /// Run database migrations.
    ///
    /// Migrations are embedded at compile time from the `migrations/` directory.
    /// After running migrations, the schema is verified to ensure all required tables exist.
    #[instrument(skip(self))]
    pub async fn migrate(&self) -> DbResult<()> {
        info!("Running database migrations...");
        // Use compile-time embedded migrations for deterministic path resolution
        sqlx::migrate!().run(&self.pool).await?;
        info!("Migrations complete");

        // Verify schema after migrations
        self.verify_schema().await?;
        Ok(())
    }

    /// Verify that the database schema is valid.
    ///
    /// Checks that all required tables exist and are accessible.
    #[instrument(skip(self))]
    pub async fn verify_schema(&self) -> DbResult<()> {
        const REQUIRED_TABLES: &[&str] = &["channels", "blocks", "connections"];

        for table in REQUIRED_TABLES {
            let exists: (i32,) = sqlx::query_as(&format!(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{}'",
                table
            ))
            .fetch_one(&self.pool)
            .await
            .map_err(crate::error::DbError::from)?;

            if exists.0 == 0 {
                return Err(crate::error::DbError::SchemaInvalid(format!(
                    "required table '{}' does not exist",
                    table
                )));
            }
        }

        info!("Schema verification passed");
        Ok(())
    }

    /// Get a channel repository.
    pub fn channel_repository(&self) -> SqliteChannelRepository {
        SqliteChannelRepository::new(self.pool.clone())
    }

    /// Get a block repository.
    pub fn block_repository(&self) -> SqliteBlockRepository {
        SqliteBlockRepository::new(self.pool.clone())
    }

    /// Get a connection repository.
    pub fn connection_repository(&self) -> SqliteConnectionRepository {
        SqliteConnectionRepository::new(self.pool.clone())
    }

    /// Get the underlying pool (for advanced usage).
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Close the database connection pool.
    pub async fn close(&self) {
        self.pool.close().await;
        info!("Database connection closed");
    }
}

impl std::fmt::Debug for SqliteDatabase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SqliteDatabase")
            .field("pool_size", &self.pool.size())
            .finish()
    }
}
