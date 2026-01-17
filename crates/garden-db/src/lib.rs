//! Garden Database Adapters
//!
//! This crate provides database implementations for the repository traits
//! defined in `garden-core`. It supports multiple backends through feature flags:
//!
//! - `sqlite` (default) - SQLite for desktop/embedded use
//! - `postgres` - PostgreSQL for server deployments
//!
//! # Usage
//!
//! ```ignore
//! use garden_db::sqlite::SqliteDatabase;
//!
//! // Create a database connection
//! let db = SqliteDatabase::new("garden.db").await?;
//!
//! // Run migrations
//! db.migrate().await?;
//!
//! // Get repositories
//! let channel_repo = db.channel_repository();
//! let block_repo = db.block_repository();
//! let conn_repo = db.connection_repository();
//!
//! // Use with GardenService
//! let service = GardenService::new(channel_repo, block_repo, conn_repo);
//! ```

pub mod error;

#[cfg(feature = "sqlite")]
pub mod sqlite;

pub use error::{DbError, DbResult};
