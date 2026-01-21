//! Channel model - a collection of blocks.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Unique identifier for a channel.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ChannelId(pub String);

impl ChannelId {
    /// Create a new channel ID.
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4().to_string())
    }

    /// Create a channel ID from an existing string.
    pub fn from_string(s: impl Into<String>) -> Self {
        Self(s.into())
    }
}

impl Default for ChannelId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for ChannelId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A channel is a collection of blocks.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Channel {
    /// Unique identifier.
    pub id: ChannelId,
    /// Display title.
    pub title: String,
    /// Optional description.
    pub description: Option<String>,
    /// When the channel was created.
    #[ts(type = "string")]
    pub created_at: DateTime<Utc>,
    /// When the channel was last updated.
    #[ts(type = "string")]
    pub updated_at: DateTime<Utc>,
}

impl Channel {
    /// Create a new channel with the given title.
    pub fn new(title: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            id: ChannelId::new(),
            title: title.into(),
            description: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Create a new channel with title and description.
    pub fn with_description(title: impl Into<String>, description: impl Into<String>) -> Self {
        let mut channel = Self::new(title);
        channel.description = Some(description.into());
        channel
    }
}

/// Data for creating a new channel.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NewChannel {
    pub title: String,
    pub description: Option<String>,
}

/// Data for updating a channel.
#[derive(Debug, Clone, Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ChannelUpdate {
    /// New title (None = keep current).
    #[serde(default)]
    pub title: Option<String>,
    /// Description update (Keep/Clear/Set).
    #[serde(default)]
    pub description: super::FieldUpdate<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn channel_id_generates_unique_ids() {
        let id1 = ChannelId::new();
        let id2 = ChannelId::new();
        assert_ne!(id1, id2);
    }

    #[test]
    fn channel_new_sets_timestamps() {
        let channel = Channel::new("Test Channel");
        assert_eq!(channel.title, "Test Channel");
        assert!(channel.description.is_none());
        assert!(channel.created_at <= Utc::now());
    }
}
