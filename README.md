# Garden

A personal curation system with PC-98 inspired aesthetics.

## Overview

Garden is an Are.na-inspired content curation tool that combines:
- **Local-first architecture** via Tauri for private, offline-capable use
- **Web components** built with Lit for a consistent design system
- **Strudel integration** for generative audio patterns

## Structure

```
garden/
├── apps/
│   ├── web/           # Public website
│   └── desktop/       # Tauri desktop app
├── packages/
│   └── components/    # @garden/components design system
└── crates/
    └── garden-core/   # Shared Rust logic
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust (for Tauri)

### Setup

```bash
# Install dependencies
pnpm install

# Start development (all packages)
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Desktop App

```bash
# Development
cd apps/desktop
pnpm tauri:dev

# Build
pnpm tauri:build
```

## Design System

The component library (`@garden/components`) features:
- Two-color palette (Farrow & Ball inspired warm neutrals)
- Dither patterns for texture and state indication
- Commit Mono typography throughout
- Responsive density modes (full/minimal)

See `packages/components/demo/` for component examples.

## License

MIT
