# ADR-001: Hexagonal Architecture

**Status**: Accepted
**Date**: 2026-01-16
**Deciders**: Ada

## Context

Garden needs to support two deployment targets:

1. **Desktop app** (Tauri): Local-first with SQLite/SurrealDB storage
2. **Web app**: Server-backed with Postgres storage

Both share the same domain concepts (Channels, Blocks, Connections) and business logic. Without careful architecture, we risk:

- Duplicating business logic across backends
- Tight coupling between domain and storage
- Difficulty swapping storage backends
- Type mismatches between Rust and TypeScript

## Decision

We will use **hexagonal architecture** (ports and adapters) with Rust as the domain core.

### Core Principles

1. **Domain at the center**: `garden-core` contains all domain models, business rules, and port definitions (traits). It has no dependencies on storage, networking, or frameworks.

2. **Ports as traits**: Repository interfaces (`ChannelRepository`, `BlockRepository`) are traits in the domain. They define what operations the domain needs, not how they're implemented.

3. **Adapters implement ports**: `garden-db` implements repository traits for different backends. `garden-tauri` and `garden-server` implement IPC/HTTP adapters that call domain services.

4. **Dependency inversion**: Adapters depend on the domain, never the reverse. The domain defines interfaces; adapters satisfy them.

### Type Safety

Rust structs are the source of truth for types. `ts-rs` generates TypeScript interfaces from Rust, ensuring the frontend and backend agree on data shapes.

## Consequences

### Positive

- **Testable domain**: Business logic can be unit tested with mock repositories
- **Swappable storage**: Changing from SQLite to SurrealDB requires only a new adapter
- **Shared logic**: Desktop and web share the same domain services
- **Type safety**: Generated TypeScript types prevent contract mismatches
- **Clear boundaries**: Each crate has a single responsibility

### Negative

- **More crates**: Initial setup requires multiple Rust crates
- **Indirection**: Trait-based dispatch adds a layer vs. direct calls
- **Learning curve**: Contributors must understand hexagonal patterns

### Neutral

- **Feature flags**: Storage backends selected via Cargo features
- **Build complexity**: Need orchestration (justfile) for cross-language builds

## Alternatives Considered

### 1. Separate codebases for desktop and web

Rejected: Would duplicate domain logic and diverge over time.

### 2. Single Rust binary with conditional compilation

Rejected: Too coarse-grained. Feature flags per-crate provide better modularity.

### 3. GraphQL instead of REST for web API

Rejected: REST is simpler for our needs. Can revisit if query flexibility becomes important.

## References

- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports and Adapters Pattern](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
- [ts-rs](https://github.com/Aleph-Alpha/ts-rs)
