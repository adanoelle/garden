//! Channel service - domain logic for channel operations.

use chrono::Utc;

use crate::error::{DomainError, DomainResult};
use crate::models::{Channel, ChannelId, ChannelUpdate, NewChannel};
use crate::ports::ChannelRepository;
use crate::validation::validate_channel_title;

/// Create a new channel.
pub async fn create_channel(
    repo: &impl ChannelRepository,
    new_channel: NewChannel,
) -> DomainResult<Channel> {
    validate_channel_title(&new_channel.title)?;

    let channel = if let Some(desc) = new_channel.description {
        Channel::with_description(new_channel.title, desc)
    } else {
        Channel::new(new_channel.title)
    };

    repo.create(&channel).await?;
    Ok(channel)
}

/// Get a channel by ID.
pub async fn get_channel(
    repo: &impl ChannelRepository,
    id: &ChannelId,
) -> DomainResult<Channel> {
    repo.get(id)
        .await?
        .ok_or_else(|| DomainError::ChannelNotFound(id.clone()))
}

/// List channels with pagination.
pub async fn list_channels(
    repo: &impl ChannelRepository,
    limit: usize,
    offset: usize,
) -> DomainResult<crate::models::Page<Channel>> {
    Ok(repo.list(limit, offset).await?)
}

/// Update a channel.
pub async fn update_channel(
    repo: &impl ChannelRepository,
    id: &ChannelId,
    update: ChannelUpdate,
) -> DomainResult<Channel> {
    let mut channel = get_channel(repo, id).await?;

    if let Some(title) = update.title {
        validate_channel_title(&title)?;
        channel.title = title;
    }

    // Apply description update using FieldUpdate
    channel.description = update.description.apply(channel.description);

    channel.updated_at = Utc::now();
    repo.update(&channel).await?;
    Ok(channel)
}

/// Delete a channel.
pub async fn delete_channel(
    repo: &impl ChannelRepository,
    id: &ChannelId,
) -> DomainResult<()> {
    // Verify channel exists
    let _ = get_channel(repo, id).await?;
    repo.delete(id).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    // Tests would use mock repositories
    // Skipping for now as we don't have a mock implementation yet
}
