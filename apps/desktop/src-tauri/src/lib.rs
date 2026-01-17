//! Garden Desktop Application
//!
//! This is the entry point for the Tauri desktop application.
//! It wires together the garden-tauri IPC layer with the Tauri runtime.

use tauri::Manager;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

/// Set up tracing for the application.
///
/// Log level can be controlled via the `RUST_LOG` environment variable.
/// Defaults to `info` level logging.
fn setup_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,sqlx=warn"));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    setup_tracing();
    info!("Starting Garden desktop application");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Initialize database and register state
            tauri::async_runtime::block_on(async move {
                match garden_tauri::initialize_database(&handle).await {
                    Ok(state) => {
                        info!("Database initialized successfully");
                        handle.manage(state);
                        Ok(())
                    }
                    Err(e) => {
                        error!(error = %e, "Failed to initialize database");
                        Err(e.to_string().into())
                    }
                }
            })
        })
        .invoke_handler(garden_tauri::generate_handler!())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
