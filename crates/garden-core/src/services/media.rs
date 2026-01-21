//! Media file operations service.
//!
//! This module provides functionality for importing, storing, and managing
//! media files (images, videos, audio) for Garden blocks.

use std::path::{Path, PathBuf};

use image::GenericImageView;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::io::AsyncWriteExt;
use tracing::{error, info, instrument};
use uuid::Uuid;

use crate::models::BlockContent;

/// Media type classification.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MediaType {
    Image,
    Video,
    Audio,
}

impl MediaType {
    /// Get the subdirectory name for this media type.
    pub fn subdir(&self) -> &'static str {
        match self {
            MediaType::Image => "images",
            MediaType::Video => "videos",
            MediaType::Audio => "audio",
        }
    }

    /// Detect media type from MIME type string.
    pub fn from_mime(mime: &str) -> Option<Self> {
        if mime.starts_with("image/") {
            Some(MediaType::Image)
        } else if mime.starts_with("video/") {
            Some(MediaType::Video)
        } else if mime.starts_with("audio/") {
            Some(MediaType::Audio)
        } else {
            None
        }
    }
}

/// Information about an imported media file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaInfo {
    /// Relative path within media directory (e.g., "images/{uuid}.jpg").
    pub file_path: String,
    /// MIME type of the file.
    pub mime_type: String,
    /// Image/video width in pixels (None for audio).
    pub width: Option<u32>,
    /// Image/video height in pixels (None for audio).
    pub height: Option<u32>,
    /// Duration in seconds (for video/audio).
    pub duration: Option<f32>,
    /// Original URL if imported from web.
    pub original_url: Option<String>,
}

impl MediaInfo {
    /// Convert this MediaInfo into a BlockContent variant.
    pub fn into_block_content(self) -> BlockContent {
        let media_type = MediaType::from_mime(&self.mime_type);

        match media_type {
            Some(MediaType::Image) => BlockContent::Image {
                file_path: self.file_path,
                original_url: self.original_url,
                width: self.width,
                height: self.height,
                mime_type: self.mime_type,
                alt_text: None,
            },
            Some(MediaType::Video) => BlockContent::Video {
                file_path: self.file_path,
                original_url: self.original_url,
                width: self.width,
                height: self.height,
                duration: self.duration,
                mime_type: self.mime_type,
                alt_text: None,
            },
            Some(MediaType::Audio) => BlockContent::Audio {
                file_path: self.file_path,
                original_url: self.original_url,
                duration: self.duration,
                mime_type: self.mime_type,
                title: None,
                artist: None,
            },
            None => {
                // Fallback to image if we can't determine type
                BlockContent::Image {
                    file_path: self.file_path,
                    original_url: self.original_url,
                    width: self.width,
                    height: self.height,
                    mime_type: self.mime_type,
                    alt_text: None,
                }
            }
        }
    }
}

/// Maximum file size for media imports (100 MB).
const MAX_DOWNLOAD_SIZE: u64 = 100 * 1024 * 1024;

/// Errors that can occur during media operations.
#[derive(Debug, Error)]
pub enum MediaError {
    #[error("Failed to download media: {0}")]
    Download(String),

    #[error("Failed to read file: {0}")]
    FileRead(#[from] std::io::Error),

    #[error("Failed to write file: {0}")]
    FileWrite(String),

    #[error("Unsupported media type: {0}")]
    UnsupportedType(String),

    #[error("Failed to extract metadata: {0}")]
    Metadata(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("File too large: {size} bytes (max {max} bytes)")]
    FileTooLarge { size: u64, max: u64 },

    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

/// Result type for media operations.
pub type MediaResult<T> = Result<T, MediaError>;

/// Service for media file operations.
///
/// This service handles importing media from URLs or local files,
/// storing them in the appropriate directory structure, and extracting
/// metadata like dimensions and MIME types.
#[derive(Debug, Clone)]
pub struct MediaService {
    /// Root directory for media storage (e.g., $APPDATA/media).
    media_root: PathBuf,
    /// HTTP client for downloading media.
    http_client: reqwest::Client,
}

impl MediaService {
    /// Create a new MediaService.
    ///
    /// # Arguments
    ///
    /// * `media_root` - The root directory for media storage
    pub fn new(media_root: impl Into<PathBuf>) -> Self {
        Self {
            media_root: media_root.into(),
            http_client: reqwest::Client::new(),
        }
    }

    /// Validate a relative path and return the full path.
    ///
    /// This prevents path traversal attacks by ensuring the resolved path
    /// stays within the media root directory.
    fn validate_path(&self, relative_path: &str) -> MediaResult<PathBuf> {
        // Reject obvious path traversal attempts
        if relative_path.contains("..") || relative_path.starts_with('/') {
            return Err(MediaError::InvalidPath(
                "Path traversal not allowed".to_string(),
            ));
        }

        let full_path = self.media_root.join(relative_path);

        // Canonicalize to resolve any symlinks or relative components
        // Note: This only works if the path exists, so we also check the parent
        if let Ok(canonical) = full_path.canonicalize() {
            if !canonical.starts_with(&self.media_root) {
                return Err(MediaError::InvalidPath(
                    "Path outside media directory".to_string(),
                ));
            }
        } else if let Some(parent) = full_path.parent() {
            // If file doesn't exist, check that parent is valid
            if let Ok(canonical_parent) = parent.canonicalize() {
                if !canonical_parent.starts_with(&self.media_root) {
                    return Err(MediaError::InvalidPath(
                        "Path outside media directory".to_string(),
                    ));
                }
            }
        }

        Ok(full_path)
    }

    /// Import media from a URL.
    ///
    /// Downloads the file, detects its type, extracts metadata, and stores it.
    ///
    /// # Arguments
    ///
    /// * `url` - The URL to download from
    ///
    /// # Returns
    ///
    /// `MediaInfo` containing the stored file path and metadata
    #[instrument(skip(self), fields(url = %url))]
    pub async fn import_from_url(&self, url: &str) -> MediaResult<MediaInfo> {
        info!("Downloading media from URL");

        // Validate URL scheme (only allow HTTP/HTTPS)
        let parsed_url = url::Url::parse(url)
            .map_err(|e| MediaError::InvalidUrl(format!("Invalid URL: {}", e)))?;

        if !["http", "https"].contains(&parsed_url.scheme()) {
            return Err(MediaError::InvalidUrl(format!(
                "Only HTTP/HTTPS URLs allowed, got: {}",
                parsed_url.scheme()
            )));
        }

        // Download the file
        let response = self.http_client.get(url).send().await?;

        if !response.status().is_success() {
            return Err(MediaError::Download(format!(
                "HTTP {} from {}",
                response.status(),
                url
            )));
        }

        // Check content length before downloading
        if let Some(content_length) = response.content_length() {
            if content_length > MAX_DOWNLOAD_SIZE {
                return Err(MediaError::FileTooLarge {
                    size: content_length,
                    max: MAX_DOWNLOAD_SIZE,
                });
            }
        }

        // Get content type from headers, or guess from URL
        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.split(';').next().unwrap_or(s).trim().to_string())
            .or_else(|| {
                mime_guess::from_path(url)
                    .first()
                    .map(|m| m.to_string())
            })
            .unwrap_or_else(|| "application/octet-stream".to_string());

        let media_type = MediaType::from_mime(&content_type)
            .ok_or_else(|| MediaError::UnsupportedType(content_type.clone()))?;

        // Get the file extension
        let extension = get_extension_for_mime(&content_type)
            .or_else(|| Path::new(url).extension().and_then(|e| e.to_str()))
            .unwrap_or("bin");

        // Generate filename and path
        let filename = format!("{}.{}", Uuid::new_v4(), extension);
        let relative_path = format!("{}/{}", media_type.subdir(), filename);
        let full_path = self.media_root.join(&relative_path);

        // Ensure directory exists
        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Download and write file
        let bytes = response.bytes().await?;
        let mut file = tokio::fs::File::create(&full_path).await?;
        file.write_all(&bytes).await?;

        info!(path = %relative_path, "Media file saved");

        // Extract metadata
        let (width, height) = if media_type == MediaType::Image {
            extract_image_dimensions(&full_path).unwrap_or((None, None))
        } else {
            (None, None)
        };

        Ok(MediaInfo {
            file_path: relative_path,
            mime_type: content_type,
            width,
            height,
            duration: None, // TODO: Extract duration for video/audio
            original_url: Some(url.to_string()),
        })
    }

    /// Import media from a local file.
    ///
    /// Copies the file to the media directory, detects its type, and extracts metadata.
    ///
    /// # Arguments
    ///
    /// * `source_path` - Path to the source file
    ///
    /// # Returns
    ///
    /// `MediaInfo` containing the stored file path and metadata
    #[instrument(skip(self, source_path))]
    pub async fn import_from_file(&self, source_path: impl AsRef<Path>) -> MediaResult<MediaInfo> {
        let source_path = source_path.as_ref();
        info!("Importing media from local file");

        // Detect MIME type
        let mime_type = mime_guess::from_path(source_path)
            .first()
            .map(|m| m.to_string())
            .unwrap_or_else(|| "application/octet-stream".to_string());

        let media_type = MediaType::from_mime(&mime_type)
            .ok_or_else(|| MediaError::UnsupportedType(mime_type.clone()))?;

        // Get extension from source file or MIME type
        let extension = source_path
            .extension()
            .and_then(|e| e.to_str())
            .or_else(|| get_extension_for_mime(&mime_type))
            .unwrap_or("bin");

        // Generate filename and path
        let filename = format!("{}.{}", Uuid::new_v4(), extension);
        let relative_path = format!("{}/{}", media_type.subdir(), filename);
        let full_path = self.media_root.join(&relative_path);

        // Ensure directory exists
        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Copy file
        tokio::fs::copy(source_path, &full_path).await?;

        info!(path = %relative_path, "Media file imported");

        // Extract metadata
        let (width, height) = if media_type == MediaType::Image {
            extract_image_dimensions(&full_path).unwrap_or((None, None))
        } else {
            (None, None)
        };

        Ok(MediaInfo {
            file_path: relative_path,
            mime_type,
            width,
            height,
            duration: None, // TODO: Extract duration for video/audio
            original_url: None,
        })
    }

    /// Delete a media file.
    ///
    /// # Arguments
    ///
    /// * `file_path` - Relative path within media directory
    #[instrument(skip(self), fields(path = %file_path))]
    pub async fn delete(&self, file_path: &str) -> MediaResult<()> {
        let full_path = self.validate_path(file_path)?;

        if full_path.exists() {
            tokio::fs::remove_file(&full_path).await?;
            info!("Media file deleted");
        }

        Ok(())
    }

    /// Get the full filesystem path for a media file.
    ///
    /// # Arguments
    ///
    /// * `file_path` - Relative path within media directory
    ///
    /// # Errors
    ///
    /// Returns `MediaError::InvalidPath` if the path attempts traversal outside media directory.
    pub fn get_full_path(&self, file_path: &str) -> MediaResult<PathBuf> {
        self.validate_path(file_path)
    }

    /// Check if a media file exists.
    ///
    /// # Arguments
    ///
    /// * `file_path` - Relative path within media directory
    ///
    /// # Errors
    ///
    /// Returns `MediaError::InvalidPath` if the path attempts traversal outside media directory.
    pub fn exists(&self, file_path: &str) -> MediaResult<bool> {
        let full_path = self.validate_path(file_path)?;
        Ok(full_path.exists())
    }
}

/// Extract image dimensions from a file.
fn extract_image_dimensions(path: &Path) -> Option<(Option<u32>, Option<u32>)> {
    match image::open(path) {
        Ok(img) => {
            let (width, height) = img.dimensions();
            Some((Some(width), Some(height)))
        }
        Err(e) => {
            error!(error = %e, "Failed to read image dimensions");
            None
        }
    }
}

/// Get file extension for a MIME type.
fn get_extension_for_mime(mime: &str) -> Option<&'static str> {
    match mime {
        // Images
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        "image/svg+xml" => Some("svg"),
        // Videos
        "video/mp4" => Some("mp4"),
        "video/webm" => Some("webm"),
        "video/quicktime" => Some("mov"),
        "video/x-msvideo" => Some("avi"),
        // Audio
        "audio/mpeg" => Some("mp3"),
        "audio/ogg" => Some("ogg"),
        "audio/wav" => Some("wav"),
        "audio/webm" => Some("webm"),
        "audio/flac" => Some("flac"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_media_type_from_mime() {
        assert_eq!(MediaType::from_mime("image/jpeg"), Some(MediaType::Image));
        assert_eq!(MediaType::from_mime("video/mp4"), Some(MediaType::Video));
        assert_eq!(MediaType::from_mime("audio/mpeg"), Some(MediaType::Audio));
        assert_eq!(MediaType::from_mime("text/plain"), None);
    }

    #[test]
    fn test_media_type_subdir() {
        assert_eq!(MediaType::Image.subdir(), "images");
        assert_eq!(MediaType::Video.subdir(), "videos");
        assert_eq!(MediaType::Audio.subdir(), "audio");
    }

    #[test]
    fn test_get_extension_for_mime() {
        assert_eq!(get_extension_for_mime("image/jpeg"), Some("jpg"));
        assert_eq!(get_extension_for_mime("video/mp4"), Some("mp4"));
        assert_eq!(get_extension_for_mime("audio/mpeg"), Some("mp3"));
        assert_eq!(get_extension_for_mime("unknown/type"), None);
    }

    #[test]
    fn test_media_info_into_block_content() {
        let info = MediaInfo {
            file_path: "images/test.jpg".to_string(),
            mime_type: "image/jpeg".to_string(),
            width: Some(800),
            height: Some(600),
            duration: None,
            original_url: Some("https://example.com/test.jpg".to_string()),
        };

        let content = info.into_block_content();
        match content {
            BlockContent::Image {
                file_path,
                width,
                height,
                ..
            } => {
                assert_eq!(file_path, "images/test.jpg");
                assert_eq!(width, Some(800));
                assert_eq!(height, Some(600));
            }
            _ => panic!("Expected Image content"),
        }
    }
}
