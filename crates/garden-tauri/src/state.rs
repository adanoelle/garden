//! Application state management for Tauri.
//!
//! This module provides the `AppState` struct that holds all application
//! state in a thread-safe manner. It wraps the `GardenService` with concrete
//! SQLite repository implementations.

use std::sync::Arc;

use garden_core::services::GardenService;
use garden_db::sqlite::{
    SqliteBlockRepository, SqliteChannelRepository, SqliteConnectionRepository, SqliteDatabase,
};

/// Type alias for the concrete GardenService with SQLite repositories.
///
/// This provides a consistent type for the service throughout the application
/// without repeating the generic parameters.
pub type SqliteGardenService = GardenService<
    SqliteChannelRepository,
    SqliteBlockRepository,
    SqliteConnectionRepository,
>;

/// Application state managed by Tauri.
///
/// This struct is designed to be:
/// - `Clone` - Required by Tauri for state management
/// - `Send + Sync` - Required for async command execution
///
/// The internal `Arc` wrappers allow cheap cloning while maintaining
/// shared ownership of the database connection and service.
///
/// # Example
///
/// ```ignore
/// use garden_tauri::{AppState, initialize_database};
///
/// // In Tauri setup:
/// let state = initialize_database(&app_handle).await?;
/// app_handle.manage(state);
///
/// // In a command:
/// #[tauri::command]
/// async fn my_command(state: State<'_, AppState>) -> CommandResult<()> {
///     let channels = state.service().list_channels(10, 0).await?;
///     Ok(())
/// }
/// ```
#[derive(Clone)]
pub struct AppState {
    /// The GardenService instance with SQLite repositories.
    service: Arc<SqliteGardenService>,
    /// The database connection manager (for lifecycle management).
    database: Arc<SqliteDatabase>,
}

impl AppState {
    /// Create a new AppState from a database connection.
    ///
    /// This creates repositories from the database's connection pool
    /// and wires them into a GardenService.
    pub fn new(database: SqliteDatabase) -> Self {
        let channel_repo = database.channel_repository();
        let block_repo = database.block_repository();
        let connection_repo = database.connection_repository();

        let service = GardenService::new(channel_repo, block_repo, connection_repo);

        Self {
            service: Arc::new(service),
            database: Arc::new(database),
        }
    }

    /// Get a reference to the GardenService.
    ///
    /// This is the primary way to access domain operations from commands.
    #[inline]
    pub fn service(&self) -> &SqliteGardenService {
        &self.service
    }

    /// Get a reference to the database.
    ///
    /// Primarily used for lifecycle management (e.g., closing on shutdown).
    #[inline]
    pub fn database(&self) -> &SqliteDatabase {
        &self.database
    }

    /// Gracefully close the database connection.
    ///
    /// This should be called during application shutdown to ensure
    /// all pending operations complete and connections are released.
    pub async fn close(&self) {
        self.database.close().await;
    }
}

impl std::fmt::Debug for AppState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AppState")
            .field("database", &self.database)
            .finish_non_exhaustive()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn app_state_is_clone() {
        // AppState must be Clone for Tauri state management
        fn assert_clone<T: Clone>() {}
        assert_clone::<AppState>();
    }

    #[tokio::test]
    async fn app_state_is_send_sync() {
        // AppState must be Send + Sync for async commands
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<AppState>();
    }
}
