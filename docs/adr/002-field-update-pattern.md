# ADR-002: FieldUpdate Pattern for Partial Updates

## Status

Accepted

## Date

2025-01-15

## Context

When updating domain entities (Block, Channel), we need to support partial updates where:
- Some fields should remain unchanged
- Some fields should be set to new values
- Some fields should be cleared (set to null)

### The Problem with `Option<T>`

A naive approach uses `Option<T>` for update fields:

```rust
struct BlockUpdate {
    notes: Option<String>,  // None = don't change? Or set to null?
}
```

This is ambiguous:
- `None` could mean "keep existing value"
- `None` could mean "set to null"

### The Problem with `Option<Option<T>>`

Some codebases use nested options:

```rust
struct BlockUpdate {
    notes: Option<Option<String>>,
    // None = keep, Some(None) = clear, Some(Some(v)) = set
}
```

This is:
- Confusing to read and use
- Error-prone (easy to use wrong variant)
- Awkward in TypeScript (`{ notes: { inner: null } }`)

## Decision

Use an explicit `FieldUpdate<T>` enum with three variants:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "action", content = "value", rename_all = "snake_case")]
pub enum FieldUpdate<T> {
    Keep,      // Don't change this field
    Clear,     // Set to None/null
    Set(T),    // Set to new value
}
```

### Usage in Rust

```rust
pub struct BlockUpdate {
    pub notes: FieldUpdate<String>,
    pub source_url: FieldUpdate<String>,
}

// Keep everything
let update = BlockUpdate::default();

// Set notes, clear source_url
let update = BlockUpdate {
    notes: FieldUpdate::Set("New notes".into()),
    source_url: FieldUpdate::Clear,
    ..Default::default()
};
```

### Usage in TypeScript

```typescript
interface BlockUpdate {
  notes?: { action: "keep" } | { action: "clear" } | { action: "set"; value: string };
}

// Keep everything (omit field)
const update: BlockUpdate = {};

// Set notes
const update: BlockUpdate = {
  notes: { action: "set", value: "New notes" },
};

// Clear source_url
const update: BlockUpdate = {
  source_url: { action: "clear" },
};
```

### Serialization

The `#[serde(tag = "action", content = "value")]` attribute produces:

```json
{ "action": "keep" }
{ "action": "clear" }
{ "action": "set", "value": "New notes" }
```

## Consequences

### Positive

- **Explicit intent**: Three distinct states with clear names
- **Type-safe**: Compiler enforces correct usage
- **Self-documenting**: Code reads naturally (`FieldUpdate::Clear`)
- **JSON-friendly**: Clean serialization for TypeScript consumption
- **Default support**: `FieldUpdate::Keep` is the default, so partial updates are easy

### Negative

- **Verbosity**: More code than `Option<Option<T>>`
- **Learning curve**: Contributors must understand the pattern
- **Bundle size**: Slightly more JSON over the wire

### Neutral

- Works seamlessly with `ts-rs` for type generation
- Easily extended if new states needed (e.g., `Append` for arrays)

## Implementation Notes

```rust
impl<T> Default for FieldUpdate<T> {
    fn default() -> Self {
        Self::Keep
    }
}

impl<T> FieldUpdate<T> {
    /// Apply this update to an existing optional value
    pub fn apply(self, current: Option<T>) -> Option<T> {
        match self {
            Self::Keep => current,
            Self::Clear => None,
            Self::Set(v) => Some(v),
        }
    }
}
```

## References

- [Rust API Guidelines: Builders](https://rust-lang.github.io/api-guidelines/type-safety.html)
- Similar patterns: GraphQL's `null` vs `undefined`, Kubernetes strategic merge patch
