//! Integration tests for SQLite repositories.
//!
//! These tests use an in-memory SQLite database to verify that all
//! repository implementations work correctly together.

use garden_core::models::{Block, BlockContent, BlockId, Channel, ChannelId};
use garden_core::ports::{BlockRepository, ChannelRepository, ConnectionRepository};
use garden_db::sqlite::SqliteDatabase;

/// Helper to set up a clean test database.
async fn setup_db() -> SqliteDatabase {
    let db = SqliteDatabase::in_memory().await.expect("Failed to create in-memory database");
    db.migrate().await.expect("Failed to run migrations");
    db
}

// =============================================================================
// Channel Repository Tests
// =============================================================================

#[tokio::test]
async fn channel_create_and_get() {
    let db = setup_db().await;
    let repo = db.channel_repository();

    let channel = Channel::with_description("Test Channel", "A test");

    repo.create(&channel).await.expect("Failed to create channel");

    let retrieved = repo
        .get(&channel.id)
        .await
        .expect("Failed to get channel")
        .expect("Channel not found");

    assert_eq!(retrieved.id, channel.id);
    assert_eq!(retrieved.title, "Test Channel");
    assert_eq!(retrieved.description, Some("A test".to_string()));
}

#[tokio::test]
async fn channel_update() {
    let db = setup_db().await;
    let repo = db.channel_repository();

    let mut channel = Channel::new("Original");
    repo.create(&channel).await.expect("Failed to create");

    channel.title = "Updated".to_string();
    channel.description = Some("Now with description".to_string());
    repo.update(&channel).await.expect("Failed to update");

    let retrieved = repo
        .get(&channel.id)
        .await
        .expect("Failed to get")
        .expect("Not found");

    assert_eq!(retrieved.title, "Updated");
    assert_eq!(retrieved.description, Some("Now with description".to_string()));
}

#[tokio::test]
async fn channel_delete() {
    let db = setup_db().await;
    let repo = db.channel_repository();

    let channel = Channel::new("To Delete");
    repo.create(&channel).await.expect("Failed to create");

    repo.delete(&channel.id).await.expect("Failed to delete");

    let result = repo.get(&channel.id).await.expect("Failed to get");
    assert!(result.is_none());
}

#[tokio::test]
async fn channel_list_pagination() {
    let db = setup_db().await;
    let repo = db.channel_repository();

    // Create 5 channels
    for i in 0..5 {
        let channel = Channel::new(format!("Channel {}", i));
        repo.create(&channel).await.expect("Failed to create");
    }

    // Get first page
    let page1 = repo.list(2, 0).await.expect("Failed to list");
    assert_eq!(page1.items.len(), 2);
    assert_eq!(page1.total, 5);
    assert_eq!(page1.offset, 0);
    assert_eq!(page1.limit, 2);

    // Get second page
    let page2 = repo.list(2, 2).await.expect("Failed to list");
    assert_eq!(page2.items.len(), 2);
    assert_eq!(page2.offset, 2);

    // Get last page
    let page3 = repo.list(2, 4).await.expect("Failed to list");
    assert_eq!(page3.items.len(), 1);
}

#[tokio::test]
async fn channel_count() {
    let db = setup_db().await;
    let repo = db.channel_repository();

    assert_eq!(repo.count().await.expect("Failed to count"), 0);

    for _ in 0..3 {
        let channel = Channel::new("Test");
        repo.create(&channel).await.expect("Failed to create");
    }

    assert_eq!(repo.count().await.expect("Failed to count"), 3);
}

// =============================================================================
// Block Repository Tests
// =============================================================================

#[tokio::test]
async fn block_create_text() {
    let db = setup_db().await;
    let repo = db.block_repository();

    let block = Block::new(BlockContent::Text {
        body: "Hello, world!".to_string(),
    });

    repo.create(&block).await.expect("Failed to create");

    let retrieved = repo
        .get(&block.id)
        .await
        .expect("Failed to get")
        .expect("Not found");

    assert_eq!(retrieved.id, block.id);
    match retrieved.content {
        BlockContent::Text { body } => assert_eq!(body, "Hello, world!"),
        _ => panic!("Wrong content type"),
    }
}

#[tokio::test]
async fn block_create_link() {
    let db = setup_db().await;
    let repo = db.block_repository();

    let block = Block::new(BlockContent::Link {
        url: "https://example.com".to_string(),
        title: Some("Example".to_string()),
        description: Some("An example site".to_string()),
    });

    repo.create(&block).await.expect("Failed to create");

    let retrieved = repo
        .get(&block.id)
        .await
        .expect("Failed to get")
        .expect("Not found");

    match retrieved.content {
        BlockContent::Link {
            url,
            title,
            description,
        } => {
            assert_eq!(url, "https://example.com");
            assert_eq!(title, Some("Example".to_string()));
            assert_eq!(description, Some("An example site".to_string()));
        }
        _ => panic!("Wrong content type"),
    }
}

#[tokio::test]
async fn block_update() {
    let db = setup_db().await;
    let repo = db.block_repository();

    let mut block = Block::new(BlockContent::Text {
        body: "Original".to_string(),
    });
    repo.create(&block).await.expect("Failed to create");

    block.content = BlockContent::Text {
        body: "Updated".to_string(),
    };
    repo.update(&block).await.expect("Failed to update");

    let retrieved = repo
        .get(&block.id)
        .await
        .expect("Failed to get")
        .expect("Not found");

    match retrieved.content {
        BlockContent::Text { body } => assert_eq!(body, "Updated"),
        _ => panic!("Wrong content type"),
    }
}

#[tokio::test]
async fn block_delete() {
    let db = setup_db().await;
    let repo = db.block_repository();

    let block = Block::new(BlockContent::Text {
        body: "To delete".to_string(),
    });
    repo.create(&block).await.expect("Failed to create");

    repo.delete(&block.id).await.expect("Failed to delete");

    let result = repo.get(&block.id).await.expect("Failed to get");
    assert!(result.is_none());
}

#[tokio::test]
async fn block_create_batch() {
    let db = setup_db().await;
    let repo = db.block_repository();

    let blocks: Vec<Block> = (0..5)
        .map(|i| {
            Block::new(BlockContent::Text {
                body: format!("Block {}", i),
            })
        })
        .collect();

    repo.create_batch(&blocks).await.expect("Failed to batch create");

    // Verify all were created
    for block in &blocks {
        let retrieved = repo
            .get(&block.id)
            .await
            .expect("Failed to get")
            .expect("Not found");
        assert_eq!(retrieved.id, block.id);
    }
}

// =============================================================================
// Connection Repository Tests
// =============================================================================

#[tokio::test]
async fn connection_connect_and_get() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    // Create a channel and block
    let channel = Channel::new("Test Channel");
    let block = Block::new(BlockContent::Text {
        body: "Test block".to_string(),
    });

    channels.create(&channel).await.expect("Failed to create channel");
    blocks.create(&block).await.expect("Failed to create block");

    // Connect them
    conns
        .connect(&block.id, &channel.id, 0)
        .await
        .expect("Failed to connect");

    // Verify connection exists
    let connection = conns
        .get_connection(&block.id, &channel.id)
        .await
        .expect("Failed to get connection")
        .expect("Connection not found");

    assert_eq!(connection.block_id, block.id);
    assert_eq!(connection.channel_id, channel.id);
    assert_eq!(connection.position, 0);
}

#[tokio::test]
async fn connection_disconnect() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    let channel = Channel::new("Test");
    let block = Block::new(BlockContent::Text {
        body: "Test".to_string(),
    });

    channels.create(&channel).await.expect("Failed to create channel");
    blocks.create(&block).await.expect("Failed to create block");
    conns.connect(&block.id, &channel.id, 0).await.expect("Failed to connect");

    // Disconnect
    conns
        .disconnect(&block.id, &channel.id)
        .await
        .expect("Failed to disconnect");

    // Verify disconnected
    let result = conns
        .get_connection(&block.id, &channel.id)
        .await
        .expect("Failed to get");
    assert!(result.is_none());
}

#[tokio::test]
async fn connection_get_blocks_in_channel() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    let channel = Channel::new("Test");
    channels.create(&channel).await.expect("Failed to create channel");

    // Create and connect 3 blocks with specific positions
    let block1 = Block::new(BlockContent::Text { body: "First".to_string() });
    let block2 = Block::new(BlockContent::Text { body: "Second".to_string() });
    let block3 = Block::new(BlockContent::Text { body: "Third".to_string() });

    blocks.create(&block1).await.unwrap();
    blocks.create(&block2).await.unwrap();
    blocks.create(&block3).await.unwrap();

    // Connect in non-sequential order to test ordering
    conns.connect(&block2.id, &channel.id, 1).await.unwrap();
    conns.connect(&block1.id, &channel.id, 0).await.unwrap();
    conns.connect(&block3.id, &channel.id, 2).await.unwrap();

    // Get blocks - should be ordered by position
    let blocks_in_channel = conns
        .get_blocks_in_channel(&channel.id)
        .await
        .expect("Failed to get blocks");

    assert_eq!(blocks_in_channel.len(), 3);
    assert_eq!(blocks_in_channel[0].0.id, block1.id);
    assert_eq!(blocks_in_channel[0].1, 0);
    assert_eq!(blocks_in_channel[1].0.id, block2.id);
    assert_eq!(blocks_in_channel[1].1, 1);
    assert_eq!(blocks_in_channel[2].0.id, block3.id);
    assert_eq!(blocks_in_channel[2].1, 2);
}

#[tokio::test]
async fn connection_get_channels_for_block() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    // Create one block and multiple channels
    let block = Block::new(BlockContent::Text { body: "Shared block".to_string() });
    blocks.create(&block).await.unwrap();

    let channel1 = Channel::new("Channel 1");
    let channel2 = Channel::new("Channel 2");
    let channel3 = Channel::new("Channel 3");

    channels.create(&channel1).await.unwrap();
    channels.create(&channel2).await.unwrap();
    channels.create(&channel3).await.unwrap();

    // Connect block to all channels
    conns.connect(&block.id, &channel1.id, 0).await.unwrap();
    conns.connect(&block.id, &channel2.id, 0).await.unwrap();
    conns.connect(&block.id, &channel3.id, 0).await.unwrap();

    // Get channels for block
    let channels_for_block = conns
        .get_channels_for_block(&block.id)
        .await
        .expect("Failed to get channels");

    assert_eq!(channels_for_block.len(), 3);
}

#[tokio::test]
async fn connection_reorder() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    let channel = Channel::new("Test");
    channels.create(&channel).await.unwrap();

    let block = Block::new(BlockContent::Text { body: "Test".to_string() });
    blocks.create(&block).await.unwrap();

    conns.connect(&block.id, &channel.id, 0).await.unwrap();

    // Reorder to position 5
    conns
        .reorder(&channel.id, &block.id, 5)
        .await
        .expect("Failed to reorder");

    let connection = conns
        .get_connection(&block.id, &channel.id)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(connection.position, 5);
}

#[tokio::test]
async fn connection_next_position() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    let channel = Channel::new("Test");
    channels.create(&channel).await.unwrap();

    // Empty channel should have next position 0
    let pos = conns.next_position(&channel.id).await.expect("Failed to get next position");
    assert_eq!(pos, 0);

    // Add some blocks
    let block1 = Block::new(BlockContent::Text { body: "1".to_string() });
    let block2 = Block::new(BlockContent::Text { body: "2".to_string() });

    blocks.create(&block1).await.unwrap();
    blocks.create(&block2).await.unwrap();

    conns.connect(&block1.id, &channel.id, 0).await.unwrap();
    conns.connect(&block2.id, &channel.id, 5).await.unwrap();

    // Next position should be max + 1 = 6
    let pos = conns.next_position(&channel.id).await.expect("Failed to get next position");
    assert_eq!(pos, 6);
}

#[tokio::test]
async fn connection_batch_connect() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    let channel = Channel::new("Test");
    channels.create(&channel).await.unwrap();

    // Create 5 blocks
    let block_list: Vec<Block> = (0..5)
        .map(|i| Block::new(BlockContent::Text { body: format!("Block {}", i) }))
        .collect();

    blocks.create_batch(&block_list).await.unwrap();

    // Batch connect
    let connections: Vec<(BlockId, ChannelId, i32)> = block_list
        .iter()
        .enumerate()
        .map(|(i, b)| (b.id.clone(), channel.id.clone(), i as i32))
        .collect();

    conns.connect_batch(&connections).await.expect("Failed to batch connect");

    // Verify all connections
    let blocks_in_channel = conns.get_blocks_in_channel(&channel.id).await.unwrap();
    assert_eq!(blocks_in_channel.len(), 5);
}

// =============================================================================
// Cascade Delete Tests
// =============================================================================

#[tokio::test]
async fn cascade_delete_channel_removes_connections() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    let channel = Channel::new("To Delete");
    let block = Block::new(BlockContent::Text { body: "Test".to_string() });

    channels.create(&channel).await.unwrap();
    blocks.create(&block).await.unwrap();
    conns.connect(&block.id, &channel.id, 0).await.unwrap();

    // Delete channel
    channels.delete(&channel.id).await.unwrap();

    // Connection should be gone
    let result = conns.get_connection(&block.id, &channel.id).await.unwrap();
    assert!(result.is_none());

    // Block should still exist
    let block_result = blocks.get(&block.id).await.unwrap();
    assert!(block_result.is_some());
}

#[tokio::test]
async fn cascade_delete_block_removes_connections() {
    let db = setup_db().await;
    let channels = db.channel_repository();
    let blocks = db.block_repository();
    let conns = db.connection_repository();

    let channel = Channel::new("Test");
    let block = Block::new(BlockContent::Text { body: "To Delete".to_string() });

    channels.create(&channel).await.unwrap();
    blocks.create(&block).await.unwrap();
    conns.connect(&block.id, &channel.id, 0).await.unwrap();

    // Delete block
    blocks.delete(&block.id).await.unwrap();

    // Connection should be gone
    let result = conns.get_connection(&block.id, &channel.id).await.unwrap();
    assert!(result.is_none());

    // Channel should still exist
    let channel_result = channels.get(&channel.id).await.unwrap();
    assert!(channel_result.is_some());
}

// =============================================================================
// Error Handling Tests
// =============================================================================

#[tokio::test]
async fn error_update_nonexistent_channel() {
    let db = setup_db().await;
    let repo = db.channel_repository();

    let channel = Channel::new("Nonexistent");
    let result = repo.update(&channel).await;

    assert!(result.is_err());
}

#[tokio::test]
async fn error_delete_nonexistent_channel() {
    let db = setup_db().await;
    let repo = db.channel_repository();

    let result = repo.delete(&ChannelId::new()).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn error_disconnect_nonexistent() {
    let db = setup_db().await;
    let conns = db.connection_repository();

    let result = conns.disconnect(&BlockId::new(), &ChannelId::new()).await;
    assert!(result.is_err());
}
