//! SQLite database adapter.
//!
//! This module provides SQLite implementations of the repository traits
//! for desktop and embedded use cases.

mod block;
mod channel;
mod connection;
mod database;
mod util;

pub use block::SqliteBlockRepository;
pub use channel::SqliteChannelRepository;
pub use connection::SqliteConnectionRepository;
pub use database::SqliteDatabase;
