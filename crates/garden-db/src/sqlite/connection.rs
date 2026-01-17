//! SQLite implementation of ConnectionRepository.

use async_trait::async_trait;
use sqlx::SqlitePool;
use std::time::Instant;
use tracing::{info, instrument, warn};

use garden_core::error::RepoResult;
use garden_core::models::{Block, BlockContent, BlockId, Channel, ChannelId, Connection};
use garden_core::ports::ConnectionRepository;

/// Threshold for logging slow queries (50ms).
const SLOW_QUERY_THRESHOLD_MS: u128 = 50;

/// SQLite-backed connection repository.
#[derive(Clone)]
pub struct SqliteConnectionRepository {
    pool: SqlitePool,
}

impl SqliteConnectionRepository {
    /// Create a new repository with the given connection pool.
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ConnectionRepository for SqliteConnectionRepository {
    #[instrument(skip(self), fields(block_id = %block_id.0, channel_id = %channel_id.0))]
    async fn connect(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
        position: i32,
    ) -> RepoResult<()> {
        let connected_at = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO connections (block_id, channel_id, position, connected_at)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(&block_id.0)
        .bind(&channel_id.0)
        .bind(position)
        .bind(&connected_at)
        .execute(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        Ok(())
    }

    #[instrument(skip(self, connections), fields(count = connections.len()))]
    async fn connect_batch(
        &self,
        connections: &[(BlockId, ChannelId, i32)],
    ) -> RepoResult<()> {
        let mut tx = self.pool.begin().await.map_err(crate::error::DbError::from)?;

        // Use consistent timestamp for all connections in the batch
        let connected_at = chrono::Utc::now().to_rfc3339();

        for (block_id, channel_id, position) in connections {
            sqlx::query(
                r#"
                INSERT INTO connections (block_id, channel_id, position, connected_at)
                VALUES ($1, $2, $3, $4)
                "#,
            )
            .bind(&block_id.0)
            .bind(&channel_id.0)
            .bind(position)
            .bind(&connected_at)
            .execute(&mut *tx)
            .await
            .map_err(crate::error::DbError::from)?;
        }

        tx.commit().await.map_err(crate::error::DbError::from)?;
        Ok(())
    }

    #[instrument(skip(self), fields(block_id = %block_id.0, channel_id = %channel_id.0))]
    async fn disconnect(&self, block_id: &BlockId, channel_id: &ChannelId) -> RepoResult<()> {
        let result = sqlx::query(
            "DELETE FROM connections WHERE block_id = $1 AND channel_id = $2",
        )
        .bind(&block_id.0)
        .bind(&channel_id.0)
        .execute(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        if result.rows_affected() == 0 {
            return Err(garden_core::error::RepoError::NotFound);
        }

        Ok(())
    }

    #[instrument(skip(self), fields(channel_id = %channel_id.0), err)]
    async fn get_blocks_in_channel(
        &self,
        channel_id: &ChannelId,
    ) -> RepoResult<Vec<(Block, i32)>> {
        let start = Instant::now();

        let rows = sqlx::query_as::<_, BlockWithPositionRow>(
            r#"
            SELECT
                b.id, b.content_type, b.content_json, b.created_at, b.updated_at,
                c.position
            FROM blocks b
            INNER JOIN connections c ON b.id = c.block_id
            WHERE c.channel_id = $1
            ORDER BY c.position ASC
            "#,
        )
        .bind(&channel_id.0)
        .fetch_all(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        let result: Vec<(Block, i32)> = rows
            .into_iter()
            .map(|r| r.into_block_with_position())
            .collect::<Result<Vec<_>, _>>()?;

        let elapsed = start.elapsed();
        if elapsed.as_millis() > SLOW_QUERY_THRESHOLD_MS {
            warn!(
                elapsed_ms = elapsed.as_millis(),
                blocks = result.len(),
                "Slow query: get blocks in channel"
            );
        } else {
            info!(
                elapsed_ms = elapsed.as_millis(),
                blocks = result.len(),
                "Retrieved blocks in channel"
            );
        }

        Ok(result)
    }

    #[instrument(skip(self), fields(block_id = %block_id.0))]
    async fn get_channels_for_block(&self, block_id: &BlockId) -> RepoResult<Vec<Channel>> {
        let rows = sqlx::query_as::<_, ChannelRow>(
            r#"
            SELECT
                ch.id, ch.title, ch.description, ch.created_at, ch.updated_at
            FROM channels ch
            INNER JOIN connections c ON ch.id = c.channel_id
            WHERE c.block_id = $1
            ORDER BY c.connected_at DESC
            "#,
        )
        .bind(&block_id.0)
        .fetch_all(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        rows.into_iter()
            .map(|r| r.into_channel())
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    #[instrument(skip(self), fields(block_id = %block_id.0, channel_id = %channel_id.0))]
    async fn get_connection(
        &self,
        block_id: &BlockId,
        channel_id: &ChannelId,
    ) -> RepoResult<Option<Connection>> {
        let row = sqlx::query_as::<_, ConnectionRow>(
            r#"
            SELECT block_id, channel_id, position, connected_at
            FROM connections
            WHERE block_id = $1 AND channel_id = $2
            "#,
        )
        .bind(&block_id.0)
        .bind(&channel_id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        match row {
            Some(r) => Ok(Some(r.into_connection()?)),
            None => Ok(None),
        }
    }

    #[instrument(skip(self), fields(channel_id = %channel_id.0, block_id = %block_id.0))]
    async fn reorder(
        &self,
        channel_id: &ChannelId,
        block_id: &BlockId,
        new_position: i32,
    ) -> RepoResult<()> {
        let result = sqlx::query(
            r#"
            UPDATE connections
            SET position = $3
            WHERE block_id = $1 AND channel_id = $2
            "#,
        )
        .bind(&block_id.0)
        .bind(&channel_id.0)
        .bind(new_position)
        .execute(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        if result.rows_affected() == 0 {
            return Err(garden_core::error::RepoError::NotFound);
        }

        Ok(())
    }

    #[instrument(skip(self), fields(channel_id = %channel_id.0))]
    async fn next_position(&self, channel_id: &ChannelId) -> RepoResult<i32> {
        let result: Option<(Option<i32>,)> = sqlx::query_as(
            "SELECT MAX(position) FROM connections WHERE channel_id = $1",
        )
        .bind(&channel_id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        // If no connections exist, or max is NULL, start at 0
        // Otherwise, return max + 1
        Ok(result
            .and_then(|(max,)| max)
            .map(|m| m + 1)
            .unwrap_or(0))
    }
}

// Internal row types for SQLite queries

#[derive(sqlx::FromRow)]
struct ConnectionRow {
    block_id: String,
    channel_id: String,
    position: i32,
    connected_at: String,
}

impl ConnectionRow {
    fn into_connection(self) -> Result<Connection, crate::error::DbError> {
        use chrono::DateTime;

        let connected_at = DateTime::parse_from_rfc3339(&self.connected_at)
            .map_err(|_| crate::error::DbError::InvalidDatetime {
                field: "connected_at",
                value: self.connected_at.clone(),
            })?
            .with_timezone(&chrono::Utc);

        Ok(Connection {
            block_id: BlockId(self.block_id),
            channel_id: ChannelId(self.channel_id),
            position: self.position,
            connected_at,
        })
    }
}

#[derive(sqlx::FromRow)]
struct BlockWithPositionRow {
    id: String,
    #[allow(dead_code)]
    content_type: String,
    content_json: String,
    created_at: String,
    updated_at: String,
    position: i32,
}

impl BlockWithPositionRow {
    fn into_block_with_position(self) -> RepoResult<(Block, i32)> {
        use chrono::DateTime;

        let content: BlockContent = serde_json::from_str(&self.content_json)
            .map_err(crate::error::DbError::from)?;

        let created_at = DateTime::parse_from_rfc3339(&self.created_at)
            .map_err(|_| crate::error::DbError::InvalidDatetime {
                field: "created_at",
                value: self.created_at.clone(),
            })?
            .with_timezone(&chrono::Utc);

        let updated_at = DateTime::parse_from_rfc3339(&self.updated_at)
            .map_err(|_| crate::error::DbError::InvalidDatetime {
                field: "updated_at",
                value: self.updated_at.clone(),
            })?
            .with_timezone(&chrono::Utc);

        Ok((
            Block {
                id: BlockId(self.id),
                content,
                created_at,
                updated_at,
            },
            self.position,
        ))
    }
}

#[derive(sqlx::FromRow)]
struct ChannelRow {
    id: String,
    title: String,
    description: Option<String>,
    created_at: String,
    updated_at: String,
}

impl ChannelRow {
    fn into_channel(self) -> Result<Channel, crate::error::DbError> {
        use chrono::DateTime;

        let created_at = DateTime::parse_from_rfc3339(&self.created_at)
            .map_err(|_| crate::error::DbError::InvalidDatetime {
                field: "created_at",
                value: self.created_at.clone(),
            })?
            .with_timezone(&chrono::Utc);

        let updated_at = DateTime::parse_from_rfc3339(&self.updated_at)
            .map_err(|_| crate::error::DbError::InvalidDatetime {
                field: "updated_at",
                value: self.updated_at.clone(),
            })?
            .with_timezone(&chrono::Utc);

        Ok(Channel {
            id: ChannelId(self.id),
            title: self.title,
            description: self.description,
            created_at,
            updated_at,
        })
    }
}
