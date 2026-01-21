//! Tauri command handlers.
//!
//! This module organizes all IPC commands into four categories:
//!
//! - **Channels**: CRUD operations for channels (collections)
//! - **Blocks**: CRUD operations for blocks (content)
//! - **Connections**: Managing block-channel relationships
//! - **Media**: Importing and managing media files
//!
//! All commands follow the naming convention `{domain}_{action}` and are
//! instrumented with tracing spans for observability.

pub mod blocks;
pub mod channels;
pub mod connections;
pub mod media;

// Re-export all commands for easy registration
pub use blocks::*;
pub use channels::*;
pub use connections::*;
pub use media::*;

/// Generate the Tauri invoke handler with all commands.
///
/// This macro creates the handler that routes IPC calls to the appropriate
/// command functions.
///
/// # Example
///
/// ```ignore
/// use garden_tauri::generate_handler;
///
/// tauri::Builder::default()
///     .invoke_handler(generate_handler!())
///     .run(tauri::generate_context!());
/// ```
#[macro_export]
macro_rules! generate_handler {
    () => {
        tauri::generate_handler![
            // Channel commands (6)
            $crate::commands::channel_create,
            $crate::commands::channel_get,
            $crate::commands::channel_list,
            $crate::commands::channel_update,
            $crate::commands::channel_delete,
            $crate::commands::channel_count,
            // Block commands (5)
            $crate::commands::block_create,
            $crate::commands::block_create_batch,
            $crate::commands::block_get,
            $crate::commands::block_update,
            $crate::commands::block_delete,
            // Connection commands (8)
            $crate::commands::connection_connect,
            $crate::commands::connection_connect_batch,
            $crate::commands::connection_disconnect,
            $crate::commands::connection_get,
            $crate::commands::connection_get_blocks_in_channel,
            $crate::commands::connection_get_blocks_with_positions,
            $crate::commands::connection_get_channels_for_block,
            $crate::commands::connection_reorder,
            // Media commands (5)
            $crate::commands::media_import_from_url,
            $crate::commands::media_import_from_file,
            $crate::commands::media_delete,
            $crate::commands::media_exists,
            $crate::commands::media_get_full_path,
        ]
    };
}
