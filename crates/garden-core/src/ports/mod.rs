//! Port definitions (interfaces) for the domain.
//!
//! Ports define the contracts that adapters must implement.
//! This follows the hexagonal architecture pattern.

mod memory;
mod repository;

pub use memory::*;
pub use repository::*;
