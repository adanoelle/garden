//! Repository port definitions (interfaces).
//!
//! These traits define the storage interface that adapters must implement.
//! The domain services depend only on these traits, not on concrete implementations.

use async_trait::async_trait;

use crate::error::RepoResult;
use crate::models::{Block, BlockId, Channel, ChannelId, Connection, Page};

/// Repository for channel operations.
#[async_trait]
pub trait ChannelRepository: Send + Sync {
    /// Create a new channel.
    async fn create(&self, channel: &Channel) -> RepoResult<()>;

    /// Get a channel by ID.
    async fn get(&self, id: &ChannelId) -> RepoResult<Option<Channel>>;

    /// List channels with pagination.
    async fn list(&self, limit: usize, offset: usize) -> RepoResult<Page<Channel>>;

    /// Update an existing channel.
    async fn update(&self, channel: &Channel) -> RepoResult<()>;

    /// Delete a channel by ID.
    async fn delete(&self, id: &ChannelId) -> RepoResult<()>;

    /// Count total channels.
    async fn count(&self) -> RepoResult<usize>;
}

/// Repository for block operations.
#[async_trait]
pub trait BlockRepository: Send + Sync {
    /// Create a new block.
    async fn create(&self, block: &Block) -> RepoResult<()>;

    /// Create multiple blocks at once.
    async fn create_batch(&self, blocks: &[Block]) -> RepoResult<()>;

    /// Get a block by ID.
    async fn get(&self, id: &BlockId) -> RepoResult<Option<Block>>;

    /// Update an existing block.
    async fn update(&self, block: &Block) -> RepoResult<()>;

    /// Delete a block by ID.
    async fn delete(&self, id: &BlockId) -> RepoResult<()>;
}

/// Repository for connection operations (block ↔ channel relationships).
#[async_trait]
pub trait ConnectionRepository: Send + Sync {
    /// Connect a block to a channel at the given position.
    async fn connect(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
        position: i32,
    ) -> RepoResult<()>;

    /// Connect multiple blocks to channels at once.
    /// Each tuple is (block_id, channel_id, position).
    async fn connect_batch(
        &self,
        connections: &[(BlockId, ChannelId, i32)],
    ) -> RepoResult<()>;

    /// Disconnect a block from a channel.
    async fn disconnect(&self, block_id: &BlockId, channel_id: &ChannelId) -> RepoResult<()>;

    /// Get all blocks in a channel, ordered by position.
    /// Returns tuples of (Block, position).
    async fn get_blocks_in_channel(&self, channel_id: &ChannelId)
        -> RepoResult<Vec<(Block, i32)>>;

    /// Get all channels that a block is connected to.
    async fn get_channels_for_block(&self, block_id: &BlockId) -> RepoResult<Vec<Channel>>;

    /// Get a specific connection.
    async fn get_connection(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
    ) -> RepoResult<Option<Connection>>;

    /// Update the position of a block within a channel.
    async fn reorder(
        &self,
        channel_id: &ChannelId,
        block_id: &BlockId,
        new_position: i32,
    ) -> RepoResult<()>;

    /// Get the next available position in a channel.
    async fn next_position(&self, channel_id: &ChannelId) -> RepoResult<i32>;
}
