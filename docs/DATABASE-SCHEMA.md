# Database Schema

Garden uses SQLite for local storage with a simple schema designed around three core
concepts: **Channels**, **Blocks**, and **Connections**.

## Entity Relationship

```
┌─────────────┐         ┌─────────────────┐         ┌─────────────┐
│   Channel   │         │   Connection    │         │    Block    │
├─────────────┤         ├─────────────────┤         ├─────────────┤
│ id (PK)     │◄────────│ channel_id (FK) │         │ id (PK)     │
│ title       │         │ block_id (FK)   │────────►│ content_type│
│ description │         │ position        │         │ content_json│
│ created_at  │         │ connected_at    │         │ source_url  │
│ updated_at  │         └─────────────────┘         │ source_title│
└─────────────┘                                     │ creator     │
                                                    │ notes       │
                                                    │ created_at  │
                                                    │ updated_at  │
                                                    └─────────────┘
```

**Key relationships:**

- A **Block** can belong to multiple **Channels** (many-to-many)
- A **Connection** links a Block to a Channel with a position
- Deleting a Channel or Block cascades to its Connections

## Tables

### channels

Stores channel metadata.

| Column        | Type | Constraints | Description          |
| ------------- | ---- | ----------- | -------------------- |
| `id`          | TEXT | PRIMARY KEY | UUID v4              |
| `title`       | TEXT | NOT NULL    | Channel name         |
| `description` | TEXT | nullable    | Optional description |
| `created_at`  | TEXT | NOT NULL    | ISO 8601 datetime    |
| `updated_at`  | TEXT | NOT NULL    | ISO 8601 datetime    |

**Indexes:**

- `idx_channels_created_at` — For listing channels by date

### blocks

Stores block content and metadata.

| Column          | Type | Constraints | Description                                    |
| --------------- | ---- | ----------- | ---------------------------------------------- |
| `id`            | TEXT | PRIMARY KEY | UUID v4                                        |
| `content_type`  | TEXT | NOT NULL    | Discriminator: text, link, image, video, audio |
| `content_json`  | TEXT | NOT NULL    | JSON-encoded BlockContent                      |
| `source_url`    | TEXT | nullable    | Original URL (archival)                        |
| `source_title`  | TEXT | nullable    | Display text for source                        |
| `creator`       | TEXT | nullable    | Author/artist                                  |
| `original_date` | TEXT | nullable    | Publication date                               |
| `notes`         | TEXT | nullable    | User notes                                     |
| `created_at`    | TEXT | NOT NULL    | ISO 8601 datetime                              |
| `updated_at`    | TEXT | NOT NULL    | ISO 8601 datetime                              |

**Indexes:**

- `idx_blocks_created_at` — For listing blocks by date

### connections

Join table linking blocks to channels.

| Column         | Type    | Constraints      | Description          |
| -------------- | ------- | ---------------- | -------------------- |
| `block_id`     | TEXT    | PK, FK(blocks)   | Block reference      |
| `channel_id`   | TEXT    | PK, FK(channels) | Channel reference    |
| `position`     | INTEGER | NOT NULL         | Order within channel |
| `connected_at` | TEXT    | NOT NULL         | ISO 8601 datetime    |

**Indexes:**

- `idx_connections_channel_position` — For ordered block lists
- `idx_connections_block` — For finding a block's channels

**Foreign Keys:**

- `block_id → blocks(id)` ON DELETE CASCADE
- `channel_id → channels(id)` ON DELETE CASCADE

## Content Types

The `content_json` column stores different content structures based on
`content_type`:

### Text Block

```json
{
  "body": "The text content..."
}
```

### Link Block

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "description": "Optional description"
}
```

### Image Block

```json
{
  "file_path": "images/abc123.jpg",
  "original_url": "https://example.com/image.jpg",
  "width": 1920,
  "height": 1080,
  "mime_type": "image/jpeg",
  "alt_text": "Description"
}
```

### Video Block

```json
{
  "file_path": "videos/def456.mp4",
  "original_url": "https://example.com/video.mp4",
  "width": 1920,
  "height": 1080,
  "duration": 120.5,
  "mime_type": "video/mp4",
  "alt_text": "Description"
}
```

### Audio Block

```json
{
  "file_path": "audio/ghi789.mp3",
  "original_url": "https://example.com/track.mp3",
  "duration": 180.0,
  "mime_type": "audio/mpeg",
  "title": "Track Name",
  "artist": "Artist Name"
}
```

## Migration History

| Version          | Date       | Description                                    |
| ---------------- | ---------- | ---------------------------------------------- |
| `20260116000000` | 2026-01-16 | Initial schema (channels, blocks, connections) |
| `20260117000000` | 2026-01-17 | Add archive metadata fields                    |

## Common Queries

### List blocks in a channel (ordered)

```sql
SELECT b.*
FROM blocks b
JOIN connections c ON b.id = c.block_id
WHERE c.channel_id = ?
ORDER BY c.position ASC;
```

### Find channels for a block

```sql
SELECT ch.*
FROM channels ch
JOIN connections c ON ch.id = c.channel_id
WHERE c.block_id = ?;
```

### Get next position in channel

```sql
SELECT COALESCE(MAX(position), -1) + 1
FROM connections
WHERE channel_id = ?;
```

### Reorder blocks in channel

```sql
UPDATE connections
SET position = ?
WHERE block_id = ? AND channel_id = ?;
```

## Database Location

The database file is stored in the app's data directory:

| Platform | Path                                                     |
| -------- | -------------------------------------------------------- |
| macOS    | `~/Library/Application Support/com.garden.app/garden.db` |
| Linux    | `~/.local/share/com.garden.app/garden.db`                |
| Windows  | `%APPDATA%\com.garden.app\garden.db`                     |

## Development

### Reset Database

```bash
just db-reset
```

This deletes and recreates the database with fresh migrations.

### Run Migrations

Migrations run automatically on app startup. They're embedded at compile time from
`crates/garden-db/migrations/`.

### Add a New Migration

1. Create file: `crates/garden-db/migrations/{timestamp}_{name}.sql`
2. Use format: `YYYYMMDDHHMMSS` for timestamp
3. Write idempotent SQL (use `IF NOT EXISTS`, etc.)
4. Test with `cargo test -p garden-db`

Example:

```sql
-- 20260120000000_add_new_feature.sql
ALTER TABLE blocks ADD COLUMN new_field TEXT;
CREATE INDEX IF NOT EXISTS idx_blocks_new_field ON blocks(new_field);
```

## Design Decisions

### Why SQLite?

- **Local-first**: No server required
- **Single file**: Easy backup and sync
- **Robust**: ACID transactions, crash recovery
- **Fast**: WAL mode for concurrent reads

### Why JSON for content?

- **Flexibility**: Different content types without schema changes
- **Extensibility**: Add fields without migrations
- **Type safety**: Validated at Rust layer via serde

### Why TEXT for dates?

- **ISO 8601**: Standard, sortable format
- **Timezone-aware**: Includes offset when needed
- **Human-readable**: Easy to debug

### Why UUID strings?

- **Globally unique**: No coordination needed
- **Offline-safe**: Generate without server
- **URL-safe**: Work in paths and queries

## Further Reading

- [SQLite documentation](https://sqlite.org/docs.html)
- [Garden Architecture](ARCHITECTURE.md)
- [Rust models](../crates/garden-core/src/models/)
