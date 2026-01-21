//! Block service - domain logic for block operations.
//!
//! **Note:** These free functions are provided for backwards compatibility.
//! For new code, prefer using [`GardenService`](super::GardenService) which
//! provides the same functionality in a more ergonomic struct-based API.

use chrono::Utc;

use crate::error::DomainResult;
use crate::models::{Block, BlockId, BlockUpdate, NewBlock};
use crate::ports::BlockRepository;
use crate::validation::validate_block_content;

/// Create a new block.
#[deprecated(since = "0.1.0", note = "Use GardenService::create_block instead")]
pub async fn create_block(repo: &impl BlockRepository, new_block: NewBlock) -> DomainResult<Block> {
    validate_block_content(&new_block.content)?;

    let block = Block::new(new_block.content);
    repo.create(&block).await?;
    Ok(block)
}

/// Get a block by ID.
#[deprecated(since = "0.1.0", note = "Use GardenService::get_block instead")]
pub async fn get_block(repo: &impl BlockRepository, id: &BlockId) -> DomainResult<Block> {
    repo.get(id)
        .await?
        .ok_or_else(|| crate::error::DomainError::BlockNotFound(id.clone()))
}

/// Update a block.
#[deprecated(since = "0.1.0", note = "Use GardenService::update_block instead")]
pub async fn update_block(
    repo: &impl BlockRepository,
    id: &BlockId,
    update: BlockUpdate,
) -> DomainResult<Block> {
    #[allow(deprecated)]
    let mut block = get_block(repo, id).await?;

    // Update content if provided
    if let Some(content) = update.content {
        validate_block_content(&content)?;
        block.content = content;
    }

    // Apply archive metadata field updates using FieldUpdate
    // None means "keep" (field not provided), Some(FieldUpdate) applies the update
    if let Some(field_update) = update.source_url {
        block.source_url = field_update.apply(block.source_url);
    }
    if let Some(field_update) = update.source_title {
        block.source_title = field_update.apply(block.source_title);
    }
    if let Some(field_update) = update.creator {
        block.creator = field_update.apply(block.creator);
    }
    if let Some(field_update) = update.original_date {
        block.original_date = field_update.apply(block.original_date);
    }
    if let Some(field_update) = update.notes {
        block.notes = field_update.apply(block.notes);
    }

    block.updated_at = Utc::now();
    repo.update(&block).await?;
    Ok(block)
}

/// Delete a block.
#[deprecated(since = "0.1.0", note = "Use GardenService::delete_block instead")]
pub async fn delete_block(repo: &impl BlockRepository, id: &BlockId) -> DomainResult<()> {
    // Verify block exists
    #[allow(deprecated)]
    let _ = get_block(repo, id).await?;
    repo.delete(id).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::models::BlockContent;
    use crate::validation::validate_block_content;

    #[test]
    fn validate_empty_text_fails() {
        let content = BlockContent::text("   ");
        assert!(validate_block_content(&content).is_err());
    }

    #[test]
    fn validate_valid_text_succeeds() {
        let content = BlockContent::text("Hello, world!");
        assert!(validate_block_content(&content).is_ok());
    }

    #[test]
    fn validate_empty_url_fails() {
        let content = BlockContent::link("");
        assert!(validate_block_content(&content).is_err());
    }

    #[test]
    fn validate_invalid_url_fails() {
        let content = BlockContent::link("not-a-url");
        assert!(validate_block_content(&content).is_err());
    }

    #[test]
    fn validate_valid_url_succeeds() {
        let content = BlockContent::link("https://example.com");
        assert!(validate_block_content(&content).is_ok());
    }
}
