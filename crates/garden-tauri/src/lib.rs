//! Garden Tauri IPC Adapter
//!
//! This crate provides the Tauri IPC layer for the Garden desktop application.
//! It exposes domain operations as Tauri commands that can be invoked from the
//! TypeScript frontend.
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────┐
//! │  TypeScript Frontend                             │
//! │    invoke('channel_create', { newChannel })      │
//! └─────────────────────┬───────────────────────────┘
//!                       │ IPC
//! ┌─────────────────────▼───────────────────────────┐
//! │  garden-tauri (this crate)                       │
//! │    - Commands (IPC handlers)                     │
//! │    - AppState (manages service)                  │
//! │    - TauriError (serializable errors)            │
//! └─────────────────────┬───────────────────────────┘
//!                       │
//! ┌─────────────────────▼───────────────────────────┐
//! │  garden-core (domain)                            │
//! │    - GardenService (business logic)              │
//! │    - Models (Channel, Block, Connection)         │
//! └─────────────────────┬───────────────────────────┘
//!                       │
//! ┌─────────────────────▼───────────────────────────┐
//! │  garden-db (storage)                             │
//! │    - SQLite repositories                         │
//! └─────────────────────────────────────────────────┘
//! ```
//!
//! # Usage
//!
//! ```ignore
//! use garden_tauri::{initialize_database, generate_handler};
//!
//! pub fn run() {
//!     tauri::Builder::default()
//!         .setup(|app| {
//!             let handle = app.handle().clone();
//!             tauri::async_runtime::block_on(async move {
//!                 let state = initialize_database(&handle).await?;
//!                 handle.manage(state);
//!                 Ok(())
//!             })
//!         })
//!         .invoke_handler(generate_handler!())
//!         .run(tauri::generate_context!())
//!         .expect("error while running tauri application");
//! }
//! ```
//!
//! # Commands
//!
//! All 19 commands follow the `{domain}_{action}` naming convention:
//!
//! ## Channels (6)
//! - `channel_create` - Create a new channel
//! - `channel_get` - Get a channel by ID
//! - `channel_list` - List channels with pagination
//! - `channel_update` - Update a channel
//! - `channel_delete` - Delete a channel
//! - `channel_count` - Get total channel count
//!
//! ## Blocks (5)
//! - `block_create` - Create a new block
//! - `block_create_batch` - Create multiple blocks
//! - `block_get` - Get a block by ID
//! - `block_update` - Update a block
//! - `block_delete` - Delete a block
//!
//! ## Connections (8)
//! - `connection_connect` - Connect a block to a channel
//! - `connection_connect_batch` - Connect multiple blocks
//! - `connection_disconnect` - Disconnect a block
//! - `connection_get` - Get a specific connection
//! - `connection_get_blocks_in_channel` - Get blocks in a channel
//! - `connection_get_blocks_with_positions` - Get blocks with positions
//! - `connection_get_channels_for_block` - Get channels for a block
//! - `connection_reorder` - Reorder a block
//!
//! # Error Handling
//!
//! All commands return `CommandResult<T>` which serializes errors to JSON
//! with machine-readable error codes. See [`TauriError`] and [`ErrorCode`]
//! for details.

pub mod commands;
pub mod error;
pub mod init;
pub mod state;

// Re-export primary types for ergonomic usage
pub use error::{CommandResult, ErrorCode, TauriError};
pub use init::initialize_database;
pub use state::AppState;

// The generate_handler! macro is automatically exported via #[macro_export]
// and available as garden_tauri::generate_handler!

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exports_are_available() {
        // Verify key types are exported
        let _: fn() -> CommandResult<()> = || Ok(());
    }
}
