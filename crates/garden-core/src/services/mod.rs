//! Domain services - business logic for Garden operations.
//!
//! This module provides two ways to access domain logic:
//!
//! 1. **GardenService** (recommended) - A unified service struct that holds
//!    all repositories and provides methods for all operations. This is
//!    ergonomic for cross-aggregate operations like connecting blocks to channels.
//!
//! 2. **Free functions** - Individual functions in submodules for when you
//!    only need single-repository operations.
//!
//! # Example
//!
//! ```ignore
//! use garden_core::services::GardenService;
//!
//! let service = GardenService::new(channel_repo, block_repo, conn_repo);
//! let channel = service.create_channel(NewChannel { title: "My Channel".into(), description: None }).await?;
//! ```

pub mod block;
pub mod channel;
pub mod connection;
pub mod garden;
pub mod media;

pub use block::*;
pub use channel::*;
pub use connection::*;
pub use garden::GardenService;
pub use media::{MediaError, MediaInfo, MediaResult, MediaService, MediaType};
