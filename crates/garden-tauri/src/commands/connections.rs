//! Connection-related Tauri commands.
//!
//! This module provides 8 commands for managing block-channel connections:
//! - `connection_connect` - Connect a block to a channel
//! - `connection_connect_batch` - Connect multiple blocks to a channel
//! - `connection_disconnect` - Disconnect a block from a channel
//! - `connection_get` - Get a specific connection
//! - `connection_get_blocks_in_channel` - Get all blocks in a channel
//! - `connection_get_blocks_with_positions` - Get blocks with their positions
//! - `connection_get_channels_for_block` - Get all channels containing a block
//! - `connection_reorder` - Change a block's position within a channel

use garden_core::models::{Block, BlockId, Channel, ChannelId, Connection};
use tauri::State;
use tracing::instrument;

use crate::error::{CommandResult, TauriError};
use crate::state::AppState;

/// Connect a block to a channel.
///
/// # Arguments
///
/// * `block_id` - The block to connect
/// * `channel_id` - The channel to connect to
/// * `position` - Optional position (appends to end if not specified)
///
/// # Returns
///
/// The created connection.
///
/// # Errors
///
/// - `BLOCK_NOT_FOUND` if the block doesn't exist
/// - `CHANNEL_NOT_FOUND` if the channel doesn't exist
/// - `VALIDATION_ERROR` if the block is already connected to this channel
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(block_id = %block_id.0, channel_id = %channel_id.0))]
pub async fn connection_connect(
    state: State<'_, AppState>,
    block_id: BlockId,
    channel_id: ChannelId,
    position: Option<i32>,
) -> CommandResult<Connection> {
    state
        .service()
        .connect_block(&block_id, &channel_id, position)
        .await
        .map_err(TauriError::from)
}

/// Connect multiple blocks to a channel at once.
///
/// Blocks are connected in order, starting at the given position or
/// appending to the end if position is not specified.
///
/// # Arguments
///
/// * `block_ids` - The blocks to connect
/// * `channel_id` - The channel to connect to
/// * `starting_position` - Optional starting position
///
/// # Returns
///
/// The created connections.
///
/// # Errors
///
/// - `BLOCK_NOT_FOUND` if any block doesn't exist
/// - `CHANNEL_NOT_FOUND` if the channel doesn't exist
/// - `VALIDATION_ERROR` if any block is already connected
/// - `DATABASE_ERROR` for storage failures (entire batch is rolled back)
#[tauri::command]
#[instrument(skip(state), fields(count = block_ids.len(), channel_id = %channel_id.0))]
pub async fn connection_connect_batch(
    state: State<'_, AppState>,
    block_ids: Vec<BlockId>,
    channel_id: ChannelId,
    starting_position: Option<i32>,
) -> CommandResult<Vec<Connection>> {
    state
        .service()
        .connect_blocks(&block_ids, &channel_id, starting_position)
        .await
        .map_err(TauriError::from)
}

/// Disconnect a block from a channel.
///
/// # Arguments
///
/// * `block_id` - The block to disconnect
/// * `channel_id` - The channel to disconnect from
///
/// # Errors
///
/// - `CONNECTION_NOT_FOUND` if the connection doesn't exist
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(block_id = %block_id.0, channel_id = %channel_id.0))]
pub async fn connection_disconnect(
    state: State<'_, AppState>,
    block_id: BlockId,
    channel_id: ChannelId,
) -> CommandResult<()> {
    state
        .service()
        .disconnect_block(&block_id, &channel_id)
        .await
        .map_err(TauriError::from)
}

/// Get a specific connection.
///
/// # Arguments
///
/// * `block_id` - The block ID
/// * `channel_id` - The channel ID
///
/// # Returns
///
/// The connection if it exists.
///
/// # Errors
///
/// - `CONNECTION_NOT_FOUND` if the connection doesn't exist
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(block_id = %block_id.0, channel_id = %channel_id.0))]
pub async fn connection_get(
    state: State<'_, AppState>,
    block_id: BlockId,
    channel_id: ChannelId,
) -> CommandResult<Connection> {
    state
        .service()
        .get_connection(&block_id, &channel_id)
        .await
        .map_err(TauriError::from)
}

/// Get all blocks in a channel, ordered by position.
///
/// This is the most common query for displaying a channel's contents.
///
/// # Arguments
///
/// * `channel_id` - The channel ID
///
/// # Returns
///
/// The blocks in position order.
///
/// # Errors
///
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(channel_id = %channel_id.0))]
pub async fn connection_get_blocks_in_channel(
    state: State<'_, AppState>,
    channel_id: ChannelId,
) -> CommandResult<Vec<Block>> {
    state
        .service()
        .get_blocks_in_channel(&channel_id)
        .await
        .map_err(TauriError::from)
}

/// Get all blocks in a channel with their positions.
///
/// Use this when you need position information for reordering UI.
///
/// # Arguments
///
/// * `channel_id` - The channel ID
///
/// # Returns
///
/// Tuples of (block, position) in position order.
///
/// # Errors
///
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(channel_id = %channel_id.0))]
pub async fn connection_get_blocks_with_positions(
    state: State<'_, AppState>,
    channel_id: ChannelId,
) -> CommandResult<Vec<(Block, i32)>> {
    state
        .service()
        .get_blocks_in_channel_with_positions(&channel_id)
        .await
        .map_err(TauriError::from)
}

/// Get all channels that contain a block.
///
/// Useful for showing where a block appears across the system.
///
/// # Arguments
///
/// * `block_id` - The block ID
///
/// # Returns
///
/// The channels containing this block.
///
/// # Errors
///
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(block_id = %block_id.0))]
pub async fn connection_get_channels_for_block(
    state: State<'_, AppState>,
    block_id: BlockId,
) -> CommandResult<Vec<Channel>> {
    state
        .service()
        .get_channels_for_block(&block_id)
        .await
        .map_err(TauriError::from)
}

/// Change a block's position within a channel.
///
/// # Arguments
///
/// * `channel_id` - The channel ID
/// * `block_id` - The block ID
/// * `new_position` - The new position
///
/// # Errors
///
/// - `CONNECTION_NOT_FOUND` if the connection doesn't exist
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(channel_id = %channel_id.0, block_id = %block_id.0))]
pub async fn connection_reorder(
    state: State<'_, AppState>,
    channel_id: ChannelId,
    block_id: BlockId,
    new_position: i32,
) -> CommandResult<()> {
    state
        .service()
        .reorder_block(&channel_id, &block_id, new_position)
        .await
        .map_err(TauriError::from)
}

#[cfg(test)]
mod tests {
    // Integration tests require Tauri test harness
    // See tests/ directory for integration tests
}
