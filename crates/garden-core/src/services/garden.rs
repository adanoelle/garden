//! GardenService - unified service for all domain operations.
//!
//! This struct-based service holds references to all repositories,
//! providing an ergonomic API for domain operations that span multiple
//! aggregates (e.g., connecting blocks to channels).
//!
//! # Observability
//!
//! All service methods are instrumented with `tracing` spans for observability.
//! To see traces, ensure a tracing subscriber is configured in your application.

use chrono::Utc;
use tracing::{info, instrument};

use crate::error::{DomainError, DomainResult};
use crate::models::{
    Block, BlockContent, BlockId, BlockUpdate, Channel, ChannelId, ChannelUpdate, Connection,
    NewBlock, NewChannel, Page,
};
use crate::ports::{BlockRepository, ChannelRepository, ConnectionRepository};

/// Unified service for Garden domain operations.
///
/// This service combines access to channels, blocks, and connections,
/// making cross-aggregate operations (like connecting a block to a channel)
/// more ergonomic than passing multiple repository references.
///
/// # Example
///
/// ```ignore
/// let service = GardenService::new(channel_repo, block_repo, conn_repo);
///
/// // Create a channel and block
/// let channel = service.create_channel(NewChannel { title: "My Channel".into(), description: None }).await?;
/// let block = service.create_block(NewBlock { content: BlockContent::text("Hello") }).await?;
///
/// // Connect them
/// let connection = service.connect_block(&block.id, &channel.id, None).await?;
/// ```
pub struct GardenService<CR, BR, CNR> {
    channels: CR,
    blocks: BR,
    connections: CNR,
}

impl<CR, BR, CNR> GardenService<CR, BR, CNR>
where
    CR: ChannelRepository,
    BR: BlockRepository,
    CNR: ConnectionRepository,
{
    /// Create a new GardenService with the given repositories.
    pub fn new(channels: CR, blocks: BR, connections: CNR) -> Self {
        Self {
            channels,
            blocks,
            connections,
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Channel Operations
    // ─────────────────────────────────────────────────────────────────────────

    /// Create a new channel.
    #[instrument(skip(self), fields(title = %new_channel.title))]
    pub async fn create_channel(&self, new_channel: NewChannel) -> DomainResult<Channel> {
        crate::validation::validate_channel_title(&new_channel.title)?;

        let channel = if let Some(desc) = new_channel.description {
            Channel::with_description(new_channel.title, desc)
        } else {
            Channel::new(new_channel.title)
        };

        self.channels.create(&channel).await?;
        Ok(channel)
    }

    /// Get a channel by ID.
    #[instrument(skip(self), fields(channel_id = %id.0))]
    pub async fn get_channel(&self, id: &ChannelId) -> DomainResult<Channel> {
        self.channels
            .get(id)
            .await?
            .ok_or_else(|| DomainError::ChannelNotFound(id.clone()))
    }

    /// List channels with pagination.
    #[instrument(skip(self))]
    pub async fn list_channels(&self, limit: usize, offset: usize) -> DomainResult<Page<Channel>> {
        Ok(self.channels.list(limit, offset).await?)
    }

    /// Update a channel.
    #[instrument(skip(self, update), fields(channel_id = %id.0))]
    pub async fn update_channel(
        &self,
        id: &ChannelId,
        update: ChannelUpdate,
    ) -> DomainResult<Channel> {
        let mut channel = self.get_channel(id).await?;

        if let Some(title) = update.title {
            crate::validation::validate_channel_title(&title)?;
            channel.title = title;
        }

        // Apply description update using FieldUpdate
        channel.description = update.description.apply(channel.description);

        channel.updated_at = Utc::now();
        self.channels.update(&channel).await?;
        info!("Channel updated");
        Ok(channel)
    }

    /// Delete a channel.
    #[instrument(skip(self), fields(channel_id = %id.0))]
    pub async fn delete_channel(&self, id: &ChannelId) -> DomainResult<()> {
        // Verify channel exists
        let _ = self.get_channel(id).await?;
        self.channels.delete(id).await?;
        info!("Channel deleted");
        Ok(())
    }

    /// Count total channels.
    pub async fn count_channels(&self) -> DomainResult<usize> {
        Ok(self.channels.count().await?)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Block Operations
    // ─────────────────────────────────────────────────────────────────────────

    /// Create a new block.
    #[instrument(skip(self, new_block))]
    pub async fn create_block(&self, new_block: NewBlock) -> DomainResult<Block> {
        Self::validate_content(&new_block.content)?;

        let block = Block::new(new_block.content);
        self.blocks.create(&block).await?;
        info!(block_id = %block.id.0, "Block created");
        Ok(block)
    }

    /// Create multiple blocks at once.
    #[instrument(skip(self, new_blocks), fields(count = new_blocks.len()))]
    pub async fn create_blocks(&self, new_blocks: Vec<NewBlock>) -> DomainResult<Vec<Block>> {
        // Validate all first
        for new_block in &new_blocks {
            Self::validate_content(&new_block.content)?;
        }

        let blocks: Vec<Block> = new_blocks
            .into_iter()
            .map(|nb| Block::new(nb.content))
            .collect();

        self.blocks.create_batch(&blocks).await?;
        info!(count = blocks.len(), "Blocks created");
        Ok(blocks)
    }

    /// Get a block by ID.
    #[instrument(skip(self), fields(block_id = %id.0))]
    pub async fn get_block(&self, id: &BlockId) -> DomainResult<Block> {
        self.blocks
            .get(id)
            .await?
            .ok_or_else(|| DomainError::BlockNotFound(id.clone()))
    }

    /// Update a block.
    #[instrument(skip(self, update), fields(block_id = %id.0))]
    pub async fn update_block(&self, id: &BlockId, update: BlockUpdate) -> DomainResult<Block> {
        let mut block = self.get_block(id).await?;

        // Update content if provided
        if let Some(content) = update.content {
            Self::validate_content(&content)?;
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
        self.blocks.update(&block).await?;
        info!("Block updated");
        Ok(block)
    }

    /// Delete a block.
    #[instrument(skip(self), fields(block_id = %id.0))]
    pub async fn delete_block(&self, id: &BlockId) -> DomainResult<()> {
        // Verify block exists
        let _ = self.get_block(id).await?;
        self.blocks.delete(id).await?;
        info!("Block deleted");
        Ok(())
    }

    /// Validate block content using the centralized validation module.
    fn validate_content(content: &BlockContent) -> DomainResult<()> {
        crate::validation::validate_block_content(content)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Connection Operations
    // ─────────────────────────────────────────────────────────────────────────

    /// Connect a block to a channel.
    ///
    /// If position is None, the block is appended to the end.
    #[instrument(skip(self), fields(block_id = %block_id.0, channel_id = %channel_id.0))]
    pub async fn connect_block(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
        position: Option<i32>,
    ) -> DomainResult<Connection> {
        // Verify block and channel exist
        let _ = self.get_block(block_id).await?;
        let _ = self.get_channel(channel_id).await?;

        // Check if already connected
        if self
            .connections
            .get_connection(block_id, channel_id)
            .await?
            .is_some()
        {
            return Err(DomainError::InvalidInput(
                "block is already connected to this channel".to_string(),
            ));
        }

        // Get position (append if not specified)
        let pos = match position {
            Some(p) => p,
            None => self.connections.next_position(channel_id).await?,
        };

        self.connections.connect(block_id, channel_id, pos).await?;
        info!(position = pos, "Block connected to channel");

        // Return the created connection
        self.connections
            .get_connection(block_id, channel_id)
            .await?
            .ok_or_else(|| DomainError::ConnectionNotFound(block_id.clone(), channel_id.clone()))
    }

    /// Connect multiple blocks to a channel at once.
    ///
    /// Blocks are connected in order, starting at the given position or
    /// appending to the end if position is None.
    pub async fn connect_blocks(
        &self,
        block_ids: &[BlockId],
        channel_id: &ChannelId,
        starting_position: Option<i32>,
    ) -> DomainResult<Vec<Connection>> {
        // Verify channel exists
        let _ = self.get_channel(channel_id).await?;

        // Verify all blocks exist and aren't already connected
        for block_id in block_ids {
            let _ = self.get_block(block_id).await?;
            if self
                .connections
                .get_connection(block_id, channel_id)
                .await?
                .is_some()
            {
                return Err(DomainError::InvalidInput(format!(
                    "block {} is already connected to this channel",
                    block_id.0
                )));
            }
        }

        // Determine starting position
        let start_pos = match starting_position {
            Some(p) => p,
            None => self.connections.next_position(channel_id).await?,
        };

        // Build connection tuples
        let conns: Vec<_> = block_ids
            .iter()
            .enumerate()
            .map(|(i, block_id)| (block_id.clone(), channel_id.clone(), start_pos + i as i32))
            .collect();

        self.connections.connect_batch(&conns).await?;

        // Return created connections
        let mut result = Vec::with_capacity(block_ids.len());
        for block_id in block_ids {
            if let Some(conn) = self
                .connections
                .get_connection(block_id, channel_id)
                .await?
            {
                result.push(conn);
            }
        }

        Ok(result)
    }

    /// Disconnect a block from a channel.
    pub async fn disconnect_block(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
    ) -> DomainResult<()> {
        // Verify connection exists
        let _ = self
            .connections
            .get_connection(block_id, channel_id)
            .await?
            .ok_or_else(|| DomainError::ConnectionNotFound(block_id.clone(), channel_id.clone()))?;

        self.connections.disconnect(block_id, channel_id).await?;
        Ok(())
    }

    /// Get all blocks in a channel, ordered by position.
    pub async fn get_blocks_in_channel(&self, channel_id: &ChannelId) -> DomainResult<Vec<Block>> {
        let blocks_with_pos = self.connections.get_blocks_in_channel(channel_id).await?;
        Ok(blocks_with_pos
            .into_iter()
            .map(|(block, _pos)| block)
            .collect())
    }

    /// Get all blocks in a channel with their positions.
    pub async fn get_blocks_in_channel_with_positions(
        &self,
        channel_id: &ChannelId,
    ) -> DomainResult<Vec<(Block, i32)>> {
        Ok(self.connections.get_blocks_in_channel(channel_id).await?)
    }

    /// Get all channels that contain a block.
    pub async fn get_channels_for_block(&self, block_id: &BlockId) -> DomainResult<Vec<Channel>> {
        Ok(self.connections.get_channels_for_block(block_id).await?)
    }

    /// Reorder a block within a channel.
    pub async fn reorder_block(
        &self,
        channel_id: &ChannelId,
        block_id: &BlockId,
        new_position: i32,
    ) -> DomainResult<()> {
        // Verify connection exists
        let _ = self
            .connections
            .get_connection(block_id, channel_id)
            .await?
            .ok_or_else(|| DomainError::ConnectionNotFound(block_id.clone(), channel_id.clone()))?;

        self.connections
            .reorder(channel_id, block_id, new_position)
            .await?;
        Ok(())
    }

    /// Get a specific connection.
    pub async fn get_connection(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
    ) -> DomainResult<Connection> {
        self.connections
            .get_connection(block_id, channel_id)
            .await?
            .ok_or_else(|| DomainError::ConnectionNotFound(block_id.clone(), channel_id.clone()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::FieldUpdate;
    use crate::ports::{
        InMemoryBlockRepository, InMemoryChannelRepository, InMemoryConnectionRepository,
        TestFixture,
    };

    /// Helper to create a test service with properly synchronized in-memory repositories.
    fn test_service() -> GardenService<
        InMemoryChannelRepository,
        InMemoryBlockRepository,
        InMemoryConnectionRepository,
    > {
        TestFixture::new().service()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Channel Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn create_channel_success() {
        let service = test_service();
        let channel = service
            .create_channel(NewChannel {
                title: "Test Channel".to_string(),
                description: None,
            })
            .await
            .unwrap();

        assert_eq!(channel.title, "Test Channel");
        assert!(channel.description.is_none());
    }

    #[tokio::test]
    async fn create_channel_with_description() {
        let service = test_service();
        let channel = service
            .create_channel(NewChannel {
                title: "Test".to_string(),
                description: Some("A description".to_string()),
            })
            .await
            .unwrap();

        assert_eq!(channel.description, Some("A description".to_string()));
    }

    #[tokio::test]
    async fn create_channel_empty_title_fails() {
        let service = test_service();
        let result = service
            .create_channel(NewChannel {
                title: "   ".to_string(),
                description: None,
            })
            .await;

        assert!(matches!(result, Err(DomainError::InvalidInput(_))));
    }

    #[tokio::test]
    async fn get_channel_not_found() {
        let service = test_service();
        let result = service.get_channel(&ChannelId::new()).await;

        assert!(matches!(result, Err(DomainError::ChannelNotFound(_))));
    }

    #[tokio::test]
    async fn list_channels_pagination() {
        let service = test_service();

        // Create 5 channels
        for i in 0..5 {
            service
                .create_channel(NewChannel {
                    title: format!("Channel {}", i),
                    description: None,
                })
                .await
                .unwrap();
        }

        // First page
        let page1 = service.list_channels(2, 0).await.unwrap();
        assert_eq!(page1.items.len(), 2);
        assert_eq!(page1.total, 5);
        assert!(page1.has_next());

        // Second page
        let page2 = service.list_channels(2, 2).await.unwrap();
        assert_eq!(page2.items.len(), 2);
        assert!(page2.has_next());

        // Last page
        let page3 = service.list_channels(2, 4).await.unwrap();
        assert_eq!(page3.items.len(), 1);
        assert!(!page3.has_next());
    }

    #[tokio::test]
    async fn update_channel_title() {
        let service = test_service();
        let channel = service
            .create_channel(NewChannel {
                title: "Original".to_string(),
                description: None,
            })
            .await
            .unwrap();

        let updated = service
            .update_channel(
                &channel.id,
                ChannelUpdate {
                    title: Some("Updated".to_string()),
                    description: FieldUpdate::Keep,
                },
            )
            .await
            .unwrap();

        assert_eq!(updated.title, "Updated");
    }

    #[tokio::test]
    async fn update_channel_set_description() {
        let service = test_service();
        let channel = service
            .create_channel(NewChannel {
                title: "Test".to_string(),
                description: None,
            })
            .await
            .unwrap();

        let updated = service
            .update_channel(
                &channel.id,
                ChannelUpdate {
                    title: None,
                    description: FieldUpdate::Set("New description".to_string()),
                },
            )
            .await
            .unwrap();

        assert_eq!(updated.description, Some("New description".to_string()));
    }

    #[tokio::test]
    async fn update_channel_clear_description() {
        let service = test_service();
        let channel = service
            .create_channel(NewChannel {
                title: "Test".to_string(),
                description: Some("Has description".to_string()),
            })
            .await
            .unwrap();

        let updated = service
            .update_channel(
                &channel.id,
                ChannelUpdate {
                    title: None,
                    description: FieldUpdate::Clear,
                },
            )
            .await
            .unwrap();

        assert!(updated.description.is_none());
    }

    #[tokio::test]
    async fn delete_channel_success() {
        let service = test_service();
        let channel = service
            .create_channel(NewChannel {
                title: "Test".to_string(),
                description: None,
            })
            .await
            .unwrap();

        service.delete_channel(&channel.id).await.unwrap();

        let result = service.get_channel(&channel.id).await;
        assert!(matches!(result, Err(DomainError::ChannelNotFound(_))));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Block Tests
    // ─────────────────────────────────────────────────────────────────────────

    #[tokio::test]
    async fn create_text_block_success() {
        let service = test_service();
        let block = service
            .create_block(NewBlock::text("Hello, world!"))
            .await
            .unwrap();

        match &block.content {
            BlockContent::Text { body } => assert_eq!(body, "Hello, world!"),
            _ => panic!("Expected text block"),
        }
    }

    #[tokio::test]
    async fn create_link_block_success() {
        let service = test_service();
        let block = service
            .create_block(NewBlock::link("https://example.com"))
            .await
            .unwrap();

        match &block.content {
            BlockContent::Link { url, .. } => assert_eq!(url, "https://example.com"),
            _ => panic!("Expected link block"),
        }
    }

    #[tokio::test]
    async fn create_block_empty_text_fails() {
        let service = test_service();
        let result = service.create_block(NewBlock::text("   ")).await;

        assert!(matches!(result, Err(DomainError::InvalidInput(_))));
    }

    #[tokio::test]
    async fn create_block_invalid_url_fails() {
        let service = test_service();
        let result = service.create_block(NewBlock::link("not-a-url")).await;

        assert!(matches!(result, Err(DomainError::InvalidInput(_))));
    }

    #[tokio::test]
    async fn create_blocks_batch() {
        let service = test_service();
        let blocks = service
            .create_blocks(vec![
                NewBlock::text("One"),
                NewBlock::text("Two"),
                NewBlock::text("Three"),
            ])
            .await
            .unwrap();

        assert_eq!(blocks.len(), 3);
    }

    #[tokio::test]
    async fn get_block_not_found() {
        let service = test_service();
        let result = service.get_block(&BlockId::new()).await;

        assert!(matches!(result, Err(DomainError::BlockNotFound(_))));
    }

    #[tokio::test]
    async fn update_block_content() {
        let service = test_service();
        let block = service
            .create_block(NewBlock::text("Original"))
            .await
            .unwrap();

        let updated = service
            .update_block(
                &block.id,
                BlockUpdate {
                    content: Some(BlockContent::text("Updated")),
                    ..Default::default()
                },
            )
            .await
            .unwrap();

        match &updated.content {
            BlockContent::Text { body } => assert_eq!(body, "Updated"),
            _ => panic!("Expected text block"),
        }
    }

    #[tokio::test]
    async fn update_block_metadata() {
        let service = test_service();
        let block = service.create_block(NewBlock::text("Test")).await.unwrap();

        // Set metadata
        let updated = service
            .update_block(
                &block.id,
                BlockUpdate {
                    source_url: Some(FieldUpdate::Set("https://example.com".to_string())),
                    creator: Some(FieldUpdate::Set("John Doe".to_string())),
                    ..Default::default()
                },
            )
            .await
            .unwrap();

        assert_eq!(updated.source_url, Some("https://example.com".to_string()));
        assert_eq!(updated.creator, Some("John Doe".to_string()));

        // Clear one field, keep another (or omit to keep)
        let updated2 = service
            .update_block(
                &block.id,
                BlockUpdate {
                    source_url: Some(FieldUpdate::Clear),
                    // creator is omitted (None), which means keep
                    ..Default::default()
                },
            )
            .await
            .unwrap();

        assert_eq!(updated2.source_url, None);
        assert_eq!(updated2.creator, Some("John Doe".to_string()));
    }

    #[tokio::test]
    async fn delete_block_success() {
        let service = test_service();
        let block = service.create_block(NewBlock::text("Test")).await.unwrap();

        service.delete_block(&block.id).await.unwrap();

        let result = service.get_block(&block.id).await;
        assert!(matches!(result, Err(DomainError::BlockNotFound(_))));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Connection Tests
    // ─────────────────────────────────────────────────────────────────────────

    /// Helper to create a service with a pre-existing channel and block.
    async fn service_with_channel_and_block() -> (
        GardenService<
            InMemoryChannelRepository,
            InMemoryBlockRepository,
            InMemoryConnectionRepository,
        >,
        Channel,
        Block,
    ) {
        let fixture = TestFixture::new();
        let service = fixture.service();

        // Create channel and block through the service
        let channel = service
            .create_channel(NewChannel {
                title: "Test Channel".to_string(),
                description: None,
            })
            .await
            .unwrap();

        let block = service
            .create_block(NewBlock::text("Test Block"))
            .await
            .unwrap();

        (service, channel, block)
    }

    #[tokio::test]
    async fn connect_block_success() {
        let (service, channel, block) = service_with_channel_and_block().await;

        let connection = service
            .connect_block(&block.id, &channel.id, None)
            .await
            .unwrap();

        assert_eq!(connection.block_id, block.id);
        assert_eq!(connection.channel_id, channel.id);
        assert_eq!(connection.position, 0);
    }

    #[tokio::test]
    async fn connect_block_with_position() {
        let (service, channel, block) = service_with_channel_and_block().await;

        let connection = service
            .connect_block(&block.id, &channel.id, Some(5))
            .await
            .unwrap();

        assert_eq!(connection.position, 5);
    }

    #[tokio::test]
    async fn connect_block_nonexistent_block_fails() {
        let service = test_service();
        let channel = service
            .create_channel(NewChannel {
                title: "Test".to_string(),
                description: None,
            })
            .await
            .unwrap();

        let result = service
            .connect_block(&BlockId::new(), &channel.id, None)
            .await;

        assert!(matches!(result, Err(DomainError::BlockNotFound(_))));
    }

    #[tokio::test]
    async fn connect_block_nonexistent_channel_fails() {
        let service = test_service();
        let block = service.create_block(NewBlock::text("Test")).await.unwrap();

        let result = service
            .connect_block(&block.id, &ChannelId::new(), None)
            .await;

        assert!(matches!(result, Err(DomainError::ChannelNotFound(_))));
    }

    #[tokio::test]
    async fn connect_block_already_connected_fails() {
        let (service, channel, block) = service_with_channel_and_block().await;

        // First connection succeeds
        service
            .connect_block(&block.id, &channel.id, None)
            .await
            .unwrap();

        // Second connection fails
        let result = service.connect_block(&block.id, &channel.id, None).await;
        assert!(matches!(result, Err(DomainError::InvalidInput(_))));
    }

    #[tokio::test]
    async fn disconnect_block_success() {
        let (service, channel, block) = service_with_channel_and_block().await;

        service
            .connect_block(&block.id, &channel.id, None)
            .await
            .unwrap();
        service
            .disconnect_block(&block.id, &channel.id)
            .await
            .unwrap();

        let result = service.get_connection(&block.id, &channel.id).await;
        assert!(matches!(result, Err(DomainError::ConnectionNotFound(_, _))));
    }

    #[tokio::test]
    async fn disconnect_nonexistent_connection_fails() {
        let service = test_service();
        let result = service
            .disconnect_block(&BlockId::new(), &ChannelId::new())
            .await;

        assert!(matches!(result, Err(DomainError::ConnectionNotFound(_, _))));
    }

    #[tokio::test]
    async fn get_blocks_in_channel() {
        let service = test_service();

        // Create channel and blocks through the service
        let channel = service
            .create_channel(NewChannel {
                title: "Test Channel".to_string(),
                description: None,
            })
            .await
            .unwrap();

        let block1 = service
            .create_block(NewBlock::text("Block 1"))
            .await
            .unwrap();

        let block2 = service
            .create_block(NewBlock::text("Block 2"))
            .await
            .unwrap();

        // Connect both blocks
        service
            .connect_block(&block1.id, &channel.id, Some(0))
            .await
            .unwrap();
        service
            .connect_block(&block2.id, &channel.id, Some(1))
            .await
            .unwrap();

        let blocks = service.get_blocks_in_channel(&channel.id).await.unwrap();
        assert_eq!(blocks.len(), 2);
    }

    #[tokio::test]
    async fn get_channels_for_block() {
        let service = test_service();

        // Create channels and block through the service
        let channel1 = service
            .create_channel(NewChannel {
                title: "Channel 1".to_string(),
                description: None,
            })
            .await
            .unwrap();

        let channel2 = service
            .create_channel(NewChannel {
                title: "Channel 2".to_string(),
                description: None,
            })
            .await
            .unwrap();

        let block = service
            .create_block(NewBlock::text("Test Block"))
            .await
            .unwrap();

        // Connect block to both channels
        service
            .connect_block(&block.id, &channel1.id, None)
            .await
            .unwrap();
        service
            .connect_block(&block.id, &channel2.id, None)
            .await
            .unwrap();

        let channels = service.get_channels_for_block(&block.id).await.unwrap();
        assert_eq!(channels.len(), 2);
    }

    #[tokio::test]
    async fn reorder_block_success() {
        let (service, channel, block) = service_with_channel_and_block().await;

        service
            .connect_block(&block.id, &channel.id, Some(0))
            .await
            .unwrap();
        service
            .reorder_block(&channel.id, &block.id, 10)
            .await
            .unwrap();

        let connection = service
            .get_connection(&block.id, &channel.id)
            .await
            .unwrap();
        assert_eq!(connection.position, 10);
    }

    #[tokio::test]
    async fn reorder_nonexistent_connection_fails() {
        let service = test_service();
        let result = service
            .reorder_block(&ChannelId::new(), &BlockId::new(), 5)
            .await;

        assert!(matches!(result, Err(DomainError::ConnectionNotFound(_, _))));
    }
}
