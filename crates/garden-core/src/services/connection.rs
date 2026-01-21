//! Connection service - domain logic for connecting blocks to channels.
//!
//! **Note:** These free functions are provided for backwards compatibility.
//! For new code, prefer using [`GardenService`](super::GardenService) which
//! provides the same functionality in a more ergonomic struct-based API.

use crate::error::{DomainError, DomainResult};
use crate::models::{Block, BlockId, Channel, ChannelId, Connection};
use crate::ports::{BlockRepository, ChannelRepository, ConnectionRepository};

/// Connect a block to a channel.
///
/// If position is None, the block is appended to the end.
#[deprecated(since = "0.1.0", note = "Use GardenService::connect_block instead")]
pub async fn connect_block(
    channel_repo: &impl ChannelRepository,
    block_repo: &impl BlockRepository,
    conn_repo: &impl ConnectionRepository,
    block_id: &BlockId,
    channel_id: &ChannelId,
    position: Option<i32>,
) -> DomainResult<Connection> {
    // Verify block and channel exist
    let _ = block_repo
        .get(block_id)
        .await?
        .ok_or_else(|| DomainError::BlockNotFound(block_id.clone()))?;

    let _ = channel_repo
        .get(channel_id)
        .await?
        .ok_or_else(|| DomainError::ChannelNotFound(channel_id.clone()))?;

    // Check if already connected
    if let Some(_existing) = conn_repo.get_connection(block_id, channel_id).await? {
        return Err(DomainError::InvalidInput(
            "block is already connected to this channel".to_string(),
        ));
    }

    // Get position (append if not specified)
    let pos = match position {
        Some(p) => p,
        None => conn_repo.next_position(channel_id).await?,
    };

    conn_repo.connect(block_id, channel_id, pos).await?;

    // Return the created connection
    conn_repo
        .get_connection(block_id, channel_id)
        .await?
        .ok_or_else(|| DomainError::ConnectionNotFound(block_id.clone(), channel_id.clone()))
}

/// Disconnect a block from a channel.
#[deprecated(since = "0.1.0", note = "Use GardenService::disconnect_block instead")]
pub async fn disconnect_block(
    conn_repo: &impl ConnectionRepository,
    block_id: &BlockId,
    channel_id: &ChannelId,
) -> DomainResult<()> {
    // Verify connection exists
    let _ = conn_repo
        .get_connection(block_id, channel_id)
        .await?
        .ok_or_else(|| DomainError::ConnectionNotFound(block_id.clone(), channel_id.clone()))?;

    conn_repo.disconnect(block_id, channel_id).await?;
    Ok(())
}

/// Get all blocks in a channel, ordered by position.
#[deprecated(
    since = "0.1.0",
    note = "Use GardenService::get_blocks_in_channel instead"
)]
pub async fn get_blocks_in_channel(
    conn_repo: &impl ConnectionRepository,
    channel_id: &ChannelId,
) -> DomainResult<Vec<Block>> {
    let blocks_with_pos = conn_repo.get_blocks_in_channel(channel_id).await?;
    Ok(blocks_with_pos
        .into_iter()
        .map(|(block, _pos)| block)
        .collect())
}

/// Get all channels that contain a block.
#[deprecated(
    since = "0.1.0",
    note = "Use GardenService::get_channels_for_block instead"
)]
pub async fn get_channels_for_block(
    conn_repo: &impl ConnectionRepository,
    block_id: &BlockId,
) -> DomainResult<Vec<Channel>> {
    Ok(conn_repo.get_channels_for_block(block_id).await?)
}

/// Reorder a block within a channel.
#[deprecated(since = "0.1.0", note = "Use GardenService::reorder_block instead")]
pub async fn reorder_block(
    conn_repo: &impl ConnectionRepository,
    channel_id: &ChannelId,
    block_id: &BlockId,
    new_position: i32,
) -> DomainResult<()> {
    // Verify connection exists
    let _ = conn_repo
        .get_connection(block_id, channel_id)
        .await?
        .ok_or_else(|| DomainError::ConnectionNotFound(block_id.clone(), channel_id.clone()))?;

    conn_repo
        .reorder(channel_id, block_id, new_position)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    // Tests would use mock repositories
}
