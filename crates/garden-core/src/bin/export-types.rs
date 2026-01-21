//! Binary to export TypeScript types from Rust models.
//!
//! Run with: cargo run --package garden-core --bin export-types
//!
//! Or use the justfile command: just gen-types
//!
//! # Output Location
//!
//! Types are exported to the directory specified by the `TS_RS_EXPORT_DIR`
//! environment variable. This is typically set by the justfile to
//! `{workspace}/packages/types/src/generated`.
//!
//! # Important
//!
//! This binary must be run from the workspace root directory (where Cargo.toml
//! with [workspace] is located) for paths to resolve correctly.

use std::path::Path;
use ts_rs::TS;

/// The expected output directory relative to workspace root (for verification).
const OUTPUT_DIR: &str = "packages/types/src/generated";

fn main() {
    // Verify we're in the workspace root
    verify_workspace_root();

    // Ensure output directory exists
    ensure_output_dir();

    println!("Exporting TypeScript types from garden-core...\n");

    // Channel types
    export::<garden_core::models::ChannelId>("ChannelId");
    export::<garden_core::models::Channel>("Channel");
    export::<garden_core::models::NewChannel>("NewChannel");
    export::<garden_core::models::ChannelUpdate>("ChannelUpdate");

    // Block types
    export::<garden_core::models::BlockId>("BlockId");
    export::<garden_core::models::BlockContent>("BlockContent");
    export::<garden_core::models::Block>("Block");
    export::<garden_core::models::NewBlock>("NewBlock");
    export::<garden_core::models::BlockUpdate>("BlockUpdate");

    // Connection types
    export::<garden_core::models::Connection>("Connection");
    export::<garden_core::models::NewConnection>("NewConnection");

    // Utility types
    export::<garden_core::models::FieldUpdate<String>>("FieldUpdate");
    export::<garden_core::models::Page<()>>("Page");

    println!("\n✅ TypeScript types exported to {}/", OUTPUT_DIR);
}

fn export<T: TS + 'static>(name: &str) {
    match T::export_all() {
        Ok(_) => println!("  ✓ {}", name),
        Err(e) => {
            eprintln!("  ✗ {} - {}", name, e);
            std::process::exit(1);
        }
    }
}

/// Verify we're running from the workspace root.
fn verify_workspace_root() {
    let cargo_toml = Path::new("Cargo.toml");
    if !cargo_toml.exists() {
        eprintln!("❌ Error: Cargo.toml not found in current directory.");
        eprintln!("   Please run this command from the workspace root.");
        std::process::exit(1);
    }

    // Check if it's a workspace Cargo.toml
    let content = std::fs::read_to_string(cargo_toml).unwrap_or_default();
    if !content.contains("[workspace]") {
        eprintln!("❌ Error: Not in workspace root (Cargo.toml doesn't contain [workspace]).");
        eprintln!("   Please run this command from the workspace root.");
        std::process::exit(1);
    }
}

/// Ensure the output directory exists, creating it if necessary.
fn ensure_output_dir() {
    let output_path = Path::new(OUTPUT_DIR);
    if !output_path.exists() {
        println!("📁 Creating output directory: {}/", OUTPUT_DIR);
        if let Err(e) = std::fs::create_dir_all(output_path) {
            eprintln!("❌ Error creating output directory: {}", e);
            std::process::exit(1);
        }
    }
}
