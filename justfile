# Garden - Unified Task Runner
# Run `just --list` to see all available commands

# Default recipe: show help
default:
    @just --list

# ─────────────────────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────────────────────

# Run everything in development mode
dev:
    @echo "Starting development servers..."
    @just dev-rust &
    @just dev-ts

# Rust development (watch + check)
dev-rust:
    cargo watch -x check -x clippy

# TypeScript development (all packages)
dev-ts:
    pnpm turbo run dev

# Run component library demo
dev-components:
    pnpm --filter @garden/components run dev

# Run desktop app in development
dev-desktop:
    cd apps/desktop && pnpm tauri dev

# Run web app in development
dev-web:
    pnpm --filter @garden/web run dev

# ─────────────────────────────────────────────────────────────────────────────
# Building
# ─────────────────────────────────────────────────────────────────────────────

# Build everything
build:
    cargo build --release
    pnpm turbo run build

# Build only Rust crates
build-rust:
    cargo build --release

# Build only TypeScript packages
build-ts:
    pnpm turbo run build

# Build desktop app for distribution
build-desktop:
    cd apps/desktop && pnpm tauri build

# ─────────────────────────────────────────────────────────────────────────────
# Type Generation
# ─────────────────────────────────────────────────────────────────────────────

# Generate TypeScript types from Rust structs
gen-types:
    @echo "Generating TypeScript types from Rust..."
    cargo test --package garden-core export_typescript_types -- --ignored
    @echo "Formatting generated types..."
    pnpm --filter @garden/types run format 2>/dev/null || true
    @echo "Done! Types exported to packages/types/src/generated/"

# ─────────────────────────────────────────────────────────────────────────────
# Testing
# ─────────────────────────────────────────────────────────────────────────────

# Run all tests
test:
    cargo test
    pnpm turbo run test

# Run Rust tests only
test-rust:
    cargo test

# Run TypeScript tests only
test-ts:
    pnpm turbo run test

# Run component tests with coverage
test-components:
    pnpm --filter @garden/components run test:coverage

# ─────────────────────────────────────────────────────────────────────────────
# Code Quality
# ─────────────────────────────────────────────────────────────────────────────

# Type check everything
check:
    cargo check
    cargo clippy -- -D warnings
    pnpm turbo run typecheck

# Check Rust only
check-rust:
    cargo check
    cargo clippy -- -D warnings

# Check TypeScript only
check-ts:
    pnpm turbo run typecheck

# Format all code
fmt:
    cargo fmt
    pnpm turbo run format

# Format Rust only
fmt-rust:
    cargo fmt

# Format TypeScript only
fmt-ts:
    pnpm turbo run format

# Lint everything
lint:
    cargo clippy -- -D warnings
    pnpm turbo run lint

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────

# Run database migrations
db-migrate:
    @echo "Running migrations..."
    cargo run --package garden-db --bin migrate

# Create a new migration
db-new-migration name:
    @echo "Creating migration: {{name}}"
    sqlx migrate add -r {{name}}

# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

# Clean all build artifacts
clean:
    cargo clean
    pnpm turbo run clean
    rm -rf node_modules/.cache

# Install all dependencies
install:
    pnpm install
    @echo "Rust dependencies managed via Cargo.toml"

# Update dependencies
update:
    cargo update
    pnpm update

# Show dependency tree for a Rust crate
deps crate:
    cargo tree -p {{crate}}

# ─────────────────────────────────────────────────────────────────────────────
# Documentation
# ─────────────────────────────────────────────────────────────────────────────

# Generate Rust documentation
docs:
    cargo doc --no-deps --open

# Create a new ADR
adr title:
    @echo "Creating ADR: {{title}}"
    @num=$(ls docs/adr/*.md 2>/dev/null | grep -v template | wc -l | tr -d ' '); \
    next=$((num + 1)); \
    padded=$(printf "%03d" $next); \
    slug=$(echo "{{title}}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-'); \
    cp docs/adr/template.md "docs/adr/${padded}-${slug}.md"; \
    echo "Created docs/adr/${padded}-${slug}.md"
