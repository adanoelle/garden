//! SQLite database adapter.
//!
//! This module provides SQLite implementations of the repository traits
//! for desktop and embedded use cases.

mod channel;
mod block;
mod connection;
mod database;

pub use channel::SqliteChannelRepository;
pub use block::SqliteBlockRepository;
pub use connection::SqliteConnectionRepository;
pub use database::SqliteDatabase;
