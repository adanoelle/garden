-- Initial Garden database schema
-- Creates tables for channels, blocks, and connections

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,  -- ISO 8601 datetime
    updated_at TEXT NOT NULL   -- ISO 8601 datetime
);

-- Index for listing channels by creation date
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON channels(created_at DESC);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY NOT NULL,
    content_type TEXT NOT NULL,  -- 'text' or 'link'
    content_json TEXT NOT NULL,  -- JSON-encoded BlockContent
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Index for listing blocks by creation date
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at DESC);

-- Connections table (block <-> channel relationships)
CREATE TABLE IF NOT EXISTS connections (
    block_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    connected_at TEXT NOT NULL,

    PRIMARY KEY (block_id, channel_id),
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

-- Index for getting blocks in a channel ordered by position
CREATE INDEX IF NOT EXISTS idx_connections_channel_position
    ON connections(channel_id, position);

-- Index for getting channels for a block
CREATE INDEX IF NOT EXISTS idx_connections_block
    ON connections(block_id);
