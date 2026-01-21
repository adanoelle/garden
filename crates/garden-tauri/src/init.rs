//! Application initialization for Tauri.
//!
//! This module handles application setup including:
//! - Resolving platform-specific data directories
//! - Creating the database file and media directories
//! - Running migrations
//! - Constructing the AppState

use std::path::PathBuf;

use garden_db::sqlite::SqliteDatabase;
use tauri::{AppHandle, Manager};
use tracing::{error, info, instrument};

use crate::error::{CommandResult, TauriError};
use crate::state::AppState;

/// Database filename.
const DATABASE_FILENAME: &str = "garden.db";

/// Media directory name.
const MEDIA_DIRNAME: &str = "media";

/// Media subdirectories for different content types.
const MEDIA_SUBDIRS: &[&str] = &["images", "videos", "audio"];

/// Initialize the database and create the application state.
///
/// This function:
/// 1. Resolves the platform-specific app data directory
/// 2. Creates the directory if it doesn't exist
/// 3. Connects to (or creates) the SQLite database
/// 4. Runs any pending migrations
/// 5. Returns the initialized AppState
///
/// # Platform-specific paths
///
/// - **macOS**: `~/Library/Application Support/{bundle_id}/`
/// - **Windows**: `%APPDATA%/{bundle_id}/`
/// - **Linux**: `~/.local/share/{bundle_id}/`
///
/// # Errors
///
/// Returns a `TauriError` if:
/// - The app data directory cannot be resolved
/// - The directory cannot be created
/// - The database connection fails
/// - Migrations fail
///
/// # Example
///
/// ```ignore
/// use garden_tauri::initialize_database;
///
/// tauri::Builder::default()
///     .setup(|app| {
///         let handle = app.handle().clone();
///         tauri::async_runtime::block_on(async move {
///             let state = initialize_database(&handle).await?;
///             handle.manage(state);
///             Ok(())
///         })
///     })
///     .run(tauri::generate_context!());
/// ```
#[instrument(skip(app), fields(app_name = %app.package_info().name))]
pub async fn initialize_database(app: &AppHandle) -> CommandResult<AppState> {
    info!("Initializing database...");

    // Get platform-specific app data directory
    let db_path = resolve_database_path(app)?;
    info!(path = %db_path.display(), "Database path resolved");

    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            error!(error = %e, path = %parent.display(), "Failed to create app data directory");
            TauriError::initialization(format!("Failed to create app data directory: {}", e))
        })?;

        // Create media directories
        initialize_media_directories(parent)?;
    }

    // Connect to database
    let database = SqliteDatabase::new(&db_path).await.map_err(|e| {
        error!(error = %e, "Failed to connect to database");
        TauriError::initialization(format!("Failed to connect to database: {}", e))
    })?;

    // Run migrations
    database.migrate().await.map_err(|e| {
        error!(error = %e, "Failed to run database migrations");
        TauriError::initialization(format!("Failed to run migrations: {}", e))
    })?;

    // Get media directory path
    let media_path = app.path().app_data_dir().map_err(|e| {
        error!(error = %e, "Failed to resolve app data directory for media");
        TauriError::initialization(format!("Failed to resolve app data directory: {}", e))
    })?.join(MEDIA_DIRNAME);

    info!("Database initialized successfully");
    Ok(AppState::new(database, media_path))
}

/// Resolve the full path to the database file.
///
/// Uses Tauri's path resolver to get the platform-appropriate app data directory.
fn resolve_database_path(app: &AppHandle) -> CommandResult<PathBuf> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| {
        error!(error = %e, "Failed to resolve app data directory");
        TauriError::initialization(format!("Failed to resolve app data directory: {}", e))
    })?;

    Ok(app_data_dir.join(DATABASE_FILENAME))
}

/// Get the database path for the current app (useful for debugging).
///
/// Returns `None` if the path cannot be resolved.
pub fn get_database_path(app: &AppHandle) -> Option<PathBuf> {
    resolve_database_path(app).ok()
}

/// Get the media directory path for the current app.
///
/// Returns `None` if the path cannot be resolved.
pub fn get_media_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join(MEDIA_DIRNAME))
}

/// Initialize the media directory structure.
///
/// Creates the media directory and subdirectories for images, videos, and audio.
fn initialize_media_directories(app_data_dir: &std::path::Path) -> CommandResult<()> {
    let media_dir = app_data_dir.join(MEDIA_DIRNAME);

    for subdir in MEDIA_SUBDIRS {
        let path = media_dir.join(subdir);
        std::fs::create_dir_all(&path).map_err(|e| {
            error!(error = %e, path = %path.display(), "Failed to create media directory");
            TauriError::initialization(format!("Failed to create media directory: {}", e))
        })?;
    }

    info!(path = %media_dir.display(), "Media directories initialized");
    Ok(())
}

#[cfg(test)]
mod tests {
    // Integration tests would require a Tauri test harness
    // which we'll add in the integration test phase
}
