//! In-memory repository implementations for testing.
//!
//! These implementations store data in memory using thread-safe collections.
//! They're primarily used for unit and integration testing of services.
//!
//! # Usage
//!
//! For simple tests, use individual repositories:
//! ```ignore
//! let channel_repo = InMemoryChannelRepository::new();
//! let block_repo = InMemoryBlockRepository::new();
//! ```
//!
//! For tests that need connections (which require block/channel lookups),
//! use `TestFixture` to get properly synchronized repositories:
//! ```ignore
//! let fixture = TestFixture::new();
//! let service = fixture.service();
//! ```

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use async_trait::async_trait;

use crate::error::{RepoError, RepoResult};
use crate::models::{Block, BlockId, Channel, ChannelId, Connection, Page};
use crate::ports::{BlockRepository, ChannelRepository, ConnectionRepository};

// Type aliases for shared storage
type SharedChannelStore = Arc<RwLock<HashMap<ChannelId, Channel>>>;
type SharedBlockStore = Arc<RwLock<HashMap<BlockId, Block>>>;
type SharedConnectionStore = Arc<RwLock<Vec<Connection>>>;

/// In-memory channel repository.
#[derive(Debug, Clone)]
pub struct InMemoryChannelRepository {
    channels: SharedChannelStore,
}

impl Default for InMemoryChannelRepository {
    fn default() -> Self {
        Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl InMemoryChannelRepository {
    /// Create a new empty repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Create with shared storage (used by TestFixture).
    pub(crate) fn with_shared_store(channels: SharedChannelStore) -> Self {
        Self { channels }
    }
}

#[async_trait]
impl ChannelRepository for InMemoryChannelRepository {
    async fn create(&self, channel: &Channel) -> RepoResult<()> {
        let mut channels = self.channels.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        if channels.contains_key(&channel.id) {
            return Err(RepoError::Duplicate);
        }
        channels.insert(channel.id.clone(), channel.clone());
        Ok(())
    }

    async fn get(&self, id: &ChannelId) -> RepoResult<Option<Channel>> {
        let channels = self.channels.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        Ok(channels.get(id).cloned())
    }

    async fn list(&self, limit: usize, offset: usize) -> RepoResult<Page<Channel>> {
        let channels = self.channels.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        let total = channels.len();

        let mut items: Vec<_> = channels.values().cloned().collect();
        // Sort by created_at descending for consistent ordering
        items.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        let items: Vec<_> = items.into_iter().skip(offset).take(limit).collect();

        Ok(Page::new(items, total, offset, limit))
    }

    async fn update(&self, channel: &Channel) -> RepoResult<()> {
        let mut channels = self.channels.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        if !channels.contains_key(&channel.id) {
            return Err(RepoError::NotFound);
        }
        channels.insert(channel.id.clone(), channel.clone());
        Ok(())
    }

    async fn delete(&self, id: &ChannelId) -> RepoResult<()> {
        let mut channels = self.channels.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        if channels.remove(id).is_none() {
            return Err(RepoError::NotFound);
        }
        Ok(())
    }

    async fn count(&self) -> RepoResult<usize> {
        let channels = self.channels.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        Ok(channels.len())
    }
}

/// In-memory block repository.
#[derive(Debug, Clone)]
pub struct InMemoryBlockRepository {
    blocks: SharedBlockStore,
}

impl Default for InMemoryBlockRepository {
    fn default() -> Self {
        Self {
            blocks: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl InMemoryBlockRepository {
    /// Create a new empty repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Create with shared storage (used by TestFixture).
    pub(crate) fn with_shared_store(blocks: SharedBlockStore) -> Self {
        Self { blocks }
    }
}

#[async_trait]
impl BlockRepository for InMemoryBlockRepository {
    async fn create(&self, block: &Block) -> RepoResult<()> {
        let mut blocks = self.blocks.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        if blocks.contains_key(&block.id) {
            return Err(RepoError::Duplicate);
        }
        blocks.insert(block.id.clone(), block.clone());
        Ok(())
    }

    async fn create_batch(&self, blocks_to_create: &[Block]) -> RepoResult<()> {
        let mut blocks = self.blocks.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        for block in blocks_to_create {
            if blocks.contains_key(&block.id) {
                return Err(RepoError::Duplicate);
            }
        }
        for block in blocks_to_create {
            blocks.insert(block.id.clone(), block.clone());
        }
        Ok(())
    }

    async fn get(&self, id: &BlockId) -> RepoResult<Option<Block>> {
        let blocks = self.blocks.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        Ok(blocks.get(id).cloned())
    }

    async fn update(&self, block: &Block) -> RepoResult<()> {
        let mut blocks = self.blocks.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        if !blocks.contains_key(&block.id) {
            return Err(RepoError::NotFound);
        }
        blocks.insert(block.id.clone(), block.clone());
        Ok(())
    }

    async fn delete(&self, id: &BlockId) -> RepoResult<()> {
        let mut blocks = self.blocks.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        if blocks.remove(id).is_none() {
            return Err(RepoError::NotFound);
        }
        Ok(())
    }
}

/// In-memory connection repository.
///
/// This repository needs access to blocks and channels for lookup operations
/// (`get_blocks_in_channel`, `get_channels_for_block`). When used standalone,
/// it maintains its own copies. When created via `TestFixture`, it shares
/// storage with the block and channel repositories.
#[derive(Debug, Clone)]
pub struct InMemoryConnectionRepository {
    connections: SharedConnectionStore,
    /// Reference to blocks for get_blocks_in_channel.
    blocks: SharedBlockStore,
    /// Reference to channels for get_channels_for_block.
    channels: SharedChannelStore,
}

impl Default for InMemoryConnectionRepository {
    fn default() -> Self {
        Self {
            connections: Arc::new(RwLock::new(Vec::new())),
            blocks: Arc::new(RwLock::new(HashMap::new())),
            channels: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl InMemoryConnectionRepository {
    /// Create a new empty repository.
    ///
    /// Note: For tests that also use block/channel repositories, prefer
    /// using `TestFixture` which properly shares data between repositories.
    pub fn new() -> Self {
        Self::default()
    }

    /// Create with shared block and channel data for lookups.
    #[deprecated(
        since = "0.1.0",
        note = "Use TestFixture::new() instead for properly synchronized repositories"
    )]
    pub fn with_data(
        blocks: HashMap<BlockId, Block>,
        channels: HashMap<ChannelId, Channel>,
    ) -> Self {
        Self {
            connections: Arc::new(RwLock::new(Vec::new())),
            blocks: Arc::new(RwLock::new(blocks)),
            channels: Arc::new(RwLock::new(channels)),
        }
    }

    /// Create with shared storage (used by TestFixture).
    pub(crate) fn with_shared_stores(
        connections: SharedConnectionStore,
        blocks: SharedBlockStore,
        channels: SharedChannelStore,
    ) -> Self {
        Self {
            connections,
            blocks,
            channels,
        }
    }

    /// Update the blocks reference (for testing).
    #[deprecated(
        since = "0.1.0",
        note = "Use TestFixture::new() instead for properly synchronized repositories"
    )]
    pub fn set_blocks(&self, blocks: HashMap<BlockId, Block>) -> RepoResult<()> {
        let mut b = self
            .blocks
            .write()
            .map_err(|_| RepoError::Database("lock poisoned".into()))?;
        *b = blocks;
        Ok(())
    }

    /// Update the channels reference (for testing).
    #[deprecated(
        since = "0.1.0",
        note = "Use TestFixture::new() instead for properly synchronized repositories"
    )]
    pub fn set_channels(&self, channels: HashMap<ChannelId, Channel>) -> RepoResult<()> {
        let mut c = self
            .channels
            .write()
            .map_err(|_| RepoError::Database("lock poisoned".into()))?;
        *c = channels;
        Ok(())
    }
}

#[async_trait]
impl ConnectionRepository for InMemoryConnectionRepository {
    async fn connect(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
        position: i32,
    ) -> RepoResult<()> {
        let mut connections = self.connections.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;

        // Check for duplicate
        if connections.iter().any(|c| &c.block_id == block_id && &c.channel_id == channel_id) {
            return Err(RepoError::Duplicate);
        }

        connections.push(Connection::new(block_id.clone(), channel_id.clone(), position));
        Ok(())
    }

    async fn connect_batch(
        &self,
        conns: &[(BlockId, ChannelId, i32)],
    ) -> RepoResult<()> {
        let mut connections = self.connections.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;

        // Check for duplicates first
        for (block_id, channel_id, _) in conns {
            if connections.iter().any(|c| &c.block_id == block_id && &c.channel_id == channel_id) {
                return Err(RepoError::Duplicate);
            }
        }

        for (block_id, channel_id, position) in conns {
            connections.push(Connection::new(block_id.clone(), channel_id.clone(), *position));
        }
        Ok(())
    }

    async fn disconnect(&self, block_id: &BlockId, channel_id: &ChannelId) -> RepoResult<()> {
        let mut connections = self.connections.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        let initial_len = connections.len();
        connections.retain(|c| !(&c.block_id == block_id && &c.channel_id == channel_id));

        if connections.len() == initial_len {
            return Err(RepoError::NotFound);
        }
        Ok(())
    }

    async fn get_blocks_in_channel(&self, channel_id: &ChannelId) -> RepoResult<Vec<(Block, i32)>> {
        let connections = self.connections.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        let blocks = self.blocks.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;

        let mut result: Vec<_> = connections
            .iter()
            .filter(|c| &c.channel_id == channel_id)
            .filter_map(|c| blocks.get(&c.block_id).map(|b| (b.clone(), c.position)))
            .collect();

        // Sort by position
        result.sort_by_key(|(_, pos)| *pos);
        Ok(result)
    }

    async fn get_channels_for_block(&self, block_id: &BlockId) -> RepoResult<Vec<Channel>> {
        let connections = self.connections.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        let channels = self.channels.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;

        let result: Vec<_> = connections
            .iter()
            .filter(|c| &c.block_id == block_id)
            .filter_map(|c| channels.get(&c.channel_id).cloned())
            .collect();

        Ok(result)
    }

    async fn get_connection(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
    ) -> RepoResult<Option<Connection>> {
        let connections = self.connections.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;
        Ok(connections
            .iter()
            .find(|c| &c.block_id == block_id && &c.channel_id == channel_id)
            .cloned())
    }

    async fn reorder(
        &self,
        channel_id: &ChannelId,
        block_id: &BlockId,
        new_position: i32,
    ) -> RepoResult<()> {
        let mut connections = self.connections.write().map_err(|_| RepoError::Database("lock poisoned".into()))?;

        let conn = connections
            .iter_mut()
            .find(|c| &c.block_id == block_id && &c.channel_id == channel_id)
            .ok_or(RepoError::NotFound)?;

        conn.position = new_position;
        Ok(())
    }

    async fn next_position(&self, channel_id: &ChannelId) -> RepoResult<i32> {
        let connections = self.connections.read().map_err(|_| RepoError::Database("lock poisoned".into()))?;

        let max_pos = connections
            .iter()
            .filter(|c| &c.channel_id == channel_id)
            .map(|c| c.position)
            .max()
            .unwrap_or(-1);

        Ok(max_pos + 1)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixture
// ─────────────────────────────────────────────────────────────────────────────

/// A test fixture that provides properly synchronized in-memory repositories.
///
/// This fixture ensures that the connection repository shares its block and
/// channel data with the respective repositories, so that operations like
/// `get_blocks_in_channel` work correctly after creating blocks/channels
/// through the service.
///
/// # Example
///
/// ```ignore
/// use garden_core::ports::TestFixture;
///
/// #[tokio::test]
/// async fn test_connection_operations() {
///     let fixture = TestFixture::new();
///     let service = fixture.service();
///
///     // Create channel and block through the service
///     let channel = service.create_channel(NewChannel { ... }).await.unwrap();
///     let block = service.create_block(NewBlock { ... }).await.unwrap();
///
///     // Connect them - this works because the connection repo
///     // shares data with block/channel repos
///     service.connect_block(&block.id, &channel.id, None).await.unwrap();
///
///     // Lookups work correctly
///     let blocks = service.get_blocks_in_channel(&channel.id).await.unwrap();
///     assert_eq!(blocks.len(), 1);
/// }
/// ```
#[derive(Debug, Clone)]
pub struct TestFixture {
    channels: SharedChannelStore,
    blocks: SharedBlockStore,
    connections: SharedConnectionStore,
}

impl Default for TestFixture {
    fn default() -> Self {
        Self::new()
    }
}

impl TestFixture {
    /// Create a new test fixture with empty repositories.
    pub fn new() -> Self {
        Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
            blocks: Arc::new(RwLock::new(HashMap::new())),
            connections: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Get the channel repository.
    pub fn channel_repo(&self) -> InMemoryChannelRepository {
        InMemoryChannelRepository::with_shared_store(Arc::clone(&self.channels))
    }

    /// Get the block repository.
    pub fn block_repo(&self) -> InMemoryBlockRepository {
        InMemoryBlockRepository::with_shared_store(Arc::clone(&self.blocks))
    }

    /// Get the connection repository.
    pub fn connection_repo(&self) -> InMemoryConnectionRepository {
        InMemoryConnectionRepository::with_shared_stores(
            Arc::clone(&self.connections),
            Arc::clone(&self.blocks),
            Arc::clone(&self.channels),
        )
    }

    /// Create a GardenService with all repositories properly connected.
    pub fn service(
        &self,
    ) -> crate::services::GardenService<
        InMemoryChannelRepository,
        InMemoryBlockRepository,
        InMemoryConnectionRepository,
    > {
        crate::services::GardenService::new(
            self.channel_repo(),
            self.block_repo(),
            self.connection_repo(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn channel_repo_crud() {
        let repo = InMemoryChannelRepository::new();
        let channel = Channel::new("Test");

        // Create
        repo.create(&channel).await.unwrap();

        // Get
        let retrieved = repo.get(&channel.id).await.unwrap().unwrap();
        assert_eq!(retrieved.title, "Test");

        // List
        let page = repo.list(10, 0).await.unwrap();
        assert_eq!(page.total, 1);
        assert_eq!(page.items.len(), 1);

        // Update
        let mut updated = channel.clone();
        updated.title = "Updated".to_string();
        repo.update(&updated).await.unwrap();
        let retrieved = repo.get(&channel.id).await.unwrap().unwrap();
        assert_eq!(retrieved.title, "Updated");

        // Delete
        repo.delete(&channel.id).await.unwrap();
        assert!(repo.get(&channel.id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn block_repo_batch_create() {
        let repo = InMemoryBlockRepository::new();
        let blocks = vec![
            Block::text("One"),
            Block::text("Two"),
            Block::text("Three"),
        ];

        repo.create_batch(&blocks).await.unwrap();

        for block in &blocks {
            assert!(repo.get(&block.id).await.unwrap().is_some());
        }
    }

    #[tokio::test]
    async fn connection_repo_operations() {
        // Use TestFixture for properly synchronized repositories
        let fixture = TestFixture::new();
        let channel_repo = fixture.channel_repo();
        let block_repo = fixture.block_repo();
        let conn_repo = fixture.connection_repo();

        let block = Block::text("Test block");
        let channel = Channel::new("Test channel");

        // Create block and channel through their repositories
        block_repo.create(&block).await.unwrap();
        channel_repo.create(&channel).await.unwrap();

        // Connect
        conn_repo.connect(&block.id, &channel.id, 0).await.unwrap();

        // Get connection
        let conn = conn_repo
            .get_connection(&block.id, &channel.id)
            .await
            .unwrap();
        assert!(conn.is_some());

        // Get blocks in channel - this works because repos share data
        let blocks_in_channel = conn_repo.get_blocks_in_channel(&channel.id).await.unwrap();
        assert_eq!(blocks_in_channel.len(), 1);

        // Get channels for block
        let channels_for_block = conn_repo.get_channels_for_block(&block.id).await.unwrap();
        assert_eq!(channels_for_block.len(), 1);

        // Disconnect
        conn_repo.disconnect(&block.id, &channel.id).await.unwrap();
        assert!(conn_repo
            .get_connection(&block.id, &channel.id)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn test_fixture_service_integration() {
        use crate::models::{BlockContent, NewBlock, NewChannel};

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
            .create_block(NewBlock {
                content: BlockContent::text("Test Block"),
            })
            .await
            .unwrap();

        // Connect them
        service
            .connect_block(&block.id, &channel.id, None)
            .await
            .unwrap();

        // Verify the connection works - get_blocks_in_channel should find the block
        let blocks = service.get_blocks_in_channel(&channel.id).await.unwrap();
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].id, block.id);

        // Verify the reverse lookup works too
        let channels = service.get_channels_for_block(&block.id).await.unwrap();
        assert_eq!(channels.len(), 1);
        assert_eq!(channels[0].id, channel.id);
    }
}
