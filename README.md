# Garden

[![CI](https://github.com/adanoelle/garden/actions/workflows/ci.yml/badge.svg)](https://github.com/adanoelle/garden/actions/workflows/ci.yml)

A personal content curation system with PC-98 inspired aesthetics.


https://github.com/user-attachments/assets/317c24bb-9b97-4d52-9ff9-053e63cf3c0a


<video src="https://github.com/user-attachments/assets/317c24bb-9b97-4d52-9ff9-053e63cf3c0a" controls autoplay loop muted width="100%"></video>

Garden is an [Are.na](https://are.na)-inspired tool for collecting and organizing
content—images, videos, audio, links, and text—into channels. Built with a
local-first architecture for privacy and offline use.

## Features

- **Local-first**: Your data stays on your machine. No accounts, no cloud sync (yet).
- **Media support**: Import images, videos, and audio from files or URLs
- **Channels**: Organize content into themed collections
- **Connections**: Link blocks across multiple channels
- **PC-98 aesthetics**: Warm neutral palette, dither patterns, Commit Mono typography

## Quick Start

### Using Nix (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/garden.git
cd garden

# Enter the development environment
nix develop

# Install dependencies and run
just setup
just dev-desktop
```

### Manual Setup

**Prerequisites**: Node.js 20+, pnpm 9+, Rust 1.75+

```bash
# Install dependencies
pnpm install

# Run the desktop app
just dev-desktop
```

### Verify Your Environment

```bash
just doctor
```

## Documentation

- **[Getting Started](docs/GETTING-STARTED.md)** — First-time setup and usage guide
- **[Component Library](docs/COMPONENT-LIBRARY.md)** — Using @garden/components
- **[Architecture](docs/ARCHITECTURE.md)** — System design and data flow
- **[Contributing](CONTRIBUTING.md)** — Development workflow and guidelines

## Project Structure

```
garden/
├── apps/
│   ├── desktop/           # Tauri desktop application
│   └── web/               # Web application (public site)
├── packages/
│   ├── components/        # @garden/components (Lit web components)
│   ├── types/             # @garden/types (generated from Rust)
│   └── views/             # @garden/views (page compositions)
├── crates/
│   ├── garden-core/       # Domain logic (models, services, ports)
│   ├── garden-db/         # SQLite storage adapter
│   └── garden-tauri/      # Tauri IPC commands
└── docs/                  # Documentation
```

## Common Commands

| Command            | Description                             |
| ------------------ | --------------------------------------- |
| `just dev-desktop` | Run desktop app in development mode     |
| `just dev`         | Run all development servers             |
| `just check`       | Run all lints and tests (CI equivalent) |
| `just build`       | Build all packages                      |
| `just gen-types`   | Regenerate TypeScript types from Rust   |
| `just doctor`      | Verify development environment          |

See `just --list` for all available commands.

## Architecture

Garden uses a **hexagonal architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Desktop App (Tauri)                      │
├─────────────────────────────────────────────────────────────┤
│  @garden/views    │  @garden/components  │  @garden/types   │
├───────────────────┴──────────────────────┴──────────────────┤
│                    garden-tauri (IPC)                        │
├─────────────────────────────────────────────────────────────┤
│                    garden-core (Domain)                      │
│              Models │ Services │ Ports                       │
├─────────────────────────────────────────────────────────────┤
│                    garden-db (Storage)                       │
│                       SQLite                                 │
└─────────────────────────────────────────────────────────────┘
```

- **garden-core**: Pure domain logic with no I/O dependencies
- **garden-db**: Implements repository traits with SQLite
- **garden-tauri**: Adapts domain to Tauri IPC commands
- **@garden/types**: TypeScript types generated from Rust via ts-rs

## Design System

The component library features a distinctive visual language:

- **Colors**: Two-color palette inspired by Farrow & Ball (warm neutrals)
- **Texture**: Dither patterns (25%, 50%, 75% density) for hover states
- **Typography**: Commit Mono throughout, hierarchy via size and weight
- **Interaction**: Rest → Dither hover → Solid active states

See the [Component Library docs](docs/COMPONENT-LIBRARY.md) for usage details.

## License

MIT
