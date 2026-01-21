//! Channel-related Tauri commands.
//!
//! This module provides 6 commands for channel CRUD operations:
//! - `channel_create` - Create a new channel
//! - `channel_get` - Get a channel by ID
//! - `channel_list` - List channels with pagination
//! - `channel_update` - Update a channel
//! - `channel_delete` - Delete a channel
//! - `channel_count` - Get total channel count

use garden_core::models::{Channel, ChannelId, ChannelUpdate, NewChannel, Page};
use tauri::State;
use tracing::instrument;

use crate::error::{CommandResult, TauriError};
use crate::state::AppState;

/// Create a new channel.
///
/// # Arguments
///
/// * `new_channel` - The channel data (title, optional description)
///
/// # Returns
///
/// The created channel with generated ID and timestamps.
///
/// # Errors
///
/// - `VALIDATION_ERROR` if the title is empty or too long
/// - `DUPLICATE_ERROR` if a channel with the same ID exists (unlikely with UUIDs)
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(title = %new_channel.title))]
pub async fn channel_create(
    state: State<'_, AppState>,
    new_channel: NewChannel,
) -> CommandResult<Channel> {
    state
        .service()
        .create_channel(new_channel)
        .await
        .map_err(TauriError::from)
}

/// Get a channel by ID.
///
/// # Arguments
///
/// * `id` - The channel ID
///
/// # Returns
///
/// The channel if found.
///
/// # Errors
///
/// - `CHANNEL_NOT_FOUND` if no channel exists with this ID
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(channel_id = %id.0))]
pub async fn channel_get(state: State<'_, AppState>, id: ChannelId) -> CommandResult<Channel> {
    state
        .service()
        .get_channel(&id)
        .await
        .map_err(TauriError::from)
}

/// List channels with pagination.
///
/// # Arguments
///
/// * `limit` - Maximum number of channels to return (default: 20, max: 100)
/// * `offset` - Number of channels to skip (default: 0)
///
/// # Returns
///
/// A page of channels with total count and pagination info.
///
/// # Errors
///
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state))]
pub async fn channel_list(
    state: State<'_, AppState>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> CommandResult<Page<Channel>> {
    // Apply sensible defaults and limits
    let limit = limit.unwrap_or(20).min(100);
    let offset = offset.unwrap_or(0);

    state
        .service()
        .list_channels(limit, offset)
        .await
        .map_err(TauriError::from)
}

/// Update a channel.
///
/// # Arguments
///
/// * `id` - The channel ID to update
/// * `update` - The fields to update (title and/or description)
///
/// # Returns
///
/// The updated channel.
///
/// # Errors
///
/// - `CHANNEL_NOT_FOUND` if no channel exists with this ID
/// - `VALIDATION_ERROR` if the new title is empty or too long
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state, update), fields(channel_id = %id.0))]
pub async fn channel_update(
    state: State<'_, AppState>,
    id: ChannelId,
    update: ChannelUpdate,
) -> CommandResult<Channel> {
    state
        .service()
        .update_channel(&id, update)
        .await
        .map_err(TauriError::from)
}

/// Delete a channel.
///
/// This also removes all connections between blocks and this channel,
/// but does not delete the blocks themselves.
///
/// # Arguments
///
/// * `id` - The channel ID to delete
///
/// # Errors
///
/// - `CHANNEL_NOT_FOUND` if no channel exists with this ID
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(channel_id = %id.0))]
pub async fn channel_delete(state: State<'_, AppState>, id: ChannelId) -> CommandResult<()> {
    state
        .service()
        .delete_channel(&id)
        .await
        .map_err(TauriError::from)
}

/// Get the total number of channels.
///
/// # Returns
///
/// The total count of channels.
///
/// # Errors
///
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state))]
pub async fn channel_count(state: State<'_, AppState>) -> CommandResult<usize> {
    state
        .service()
        .count_channels()
        .await
        .map_err(TauriError::from)
}

#[cfg(test)]
mod tests {
    // Integration tests require Tauri test harness
    // See tests/ directory for integration tests
}
