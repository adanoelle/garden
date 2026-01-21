# ADR-001: Hexagonal Architecture

## Status

Accepted

## Date

2025-01-15

## Context

Garden needs to support multiple deployment targets:
- **Tauri desktop app** - Direct SQLite access via IPC
- **Future web app** - REST API with server-side storage
- **Potential mobile app** - May use different storage backend

We need an architecture that:
1. Keeps business logic independent of I/O concerns
2. Makes the domain testable without external dependencies
3. Allows swapping storage backends without changing core logic
4. Enables code sharing between deployment targets

## Decision

Adopt **hexagonal architecture** (ports and adapters) for the Rust backend:

```
┌─────────────────────────────────────────────────────────────┐
│                       Adapters (outer)                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ garden-tauri│    │ garden-db   │    │ (future: REST)  │  │
│  │ IPC Commands│    │ SQLite      │    │                 │  │
│  └──────┬──────┘    └──────┬──────┘    └────────┬────────┘  │
│         │                  │                    │            │
│         ▼                  ▼                    ▼            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Ports (interfaces)                   ││
│  │    ChannelRepository    BlockRepository    etc.         ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  garden-core (inner)                    ││
│  │     Models          Services          Validation        ││
│  │  Channel, Block    GardenService      URL, paths        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Crate Organization

| Crate | Layer | Responsibility |
|-------|-------|----------------|
| `garden-core` | Domain | Pure business logic, models, validation |
| `garden-db` | Adapter | SQLite implementation of repository traits |
| `garden-tauri` | Adapter | Tauri IPC command handlers |

### Key Rules

1. **garden-core has zero I/O dependencies** - No database, filesystem, or network
2. **Ports are traits in garden-core** - `ChannelRepository`, `BlockRepository`, etc.
3. **Adapters implement ports** - `SqliteChannelRepository` implements `ChannelRepository`
4. **Dependencies point inward** - Adapters depend on core, never the reverse

## Consequences

### Positive

- **Testability**: Domain logic tested with in-memory fakes, no SQLite needed
- **Flexibility**: Can swap SQLite for Postgres, or Tauri for REST, without touching core
- **Clarity**: Clear boundaries make code navigation easier
- **Type safety**: Repository traits enforce consistent interfaces

### Negative

- **Indirection**: More files and traits than a simple layered architecture
- **Boilerplate**: Repository traits require implementations for each adapter
- **Learning curve**: Developers must understand the port/adapter pattern

### Neutral

- Test fixtures use `TestFixture` struct that creates in-memory repositories
- Error types are defined per layer and converted at boundaries

## References

- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports and Adapters Pattern](https://www.dossier-andreas.net/software_architecture/ports_and_adapters.html)
