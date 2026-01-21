//! Utility functions for SQLite repository implementations.

use chrono::{DateTime, Utc};

use crate::error::DbError;

/// Parse an RFC3339 datetime string into a `DateTime<Utc>`.
///
/// This centralizes the datetime parsing logic to avoid duplication across
/// row conversion methods in the repository implementations.
///
/// # Arguments
///
/// * `value` - The RFC3339 formatted datetime string from SQLite.
/// * `field` - The name of the field being parsed (for error messages).
///
/// # Errors
///
/// Returns `DbError::InvalidDatetime` if the string cannot be parsed as RFC3339.
///
/// # Example
///
/// ```ignore
/// let created_at = parse_datetime(&row.created_at, "created_at")?;
/// ```
pub fn parse_datetime(value: &str, field: &'static str) -> Result<DateTime<Utc>, DbError> {
    DateTime::parse_from_rfc3339(value)
        .map_err(|_| DbError::InvalidDatetime {
            field,
            value: value.to_string(),
        })
        .map(|dt| dt.with_timezone(&Utc))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Datelike;

    #[test]
    fn parse_valid_datetime() {
        let result = parse_datetime("2024-01-15T10:30:00Z", "test_field");
        assert!(result.is_ok());
        let dt = result.unwrap();
        assert_eq!(dt.year(), 2024);
    }

    #[test]
    fn parse_datetime_with_offset() {
        let result = parse_datetime("2024-01-15T10:30:00+05:00", "test_field");
        assert!(result.is_ok());
    }

    #[test]
    fn parse_invalid_datetime() {
        let result = parse_datetime("not-a-date", "test_field");
        assert!(result.is_err());
        match result {
            Err(DbError::InvalidDatetime { field, value }) => {
                assert_eq!(field, "test_field");
                assert_eq!(value, "not-a-date");
            }
            _ => panic!("Expected InvalidDatetime error"),
        }
    }
}
