# Getting Started with Garden

This guide helps you get up and running with Garden, whether you're contributing to
the codebase or using the component library in your own project.

## Table of Contents

- [For Contributors](#for-contributors)
- [For Library Users](#for-library-users)

---

## For Contributors

### 15-Minute Setup

#### 1. Clone and Enter Dev Environment

```bash
git clone https://github.com/yourusername/garden.git
cd garden

# Using Nix (recommended)
nix develop

# Or manually ensure you have: Node.js 20+, pnpm 9+, Rust 1.75+, just
```

#### 2. Install Dependencies

```bash
just setup
```

#### 3. Verify Environment

```bash
just doctor
```

You should see all green checkmarks:

```
🩺 Checking development environment...

Required tools:
  ✓ node: v20.x.x
  ✓ pnpm: 9.x.x
  ✓ cargo: cargo 1.7x.x
  ✓ rustc: rustc 1.7x.x
  ✓ just: just 1.x.x

✅ All required tools available!
```

#### 4. Run the Desktop App

```bash
just dev-desktop
```

This builds the TypeScript packages and starts the Tauri development server. The app
will open automatically.

#### 5. Make Your First Change

Let's make a small change to verify everything works:

```bash
# Open the component demo
just dev-components
```

Visit `http://localhost:5173/demo/` in your browser. Try editing a component in
`packages/components/src/components/` and watch it hot-reload.

### Common Development Tasks

| What you want to do               | Command               |
| --------------------------------- | --------------------- |
| Run desktop app                   | `just dev-desktop`    |
| Run component demo                | `just dev-components` |
| Run all checks (before commit)    | `just check`          |
| Run tests                         | `just test`           |
| Format code                       | `just fmt`            |
| Generate types after Rust changes | `just gen-types`      |
| Reset database                    | `just db-reset`       |

### Project Layout Quick Reference

```
garden/
├── apps/desktop/          # Tauri app entry point
│   └── src/main.ts        # Frontend bootstrap
├── packages/
│   ├── components/        # UI components (edit these!)
│   │   ├── src/components/  # Individual components
│   │   └── demo/            # Component showcase
│   ├── types/             # Generated TypeScript types
│   └── views/             # Page compositions
└── crates/
    ├── garden-core/       # Domain logic
    │   └── src/models/    # Data models (Block, Channel, etc.)
    ├── garden-db/         # Database layer
    └── garden-tauri/      # IPC commands
```

### Next Steps

- Read [CONTRIBUTING.md](../CONTRIBUTING.md) for workflow details
- Explore [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Check [COMPONENT-LIBRARY.md](COMPONENT-LIBRARY.md) for design system

---

## For Library Users

### Using @garden/components in Your Project

The Garden component library can be used independently in any web project.

#### 1. Install the Package

```bash
# npm
npm install @garden/components

# pnpm
pnpm add @garden/components

# yarn
yarn add @garden/components
```

#### 2. Import the Styles

Add the design tokens to your HTML or import in your bundler:

```html
<!-- In your HTML -->
<link
  rel="stylesheet"
  href="node_modules/@garden/components/dist/styles/tokens.css"
/>
```

Or in your JavaScript/TypeScript:

```typescript
import "@garden/components/dist/styles/tokens.css";
```

#### 3. Use Components

```html
<!DOCTYPE html>
<html>
  <head>
    <link
      rel="stylesheet"
      href="node_modules/@garden/components/dist/styles/tokens.css"
    />
    <script type="module">
      import "@garden/components";
    </script>
  </head>
  <body>
    <garden-button variant="default" size="md"> Click me </garden-button>

    <garden-card clickable>
      <span slot="header">Card Title</span>
      <p>Card content goes here.</p>
    </garden-card>
  </body>
</html>
```

#### 4. Customize with CSS Variables

Override design tokens to customize the look:

```css
:root {
  /* Override colors */
  --garden-bg: #f5f5f5;
  --garden-fg: #333333;

  /* Override typography */
  --garden-font-mono: "Your Font", monospace;

  /* Override spacing */
  --garden-space-4: 20px;
}
```

### Available Components

| Component              | Description                       |
| ---------------------- | --------------------------------- |
| `<garden-button>`      | Primary button with variants      |
| `<garden-input>`       | Text input field                  |
| `<garden-card>`        | Content container                 |
| `<garden-modal>`       | Dialog overlay                    |
| `<garden-video-block>` | Video player with custom controls |
| `<garden-audio-block>` | Audio player                      |
| `<garden-image-block>` | Image display                     |

See [COMPONENT-LIBRARY.md](COMPONENT-LIBRARY.md) for full documentation.

### Theming

Garden supports light and dark modes via the `data-theme` attribute:

```html
<!-- Light mode (default) -->
<html data-theme="light">
  <!-- Dark mode -->
  <html data-theme="dark"></html>
</html>
```

Toggle programmatically:

```javascript
document.documentElement.dataset.theme =
  document.documentElement.dataset.theme === "dark" ? "light" : "dark";
```

### Framework Integration

#### React

```jsx
import "@garden/components";
import "@garden/components/dist/styles/tokens.css";

function App() {
  return (
    <garden-button variant="default" onClick={() => console.log("clicked")}>
      Click me
    </garden-button>
  );
}
```

#### Vue

```vue
<template>
  <garden-button variant="default" @click="handleClick"> Click me </garden-button>
</template>

<script setup>
import "@garden/components";
import "@garden/components/dist/styles/tokens.css";

const handleClick = () => console.log("clicked");
</script>
```

#### Svelte

```svelte
<script>
  import '@garden/components';
  import '@garden/components/dist/styles/tokens.css';
</script>

<garden-button variant="default" on:click={() => console.log('clicked')}>
  Click me
</garden-button>
```

### TypeScript Support

Type definitions are included. For custom element types in JSX:

```typescript
// types.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    "garden-button": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        variant?: "default" | "ghost" | "solid";
        size?: "sm" | "md" | "lg";
        disabled?: boolean;
      },
      HTMLElement
    >;
  }
}
```

### Next Steps

- See [COMPONENT-LIBRARY.md](COMPONENT-LIBRARY.md) for full component API
- Check the demo at `packages/components/demo/index.html` for examples
- Report issues on GitHub
