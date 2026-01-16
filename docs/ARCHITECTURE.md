# Garden Architecture

Garden is an Are.na-inspired content curation tool with integrated Strudel patterns for generative audio. This document describes the system architecture that enables shared domain logic between Tauri desktop and web server backends.

## Design Goals

- **Shared domain logic** between Tauri desktop and web server backends
- **Swappable storage** (SQLite, SurrealDB, Postgres) via trait-based ports
- **Type safety end-to-end** with Rust as source of truth, generating TypeScript
- **Testable components** at every layer

## Repository Structure

```
garden/
│
├── crates/                      # All Rust code (Cargo workspace)
│   ├── garden-core/             # Domain hexagon
│   ├── garden-db/               # Storage adapters
│   ├── garden-tauri/            # Tauri IPC adapter
│   └── garden-server/           # REST API server
│
├── apps/                        # TypeScript applications
│   ├── desktop/                 # Tauri frontend (Vite + Lit)
│   └── web/                     # Web frontend (Vite + Lit)
│
├── packages/                    # Shared TypeScript packages
│   ├── components/              # @garden/components (UI primitives)
│   ├── views/                   # @garden/views (page compositions)
│   └── types/                   # @garden/types (generated from Rust)
│
├── docs/                        # Architecture documentation
│   ├── ARCHITECTURE.md          # This file
│   └── adr/                     # Architecture Decision Records
│
├── Cargo.toml                   # Rust workspace root
├── package.json                 # TypeScript workspace root
├── pnpm-workspace.yaml          # pnpm workspace config
├── turbo.json                   # Turbo task orchestration
└── justfile                     # Cross-language task runner
```

## Hexagonal Architecture

The core principle is **dependency inversion**: the domain has zero dependencies on adapters. Adapters depend on the domain, implementing its traits.

```
                         ┌─────────────────────────────────────┐
                         │           garden-core               │
                         │         (Domain Hexagon)            │
                         │                                     │
                         │  Models:  Channel, Block, User      │
                         │  Ports:   ChannelRepo, BlockRepo    │
                         │  Services: connect_block, search    │
                         └──────────────────┬──────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
          ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
          │  garden-tauri   │    │  garden-server  │    │   garden-db     │
          │  (IPC Adapter)  │    │  (HTTP Adapter) │    │ (Storage Adapt) │
          └────────┬────────┘    └────────┬────────┘    └─────────────────┘
                   │                      │                       │
                   │                      │              ┌────────┴────────┐
                   ▼                      ▼              ▼                 ▼
          ┌─────────────────┐    ┌─────────────────┐  SQLite         Postgres
          │  apps/desktop   │    │   apps/web      │  SurrealDB      (server)
          │  (Tauri + Lit)  │    │   (Lit SPA)     │  (desktop)
          └─────────────────┘    └─────────────────┘
```

### Crate Responsibilities

| Crate | Purpose | Dependencies |
|-------|---------|--------------|
| `garden-core` | Domain models, port traits, pure business logic | None (pure Rust) |
| `garden-db` | Storage adapters implementing repository traits | `garden-core` |
| `garden-tauri` | Tauri IPC commands calling domain services | `garden-core`, `garden-db` |
| `garden-server` | REST API routes calling domain services | `garden-core`, `garden-db` |

## Data Flow

### TypeScript to Rust

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RUST (crates/)                                │
│                                                                         │
│  garden-core          garden-db           garden-tauri / garden-server  │
│  ┌──────────┐        ┌──────────┐        ┌──────────────────────────┐  │
│  │ Models   │◄──────▶│ SQLite/  │◄──────▶│ IPC Commands / REST      │  │
│  │ Ports    │        │ Postgres │        │ Routes                   │  │
│  │ Services │        └──────────┘        └────────────┬─────────────┘  │
│  └──────────┘                                         │                 │
│       │                                               │                 │
│       │ ts-rs generates                               │ JSON            │
│       ▼                                               ▼                 │
└───────┼───────────────────────────────────────────────┼─────────────────┘
        │                                               │
        ▼                                               │
┌─────────────────────────────────────────────────────────────────────────┐
│                        TYPESCRIPT (packages/, apps/)                    │
│                                                                         │
│  @garden/types        @garden/views        apps/desktop, apps/web       │
│  ┌──────────┐        ┌──────────┐        ┌──────────────────────────┐  │
│  │ Channel  │◄──────▶│ Pages    │◄──────▶│ App Shell                │◄─┘
│  │ Block    │        │ Layouts  │        │ (Tauri invoke / fetch)   │
│  │ User     │        └──────────┘        └──────────────────────────┘
│  └──────────┘               │
│       ▲                     ▼
│       │              @garden/components
│       │              ┌──────────┐
│       └──────────────│ Button   │
│                      │ Card     │
│                      │ Modal    │
│                      └──────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

### Example: Creating a Block

1. **User Action**: User clicks "Add Block" in `<garden-channel-page>`
2. **View Emits Event**: `this.emit('create-block', { channelId, content })`
3. **App Shell Handles**:
   - Desktop: `invoke('create_block', { channel_id, content })`
   - Web: `fetch('/api/blocks', { method: 'POST', body: {...} })`
4. **Adapter Receives**: Tauri command or HTTP handler deserializes request
5. **Domain Service**: `create_block(repo, channel_id, content)` runs pure logic
6. **Storage Adapter**: `repo.create(&block)` persists to SQLite/Postgres
7. **Response**: Block serialized to JSON, sent back to TypeScript
8. **View Updates**: App shell updates state, view re-renders

## Type Generation

Rust structs are the source of truth. TypeScript types are generated via `ts-rs`:

```rust
// crates/garden-core/src/models/channel.rs
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../packages/types/src/generated/")]
pub struct Channel {
    pub id: ChannelId,
    pub title: String,
    pub description: Option<String>,
    pub block_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

Generates:

```typescript
// packages/types/src/generated/Channel.ts
export interface Channel {
    id: ChannelId;
    title: string;
    description: string | null;
    block_count: number;
    created_at: string;
    updated_at: string;
}
```

Run `just gen-types` to regenerate after Rust changes.

## Storage Backends

Feature flags enable swappable storage:

```toml
# crates/garden-db/Cargo.toml
[features]
default = ["sqlite"]
sqlite = ["sqlx/sqlite"]
surrealdb = ["surrealdb/kv-rocksdb"]
postgres = ["sqlx/postgres"]
```

- **Desktop app**: SQLite (or SurrealDB) for local-first storage
- **Web server**: Postgres for multi-user deployment

## Tooling

| Concern | Tool | Scope |
|---------|------|-------|
| Rust dependencies | Cargo workspace | `crates/*` |
| TypeScript dependencies | pnpm workspace | `apps/*`, `packages/*` |
| TypeScript builds | Turbo | Caching, parallelization |
| Cross-language tasks | just | Unified commands |
| Type generation | ts-rs | Rust → TypeScript |

See `justfile` for available commands.

## Frontend Architecture

### Component Layers

1. **@garden/components**: Primitive UI elements (Button, Card, Modal, Input)
2. **@garden/views**: Page compositions using components (ChannelPage, BlockPage)
3. **apps/\***: Application shells that wire views to backends

### Data Flow Pattern

Views follow **data-down, events-up**:

- **Props (down)**: Views receive typed data as properties
- **Events (up)**: Views emit domain events for actions
- **App Shell**: Translates events to backend calls, updates view props

```typescript
// App shell handles events from views
channelPage.addEventListener('garden:create-block', async (e) => {
  const block = await api.createBlock(e.detail);
  channelPage.blocks = [...channelPage.blocks, block];
});
```

## Further Reading

- [ADR-001: Hexagonal Architecture](./adr/001-hexagonal-architecture.md)
- [@garden/components README](../packages/components/README.md)
