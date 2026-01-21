# Contributing to Garden

Thank you for your interest in contributing to Garden! This guide will help you get
started.

## Table of Contents

- [Development Environment](#development-environment)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

---

## Development Environment

### Using Nix (Recommended)

Nix provides a reproducible development environment with all dependencies
pre-configured.

```bash
# Install Nix (if you haven't)
sh <(curl -L https://nixos.org/nix/install) --daemon

# Enable flakes
mkdir -p ~/.config/nix
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf

# Enter the dev shell
cd garden
nix develop

# Or with direnv (auto-enters shell)
direnv allow
```

### Manual Setup

If you prefer not to use Nix:

**Required:**

- Node.js 20+
- pnpm 9+
- Rust 1.75+ (via rustup)
- just (task runner)

**Optional:**

- cargo-watch (for Rust hot reloading)
- turbo (for incremental builds)

```bash
# Install just
cargo install just

# Install pnpm
npm install -g pnpm

# Verify setup
just doctor
```

### First-Time Setup

```bash
# Install all dependencies
just setup

# Run the desktop app
just dev-desktop
```

---

## Project Architecture

Garden uses a **hexagonal architecture** with clear boundaries between layers.

### Crate Responsibilities

| Crate          | Purpose                         | Dependencies           |
| -------------- | ------------------------------- | ---------------------- |
| `garden-core`  | Domain logic (models, services) | None (pure)            |
| `garden-db`    | SQLite storage adapter          | garden-core            |
| `garden-tauri` | Tauri IPC commands              | garden-core, garden-db |

### Package Responsibilities

| Package              | Purpose                                |
| -------------------- | -------------------------------------- |
| `@garden/types`      | TypeScript types (generated from Rust) |
| `@garden/components` | Lit web components (design system)     |
| `@garden/views`      | Page compositions                      |

### Data Flow

```
User Action → TypeScript → Tauri IPC → garden-tauri → garden-core → garden-db
                                              ↓
                                        Domain Logic
                                              ↓
                                        Repository Trait
                                              ↓
                                        SQLite Adapter
```

### Key Patterns

**FieldUpdate<T>** — 3-state partial updates:

```typescript
// Keep existing value (omit the field)
const update = {};

// Set to new value
const update = { notes: { action: "set", value: "New notes" } };

// Clear value (set to null)
const update = { notes: { action: "clear" } };
```

**Repository Traits** — Defined in garden-core, implemented in garden-db:

```rust
// Port (garden-core)
pub trait BlockRepository: Send + Sync {
    async fn create(&self, block: NewBlock) -> Result<Block>;
}

// Adapter (garden-db)
impl BlockRepository for SqliteBlockRepository { ... }
```

---

## Development Workflow

### Which Command to Use

| Task                | Command               |
| ------------------- | --------------------- |
| Run desktop app     | `just dev-desktop`    |
| Run component demo  | `just dev-components` |
| Run all dev servers | `just dev`            |
| Build everything    | `just build`          |
| Run all checks      | `just check`          |
| Run Rust tests      | `just test-rust`      |
| Run TS tests        | `just test-ts`        |
| Generate types      | `just gen-types`      |
| Format code         | `just fmt`            |
| Lint code           | `just lint`           |

### Type Generation Workflow

When you modify Rust structs with `#[derive(TS)]`:

```bash
# 1. Edit Rust types in garden-core/src/models/
# 2. Regenerate TypeScript types
just gen-types

# 3. Types appear in packages/types/src/generated/
# Never edit generated files manually!
```

### Adding a New Tauri Command

1. Add method to service in `garden-core/src/services/`
2. Create command in `garden-tauri/src/commands/`
3. Register in `garden-tauri/src/lib.rs`
4. Run `just gen-types`
5. Use from frontend via `@garden/types` API

### Adding a New Component

1. Create `packages/components/src/components/garden-{name}.ts`
2. Extend `GardenElement` base class
3. Export from `packages/components/src/index.ts`
4. Add demo in `packages/components/demo/index.html`

---

## Code Style

### Rust

- Format with `rustfmt` (automatic via `just fmt`)
- Lint with `clippy` (automatic via `just lint`)
- Use `#[instrument]` for tracing on public methods
- Document public APIs with `///` doc comments

```rust
/// Creates a new block in the given channel.
///
/// # Arguments
/// * `new_block` - The block to create
///
/// # Errors
/// Returns `DomainError::NotFound` if the channel doesn't exist.
#[instrument(skip(self))]
pub async fn create_block(&self, new_block: NewBlock) -> Result<Block> {
    // ...
}
```

### TypeScript

- Format with Prettier (automatic via `just fmt`)
- Lint with ESLint (automatic via `just lint`)
- Use TypeScript strict mode
- Prefer `const` over `let`

### Commit Messages

Use conventional commit format:

```
<type>: <description>

[optional body]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code change that neither fixes nor adds
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:

```
feat: Add video duration extraction
fix: Handle UTF-8 boundaries in display_title
docs: Add component library documentation
```

---

## Testing

### Running Tests

```bash
# All tests
just test

# Rust only
just test-rust

# TypeScript only
just test-ts

# Specific Rust crate
cargo test -p garden-core

# Specific component
cd packages/components && pnpm test -- --grep "garden-button"
```

### Writing Tests

**Rust:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_block() {
        let service = setup_test_service().await;
        let block = service.create_block(new_block).await.unwrap();
        assert_eq!(block.title, "Test");
    }
}
```

**TypeScript (components):**

```typescript
import { fixture, html, expect } from "@open-wc/testing";
import "../src/components/garden-button.js";

describe("garden-button", () => {
  it("renders with default props", async () => {
    const el = await fixture(html`<garden-button>Click</garden-button>`);
    expect(el.textContent).to.equal("Click");
  });
});
```

---

## Pull Request Process

### Before Submitting

1. **Run all checks:**

   ```bash
   just check
   ```

2. **Ensure tests pass:**

   ```bash
   just test
   ```

3. **Format code:**
   ```bash
   just fmt
   ```

### PR Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Update documentation if needed
- Reference related issues

### Review Process

1. Open a PR against `main`
2. CI will run `just check`
3. Request review from maintainers
4. Address feedback
5. Squash and merge when approved

---

## Questions?

- Check existing [issues](https://github.com/yourusername/garden/issues)
- Open a new issue for bugs or feature requests
- See [Architecture docs](docs/ARCHITECTURE.md) for design decisions
