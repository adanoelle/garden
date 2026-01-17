//! SQLite implementation of ChannelRepository.

use async_trait::async_trait;
use sqlx::SqlitePool;
use std::time::Instant;
use tracing::{info, instrument, warn};

use garden_core::error::RepoResult;
use garden_core::models::{Channel, ChannelId, Page};
use garden_core::ports::ChannelRepository;

/// Threshold for logging slow queries (50ms).
const SLOW_QUERY_THRESHOLD_MS: u128 = 50;

/// SQLite-backed channel repository.
#[derive(Clone)]
pub struct SqliteChannelRepository {
    pool: SqlitePool,
}

impl SqliteChannelRepository {
    /// Create a new repository with the given connection pool.
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ChannelRepository for SqliteChannelRepository {
    #[instrument(skip(self, channel), fields(channel_id = %channel.id.0))]
    async fn create(&self, channel: &Channel) -> RepoResult<()> {
        sqlx::query(
            r#"
            INSERT INTO channels (id, title, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(&channel.id.0)
        .bind(&channel.title)
        .bind(&channel.description)
        .bind(channel.created_at.to_rfc3339())
        .bind(channel.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        Ok(())
    }

    #[instrument(skip(self), fields(channel_id = %id.0))]
    async fn get(&self, id: &ChannelId) -> RepoResult<Option<Channel>> {
        let row = sqlx::query_as::<_, ChannelRow>(
            r#"
            SELECT id, title, description, created_at, updated_at
            FROM channels
            WHERE id = $1
            "#,
        )
        .bind(&id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        match row {
            Some(r) => Ok(Some(r.into_channel()?)),
            None => Ok(None),
        }
    }

    #[instrument(skip(self), err)]
    async fn list(&self, limit: usize, offset: usize) -> RepoResult<Page<Channel>> {
        let start = Instant::now();

        // Get total count
        let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM channels")
            .fetch_one(&self.pool)
            .await
            .map_err(crate::error::DbError::from)?;

        // Get paginated items
        let rows = sqlx::query_as::<_, ChannelRow>(
            r#"
            SELECT id, title, description, created_at, updated_at
            FROM channels
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        let items: Vec<Channel> = rows
            .into_iter()
            .map(|r| r.into_channel())
            .collect::<Result<Vec<_>, _>>()?;

        let elapsed = start.elapsed();
        if elapsed.as_millis() > SLOW_QUERY_THRESHOLD_MS {
            warn!(
                elapsed_ms = elapsed.as_millis(),
                rows = items.len(),
                "Slow query: list channels"
            );
        } else {
            info!(
                elapsed_ms = elapsed.as_millis(),
                rows = items.len(),
                "Listed channels"
            );
        }

        Ok(Page::new(items, total.0 as usize, offset, limit))
    }

    #[instrument(skip(self, channel), fields(channel_id = %channel.id.0))]
    async fn update(&self, channel: &Channel) -> RepoResult<()> {
        let result = sqlx::query(
            r#"
            UPDATE channels
            SET title = $2, description = $3, updated_at = $4
            WHERE id = $1
            "#,
        )
        .bind(&channel.id.0)
        .bind(&channel.title)
        .bind(&channel.description)
        .bind(channel.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(crate::error::DbError::from)?;

        if result.rows_affected() == 0 {
            return Err(garden_core::error::RepoError::NotFound);
        }

        Ok(())
    }

    #[instrument(skip(self), fields(channel_id = %id.0))]
    async fn delete(&self, id: &ChannelId) -> RepoResult<()> {
        let result = sqlx::query("DELETE FROM channels WHERE id = $1")
            .bind(&id.0)
            .execute(&self.pool)
            .await
            .map_err(crate::error::DbError::from)?;

        if result.rows_affected() == 0 {
            return Err(garden_core::error::RepoError::NotFound);
        }

        Ok(())
    }

    #[instrument(skip(self))]
    async fn count(&self) -> RepoResult<usize> {
        let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM channels")
            .fetch_one(&self.pool)
            .await
            .map_err(crate::error::DbError::from)?;

        Ok(count as usize)
    }
}

/// Internal row type for SQLite queries.
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
