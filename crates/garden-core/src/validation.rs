//! Validation utilities for domain models.
//!
//! This module provides validation functions for user input,
//! ensuring data integrity at the domain boundary.

use url::Url;

use crate::error::{DomainError, DomainResult};
use crate::models::BlockContent;

/// Validate block content.
pub fn validate_block_content(content: &BlockContent) -> DomainResult<()> {
    match content {
        BlockContent::Text { body } => validate_text(body),
        BlockContent::Link {
            url,
            title,
            description,
            alt_text,
        } => {
            validate_url(url)?;
            if let Some(t) = title {
                validate_optional_text("title", t)?;
            }
            if let Some(d) = description {
                validate_optional_text("description", d)?;
            }
            if let Some(a) = alt_text {
                validate_optional_text("alt_text", a)?;
            }
            Ok(())
        }
        BlockContent::Image {
            file_path,
            mime_type,
            alt_text,
            original_url,
            ..
        } => {
            validate_file_path(file_path)?;
            validate_mime_type(mime_type, "image")?;
            if let Some(a) = alt_text {
                validate_optional_text("alt_text", a)?;
            }
            if let Some(url) = original_url {
                validate_url(url)?;
            }
            Ok(())
        }
        BlockContent::Video {
            file_path,
            mime_type,
            alt_text,
            original_url,
            ..
        } => {
            validate_file_path(file_path)?;
            validate_mime_type(mime_type, "video")?;
            if let Some(a) = alt_text {
                validate_optional_text("alt_text", a)?;
            }
            if let Some(url) = original_url {
                validate_url(url)?;
            }
            Ok(())
        }
        BlockContent::Audio {
            file_path,
            mime_type,
            title,
            artist,
            original_url,
            ..
        } => {
            validate_file_path(file_path)?;
            validate_mime_type(mime_type, "audio")?;
            if let Some(t) = title {
                validate_optional_text("title", t)?;
            }
            if let Some(a) = artist {
                validate_optional_text("artist", a)?;
            }
            if let Some(url) = original_url {
                validate_url(url)?;
            }
            Ok(())
        }
    }
}

/// Validate text content is not empty.
fn validate_text(text: &str) -> DomainResult<()> {
    if text.trim().is_empty() {
        return Err(DomainError::InvalidInput(
            "text block cannot be empty".to_string(),
        ));
    }
    Ok(())
}

/// Validate optional text fields (can be empty string, but not just whitespace if non-empty).
fn validate_optional_text(field_name: &str, text: &str) -> DomainResult<()> {
    // Empty string is allowed for optional fields
    if text.is_empty() {
        return Ok(());
    }
    // But if there's content, it shouldn't be just whitespace
    if text.trim().is_empty() {
        return Err(DomainError::InvalidInput(format!(
            "{} cannot be only whitespace",
            field_name
        )));
    }
    Ok(())
}

/// Validate a media file path.
///
/// File paths should be relative paths within the media directory,
/// following the pattern: "{type}/{uuid}.{ext}"
fn validate_file_path(path: &str) -> DomainResult<()> {
    if path.trim().is_empty() {
        return Err(DomainError::InvalidInput(
            "file path cannot be empty".to_string(),
        ));
    }

    // Basic sanity checks to prevent path traversal
    if path.contains("..") {
        return Err(DomainError::InvalidInput(
            "file path cannot contain '..'".to_string(),
        ));
    }
    if path.starts_with('/') || path.starts_with('\\') {
        return Err(DomainError::InvalidInput(
            "file path must be relative".to_string(),
        ));
    }

    Ok(())
}

/// Validate a MIME type matches the expected media category.
fn validate_mime_type(mime_type: &str, expected_category: &str) -> DomainResult<()> {
    if mime_type.trim().is_empty() {
        return Err(DomainError::InvalidInput(
            "MIME type cannot be empty".to_string(),
        ));
    }

    // Check that MIME type starts with expected category (image/, video/, audio/)
    if !mime_type.starts_with(&format!("{}/", expected_category)) {
        return Err(DomainError::InvalidInput(format!(
            "expected {} MIME type, got '{}'",
            expected_category, mime_type
        )));
    }

    Ok(())
}

/// Validate a URL string.
///
/// Uses the `url` crate for proper URL parsing and validation.
/// Only HTTP and HTTPS schemes are allowed.
pub fn validate_url(url_str: &str) -> DomainResult<()> {
    if url_str.trim().is_empty() {
        return Err(DomainError::InvalidInput(
            "link URL cannot be empty".to_string(),
        ));
    }

    let parsed = Url::parse(url_str)
        .map_err(|e| DomainError::InvalidInput(format!("invalid URL '{}': {}", url_str, e)))?;

    // Only allow http and https schemes
    match parsed.scheme() {
        "http" | "https" => {}
        scheme => {
            return Err(DomainError::InvalidInput(format!(
                "URL scheme '{}' is not allowed, use http or https",
                scheme
            )));
        }
    }

    // Ensure there's a host
    if parsed.host().is_none() {
        return Err(DomainError::InvalidInput(
            "URL must have a valid host".to_string(),
        ));
    }

    Ok(())
}

/// Validate a channel title.
pub fn validate_channel_title(title: &str) -> DomainResult<()> {
    if title.trim().is_empty() {
        return Err(DomainError::InvalidInput(
            "channel title cannot be empty".to_string(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─────────────────────────────────────────────────────────────────────────
    // URL Validation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn valid_https_url() {
        assert!(validate_url("https://example.com").is_ok());
        assert!(validate_url("https://example.com/path").is_ok());
        assert!(validate_url("https://example.com/path?query=value").is_ok());
        assert!(validate_url("https://sub.example.com").is_ok());
        assert!(validate_url("https://example.com:8080").is_ok());
    }

    #[test]
    fn valid_http_url() {
        assert!(validate_url("http://example.com").is_ok());
        assert!(validate_url("http://localhost").is_ok());
        assert!(validate_url("http://localhost:3000").is_ok());
    }

    #[test]
    fn empty_url_fails() {
        assert!(validate_url("").is_err());
        assert!(validate_url("   ").is_err());
    }

    #[test]
    fn missing_scheme_fails() {
        let result = validate_url("example.com");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("invalid URL"));
    }

    #[test]
    fn invalid_scheme_fails() {
        let result = validate_url("ftp://example.com");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not allowed"));

        let result = validate_url("file:///etc/passwd");
        assert!(result.is_err());

        let result = validate_url("javascript:alert(1)");
        assert!(result.is_err());
    }

    #[test]
    fn malformed_url_fails() {
        assert!(validate_url("https://").is_err());
        assert!(validate_url("http://").is_err());
        assert!(validate_url("not a url at all").is_err());
        assert!(validate_url("https:// spaces.com").is_err());
    }

    #[test]
    fn url_with_special_characters() {
        // These should work - they're valid URL formats
        assert!(validate_url("https://example.com/path%20with%20spaces").is_ok());
        assert!(validate_url("https://example.com/path?q=hello+world").is_ok());
        assert!(validate_url("https://example.com/#anchor").is_ok());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Text Validation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn valid_text() {
        assert!(validate_text("Hello, world!").is_ok());
        assert!(validate_text("  Hello  ").is_ok()); // Has content after trim
    }

    #[test]
    fn empty_text_fails() {
        assert!(validate_text("").is_err());
        assert!(validate_text("   ").is_err());
        assert!(validate_text("\t\n").is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Block Content Validation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn valid_text_block() {
        let content = BlockContent::text("Hello");
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn valid_link_block() {
        let content = BlockContent::link("https://example.com");
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn link_block_with_metadata() {
        let content = BlockContent::Link {
            url: "https://example.com".to_string(),
            title: Some("Example".to_string()),
            description: Some("An example site".to_string()),
            alt_text: None,
        };
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn link_block_whitespace_title_fails() {
        let content = BlockContent::Link {
            url: "https://example.com".to_string(),
            title: Some("   ".to_string()),
            description: None,
            alt_text: None,
        };
        assert!(validate_block_content(&content).is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Channel Title Validation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn valid_channel_title() {
        assert!(validate_channel_title("My Channel").is_ok());
        assert!(validate_channel_title("  Spaced  ").is_ok());
    }

    #[test]
    fn empty_channel_title_fails() {
        assert!(validate_channel_title("").is_err());
        assert!(validate_channel_title("   ").is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // File Path Validation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn valid_file_path() {
        assert!(validate_file_path("images/abc123.jpg").is_ok());
        assert!(validate_file_path("videos/xyz789.mp4").is_ok());
        assert!(validate_file_path("audio/song.mp3").is_ok());
    }

    #[test]
    fn empty_file_path_fails() {
        assert!(validate_file_path("").is_err());
        assert!(validate_file_path("   ").is_err());
    }

    #[test]
    fn path_traversal_fails() {
        assert!(validate_file_path("../etc/passwd").is_err());
        assert!(validate_file_path("images/../../../secret").is_err());
    }

    #[test]
    fn absolute_path_fails() {
        assert!(validate_file_path("/etc/passwd").is_err());
        assert!(validate_file_path("\\Windows\\System32").is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MIME Type Validation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn valid_image_mime_types() {
        assert!(validate_mime_type("image/jpeg", "image").is_ok());
        assert!(validate_mime_type("image/png", "image").is_ok());
        assert!(validate_mime_type("image/gif", "image").is_ok());
        assert!(validate_mime_type("image/webp", "image").is_ok());
    }

    #[test]
    fn valid_video_mime_types() {
        assert!(validate_mime_type("video/mp4", "video").is_ok());
        assert!(validate_mime_type("video/webm", "video").is_ok());
        assert!(validate_mime_type("video/quicktime", "video").is_ok());
    }

    #[test]
    fn valid_audio_mime_types() {
        assert!(validate_mime_type("audio/mpeg", "audio").is_ok());
        assert!(validate_mime_type("audio/ogg", "audio").is_ok());
        assert!(validate_mime_type("audio/wav", "audio").is_ok());
    }

    #[test]
    fn wrong_mime_category_fails() {
        assert!(validate_mime_type("video/mp4", "image").is_err());
        assert!(validate_mime_type("audio/mpeg", "video").is_err());
        assert!(validate_mime_type("image/jpeg", "audio").is_err());
    }

    #[test]
    fn empty_mime_type_fails() {
        assert!(validate_mime_type("", "image").is_err());
        assert!(validate_mime_type("   ", "video").is_err());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Media Block Content Validation Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn valid_image_block() {
        let content = BlockContent::image("images/test.jpg", "image/jpeg");
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn valid_video_block() {
        let content = BlockContent::video("videos/test.mp4", "video/mp4");
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn valid_audio_block() {
        let content = BlockContent::audio("audio/test.mp3", "audio/mpeg");
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn image_block_wrong_mime_fails() {
        let content = BlockContent::image("images/test.jpg", "video/mp4");
        assert!(validate_block_content(&content).is_err());
    }

    #[test]
    fn media_block_with_original_url() {
        let content = BlockContent::image_with_meta(
            "images/test.jpg",
            "image/jpeg",
            Some("https://example.com/original.jpg".to_string()),
            Some(800),
            Some(600),
            Some("A test image".to_string()),
        );
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn media_block_invalid_original_url_fails() {
        let content = BlockContent::image_with_meta(
            "images/test.jpg",
            "image/jpeg",
            Some("not-a-valid-url".to_string()),
            None,
            None,
            None,
        );
        assert!(validate_block_content(&content).is_err());
    }
}
