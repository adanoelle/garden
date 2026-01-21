//! Connection model - links blocks to channels.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::{BlockId, ChannelId};

/// A connection links a block to a channel.
///
/// Blocks can belong to multiple channels, and this is the join table.
/// The position field allows ordering blocks within a channel.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Connection {
    /// The block being connected.
    pub block_id: BlockId,
    /// The channel the block is connected to.
    pub channel_id: ChannelId,
    /// Position within the channel (for ordering).
    pub position: i32,
    /// When this connection was created.
    #[ts(type = "string")]
    pub connected_at: DateTime<Utc>,
}

impl Connection {
    /// Create a new connection.
    pub fn new(block_id: BlockId, channel_id: ChannelId, position: i32) -> Self {
        Self {
            block_id,
            channel_id,
            position,
            connected_at: Utc::now(),
        }
    }
}

/// Data for creating a new connection.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NewConnection {
    pub block_id: BlockId,
    pub channel_id: ChannelId,
    /// Optional position; if not provided, append to end.
    pub position: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connection_creation() {
        let block_id = BlockId::new();
        let channel_id = ChannelId::new();
        let conn = Connection::new(block_id.clone(), channel_id.clone(), 0);

        assert_eq!(conn.block_id, block_id);
        assert_eq!(conn.channel_id, channel_id);
        assert_eq!(conn.position, 0);
    }
}
