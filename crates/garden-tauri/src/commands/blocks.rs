//! Block-related Tauri commands.
//!
//! This module provides 5 commands for block CRUD operations:
//! - `block_create` - Create a new block
//! - `block_create_batch` - Create multiple blocks at once
//! - `block_get` - Get a block by ID
//! - `block_update` - Update a block
//! - `block_delete` - Delete a block

use garden_core::models::{Block, BlockId, BlockUpdate, NewBlock};
use tauri::State;
use tracing::instrument;

use crate::error::{CommandResult, TauriError};
use crate::state::AppState;

/// Create a new block.
///
/// # Arguments
///
/// * `new_block` - The block content (text or link)
///
/// # Returns
///
/// The created block with generated ID and timestamps.
///
/// # Errors
///
/// - `VALIDATION_ERROR` if the content is invalid (empty text, invalid URL, etc.)
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state, new_block))]
pub async fn block_create(
    state: State<'_, AppState>,
    new_block: NewBlock,
) -> CommandResult<Block> {
    state
        .service()
        .create_block(new_block)
        .await
        .map_err(TauriError::from)
}

/// Create multiple blocks at once.
///
/// This is more efficient than creating blocks one by one when importing
/// or bulk-adding content.
///
/// # Arguments
///
/// * `new_blocks` - The list of blocks to create
///
/// # Returns
///
/// The created blocks with generated IDs and timestamps.
///
/// # Errors
///
/// - `VALIDATION_ERROR` if any content is invalid
/// - `DATABASE_ERROR` for storage failures (entire batch is rolled back)
#[tauri::command]
#[instrument(skip(state, new_blocks), fields(count = new_blocks.len()))]
pub async fn block_create_batch(
    state: State<'_, AppState>,
    new_blocks: Vec<NewBlock>,
) -> CommandResult<Vec<Block>> {
    state
        .service()
        .create_blocks(new_blocks)
        .await
        .map_err(TauriError::from)
}

/// Get a block by ID.
///
/// # Arguments
///
/// * `id` - The block ID
///
/// # Returns
///
/// The block if found.
///
/// # Errors
///
/// - `BLOCK_NOT_FOUND` if no block exists with this ID
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(block_id = %id.0))]
pub async fn block_get(
    state: State<'_, AppState>,
    id: BlockId,
) -> CommandResult<Block> {
    state
        .service()
        .get_block(&id)
        .await
        .map_err(TauriError::from)
}

/// Update a block.
///
/// # Arguments
///
/// * `id` - The block ID to update
/// * `update` - The new content (if provided)
///
/// # Returns
///
/// The updated block.
///
/// # Errors
///
/// - `BLOCK_NOT_FOUND` if no block exists with this ID
/// - `VALIDATION_ERROR` if the new content is invalid
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state, update), fields(block_id = %id.0))]
pub async fn block_update(
    state: State<'_, AppState>,
    id: BlockId,
    update: BlockUpdate,
) -> CommandResult<Block> {
    state
        .service()
        .update_block(&id, update)
        .await
        .map_err(TauriError::from)
}

/// Delete a block.
///
/// This also removes all connections between this block and any channels.
///
/// # Arguments
///
/// * `id` - The block ID to delete
///
/// # Errors
///
/// - `BLOCK_NOT_FOUND` if no block exists with this ID
/// - `DATABASE_ERROR` for storage failures
#[tauri::command]
#[instrument(skip(state), fields(block_id = %id.0))]
pub async fn block_delete(
    state: State<'_, AppState>,
    id: BlockId,
) -> CommandResult<()> {
    state
        .service()
        .delete_block(&id)
        .await
        .map_err(TauriError::from)
}

#[cfg(test)]
mod tests {
    // Integration tests require Tauri test harness
    // See tests/ directory for integration tests
}
