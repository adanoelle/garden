# Garden - Claude Code Context

Garden is an Are.na-inspired content curation tool with a Tauri desktop app and shared component library.

## Project Structure

```
garden/
├── crates/                      # Rust workspace (hexagonal architecture)
│   ├── garden-core/             # Domain logic (models, ports, services)
│   ├── garden-db/               # SQLite storage adapter
│   └── garden-tauri/            # Tauri IPC commands
├── packages/                    # TypeScript workspace (pnpm)
│   ├── types/                   # Generated types from Rust (ts-rs)
│   ├── components/              # @garden/components (Lit primitives)
│   └── views/                   # @garden/views (page compositions)
├── apps/
│   └── desktop/                 # Tauri desktop app
└── docs/                        # Architecture documentation
```

## Development Commands

```bash
# Enter dev environment (Nix)
direnv allow                     # or: nix develop

# TypeScript development
pnpm install                     # Install dependencies
pnpm turbo dev                   # Start all dev servers
pnpm turbo build                 # Build all packages
pnpm turbo typecheck             # Type check all packages
pnpm turbo lint                  # Lint all packages

# Rust development
cargo check                      # Fast syntax check
cargo clippy                     # Lints
cargo test                       # Run tests

# Tauri desktop app
just dev-desktop                 # Run desktop app in dev mode
just build-desktop               # Build production app

# Type generation (Rust → TypeScript)
just gen-types                   # Regenerate @garden/types from Rust

# Database
just db-reset                    # Delete and recreate database

# Full check (before committing)
just check                       # Run all lints and tests
```

## Architecture Overview

### Hexagonal Architecture (Rust)

- **garden-core**: Pure domain logic with zero I/O dependencies
  - Models: `Block`, `Channel`, `Connection`
  - Ports: Repository traits (`ChannelRepository`, `BlockRepository`, etc.)
  - Services: `GardenService` composed with injected repositories
- **garden-db**: Implements repository traits with SQLite
- **garden-tauri**: Adapts domain to Tauri IPC commands

### Type Safety (Rust → TypeScript)

- Rust structs are source of truth for types
- `ts-rs` generates TypeScript from `#[derive(TS)]` structs
- Never manually edit `packages/types/src/generated/`
- Run `just gen-types` after changing Rust models

### Key Patterns

**`FieldUpdate<T>`** - 3-state updates for partial updates:
```typescript
// Keep existing value (omit field)
const update: BlockUpdate = {};

// Set to new value
const update: BlockUpdate = {
  notes: { action: 'set', value: 'New notes' }
};

// Clear value (set to null)
const update: BlockUpdate = {
  notes: { action: 'clear' }
};
```

## Common Tasks

### Adding a new Tauri command

1. Add method to appropriate service in `garden-core/src/services/`
2. Create command in `garden-tauri/src/commands/`
3. Register in `garden-tauri/src/lib.rs` handler
4. Run `just gen-types` to update TypeScript types
5. Use `invoke()` from frontend via `@garden/types` API

### Adding a new model field

1. Update struct in `garden-core/src/models/`
2. Add migration in `garden-db/src/sqlite/migrations/`
3. Update SQLite repository implementations
4. Run `just gen-types`
5. Update TypeScript consumers

### Adding a new component

See `packages/components/CLAUDE.md` for component-specific patterns.

### Testing changes

```bash
# Rust tests
cargo test

# TypeScript tests
pnpm turbo test

# Full check before commit
just check
```

## Workspace Packages

| Package | Description | Commands |
|---------|-------------|----------|
| `@garden/types` | Generated types + API wrapper | `pnpm turbo build --filter=@garden/types` |
| `@garden/components` | Lit web components | `pnpm turbo dev --filter=@garden/components` |
| `@garden/views` | Page compositions | `pnpm turbo build --filter=@garden/views` |

## Tauri Troubleshooting

### Tauri APIs not working (fullscreen, window controls, etc.)

**Symptom**: Components fail silently, `window.__TAURI__` is undefined, features fall back to unsupported browser APIs.

**Root Cause**: `withGlobalTauri: false` in `apps/desktop/src-tauri/tauri.conf.json`

**Solution**: Set `"withGlobalTauri": true` in the `app` section of `tauri.conf.json`

**Prevention**: The app shows a console warning on startup if Tauri global is missing (see `apps/desktop/src/main.ts`)

### Fullscreen not working

1. **Check Tauri detection**: Open console, look for "✅ Tauri environment validated" on startup
2. **Check capabilities**: Ensure `core:window:allow-set-fullscreen` is in `apps/desktop/src-tauri/capabilities/default.json`
3. **Check CSP**: No Content Security Policy violations in console

### Platform Detection

Use the shared `isTauri()` function from `@garden/types`:

```typescript
import { isTauri } from '@garden/types';

if (isTauri()) {
  // Running in Tauri desktop app
} else {
  // Running in browser
}
```

**Do not** create local `_isTauri()` methods in components - use the shared utility for consistency.

## Package-Specific Instructions

- **Components**: See `packages/components/CLAUDE.md` for design system details
- **Architecture**: See `docs/ARCHITECTURE.md` for detailed system design
