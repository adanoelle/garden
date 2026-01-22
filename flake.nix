{
  description = "Garden - A personal curation system with PC-98 aesthetics";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        # Rust toolchain with useful extensions
        # Pinned to specific version for reproducibility
        # To update: change version and run `nix flake update`
        # Available versions: nix flake show github:oxalica/rust-overlay
        rustToolchain = pkgs.rust-bin.stable."1.92.0".default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        # Platform-specific Tauri dependencies
        # New SDK pattern (2025+): Use apple-sdk package instead of individual frameworks
        # See: https://discourse.nixos.org/t/the-darwin-sdks-have-been-updated/55295
        darwinDeps = with pkgs; lib.optionals stdenv.isDarwin [
          apple-sdk_14              # Includes WebKit, AppKit, Security, etc.
          libiconv                  # Common dependency for Rust on Darwin
        ];

        linuxDeps = with pkgs; lib.optionals stdenv.isLinux [
          webkitgtk_4_1
          gtk3
          libsoup_3
          glib
          glib-networking
          openssl
          pkg-config
          libappindicator-gtk3
          librsvg
        ];

      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js ecosystem
            nodejs_20
            pnpm

            # Rust toolchain
            rustToolchain
            cargo-watch      # File watcher for Rust development

            # Build orchestration
            just             # Task runner (our single entry point)
            turbo            # TypeScript build orchestration

            # Database tools
            sqlite           # SQLite CLI for database inspection
            # Note: sqlx-cli should be installed via: cargo install sqlx-cli

            # Build essentials
            pkg-config

            # Dev tools
            figlet
            git
            gh               # GitHub CLI for CI/PR management
            direnv           # Automatic environment loading
          ] ++ darwinDeps ++ linuxDeps;

          # Environment variables for Tauri on Linux
          shellHook = ''
            ${pkgs.lib.optionalString pkgs.stdenv.isLinux ''
              export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
            ''}

            echo ""
            figlet -f slant "garden"
            echo ""
            echo "  Node:    $(node --version)"
            echo "  pnpm:    $(pnpm --version)"
            echo "  Rust:    $(rustc --version | cut -d' ' -f2)"
            echo "  SQLite:  $(sqlite3 --version | cut -d' ' -f1)"
            echo ""
            echo "  Run 'just' to see available commands"
            echo ""
          '';
        };
      }
    );
}
