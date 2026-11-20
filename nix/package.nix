# The Garden desktop app as a Nix package.
#
# Two fixed-output hashes pin the dependencies: Cargo.lock covers the Rust
# side, and `pnpmDeps.hash` covers pnpm-lock.yaml. After changing
# pnpm-lock.yaml, set the hash to `lib.fakeHash`, build, and copy the hash
# Nix reports.
{
  lib,
  rustPlatform,
  cargo-tauri,
  fetchPnpmDeps,
  pnpmConfigHook,
  pnpm_10,
  nodejs_22,
  pkg-config,
  wrapGAppsHook3,
  glib-networking,
  gtk3,
  librsvg,
  libsoup_3,
  openssl,
  webkitgtk_4_1,
}:

rustPlatform.buildRustPackage (finalAttrs: {
  pname = "garden";
  version = "0.1.3";

  src = lib.cleanSource ../.;

  cargoLock.lockFile = ../Cargo.lock;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    pnpm = pnpm_10;
    fetcherVersion = 3;
    hash = "sha256-R8+VsY4MKqvtVNTsVqMncdIyyn25fpyh5AX2FKdWr/g=";
  };

  nativeBuildInputs = [
    cargo-tauri.hook
    nodejs_22
    pnpm_10
    pnpmConfigHook
    pkg-config
    wrapGAppsHook3
  ];

  buildInputs = [
    glib-networking
    gtk3
    librsvg
    libsoup_3
    openssl
    webkitgtk_4_1
  ];

  # `tauri build` runs from the app directory and builds the desktop
  # frontend itself; the workspace packages it imports are built first.
  buildAndTestSubdir = "apps/desktop";

  preBuild = ''
    pnpm --filter '@garden/desktop^...' build
  '';

  # The Rust tests run in CI; here they would only repeat that work.
  doCheck = false;

  meta = {
    description = "A personal curation system with PC-98 aesthetics";
    homepage = "https://github.com/adanoelle/garden";
    license = lib.licenses.unlicense;
    mainProgram = "garden-desktop";
    platforms = lib.platforms.linux;
  };
})
