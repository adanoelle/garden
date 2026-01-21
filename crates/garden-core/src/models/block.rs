//! Block model - a piece of content that can be connected to channels.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Unique identifier for a block.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BlockId(pub String);

impl BlockId {
    /// Create a new block ID.
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4().to_string())
    }

    /// Create a block ID from an existing string.
    pub fn from_string(s: impl Into<String>) -> Self {
        Self(s.into())
    }
}

impl Default for BlockId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for BlockId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// The content of a block.
///
/// Supports Text, Link, Image, Video, and Audio types.
/// Future types: Code.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum BlockContent {
    /// Plain text content.
    Text {
        /// The text body.
        body: String,
    },
    /// A link to an external resource.
    Link {
        /// The URL.
        url: String,
        /// Optional title (often extracted from the page).
        title: Option<String>,
        /// Optional description (often extracted from meta tags).
        description: Option<String>,
        /// Alt text for accessibility.
        alt_text: Option<String>,
    },
    /// An image stored locally.
    Image {
        /// Relative path within media directory: "images/{uuid}.{ext}"
        file_path: String,
        /// Original URL where image was downloaded from.
        original_url: Option<String>,
        /// Image width in pixels.
        width: Option<u32>,
        /// Image height in pixels.
        height: Option<u32>,
        /// MIME type: "image/jpeg", "image/png", etc.
        mime_type: String,
        /// Alt text for accessibility.
        alt_text: Option<String>,
    },
    /// A video stored locally.
    Video {
        /// Relative path within media directory: "videos/{uuid}.{ext}"
        file_path: String,
        /// Original URL where video was downloaded from.
        original_url: Option<String>,
        /// Video width in pixels.
        width: Option<u32>,
        /// Video height in pixels.
        height: Option<u32>,
        /// Duration in seconds.
        duration: Option<f32>,
        /// MIME type: "video/mp4", "video/webm", etc.
        mime_type: String,
        /// Alt text for accessibility.
        alt_text: Option<String>,
    },
    /// An audio file stored locally.
    Audio {
        /// Relative path within media directory: "audio/{uuid}.{ext}"
        file_path: String,
        /// Original URL where audio was downloaded from.
        original_url: Option<String>,
        /// Duration in seconds.
        duration: Option<f32>,
        /// MIME type: "audio/mpeg", "audio/ogg", etc.
        mime_type: String,
        /// Title from ID3 tags or filename.
        title: Option<String>,
        /// Artist from ID3 tags.
        artist: Option<String>,
    },
}

impl BlockContent {
    /// Create text content.
    pub fn text(body: impl Into<String>) -> Self {
        Self::Text { body: body.into() }
    }

    /// Create link content.
    pub fn link(url: impl Into<String>) -> Self {
        Self::Link {
            url: url.into(),
            title: None,
            description: None,
            alt_text: None,
        }
    }

    /// Create link content with metadata.
    pub fn link_with_meta(
        url: impl Into<String>,
        title: Option<String>,
        description: Option<String>,
        alt_text: Option<String>,
    ) -> Self {
        Self::Link {
            url: url.into(),
            title,
            description,
            alt_text,
        }
    }

    /// Create image content.
    pub fn image(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::Image {
            file_path: file_path.into(),
            original_url: None,
            width: None,
            height: None,
            mime_type: mime_type.into(),
            alt_text: None,
        }
    }

    /// Create image content with full metadata.
    pub fn image_with_meta(
        file_path: impl Into<String>,
        mime_type: impl Into<String>,
        original_url: Option<String>,
        width: Option<u32>,
        height: Option<u32>,
        alt_text: Option<String>,
    ) -> Self {
        Self::Image {
            file_path: file_path.into(),
            original_url,
            width,
            height,
            mime_type: mime_type.into(),
            alt_text,
        }
    }

    /// Create video content.
    pub fn video(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::Video {
            file_path: file_path.into(),
            original_url: None,
            width: None,
            height: None,
            duration: None,
            mime_type: mime_type.into(),
            alt_text: None,
        }
    }

    /// Create video content with full metadata.
    pub fn video_with_meta(
        file_path: impl Into<String>,
        mime_type: impl Into<String>,
        original_url: Option<String>,
        width: Option<u32>,
        height: Option<u32>,
        duration: Option<f32>,
        alt_text: Option<String>,
    ) -> Self {
        Self::Video {
            file_path: file_path.into(),
            original_url,
            width,
            height,
            duration,
            mime_type: mime_type.into(),
            alt_text,
        }
    }

    /// Create audio content.
    pub fn audio(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::Audio {
            file_path: file_path.into(),
            original_url: None,
            duration: None,
            mime_type: mime_type.into(),
            title: None,
            artist: None,
        }
    }

    /// Create audio content with full metadata.
    pub fn audio_with_meta(
        file_path: impl Into<String>,
        mime_type: impl Into<String>,
        original_url: Option<String>,
        duration: Option<f32>,
        title: Option<String>,
        artist: Option<String>,
    ) -> Self {
        Self::Audio {
            file_path: file_path.into(),
            original_url,
            duration,
            mime_type: mime_type.into(),
            title,
            artist,
        }
    }

    /// Get a display title for the block content.
    pub fn display_title(&self) -> &str {
        match self {
            Self::Text { body } => {
                // Return first line, truncated to 50 chars if needed
                let first_line = body.lines().next().unwrap_or(body);
                if first_line.len() > 50 {
                    // Find a valid UTF-8 boundary at or before byte 50
                    let mut end = 50;
                    while end > 0 && !first_line.is_char_boundary(end) {
                        end -= 1;
                    }
                    &first_line[..end]
                } else {
                    first_line
                }
            }
            Self::Link { title, url, .. } => title.as_deref().unwrap_or(url),
            Self::Image { alt_text, file_path, .. } => {
                alt_text.as_deref().unwrap_or(file_path)
            }
            Self::Video { alt_text, file_path, .. } => {
                alt_text.as_deref().unwrap_or(file_path)
            }
            Self::Audio { title, artist, file_path, .. } => {
                // Prefer title, then "artist - title", then file_path
                if let Some(t) = title {
                    t
                } else if let Some(a) = artist {
                    a
                } else {
                    file_path
                }
            }
        }
    }

    /// Returns true if this content is a media type (Image, Video, or Audio).
    pub fn is_media(&self) -> bool {
        matches!(self, Self::Image { .. } | Self::Video { .. } | Self::Audio { .. })
    }

    /// Get the file path if this is a media type.
    pub fn file_path(&self) -> Option<&str> {
        match self {
            Self::Image { file_path, .. }
            | Self::Video { file_path, .. }
            | Self::Audio { file_path, .. } => Some(file_path),
            _ => None,
        }
    }

    /// Get the MIME type if this is a media type.
    pub fn mime_type(&self) -> Option<&str> {
        match self {
            Self::Image { mime_type, .. }
            | Self::Video { mime_type, .. }
            | Self::Audio { mime_type, .. } => Some(mime_type),
            _ => None,
        }
    }
}

/// A block is a piece of content that can be connected to multiple channels.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Block {
    /// Unique identifier.
    pub id: BlockId,
    /// The block's content.
    pub content: BlockContent,
    /// When the block was created (archived).
    #[ts(type = "string")]
    pub created_at: DateTime<Utc>,
    /// When the block was last updated.
    #[ts(type = "string")]
    pub updated_at: DateTime<Utc>,

    // Archive metadata fields
    /// Original URL where content was curated from.
    pub source_url: Option<String>,
    /// Custom display text for the source link.
    pub source_title: Option<String>,
    /// Author or artist of the original content.
    pub creator: Option<String>,
    /// Original publication date (flexible format string).
    pub original_date: Option<String>,
    /// User's personal notes about this block.
    pub notes: Option<String>,
}

impl Block {
    /// Create a new block with the given content.
    pub fn new(content: BlockContent) -> Self {
        let now = Utc::now();
        Self {
            id: BlockId::new(),
            content,
            created_at: now,
            updated_at: now,
            source_url: None,
            source_title: None,
            creator: None,
            original_date: None,
            notes: None,
        }
    }

    /// Create a new text block.
    pub fn text(body: impl Into<String>) -> Self {
        Self::new(BlockContent::text(body))
    }

    /// Create a new link block.
    pub fn link(url: impl Into<String>) -> Self {
        Self::new(BlockContent::link(url))
    }

    /// Create a new image block.
    pub fn image(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::new(BlockContent::image(file_path, mime_type))
    }

    /// Create a new video block.
    pub fn video(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::new(BlockContent::video(file_path, mime_type))
    }

    /// Create a new audio block.
    pub fn audio(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::new(BlockContent::audio(file_path, mime_type))
    }

    /// Get the display title for this block.
    pub fn display_title(&self) -> &str {
        self.content.display_title()
    }

    /// Returns true if this block contains media content.
    pub fn is_media(&self) -> bool {
        self.content.is_media()
    }
}

/// Data for creating a new block.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NewBlock {
    pub content: BlockContent,
    /// Original URL where content was curated from.
    #[serde(default)]
    pub source_url: Option<String>,
    /// Custom display text for the source link.
    #[serde(default)]
    pub source_title: Option<String>,
    /// Author or artist of the original content.
    #[serde(default)]
    pub creator: Option<String>,
    /// Original publication date (flexible format string).
    #[serde(default)]
    pub original_date: Option<String>,
    /// User's personal notes about this block.
    #[serde(default)]
    pub notes: Option<String>,
}

impl NewBlock {
    /// Create a new block with just content (metadata fields default to None).
    pub fn new(content: BlockContent) -> Self {
        Self {
            content,
            source_url: None,
            source_title: None,
            creator: None,
            original_date: None,
            notes: None,
        }
    }

    /// Create a new text block.
    pub fn text(body: impl Into<String>) -> Self {
        Self::new(BlockContent::text(body))
    }

    /// Create a new link block.
    pub fn link(url: impl Into<String>) -> Self {
        Self::new(BlockContent::link(url))
    }

    /// Create a new image block.
    pub fn image(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::new(BlockContent::image(file_path, mime_type))
    }

    /// Create a new video block.
    pub fn video(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::new(BlockContent::video(file_path, mime_type))
    }

    /// Create a new audio block.
    pub fn audio(file_path: impl Into<String>, mime_type: impl Into<String>) -> Self {
        Self::new(BlockContent::audio(file_path, mime_type))
    }

    /// Set the source URL and return self (builder pattern).
    pub fn with_source_url(mut self, url: impl Into<String>) -> Self {
        self.source_url = Some(url.into());
        self
    }
}

/// Data for updating a block.
///
/// All fields are optional:
/// - Omit field or null → keep existing value
/// - `{ action: 'clear' }` → set to null
/// - `{ action: 'set', value: '...' }` → set to new value
#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct BlockUpdate {
    /// New content (if changing). Omit = keep current.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub content: Option<BlockContent>,
    /// Source URL update. Omit = keep current.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub source_url: Option<super::FieldUpdate<String>>,
    /// Source title update. Omit = keep current.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub source_title: Option<super::FieldUpdate<String>>,
    /// Creator update. Omit = keep current.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub creator: Option<super::FieldUpdate<String>>,
    /// Original date update. Omit = keep current.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub original_date: Option<super::FieldUpdate<String>>,
    /// Notes update. Omit = keep current.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub notes: Option<super::FieldUpdate<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_id_generates_unique_ids() {
        let id1 = BlockId::new();
        let id2 = BlockId::new();
        assert_ne!(id1, id2);
    }

    #[test]
    fn text_block_display_title() {
        let block = Block::text("Hello, world!\nSecond line");
        assert_eq!(block.display_title(), "Hello, world!");
    }

    #[test]
    fn link_block_display_title_uses_title() {
        let block = Block::new(BlockContent::link_with_meta(
            "https://example.com",
            Some("Example Site".to_string()),
            None,
            None,
        ));
        assert_eq!(block.display_title(), "Example Site");
    }

    #[test]
    fn link_block_display_title_falls_back_to_url() {
        let block = Block::link("https://example.com");
        assert_eq!(block.display_title(), "https://example.com");
    }

    #[test]
    fn image_block_creation() {
        let block = Block::image("images/abc123.jpg", "image/jpeg");
        assert!(block.is_media());
        assert_eq!(block.content.file_path(), Some("images/abc123.jpg"));
        assert_eq!(block.content.mime_type(), Some("image/jpeg"));
    }

    #[test]
    fn image_block_display_title_uses_alt_text() {
        let block = Block::new(BlockContent::image_with_meta(
            "images/abc123.jpg",
            "image/jpeg",
            None,
            Some(800),
            Some(600),
            Some("A beautiful sunset".to_string()),
        ));
        assert_eq!(block.display_title(), "A beautiful sunset");
    }

    #[test]
    fn image_block_display_title_falls_back_to_path() {
        let block = Block::image("images/abc123.jpg", "image/jpeg");
        assert_eq!(block.display_title(), "images/abc123.jpg");
    }

    #[test]
    fn video_block_creation() {
        let block = Block::video("videos/xyz789.mp4", "video/mp4");
        assert!(block.is_media());
        assert_eq!(block.content.file_path(), Some("videos/xyz789.mp4"));
        assert_eq!(block.content.mime_type(), Some("video/mp4"));
    }

    #[test]
    fn video_block_with_metadata() {
        let content = BlockContent::video_with_meta(
            "videos/xyz789.mp4",
            "video/mp4",
            Some("https://example.com/video.mp4".to_string()),
            Some(1920),
            Some(1080),
            Some(120.5),
            Some("Tutorial video".to_string()),
        );
        let block = Block::new(content);
        assert_eq!(block.display_title(), "Tutorial video");
        if let BlockContent::Video { width, height, duration, .. } = &block.content {
            assert_eq!(*width, Some(1920));
            assert_eq!(*height, Some(1080));
            assert_eq!(*duration, Some(120.5));
        } else {
            panic!("Expected Video content");
        }
    }

    #[test]
    fn audio_block_creation() {
        let block = Block::audio("audio/song123.mp3", "audio/mpeg");
        assert!(block.is_media());
        assert_eq!(block.content.file_path(), Some("audio/song123.mp3"));
        assert_eq!(block.content.mime_type(), Some("audio/mpeg"));
    }

    #[test]
    fn audio_block_display_title_uses_title() {
        let content = BlockContent::audio_with_meta(
            "audio/song123.mp3",
            "audio/mpeg",
            None,
            Some(245.0),
            Some("Bohemian Rhapsody".to_string()),
            Some("Queen".to_string()),
        );
        let block = Block::new(content);
        assert_eq!(block.display_title(), "Bohemian Rhapsody");
    }

    #[test]
    fn audio_block_display_title_falls_back_to_artist() {
        let content = BlockContent::audio_with_meta(
            "audio/song123.mp3",
            "audio/mpeg",
            None,
            Some(245.0),
            None,
            Some("Queen".to_string()),
        );
        let block = Block::new(content);
        assert_eq!(block.display_title(), "Queen");
    }

    #[test]
    fn audio_block_display_title_falls_back_to_path() {
        let block = Block::audio("audio/song123.mp3", "audio/mpeg");
        assert_eq!(block.display_title(), "audio/song123.mp3");
    }

    #[test]
    fn text_block_is_not_media() {
        let block = Block::text("Hello");
        assert!(!block.is_media());
        assert!(block.content.file_path().is_none());
        assert!(block.content.mime_type().is_none());
    }

    #[test]
    fn link_block_is_not_media() {
        let block = Block::link("https://example.com");
        assert!(!block.is_media());
    }

    #[test]
    fn new_block_with_source_url() {
        let new_block = NewBlock::image("images/abc.jpg", "image/jpeg")
            .with_source_url("https://example.com/original.jpg");
        assert_eq!(
            new_block.source_url,
            Some("https://example.com/original.jpg".to_string())
        );
    }
}
