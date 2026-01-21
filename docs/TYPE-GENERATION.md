# Type Generation (Rust → TypeScript)

Garden uses [ts-rs](https://github.com/Aleph-Alpha/ts-rs) to generate TypeScript
types from Rust structs. This ensures type safety across the Rust backend and
TypeScript frontend.

## How It Works

1. Rust structs are decorated with `#[derive(TS)]`
2. Running `just gen-types` exports TypeScript interfaces
3. Types appear in `packages/types/src/generated/`
4. Frontend imports types from `@garden/types`

```
Rust Struct          ts-rs            TypeScript Interface
┌─────────────┐    ────────►    ┌─────────────────────┐
│ #[derive(TS)]│                │ export interface    │
│ struct Block │                │ Block { ... }       │
└─────────────┘                 └─────────────────────┘
```

## Quick Reference

```bash
# Regenerate all types
just gen-types

# Types are output to:
# packages/types/src/generated/
```

## Adding a New Type

### Step 1: Define the Rust Struct

In `crates/garden-core/src/models/`:

```rust
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A new model that will be shared with TypeScript.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
pub struct MyModel {
    pub id: String,
    pub name: String,
    pub count: u32,
    pub optional_field: Option<String>,
}
```

### Step 2: Export from the Module

In `crates/garden-core/src/models/mod.rs`:

```rust
mod my_model;
pub use my_model::MyModel;
```

### Step 3: Generate Types

```bash
just gen-types
```

### Step 4: Use in TypeScript

```typescript
import type { MyModel } from "@garden/types";

const model: MyModel = {
  id: "123",
  name: "Example",
  count: 42,
  optional_field: null, // or undefined
};
```

## Type Mapping

| Rust Type           | TypeScript Type |
| ------------------- | --------------- |
| `String`            | `string`        |
| `u32`, `i32`, `f64` | `number`        |
| `bool`              | `boolean`       |
| `Option<T>`         | `T \| null`     |
| `Vec<T>`            | `T[]`           |
| `HashMap<K, V>`     | `Record<K, V>`  |
| `()`                | `null`          |
| Enums               | Tagged unions   |

### Enum Example

```rust
#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum BlockContent {
    Text { body: String },
    Link { url: String, title: Option<String> },
    Image { file_path: String, width: Option<u32> },
}
```

Generates:

```typescript
export type BlockContent =
  | { kind: "text"; body: string }
  | { kind: "link"; url: string; title: string | null }
  | { kind: "image"; file_path: string; width: number | null };
```

## Configuration

### ts-rs Attributes

| Attribute                  | Purpose                           |
| -------------------------- | --------------------------------- |
| `#[ts(export)]`            | Export this type to TypeScript    |
| `#[ts(export_to = "...")]` | Custom output path                |
| `#[ts(rename = "...")]`    | Rename the type                   |
| `#[ts(optional)]`          | Make field optional (vs nullable) |
| `#[ts(skip)]`              | Exclude field from export         |

### Serde Compatibility

ts-rs respects most serde attributes:

```rust
#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]  // field_name → fieldName
pub struct Example {
    #[serde(skip)]           // Excluded from both serde and ts-rs
    internal_field: String,

    #[serde(rename = "ID")]  // Renamed in JSON and TypeScript
    id: String,
}
```

## Workflow Integration

### Build Command

The `just gen-types` command:

```bash
# 1. Build the export binary
cargo build -p garden-core --bin export-types

# 2. Run type export
cargo run -p garden-core --bin export-types

# 3. Format generated files
pnpm --filter @garden/types format
```

### CI Integration

Type generation runs as part of `just check`:

```bash
just check  # Includes type generation and validation
```

## Troubleshooting

### Types Not Updating

1. Ensure `#[ts(export)]` is present
2. Check `export_to` path is correct
3. Run `just gen-types` (not just `cargo build`)
4. Clear cargo cache if needed: `cargo clean -p garden-core`

### Compilation Errors

If types fail to compile in TypeScript:

1. Check enum tag configuration (`#[serde(tag = "kind")]`)
2. Ensure all nested types also have `#[derive(TS)]`
3. Check for circular references

### Missing Types

If a type isn't exported:

```rust
// Ensure ALL derives are present
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../../packages/types/src/generated/")]
pub struct MyType { ... }
```

### Path Issues

The `export_to` path is relative to the Cargo.toml location:

```
crates/garden-core/Cargo.toml
                   ↓
                   ../../../packages/types/src/generated/
                   ↓
packages/types/src/generated/
```

## Generated Files

**Never edit files in `packages/types/src/generated/` manually!**

These files are overwritten on each `just gen-types` run.

Current generated types:

- `Block.ts` — Block model
- `BlockContent.ts` — Content type variants
- `BlockUpdate.ts` — Partial update type
- `Channel.ts` — Channel model
- `Connection.ts` — Block-channel connection
- `TauriError.ts` — Error response type
- `MediaImportResult.ts` — Media import response
- `index.ts` — Re-exports all types

## Best Practices

1. **Keep types in garden-core** — Single source of truth
2. **Use descriptive field names** — They become API contracts
3. **Document with `///` comments** — ts-rs doesn't export docs (yet)
4. **Test serialization** — Ensure Rust and TS agree on format
5. **Avoid breaking changes** — Add fields as optional when possible

## Further Reading

- [ts-rs documentation](https://docs.rs/ts-rs)
- [Serde attributes](https://serde.rs/attributes.html)
- [Garden Architecture](ARCHITECTURE.md)
