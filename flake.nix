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
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        # Platform-specific Tauri dependencies
        darwinDeps = with pkgs; lib.optionals stdenv.isDarwin [
          darwin.apple_sdk.frameworks.WebKit
          darwin.apple_sdk.frameworks.AppKit
          darwin.apple_sdk.frameworks.Security
          darwin.apple_sdk.frameworks.CoreServices
          darwin.apple_sdk.frameworks.CoreFoundation
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

            # Build essentials
            pkg-config

            # Dev tools
            figlet
            git
          ] ++ darwinDeps ++ linuxDeps;

          # Environment variables for Tauri on Linux
          shellHook = ''
            ${pkgs.lib.optionalString pkgs.stdenv.isLinux ''
              export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
            ''}

            echo ""
            figlet -f slant "garden"
            echo ""
            echo "  Node:  $(node --version)"
            echo "  pnpm:  $(pnpm --version)"
            echo "  Rust:  $(rustc --version | cut -d' ' -f2)"
            echo ""
          '';
        };
      }
    );
}
