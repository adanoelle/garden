//! Common types used across models.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Represents an optional field update.
///
/// This solves the `Option<Option<T>>` problem where we need to distinguish between:
/// - Not updating a field (Keep)
/// - Clearing a field to None (Clear)
/// - Setting a field to a new value (Set)
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(tag = "action", content = "value", rename_all = "snake_case")]
pub enum FieldUpdate<T> {
    /// Keep the current value (don't update).
    #[default]
    Keep,
    /// Clear the field (set to None).
    Clear,
    /// Set to a new value.
    Set(T),
}

impl<T> FieldUpdate<T> {
    /// Apply this update to an optional field.
    pub fn apply(self, current: Option<T>) -> Option<T> {
        match self {
            Self::Keep => current,
            Self::Clear => None,
            Self::Set(value) => Some(value),
        }
    }

    /// Check if this update will change the value.
    pub fn is_update(&self) -> bool {
        !matches!(self, Self::Keep)
    }
}

/// A paginated response.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Page<T> {
    /// The items in this page.
    pub items: Vec<T>,
    /// Total number of items across all pages.
    pub total: usize,
    /// Offset of the first item in this page.
    pub offset: usize,
    /// Maximum number of items per page.
    pub limit: usize,
}

impl<T> Page<T> {
    /// Create a new page.
    pub fn new(items: Vec<T>, total: usize, offset: usize, limit: usize) -> Self {
        Self {
            items,
            total,
            offset,
            limit,
        }
    }

    /// Check if there are more pages after this one.
    pub fn has_next(&self) -> bool {
        self.offset + self.items.len() < self.total
    }

    /// Check if there are pages before this one.
    pub fn has_prev(&self) -> bool {
        self.offset > 0
    }

    /// Get the current page number (0-indexed).
    pub fn page_number(&self) -> usize {
        if self.limit == 0 {
            0
        } else {
            self.offset / self.limit
        }
    }

    /// Get the total number of pages.
    pub fn total_pages(&self) -> usize {
        if self.limit == 0 {
            1
        } else {
            self.total.div_ceil(self.limit)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn field_update_keep() {
        assert_eq!(
            FieldUpdate::<String>::Keep.apply(Some("old".to_string())),
            Some("old".to_string())
        );
        assert_eq!(FieldUpdate::<String>::Keep.apply(None), None);
    }

    #[test]
    fn field_update_clear() {
        assert_eq!(
            FieldUpdate::<String>::Clear.apply(Some("old".to_string())),
            None
        );
        assert_eq!(FieldUpdate::<String>::Clear.apply(None), None);
    }

    #[test]
    fn field_update_set() {
        assert_eq!(
            FieldUpdate::Set("new".to_string()).apply(Some("old".to_string())),
            Some("new".to_string())
        );
        assert_eq!(
            FieldUpdate::Set("new".to_string()).apply(None),
            Some("new".to_string())
        );
    }

    #[test]
    fn page_has_next() {
        let page: Page<i32> = Page::new(vec![1, 2, 3], 10, 0, 3);
        assert!(page.has_next());

        let last_page: Page<i32> = Page::new(vec![10], 10, 9, 3);
        assert!(!last_page.has_next());
    }

    #[test]
    fn page_numbers() {
        let page: Page<i32> = Page::new(vec![1, 2, 3], 10, 6, 3);
        assert_eq!(page.page_number(), 2);
        assert_eq!(page.total_pages(), 4);
    }
}
