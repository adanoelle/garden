//! Block service - domain logic for block operations.

use chrono::Utc;

use crate::error::DomainResult;
use crate::models::{Block, BlockId, BlockUpdate, NewBlock};
use crate::ports::BlockRepository;
use crate::validation::validate_block_content;

/// Create a new block.
pub async fn create_block(
    repo: &impl BlockRepository,
    new_block: NewBlock,
) -> DomainResult<Block> {
    validate_block_content(&new_block.content)?;

    let block = Block::new(new_block.content);
    repo.create(&block).await?;
    Ok(block)
}

/// Get a block by ID.
pub async fn get_block(repo: &impl BlockRepository, id: &BlockId) -> DomainResult<Block> {
    repo.get(id)
        .await?
        .ok_or_else(|| crate::error::DomainError::BlockNotFound(id.clone()))
}

/// Update a block.
pub async fn update_block(
    repo: &impl BlockRepository,
    id: &BlockId,
    update: BlockUpdate,
) -> DomainResult<Block> {
    let mut block = get_block(repo, id).await?;

    if let Some(content) = update.content {
        validate_block_content(&content)?;
        block.content = content;
    }

    block.updated_at = Utc::now();
    repo.update(&block).await?;
    Ok(block)
}

/// Delete a block.
pub async fn delete_block(repo: &impl BlockRepository, id: &BlockId) -> DomainResult<()> {
    // Verify block exists
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
