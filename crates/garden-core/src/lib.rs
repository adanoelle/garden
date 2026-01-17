//! Garden Core
//!
//! Domain models, ports (interfaces), and services for the Garden application.
//!
//! This crate follows hexagonal architecture:
//! - **Models**: Domain data structures (Channel, Block, Connection)
//! - **Ports**: Trait definitions that adapters must implement
//! - **Services**: Pure business logic that operates through ports
//! - **Validation**: Input validation at the domain boundary
//!
//! The domain has no dependencies on storage, networking, or UI.
//! Adapters (in other crates) implement the ports to provide concrete functionality.

pub mod error;
pub mod models;
pub mod ports;
pub mod services;
pub mod validation;

/// Re-export commonly used types for convenience.
pub mod prelude {
    pub use crate::error::{DomainError, DomainResult, RepoError, RepoResult};
    pub use crate::models::*;
    pub use crate::ports::*;
}

// Type export test for ts-rs
#[cfg(test)]
mod type_export_tests {
    #[test]
    #[ignore] // Run with: cargo test --package garden-core export_typescript_types -- --ignored
    fn export_typescript_types() {
        use ts_rs::TS;

        // Models
        crate::models::ChannelId::export_all().expect("Failed to export ChannelId");
        crate::models::Channel::export_all().expect("Failed to export Channel");
        crate::models::NewChannel::export_all().expect("Failed to export NewChannel");
        crate::models::ChannelUpdate::export_all().expect("Failed to export ChannelUpdate");

        crate::models::BlockId::export_all().expect("Failed to export BlockId");
        crate::models::BlockContent::export_all().expect("Failed to export BlockContent");
        crate::models::Block::export_all().expect("Failed to export Block");
        crate::models::NewBlock::export_all().expect("Failed to export NewBlock");
        crate::models::BlockUpdate::export_all().expect("Failed to export BlockUpdate");

        crate::models::Connection::export_all().expect("Failed to export Connection");
        crate::models::NewConnection::export_all().expect("Failed to export NewConnection");

        println!("TypeScript types exported successfully!");
    }
}
