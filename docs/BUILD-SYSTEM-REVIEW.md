# Build System Review

**Date:** January 19, 2026 **Goal:** Make the development experience seamless and
effortless across components, Tauri app, and (future) web app.

---

## Executive Summary

The Garden build system is functional but has opportunities for improvement:

| Area           | Current State                             | Priority |
| -------------- | ----------------------------------------- | -------- |
| **flake.nix**  | Well-structured, missing dev tools        | Medium   |
| **turbo.json** | Underutilized, minimal config             | High     |
| **justfile**   | Comprehensive but manual deps             | Medium   |
| **CLAUDE.md**  | Only in components, needs workspace-level | High     |

---

## 1. Nix Flake Review

### Current Strengths

- Uses oxalica rust-overlay for reproducible Rust toolchain
- Cross-platform support (aarch64-darwin, x86_64-darwin, x86_64-linux)
- Clean devShell with Node.js 20, pnpm, cargo-watch, just, turbo
- Proper `.envrc` integration with `use flake`

### Issues Found

1. **Missing dev tools:**
   - `sqlite3` CLI for database inspection
   - `sqlx-cli` for migrations (`cargo install sqlx-cli` not cached)
   - `direnv` (relies on user having it installed)

2. **No Tauri dependencies:**
   - Missing webkit2gtk, libsoup, etc. for Linux builds
   - macOS works because system frameworks suffice

3. **Rust toolchain pinning:**
   - Uses `stable` but doesn't pin a specific date
   - Could cause reproducibility issues over time

### Recommendations

```nix
# Add to devShell packages:
pkgs.sqlite           # CLI for database inspection
pkgs.sqlx-cli         # Or use: cargo install sqlx-cli --locked
pkgs.direnv           # Explicit dependency

# Pin Rust toolchain:
rust-bin.stable."1.75.0".default  # Instead of just stable

# For Linux Tauri builds, add conditionally:
lib.optionals stdenv.isLinux [
  pkgs.webkitgtk
  pkgs.libsoup
  pkgs.openssl
  pkgs.pkg-config
]
```

**Priority:** Medium - Current setup works, improvements are nice-to-have.

---

## 2. Turborepo Review

### Current State

The `turbo.json` is minimal (32 lines) with 8 tasks configured:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**"],
      "outputs": ["dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["build"] },
    "lint": {},
    "typecheck": {},
    "format": {},
    "format:check": {},
    "clean": { "cache": false }
  }
}
```

### Issues Found

1. **Missing outputs for cacheable tasks:**
   - `test`, `lint`, `typecheck` have no `outputs` → no caching benefit
   - Only `build` properly specifies `outputs: ["dist/**"]`

2. **No globalDependencies:**
   - Changes to `tsconfig.json`, `package.json` don't invalidate cache

3. **Underutilized parallelization:**
   - Tasks like `lint`, `typecheck`, `format:check` could run in parallel
   - No pipeline composition for common workflows

4. **No environment variables:**
   - Missing `env` and `globalEnv` for proper cache keys

### Recommendations

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.json", "pnpm-lock.yaml"],
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json", "package.json"],
      "outputs": ["dist/**", ".tsbuildinfo"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json"],
      "outputs": [".tsbuildinfo"]
    },
    "lint": {
      "inputs": ["src/**", ".eslintrc*", "eslint.config.*"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**", "tests/**", "vitest.config.*"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    },
    "//#check": {
      "dependsOn": ["lint", "typecheck", "test"]
    }
  }
}
```

**Key improvements:**

- Add `globalDependencies` for config files
- Specify `inputs` for all tasks (better cache hits)
- Add `outputs: []` for lint (marks as cacheable with no outputs)
- Add composite task `//#check` for CI

**Priority:** High - Proper caching dramatically improves rebuild times.

---

## 3. Justfile Review

### Current Strengths

The justfile is comprehensive (313 lines, 40+ recipes):

- Clean unified entry point for all operations
- Good grouping (dev, build, test, database, etc.)
- Helpful default recipe showing available commands
- Cross-platform considerations

### Issues Found

1. **Manual dependency chaining:**

   ```just
   build-components: build-types
       cd packages/components && pnpm run build

   build-views: build-components
       cd packages/views && pnpm run build
   ```

   This duplicates what Turbo should handle via `dependsOn`.

2. **No modular organization:**
   - All 313 lines in one file
   - Could split into `just/rust.just`, `just/typescript.just`, etc.

3. **Redundant tasks:**
   - `just build-ts` manually sequences what `pnpm turbo run build` does
   - `just typecheck` runs individual packages instead of `turbo typecheck`

4. **Inconsistent tool usage:**
   - Some recipes use turbo, others don't
   - Mix of `cd && command` vs direct invocation

### Recommendations

**Option A: Lean on Turbo more (Recommended)**

```just
# Simplified justfile - let Turbo handle TypeScript orchestration

# === Development ===
dev:
    turbo dev

dev-rust:
    cargo watch -x check -x clippy

dev-tauri:
    cd apps/desktop && pnpm tauri dev

# === Build ===
build: build-rust build-ts

build-rust:
    cargo build --release

build-ts:
    turbo build

# === Quality ===
check: check-rust check-ts

check-rust:
    cargo check && cargo clippy && cargo test

check-ts:
    turbo lint typecheck test

# === Types ===
gen-types:
    cargo test -p garden-core export_bindings -- --ignored
    turbo build --filter=@garden/types

# === Database ===
db-migrate:
    cargo run -p garden-db --bin migrate

db-reset:
    rm -f ~/.local/share/com.garden.app/garden.db
    just db-migrate
```

**Option B: Modular justfiles**

```
just/
├── mod.just      # Imports all modules
├── rust.just     # Cargo recipes
├── ts.just       # TypeScript/Turbo recipes
├── tauri.just    # Tauri-specific recipes
└── db.just       # Database recipes

# justfile (root)
import 'just/mod.just'
```

```just
# just/mod.just
import 'rust.just'
import 'ts.just'
import 'tauri.just'
import 'db.just'

default:
    @just --list
```

**Priority:** Medium - Current setup works, but simplification reduces maintenance.

---

## 4. CLAUDE.md Review

### Current State

Only one `CLAUDE.md` exists at `packages/components/CLAUDE.md`:

- 167 lines, well-written for component development
- Covers design philosophy, interaction model, color palette
- Documents technical stack and development workflow

### Issues Found

1. **No workspace-level instructions:**
   - No root `CLAUDE.md` for cross-cutting concerns
   - Missing guidance on Rust crates, Tauri commands, architecture

2. **Wrong package manager:**
   - Uses `npm run dev` but project uses `pnpm`
   - Could cause confusion or errors

3. **Missing key workflows:**
   - No type generation instructions (`just gen-types`)
   - No Tauri development guidance
   - No database migration info

4. **Outdated file structure:**
   - Shows single-package structure, not monorepo
   - Missing crates, apps, packages breakdown

### Recommendations

**Create workspace-level `/CLAUDE.md`:**

```markdown
# Garden - Claude Code Context

## Project Structure

Garden is a monorepo with Rust backend (hexagonal architecture) and TypeScript
frontend (Lit web components).

\`\`\` garden/ ├── crates/ # Rust workspace │ ├── garden-core/ # Domain logic
(models, ports, services) │ ├── garden-db/ # SQLite storage adapter │ └──
garden-tauri/ # Tauri IPC commands ├── packages/ # TypeScript workspace (pnpm) │ ├──
types/ # Generated types from Rust (ts-rs) │ ├── components/ # @garden/components
(Lit primitives) │ └── views/ # @garden/views (page compositions) ├── apps/ │ └──
desktop/ # Tauri desktop app └── docs/ # Architecture documentation \`\`\`

## Development Commands

\`\`\`bash

# Enter dev environment (Nix)

direnv allow # or: nix develop

# TypeScript development

pnpm install # Install dependencies pnpm turbo dev # Start all dev servers pnpm turbo
build # Build all packages pnpm turbo typecheck # Type check all packages

# Rust development

cargo check # Fast syntax check cargo clippy # Lints cargo test # Run tests

# Tauri desktop app

just dev-tauri # Run desktop app in dev mode just build-tauri # Build production app

# Type generation (Rust → TypeScript)

just gen-types # Regenerate @garden/types from Rust models

# Database

just db-migrate # Run migrations just db-reset # Delete and recreate database \`\`\`

## Architecture Overview

**Hexagonal Architecture:**

- `garden-core`: Pure domain logic, no I/O dependencies
- `garden-db`: Implements repository traits with SQLite
- `garden-tauri`: Adapts domain to Tauri IPC commands

**Type Safety:**

- Rust is source of truth for types
- ts-rs generates TypeScript from `#[derive(TS)]` structs
- Never manually edit `packages/types/src/generated/`

**Key Patterns:**

- `FieldUpdate<T>`: 3-state updates (Keep/Clear/Set) for partial updates
- Repository traits: Async, generic, testable
- GardenService: Composed service with injected repositories

## Common Tasks

### Adding a new Tauri command

1. Add method to appropriate service in `garden-core`
2. Create command in `garden-tauri/src/commands/`
3. Register in `garden-tauri/src/lib.rs`
4. Run `just gen-types` to update TypeScript types
5. Use `invoke()` from frontend

### Adding a new model field

1. Update struct in `garden-core/src/models/`
2. Add migration in `garden-db/src/sqlite/migrations/`
3. Update repository implementations
4. Run `just gen-types`
5. Update TypeScript consumers

### Testing changes

\`\`\`bash

# Rust tests

cargo test

# TypeScript tests

pnpm turbo test

# Full check before commit

just check \`\`\`

## Package-Specific Instructions

See individual CLAUDE.md files:

- `packages/components/CLAUDE.md` - Component design system \`\`\`

**Update `packages/components/CLAUDE.md`:**

- Change `npm` → `pnpm` throughout
- Add link to workspace CLAUDE.md for architecture context

**Priority:** High - Claude agents need accurate instructions to be effective.

---

## Implementation Plan

### Phase 1: High Priority (Do First)

1. **Update turbo.json** with proper caching config
   - Add globalDependencies
   - Specify inputs/outputs for all tasks
   - Test cache hits work correctly

2. **Create workspace CLAUDE.md**
   - Document monorepo structure
   - List common commands with `pnpm`/`just`
   - Explain Rust → TypeScript type flow

3. **Fix components CLAUDE.md**
   - `npm` → `pnpm`
   - Link to workspace docs

### Phase 2: Medium Priority (Do Second)

4. **Simplify justfile**
   - Remove recipes that duplicate Turbo functionality
   - Keep cross-cutting recipes (gen-types, dev-tauri, db-\*)
   - Consider modular split if > 200 lines remain

5. **Enhance flake.nix**
   - Add sqlite3, sqlx-cli
   - Pin Rust version
   - Add Linux Tauri deps (conditional)

### Phase 3: Validation

6. **Test full workflow**
   - Fresh clone → `direnv allow` → `pnpm install` → `just dev-tauri`
   - Verify caching: run `turbo build` twice, second should be instant
   - Test type generation roundtrip

---

## Success Criteria

After implementation, these workflows should be seamless:

| Workflow              | Command                                      | Expected Time       |
| --------------------- | -------------------------------------------- | ------------------- |
| Start component dev   | `pnpm turbo dev --filter=@garden/components` | < 5s                |
| Start Tauri dev       | `just dev-tauri`                             | < 30s               |
| Full rebuild (cached) | `turbo build`                                | < 2s                |
| Full rebuild (cold)   | `turbo build`                                | < 30s               |
| Type check all        | `turbo typecheck`                            | < 10s (cached < 1s) |
| Run all tests         | `just check`                                 | < 60s               |

The goal is for developers to never wait unnecessarily and for Claude agents to have
accurate, actionable instructions.
```
