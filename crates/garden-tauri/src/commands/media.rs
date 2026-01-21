//! Media import and management commands.
//!
//! This module provides Tauri commands for importing and managing media files
//! (images, videos, audio). Media files are stored in the app's data directory
//! and served via Tauri's asset protocol.

use std::path::PathBuf;

use garden_core::services::{MediaError, MediaInfo};
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::{info, instrument};
use ts_rs::TS;

use crate::error::{CommandResult, TauriError};
use crate::state::AppState;

/// Response from media import operations.
///
/// Contains the stored file path and metadata that can be used to create
/// a block with the appropriate content type.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
pub struct MediaImportResult {
    /// Relative path within media directory (e.g., "images/{uuid}.jpg").
    pub file_path: String,
    /// MIME type of the file (e.g., "image/jpeg").
    pub mime_type: String,
    /// Image/video width in pixels (None for audio).
    pub width: Option<u32>,
    /// Image/video height in pixels (None for audio).
    pub height: Option<u32>,
    /// Duration in seconds (for video/audio, None for images).
    pub duration: Option<f32>,
    /// Original URL if imported from web.
    pub original_url: Option<String>,
}

impl From<MediaInfo> for MediaImportResult {
    fn from(info: MediaInfo) -> Self {
        Self {
            file_path: info.file_path,
            mime_type: info.mime_type,
            width: info.width,
            height: info.height,
            duration: info.duration,
            original_url: info.original_url,
        }
    }
}

impl From<MediaError> for TauriError {
    fn from(err: MediaError) -> Self {
        match err {
            MediaError::Download(msg) => TauriError::media(format!("Download failed: {}", msg)),
            MediaError::FileRead(e) => TauriError::media(format!("File read error: {}", e)),
            MediaError::FileWrite(msg) => TauriError::media(format!("File write error: {}", msg)),
            MediaError::UnsupportedType(mime) => {
                TauriError::media(format!("Unsupported media type: {}", mime))
            }
            MediaError::Metadata(msg) => TauriError::media(format!("Metadata error: {}", msg)),
            MediaError::Http(e) => TauriError::media(format!("HTTP error: {}", e)),
            MediaError::InvalidUrl(msg) => TauriError::media(format!("Invalid URL: {}", msg)),
            MediaError::FileTooLarge { size, max } => {
                TauriError::media(format!("File too large: {} bytes (max {} bytes)", size, max))
            }
            MediaError::InvalidPath(msg) => TauriError::media(format!("Invalid path: {}", msg)),
        }
    }
}

/// Import media from a URL.
///
/// Downloads the file, detects its type, extracts metadata, and stores it
/// in the appropriate media subdirectory.
///
/// # Arguments
///
/// * `url` - The URL to download from (must be a valid HTTP/HTTPS URL)
///
/// # Returns
///
/// `MediaImportResult` containing the stored file path and metadata.
///
/// # Errors
///
/// Returns an error if:
/// - The URL cannot be reached or returns an error status
/// - The content type is not a supported media type (image/video/audio)
/// - The file cannot be written to disk
///
/// # Example
///
/// ```typescript
/// const result = await invoke<MediaImportResult>('media_import_from_url', {
///   url: 'https://example.com/image.jpg'
/// });
/// // result.file_path = "images/a1b2c3d4.jpg"
/// // result.mime_type = "image/jpeg"
/// ```
#[tauri::command]
#[instrument(skip(state), fields(url = %url))]
pub async fn media_import_from_url(
    state: State<'_, AppState>,
    url: String,
) -> CommandResult<MediaImportResult> {
    info!("Importing media from URL");

    let media_info = state.media_service().import_from_url(&url).await?;

    info!(
        file_path = %media_info.file_path,
        mime_type = %media_info.mime_type,
        "Media imported successfully from URL"
    );

    Ok(media_info.into())
}

/// Import media from a local file.
///
/// Copies the file to the media directory, detects its type, and extracts metadata.
///
/// # Arguments
///
/// * `path` - Absolute path to the source file
///
/// # Returns
///
/// `MediaImportResult` containing the stored file path and metadata.
///
/// # Errors
///
/// Returns an error if:
/// - The source file does not exist or cannot be read
/// - The file type is not a supported media type (image/video/audio)
/// - The file cannot be copied to the media directory
///
/// # Example
///
/// ```typescript
/// const result = await invoke<MediaImportResult>('media_import_from_file', {
///   path: '/Users/alice/Downloads/photo.png'
/// });
/// // result.file_path = "images/e5f6g7h8.png"
/// // result.mime_type = "image/png"
/// ```
#[tauri::command]
#[instrument(skip(state), fields(path = %path))]
pub async fn media_import_from_file(
    state: State<'_, AppState>,
    path: String,
) -> CommandResult<MediaImportResult> {
    info!("Importing media from local file");

    let source_path = PathBuf::from(&path);
    let media_info = state.media_service().import_from_file(&source_path).await?;

    info!(
        file_path = %media_info.file_path,
        mime_type = %media_info.mime_type,
        "Media imported successfully from file"
    );

    Ok(media_info.into())
}

/// Delete a media file.
///
/// Removes the file from the media directory. This should be called when
/// deleting a block that contains media content.
///
/// # Arguments
///
/// * `file_path` - Relative path within media directory (e.g., "images/a1b2c3d4.jpg")
///
/// # Returns
///
/// `()` on success. Does not error if the file doesn't exist.
///
/// # Example
///
/// ```typescript
/// await invoke('media_delete', { filePath: 'images/a1b2c3d4.jpg' });
/// ```
#[tauri::command]
#[instrument(skip(state), fields(file_path = %file_path))]
pub async fn media_delete(state: State<'_, AppState>, file_path: String) -> CommandResult<()> {
    info!("Deleting media file");

    state.media_service().delete(&file_path).await?;

    info!("Media file deleted");
    Ok(())
}

/// Check if a media file exists.
///
/// # Arguments
///
/// * `file_path` - Relative path within media directory (e.g., "images/a1b2c3d4.jpg")
///
/// # Returns
///
/// `true` if the file exists, `false` otherwise.
///
/// # Example
///
/// ```typescript
/// const exists = await invoke<boolean>('media_exists', {
///   filePath: 'images/a1b2c3d4.jpg'
/// });
/// ```
#[tauri::command]
#[instrument(skip(state), fields(file_path = %file_path))]
pub async fn media_exists(state: State<'_, AppState>, file_path: String) -> CommandResult<bool> {
    let exists = state.media_service().exists(&file_path)?;
    Ok(exists)
}

/// Get the full filesystem path for a media file.
///
/// This is primarily useful for debugging or when you need the absolute path
/// rather than the asset:// URL.
///
/// # Arguments
///
/// * `file_path` - Relative path within media directory (e.g., "images/a1b2c3d4.jpg")
///
/// # Returns
///
/// The absolute filesystem path to the media file.
///
/// # Example
///
/// ```typescript
/// const fullPath = await invoke<string>('media_get_full_path', {
///   filePath: 'images/a1b2c3d4.jpg'
/// });
/// // fullPath = "/Users/alice/Library/Application Support/com.garden.app/media/images/a1b2c3d4.jpg"
/// ```
#[tauri::command]
#[instrument(skip(state), fields(file_path = %file_path))]
pub async fn media_get_full_path(
    state: State<'_, AppState>,
    file_path: String,
) -> CommandResult<String> {
    let full_path = state.media_service().get_full_path(&file_path)?;
    Ok(full_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn media_import_result_from_media_info() {
        let info = MediaInfo {
            file_path: "images/test.jpg".to_string(),
            mime_type: "image/jpeg".to_string(),
            width: Some(800),
            height: Some(600),
            duration: None,
            original_url: Some("https://example.com/test.jpg".to_string()),
        };

        let result: MediaImportResult = info.into();

        assert_eq!(result.file_path, "images/test.jpg");
        assert_eq!(result.mime_type, "image/jpeg");
        assert_eq!(result.width, Some(800));
        assert_eq!(result.height, Some(600));
        assert_eq!(result.duration, None);
        assert_eq!(
            result.original_url,
            Some("https://example.com/test.jpg".to_string())
        );
    }
}
