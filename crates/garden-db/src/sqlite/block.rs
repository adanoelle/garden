//! SQLite implementation of BlockRepository.

use async_trait::async_trait;
use sqlx::SqlitePool;
use tracing::instrument;

use garden_core::error::RepoResult;
use garden_core::models::{Block, BlockContent, BlockId};
use garden_core::ports::BlockRepository;

/// SQLite-backed block repository.
#[derive(Clone)]
pub struct SqliteBlockRepository {
    pool: SqlitePool,
}

impl SqliteBlockRepository {
    /// Create a new repository with the given connection pool.
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl BlockRepository for SqliteBlockRepository {
    #[instrument(skip(self, block), fields(block_id = %block.id.0))]
    async fn create(&self, block: &Block) -> RepoResult<()> {
        let (content_type, content_json) = serialize_content(&block.content)?;

        sqlx::query(
            r#"
            INSERT INTO blocks (id, content_type, content_json, created_at, updated_at,
                               source_url, source_title, creator, original_date, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(&block.id.0)
        .bind(&content_type)
        .bind(&content_json)
        .bind(block.created_at.to_rfc3339())
        .bind(block.updated_at.to_rfc3339())
        .bind(&block.source_url)
        .bind(&block.source_title)
        .bind(&block.creator)
        .bind(&block.original_date)
        .bind(&block.notes)
        .execute(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        Ok(())
    }

    #[instrument(skip(self, blocks), fields(count = blocks.len()))]
    async fn create_batch(&self, blocks: &[Block]) -> RepoResult<()> {
        // Use a transaction for atomicity
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(crate::error::DbError::from)?;

        for block in blocks {
            let (content_type, content_json) = serialize_content(&block.content)?;

            sqlx::query(
                r#"
                INSERT INTO blocks (id, content_type, content_json, created_at, updated_at,
                                   source_url, source_title, creator, original_date, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#,
            )
            .bind(&block.id.0)
            .bind(&content_type)
            .bind(&content_json)
            .bind(block.created_at.to_rfc3339())
            .bind(block.updated_at.to_rfc3339())
            .bind(&block.source_url)
            .bind(&block.source_title)
            .bind(&block.creator)
            .bind(&block.original_date)
            .bind(&block.notes)
            .execute(&mut *tx)
            .await
            .map_err(crate::error::DbError::from)?;
        }

        tx.commit().await.map_err(crate::error::DbError::from)?;
        Ok(())
    }

    #[instrument(skip(self), fields(block_id = %id.0))]
    async fn get(&self, id: &BlockId) -> RepoResult<Option<Block>> {
        let row = sqlx::query_as::<_, BlockRow>(
            r#"
            SELECT id, content_type, content_json, created_at, updated_at,
                   source_url, source_title, creator, original_date, notes
            FROM blocks
            WHERE id = $1
            "#,
        )
        .bind(&id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        match row {
            Some(r) => Ok(Some(r.into_block()?)),
            None => Ok(None),
        }
    }

    #[instrument(skip(self, block), fields(block_id = %block.id.0))]
    async fn update(&self, block: &Block) -> RepoResult<()> {
        let (content_type, content_json) = serialize_content(&block.content)?;

        let result = sqlx::query(
            r#"
            UPDATE blocks
            SET content_type = $2, content_json = $3, updated_at = $4,
                source_url = $5, source_title = $6, creator = $7,
                original_date = $8, notes = $9
            WHERE id = $1
            "#,
        )
        .bind(&block.id.0)
        .bind(&content_type)
        .bind(&content_json)
        .bind(block.updated_at.to_rfc3339())
        .bind(&block.source_url)
        .bind(&block.source_title)
        .bind(&block.creator)
        .bind(&block.original_date)
        .bind(&block.notes)
        .execute(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        if result.rows_affected() == 0 {
            return Err(garden_core::error::RepoError::NotFound);
        }

        Ok(())
    }

    #[instrument(skip(self), fields(block_id = %id.0))]
    async fn delete(&self, id: &BlockId) -> RepoResult<()> {
        let result = sqlx::query("DELETE FROM blocks WHERE id = $1")
            .bind(&id.0)
            .execute(&self.pool)
            .await
            .map_err(crate::error::DbError::from)?;

        if result.rows_affected() == 0 {
            return Err(garden_core::error::RepoError::NotFound);
        }

        Ok(())
    }
}

/// Serialize block content to (type, json) tuple.
fn serialize_content(content: &BlockContent) -> RepoResult<(String, String)> {
    let content_type = match content {
        BlockContent::Text { .. } => "text",
        BlockContent::Link { .. } => "link",
        BlockContent::Image { .. } => "image",
        BlockContent::Video { .. } => "video",
        BlockContent::Audio { .. } => "audio",
    };

    let content_json = serde_json::to_string(content).map_err(crate::error::DbError::from)?;

    Ok((content_type.to_string(), content_json))
}

/// Internal row type for SQLite queries.
#[derive(sqlx::FromRow)]
struct BlockRow {
    id: String,
    #[allow(dead_code)]
    content_type: String, // Used for debugging, actual parsing is from JSON
    content_json: String,
    created_at: String,
    updated_at: String,
    // Archive metadata fields
    source_url: Option<String>,
    source_title: Option<String>,
    creator: Option<String>,
    original_date: Option<String>,
    notes: Option<String>,
}

impl BlockRow {
    fn into_block(self) -> RepoResult<Block> {
        use super::util::parse_datetime;

        let content: BlockContent =
            serde_json::from_str(&self.content_json).map_err(crate::error::DbError::from)?;

        Ok(Block {
            id: BlockId(self.id),
            content,
            created_at: parse_datetime(&self.created_at, "created_at")?,
            updated_at: parse_datetime(&self.updated_at, "updated_at")?,
            source_url: self.source_url,
            source_title: self.source_title,
            creator: self.creator,
            original_date: self.original_date,
            notes: self.notes,
        })
    }
}
