# Garden - Unified Task Runner
# ══════════════════════════════════════════════════════════════════════════════
#
# This is the SINGLE ENTRY POINT for all development tasks.
# Always use `just <command>` rather than invoking tools directly.
#
# Quick reference:
#   just           - Show all commands
#   just doctor    - Check your environment
#   just setup     - Install all dependencies
#   just dev       - Start development mode
#   just check     - Run all checks (CI equivalent)
#   just build     - Build everything
#
# Run `just --list` to see all available commands
# ══════════════════════════════════════════════════════════════════════════════

# Directory containing this justfile (workspace root)
workspace := justfile_directory()

# Default recipe: show help
default:
    @just --list

# ─────────────────────────────────────────────────────────────────────────────
# Environment & Setup
# ─────────────────────────────────────────────────────────────────────────────

# Check that all required tools are available
doctor:
    #!/usr/bin/env bash
    set -euo pipefail

    echo "🩺 Checking development environment..."
    echo ""

    errors=0

    check_required() {
        if command -v "$1" &> /dev/null; then
            version=$($2 2>&1 | head -1)
            echo "  ✓ $1: $version"
        else
            echo "  ✗ $1: NOT FOUND"
            errors=$((errors + 1))
        fi
    }

    check_optional() {
        if command -v "$1" &> /dev/null; then
            # Wrap in subshell to catch crashes (e.g., turbo can SIGABRT in CI)
            if version=$($2 2>&1 | head -1); then
                echo "  ✓ $1: $version"
            else
                echo "  ○ $1: installed but version check failed"
            fi
        else
            echo "  ○ $1: not installed (optional)"
        fi
    }

    echo "Required tools:"
    check_required "node" "node --version"
    check_required "pnpm" "pnpm --version"
    check_required "cargo" "cargo --version"
    check_required "rustc" "rustc --version"
    check_required "just" "just --version"

    echo ""
    echo "Optional tools:"
    check_optional "cargo-watch" "cargo watch --version"
    check_optional "turbo" "turbo --version"

    echo ""
    if [ $errors -gt 0 ]; then
        echo "❌ $errors required tool(s) missing!"
        echo ""
        echo "To fix: Enter the Nix dev shell with 'nix develop'"
        exit 1
    else
        echo "✅ All required tools available!"
    fi

# Install all dependencies (run after cloning or updating)
setup: setup-hooks
    @echo "📦 Installing dependencies..."
    pnpm install
    @echo ""
    @echo "✅ Setup complete! Run 'just doctor' to verify environment."

# Configure git to use project hooks
setup-hooks:
    @echo "🪝 Setting up git hooks..."
    git config core.hooksPath .githooks
    @echo "  ✓ Git hooks configured"

# ─────────────────────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────────────────────

# Run everything in development mode
dev:
    @echo "🚀 Starting development servers..."
    @just dev-rust &
    @just dev-ts

# Rust development (watch + check)
dev-rust:
    cargo watch -x check -x clippy

# TypeScript development (all packages via turbo)
dev-ts:
    pnpm turbo dev

# Run component library demo
dev-components:
    pnpm turbo dev --filter=@garden/components

# Run desktop app in development
dev-desktop:
    pnpm turbo build --filter=@garden/views
    cd apps/desktop && pnpm tauri dev

# Run web app in development
dev-web:
    pnpm turbo dev --filter=@garden/web

# ─────────────────────────────────────────────────────────────────────────────
# Building
# ─────────────────────────────────────────────────────────────────────────────

# Build all TypeScript packages (Turbo handles dependency order)
build-ts:
    pnpm turbo build

# Build only Rust crates
build-rust:
    cargo build --release

# Build everything (Rust + TypeScript)
build: build-rust build-ts
    @echo "✅ Full build complete!"

# Build desktop app for distribution (full release with all bundles)
build-desktop:
    pnpm turbo build --filter=@garden/views
    cd apps/desktop && pnpm tauri build

# Build production .app only (fast, skips DMG for local testing)
build-app:
    pnpm turbo build --filter=@garden/views
    cd apps/desktop && pnpm tauri build --bundles app
    @echo "✅ Built: target/release/bundle/macos/Garden.app"

# Build and open the production app for testing
run-prod: build-app
    open target/release/bundle/macos/Garden.app

# ─────────────────────────────────────────────────────────────────────────────
# Quality Checks
# ─────────────────────────────────────────────────────────────────────────────

# Type check all TypeScript (Turbo handles dependency order)
typecheck:
    pnpm turbo typecheck

# Check Rust only
check-rust:
    cargo check
    cargo clippy -- -D warnings

# Run ALL checks (equivalent to CI) - use this before committing!
check: check-rust typecheck lint-ts test
    @echo ""
    @echo "════════════════════════════════════════"
    @echo "✅ All checks passed!"
    @echo "════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────────────
# Type Generation (Rust → TypeScript)
# ─────────────────────────────────────────────────────────────────────────────

# Generate TypeScript types from Rust structs
gen-types:
    @echo "🔄 Generating TypeScript types from Rust..."
    TS_RS_EXPORT_DIR="{{ workspace }}/packages/types/src/generated" cargo build --package garden-core --bin export-types
    TS_RS_EXPORT_DIR="{{ workspace }}/packages/types/src/generated" cargo run --package garden-core --bin export-types
    @echo "📝 Formatting generated types..."
    pnpm --filter @garden/types run format 2>/dev/null || true
    @echo "✅ Types generated!"

# Generate types and rebuild the full TypeScript chain
gen-types-full: gen-types build-ts
    @echo "✅ Types regenerated and all packages rebuilt!"

# ─────────────────────────────────────────────────────────────────────────────
# Testing
# ─────────────────────────────────────────────────────────────────────────────

# Run all tests
test: test-rust test-ts
    @echo "✅ All tests passed!"

# Run Rust tests only
test-rust:
    cargo test

# Run TypeScript tests only (via turbo)
test-ts:
    pnpm turbo test

# ─────────────────────────────────────────────────────────────────────────────
# Code Quality
# ─────────────────────────────────────────────────────────────────────────────

# Format all code
fmt: fmt-rust fmt-ts
    @echo "✅ All code formatted!"

# Format Rust only
fmt-rust:
    cargo fmt

# Format TypeScript only
fmt-ts:
    pnpm turbo format 2>/dev/null || pnpm format

# Lint everything
lint: lint-rust lint-ts
    @echo "✅ All linting passed!"

# Lint Rust only
lint-rust:
    cargo clippy -- -D warnings

# Lint TypeScript only
lint-ts:
    pnpm turbo lint

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────

# Reset database (delete and recreate)
db-reset:
    @echo "🗄️ Resetting database..."
    rm -f ~/.local/share/com.garden.app/garden.db 2>/dev/null || true
    rm -f ~/Library/Application\ Support/com.garden.app/garden.db 2>/dev/null || true
    @echo "✅ Database reset! It will be recreated on next app launch."

# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

# Clean all build artifacts
clean:
    @echo "🧹 Cleaning build artifacts..."
    cargo clean
    pnpm turbo clean 2>/dev/null || true
    rm -rf node_modules/.cache
    rm -rf packages/*/dist
    rm -rf apps/*/dist
    @echo "✅ Clean complete!"

# Update all dependencies
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
    #!/usr/bin/env bash
    set -euo pipefail
    echo "📝 Creating ADR: {{title}}"
    num=$(ls docs/adr/*.md 2>/dev/null | grep -v template | wc -l | tr -d ' ')
    next=$((num + 1))
    padded=$(printf "%03d" $next)
    slug=$(echo "{{title}}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    cp docs/adr/template.md "docs/adr/${padded}-${slug}.md"
    echo "✅ Created docs/adr/${padded}-${slug}.md"

# ─────────────────────────────────────────────────────────────────────────────
# CI Simulation
# ─────────────────────────────────────────────────────────────────────────────

# Run the full CI pipeline locally (use before pushing!)
# CI needs: pnpm install first, then build TS (creates dist/), then Rust checks
ci: doctor
    pnpm install
    pnpm exec playwright install chromium
    just build-ts
    just check-rust
    just gen-types
    just typecheck
    just test
    @echo ""
    @echo "════════════════════════════════════════════════════════════════════"
    @echo "✅ CI simulation complete! Safe to push."
    @echo "════════════════════════════════════════════════════════════════════"
