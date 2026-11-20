# Changelog

All notable changes to Garden will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Inbox folder: files dropped into `~/garden` are imported into an
  "Inbox" channel. A PDF becomes one image block per page. Originals move
  to `~/garden/imported`.
- Nix package for the desktop app (`nix run github:adanoelle/garden`).

## [0.1.0] - 2026-01-23

### Added

- Initial release of Garden desktop app
- Core domain models: Blocks, Channels, Connections
- SQLite storage with WAL mode for performance
- Tauri 2.0 desktop integration with native performance
- Lit web component library with PC-98 inspired design
- Type-safe Rust to TypeScript pipeline via ts-rs
- Media import support for images, audio, and video
- Channel organization and navigation
- Block metadata and notes editing
- Waveform visualization for audio blocks
- Keyboard navigation and accessibility support
- Nix flake for reproducible development environment
- Comprehensive documentation and architecture guides
