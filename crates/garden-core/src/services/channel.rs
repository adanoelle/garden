//! Channel service - domain logic for channel operations.
//!
//! **Note:** These free functions are provided for backwards compatibility.
//! For new code, prefer using [`GardenService`](super::GardenService) which
//! provides the same functionality in a more ergonomic struct-based API.

use chrono::Utc;

use crate::error::{DomainError, DomainResult};
use crate::models::{Channel, ChannelId, ChannelUpdate, NewChannel};
use crate::ports::ChannelRepository;
use crate::validation::validate_channel_title;

/// Create a new channel.
#[deprecated(since = "0.1.0", note = "Use GardenService::create_channel instead")]
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
#[deprecated(since = "0.1.0", note = "Use GardenService::get_channel instead")]
pub async fn get_channel(repo: &impl ChannelRepository, id: &ChannelId) -> DomainResult<Channel> {
    repo.get(id)
        .await?
        .ok_or_else(|| DomainError::ChannelNotFound(id.clone()))
}

/// List channels with pagination.
#[deprecated(since = "0.1.0", note = "Use GardenService::list_channels instead")]
pub async fn list_channels(
    repo: &impl ChannelRepository,
    limit: usize,
    offset: usize,
) -> DomainResult<crate::models::Page<Channel>> {
    Ok(repo.list(limit, offset).await?)
}

/// Update a channel.
#[deprecated(since = "0.1.0", note = "Use GardenService::update_channel instead")]
pub async fn update_channel(
    repo: &impl ChannelRepository,
    id: &ChannelId,
    update: ChannelUpdate,
) -> DomainResult<Channel> {
    #[allow(deprecated)]
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
#[deprecated(since = "0.1.0", note = "Use GardenService::delete_channel instead")]
pub async fn delete_channel(repo: &impl ChannelRepository, id: &ChannelId) -> DomainResult<()> {
    // Verify channel exists
    #[allow(deprecated)]
    let _ = get_channel(repo, id).await?;
    repo.delete(id).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    // Tests would use mock repositories
    // Skipping for now as we don't have a mock implementation yet
}
