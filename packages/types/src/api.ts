/**
 * Type-safe API wrapper for Garden Tauri commands.
 *
 * This module provides a type-safe interface for invoking Tauri commands
 * from the frontend. It wraps the low-level `invoke` function with
 * proper TypeScript types and error handling.
 *
 * @example
 * ```typescript
 * import { garden, GardenError } from '@garden/types';
 *
 * // Create a channel
 * const channel = await garden.channels.create({
 *   title: 'My Channel',
 *   description: 'A description'
 * });
 *
 * // Handle errors
 * try {
 *   await garden.channels.get({ id: 'invalid-id' });
 * } catch (e) {
 *   if (e instanceof GardenError && e.code === 'CHANNEL_NOT_FOUND') {
 *     console.log('Channel not found:', e.entityId);
 *   }
 * }
 * ```
 */

import { invoke } from '@tauri-apps/api/core';

import type { Block, BlockId, BlockUpdate, NewBlock } from './generated/index.js';
import type { Channel, ChannelId, ChannelUpdate, NewChannel } from './generated/index.js';
import type { Connection } from './generated/index.js';
import type { Page } from './generated/index.js';
import type { ErrorCode, TauriError } from './generated/index.js';

// Re-export types for convenience
export type { ErrorCode, TauriError };

/**
 * Custom error class for Garden API errors.
 *
 * Provides structured error information from the backend:
 * - `code`: Machine-readable error code for programmatic handling
 * - `message`: Human-readable error message for display
 * - `entityId`: Optional ID of the entity that caused the error
 */
export class GardenError extends Error {
  readonly code: ErrorCode;
  readonly entityId: string | null;

  constructor(err: TauriError) {
    super(err.message);
    this.name = 'GardenError';
    this.code = err.code;
    this.entityId = err.entityId;
  }

  /**
   * Check if this is a "not found" error.
   */
  isNotFound(): boolean {
    return (
      this.code === 'CHANNEL_NOT_FOUND' ||
      this.code === 'BLOCK_NOT_FOUND' ||
      this.code === 'CONNECTION_NOT_FOUND'
    );
  }

  /**
   * Check if this is a validation error.
   */
  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if this is a duplicate error.
   */
  isDuplicate(): boolean {
    return this.code === 'DUPLICATE_ERROR';
  }
}

/**
 * Wrap an invoke call with proper error handling.
 */
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    // Tauri returns errors as plain objects matching TauriError
    if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
      throw new GardenError(error as TauriError);
    }
    // Re-throw unknown errors
    throw error;
  }
}

/**
 * Channel API methods.
 */
export const channels = {
  /**
   * Create a new channel.
   */
  create(newChannel: NewChannel): Promise<Channel> {
    return safeInvoke<Channel>('channel_create', { newChannel });
  },

  /**
   * Get a channel by ID.
   */
  get(id: ChannelId): Promise<Channel> {
    return safeInvoke<Channel>('channel_get', { id });
  },

  /**
   * List channels with pagination.
   */
  list(options?: { limit?: number; offset?: number }): Promise<Page<Channel>> {
    return safeInvoke<Page<Channel>>('channel_list', {
      limit: options?.limit,
      offset: options?.offset,
    });
  },

  /**
   * Update a channel.
   */
  update(id: ChannelId, update: ChannelUpdate): Promise<Channel> {
    return safeInvoke<Channel>('channel_update', { id, update });
  },

  /**
   * Delete a channel.
   */
  delete(id: ChannelId): Promise<void> {
    return safeInvoke<void>('channel_delete', { id });
  },

  /**
   * Get total channel count.
   */
  count(): Promise<number> {
    return safeInvoke<number>('channel_count', {});
  },
};

/**
 * Block API methods.
 */
export const blocks = {
  /**
   * Create a new block.
   */
  create(newBlock: NewBlock): Promise<Block> {
    return safeInvoke<Block>('block_create', { newBlock });
  },

  /**
   * Create multiple blocks at once.
   */
  createBatch(newBlocks: NewBlock[]): Promise<Block[]> {
    return safeInvoke<Block[]>('block_create_batch', { newBlocks });
  },

  /**
   * Get a block by ID.
   */
  get(id: BlockId): Promise<Block> {
    return safeInvoke<Block>('block_get', { id });
  },

  /**
   * Update a block.
   */
  update(id: BlockId, update: BlockUpdate): Promise<Block> {
    return safeInvoke<Block>('block_update', { id, update });
  },

  /**
   * Delete a block.
   */
  delete(id: BlockId): Promise<void> {
    return safeInvoke<void>('block_delete', { id });
  },
};

/**
 * Connection API methods.
 */
export const connections = {
  /**
   * Connect a block to a channel.
   */
  connect(
    blockId: BlockId,
    channelId: ChannelId,
    position?: number
  ): Promise<Connection> {
    return safeInvoke<Connection>('connection_connect', {
      blockId,
      channelId,
      position,
    });
  },

  /**
   * Connect multiple blocks to a channel.
   */
  connectBatch(
    blockIds: BlockId[],
    channelId: ChannelId,
    startingPosition?: number
  ): Promise<Connection[]> {
    return safeInvoke<Connection[]>('connection_connect_batch', {
      blockIds,
      channelId,
      startingPosition,
    });
  },

  /**
   * Disconnect a block from a channel.
   */
  disconnect(blockId: BlockId, channelId: ChannelId): Promise<void> {
    return safeInvoke<void>('connection_disconnect', { blockId, channelId });
  },

  /**
   * Get a specific connection.
   */
  get(blockId: BlockId, channelId: ChannelId): Promise<Connection> {
    return safeInvoke<Connection>('connection_get', { blockId, channelId });
  },

  /**
   * Get all blocks in a channel.
   */
  getBlocksInChannel(channelId: ChannelId): Promise<Block[]> {
    return safeInvoke<Block[]>('connection_get_blocks_in_channel', { channelId });
  },

  /**
   * Get all blocks in a channel with their positions.
   */
  getBlocksWithPositions(channelId: ChannelId): Promise<[Block, number][]> {
    return safeInvoke<[Block, number][]>('connection_get_blocks_with_positions', {
      channelId,
    });
  },

  /**
   * Get all channels containing a block.
   */
  getChannelsForBlock(blockId: BlockId): Promise<Channel[]> {
    return safeInvoke<Channel[]>('connection_get_channels_for_block', { blockId });
  },

  /**
   * Reorder a block within a channel.
   */
  reorder(channelId: ChannelId, blockId: BlockId, newPosition: number): Promise<void> {
    return safeInvoke<void>('connection_reorder', {
      channelId,
      blockId,
      newPosition,
    });
  },
};

/**
 * Unified Garden API.
 *
 * Provides type-safe access to all Garden IPC commands.
 */
export const garden = {
  channels,
  blocks,
  connections,
};

export default garden;
