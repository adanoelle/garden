//! Block model - a piece of content that can be connected to channels.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Unique identifier for a block.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
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
/// Currently supports Text and Link types.
/// Future types: Image, Audio, Code.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
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
        }
    }

    /// Create link content with metadata.
    pub fn link_with_meta(
        url: impl Into<String>,
        title: Option<String>,
        description: Option<String>,
    ) -> Self {
        Self::Link {
            url: url.into(),
            title,
            description,
        }
    }

    /// Get a display title for the block content.
    pub fn display_title(&self) -> &str {
        match self {
            Self::Text { body } => {
                // Return first line, truncated to 50 chars if needed
                let first_line = body.lines().next().unwrap_or(body);
                if first_line.len() > 50 {
                    &first_line[..50]
                } else {
                    first_line
                }
            }
            Self::Link { title, url, .. } => title.as_deref().unwrap_or(url),
        }
    }
}

/// A block is a piece of content that can be connected to multiple channels.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
pub struct Block {
    /// Unique identifier.
    pub id: BlockId,
    /// The block's content.
    pub content: BlockContent,
    /// When the block was created.
    #[ts(type = "string")]
    pub created_at: DateTime<Utc>,
    /// When the block was last updated.
    #[ts(type = "string")]
    pub updated_at: DateTime<Utc>,
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

    /// Get the display title for this block.
    pub fn display_title(&self) -> &str {
        self.content.display_title()
    }
}

/// Data for creating a new block.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
pub struct NewBlock {
    pub content: BlockContent,
}

/// Data for updating a block.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
pub struct BlockUpdate {
    pub content: Option<BlockContent>,
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
        ));
        assert_eq!(block.display_title(), "Example Site");
    }

    #[test]
    fn link_block_display_title_falls_back_to_url() {
        let block = Block::link("https://example.com");
        assert_eq!(block.display_title(), "https://example.com");
    }
}
