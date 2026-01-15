//! Garden Core
//!
//! Shared Rust logic for the Garden application.

/// Re-export common types
pub mod prelude {
    pub use serde::{Deserialize, Serialize};
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
