# Garden Component Library

`@garden/components` is a Lit-based web component library with PC-98 inspired
aesthetics and a Farrow & Ball color palette.

## Table of Contents

- [Installation](#installation)
- [Design System](#design-system)
- [Components](#components)
- [Theming](#theming)
- [Accessibility](#accessibility)

---

## Installation

```bash
npm install @garden/components
```

Import the design tokens and components:

```typescript
// Import all components
import "@garden/components";

// Import styles
import "@garden/components/dist/styles/tokens.css";

// Or import specific components
import "@garden/components/garden-button";
```

---

## Design System

### Philosophy

Garden's design language draws from two influences:

- **Are.na's minimalism**: Content-forward, no visual noise
- **PC-98's warmth**: Constraint as creative material, dither as texture

**Core principles:**

- Two colors only (foreground and background)
- Hierarchy through size and weight, not color
- Dither patterns for texture and state indication
- No gradients, minimal rounded corners, no shadows

### Color Palette

Inspired by Farrow & Ball paint colors:

| Token                | Light Mode              | Dark Mode | Usage                |
| -------------------- | ----------------------- | --------- | -------------------- |
| `--garden-bg`        | #f4f2e9 (Pointing)      | #2d3748   | Primary background   |
| `--garden-bg-subtle` | #f2efdf (Wimborne)      | #374151   | Secondary background |
| `--garden-bg-muted`  | #e7e1d3 (Skimming)      | #8b8074   | Muted background     |
| `--garden-fg`        | #2d3748 (Railings)      | #f4f2e9   | Primary text         |
| `--garden-fg-muted`  | #8b8074 (Mole's Breath) | #b8ad98   | Secondary text       |
| `--garden-accent`    | #4a5568 (Hague)         | #93c5fd   | Accent/focus         |

### Dither Patterns

Three density levels for texture effects:

| Token                | Density | Usage                       |
| -------------------- | ------- | --------------------------- |
| `--garden-dither-25` | 25%     | Subtle texture, backgrounds |
| `--garden-dither-50` | 50%     | Default hover state         |
| `--garden-dither-75` | 75%     | Heavy texture, emphasis     |

### Typography

All text uses **Commit Mono** with a typographic scale:

| Token                | Size | Usage            |
| -------------------- | ---- | ---------------- |
| `--garden-text-xs`   | 12px | Labels, captions |
| `--garden-text-sm`   | 14px | Secondary text   |
| `--garden-text-base` | 16px | Body text        |
| `--garden-text-lg`   | 18px | Subheadings      |
| `--garden-text-xl`   | 20px | Headings         |
| `--garden-text-2xl`  | 24px | Large headings   |
| `--garden-text-3xl`  | 32px | Display text     |

### Spacing

4px base unit system:

| Token              | Value   | Pixels |
| ------------------ | ------- | ------ |
| `--garden-space-1` | 0.25rem | 4px    |
| `--garden-space-2` | 0.5rem  | 8px    |
| `--garden-space-3` | 0.75rem | 12px   |
| `--garden-space-4` | 1rem    | 16px   |
| `--garden-space-6` | 1.5rem  | 24px   |
| `--garden-space-8` | 2rem    | 32px   |

### Interaction Model

All interactive components follow this state pattern:

| State    | Visual               | CSS                                                     |
| -------- | -------------------- | ------------------------------------------------------- |
| Rest     | Clean, minimal       | `border: 1px solid var(--garden-fg)`                    |
| Hover    | Dither texture fills | `background-image: var(--garden-dither-50)`             |
| Active   | Solid inversion      | `background: var(--garden-fg); color: var(--garden-bg)` |
| Disabled | 50% opacity          | `opacity: 0.5; cursor: not-allowed`                     |
| Focus    | Accent ring          | `outline: var(--garden-focus-ring)`                     |

---

## Components

### Form Controls

#### `<garden-button>`

Primary button component with variants.

```html
<garden-button>Default</garden-button>
<garden-button variant="ghost">Ghost</garden-button>
<garden-button variant="solid">Solid</garden-button>
<garden-button size="sm">Small</garden-button>
<garden-button size="lg">Large</garden-button>
<garden-button disabled>Disabled</garden-button>
<garden-button full>Full Width</garden-button>
```

| Property   | Type                              | Default     | Description          |
| ---------- | --------------------------------- | ----------- | -------------------- |
| `variant`  | `'default' \| 'ghost' \| 'solid'` | `'default'` | Visual style         |
| `size`     | `'sm' \| 'md' \| 'lg'`            | `'md'`      | Button size          |
| `disabled` | `boolean`                         | `false`     | Disable interactions |
| `pressed`  | `boolean`                         | `false`     | Toggle pressed state |
| `full`     | `boolean`                         | `false`     | Full-width button    |

#### `<garden-input>`

Text input field.

```html
<garden-input placeholder="Enter text..."></garden-input>
<garden-input value="Prefilled"></garden-input>
<garden-input disabled></garden-input>
```

| Property      | Type      | Default | Description      |
| ------------- | --------- | ------- | ---------------- |
| `value`       | `string`  | `''`    | Input value      |
| `placeholder` | `string`  | `''`    | Placeholder text |
| `disabled`    | `boolean` | `false` | Disable input    |
| `readonly`    | `boolean` | `false` | Read-only mode   |

**Events:** `garden:input`, `garden:change`

#### `<garden-checkbox>`

Checkbox input.

```html
<garden-checkbox>Label</garden-checkbox>
<garden-checkbox checked>Checked</garden-checkbox>
```

| Property   | Type      | Default | Description      |
| ---------- | --------- | ------- | ---------------- |
| `checked`  | `boolean` | `false` | Checked state    |
| `disabled` | `boolean` | `false` | Disable checkbox |

**Events:** `garden:change`

#### `<garden-radio>`

Radio button (use multiple with same `name`).

```html
<garden-radio name="option" value="a">Option A</garden-radio>
<garden-radio name="option" value="b">Option B</garden-radio>
```

| Property  | Type      | Default | Description      |
| --------- | --------- | ------- | ---------------- |
| `name`    | `string`  | `''`    | Radio group name |
| `value`   | `string`  | `''`    | Radio value      |
| `checked` | `boolean` | `false` | Selected state   |

### Containers

#### `<garden-card>`

Content container with optional interactions.

```html
<garden-card>
  <span slot="header">Title</span>
  <p>Content goes here.</p>
  <span slot="footer">Footer</span>
</garden-card>

<garden-card clickable>
  <span slot="header">Clickable Card</span>
</garden-card>

<garden-card href="/page">
  <span slot="header">Link Card</span>
</garden-card>
```

| Property    | Type      | Default     | Description              |
| ----------- | --------- | ----------- | ------------------------ |
| `clickable` | `boolean` | `false`     | Enable click interaction |
| `href`      | `string`  | `undefined` | Make card a link         |
| `target`    | `string`  | `undefined` | Link target              |

**Slots:** `header`, `default`, `footer`

**Events:** `garden:click` (when clickable)

#### `<garden-modal>`

Dialog overlay with focus trap.

```html
<garden-modal open>
  <span slot="header">Modal Title</span>
  <p>Modal content.</p>
  <span slot="footer">
    <garden-button>Close</garden-button>
  </span>
</garden-modal>
```

| Property          | Type                             | Default | Description                  |
| ----------------- | -------------------------------- | ------- | ---------------------------- |
| `open`            | `boolean`                        | `false` | Show modal                   |
| `size`            | `'sm' \| 'md' \| 'lg' \| 'full'` | `'md'`  | Modal size                   |
| `closeOnBackdrop` | `boolean`                        | `true`  | Close when clicking backdrop |
| `closeOnEscape`   | `boolean`                        | `true`  | Close on Escape key          |

**Slots:** `header`, `default`, `footer`

**Events:** `garden:close`

#### `<garden-grid>`

Responsive grid layout.

```html
<garden-grid columns="3" gap="4">
  <garden-card>Item 1</garden-card>
  <garden-card>Item 2</garden-card>
  <garden-card>Item 3</garden-card>
</garden-grid>
```

| Property  | Type     | Default | Description                   |
| --------- | -------- | ------- | ----------------------------- |
| `columns` | `number` | `3`     | Number of columns             |
| `gap`     | `string` | `'4'`   | Gap size (space token number) |

### Media Blocks

#### `<garden-video-block>`

Video player with custom controls and fullscreen modes.

```html
<garden-video-block
  src="asset://localhost/media/videos/example.mp4"
  width="1920"
  height="1080"
></garden-video-block>
```

| Property   | Type                  | Default     | Description           |
| ---------- | --------------------- | ----------- | --------------------- |
| `src`      | `string`              | `''`        | Video source URL      |
| `poster`   | `string`              | `undefined` | Poster image URL      |
| `width`    | `number`              | `undefined` | Original video width  |
| `height`   | `number`              | `undefined` | Original video height |
| `autoplay` | `boolean`             | `false`     | Auto-start playback   |
| `loop`     | `boolean`             | `false`     | Loop video            |
| `muted`    | `boolean`             | `false`     | Start muted           |
| `controls` | `'default' \| 'none'` | `'default'` | Show controls         |

**Keyboard shortcuts:**

- `F` — Gallery fullscreen (with matte)
- `Shift+F` — Immersive fullscreen (edge-to-edge)
- `Escape` — Exit fullscreen
- `←/→` — Seek 5 seconds
- `↑/↓` — Adjust volume

**Events:** `garden:play`, `garden:pause`, `garden:ended`, `garden:timeupdate`

#### `<garden-audio-block>`

Audio player with playback controls.

```html
<garden-audio-block
  src="asset://localhost/media/audio/track.mp3"
  title="Track Name"
  artist="Artist"
></garden-audio-block>
```

| Property  | Type      | Default     | Description      |
| --------- | --------- | ----------- | ---------------- |
| `src`     | `string`  | `''`        | Audio source URL |
| `title`   | `string`  | `undefined` | Track title      |
| `artist`  | `string`  | `undefined` | Artist name      |
| `compact` | `boolean` | `false`     | Compact layout   |

**Events:** `garden:play`, `garden:pause`, `garden:ended`

#### `<garden-image-block>`

Gallery-style image display with framed presentation and fullscreen modes.

```html
<garden-image-block
  src="asset://localhost/media/images/photo.jpg"
  alt="Coastal memory, early morning"
  width="1920"
  height="1080"
></garden-image-block>
```

| Property      | Type      | Default     | Description               |
| ------------- | --------- | ----------- | ------------------------- |
| `src`         | `string`  | `''`        | Image source URL          |
| `alt`         | `string`  | `''`        | Alt text (shown in plaque)|
| `width`       | `number`  | `undefined` | Image width               |
| `height`      | `number`  | `undefined` | Image height              |
| `constrained` | `boolean` | `false`     | Max 80vh height           |
| `cover`       | `boolean` | `false`     | Cover fit mode            |
| `clickable`   | `boolean` | `false`     | Custom click (no fullscreen) |
| `hideCaption` | `boolean` | `false`     | Hide the plaque caption   |

**Fullscreen Modes:**

- **Gallery** (F key) — Image with cream matte background and framed presentation
- **Immersive** (Shift+F) — Edge-to-edge on pure black, maximum fidelity

**Keyboard shortcuts:**

- `F` — Toggle gallery fullscreen
- `Shift+F` — Enter immersive fullscreen
- `Escape` — Exit fullscreen

**Events:** `garden:click`, `garden:load`, `garden:error`, `garden:fullscreen`

#### `<garden-waveform>`

Audio frequency visualization.

```html
<garden-waveform bars="16" demo></garden-waveform>
```

| Property  | Type                  | Default | Description        |
| --------- | --------------------- | ------- | ------------------ |
| `bars`    | `number`              | `16`    | Number of bars     |
| `demo`    | `boolean`             | `false` | Show animated demo |
| `density` | `'full' \| 'minimal'` | auto    | Display density    |

**Methods:**

- `connectAnalyser(analyser: AnalyserNode)` — Connect to Web Audio API

### Navigation

#### `<garden-breadcrumb>`

Breadcrumb navigation.

```html
<garden-breadcrumb>
  <a href="/">Home</a>
  <a href="/channels">Channels</a>
  <span>Current</span>
</garden-breadcrumb>
```

#### `<garden-context-menu>`

Right-click context menu.

```html
<garden-context-menu .items=${[
  { label: 'Edit', action: 'edit' },
  { label: 'Delete', action: 'delete', danger: true }
]}></garden-context-menu>
```

**Events:** `garden:select` (with action in detail)

#### `<garden-tooltip>`

Hover tooltip.

```html
<garden-tooltip content="Helpful text">
  <garden-button>Hover me</garden-button>
</garden-tooltip>
```

| Property   | Type                                     | Default | Description  |
| ---------- | ---------------------------------------- | ------- | ------------ |
| `content`  | `string`                                 | `''`    | Tooltip text |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Position     |

---

## Theming

### Light/Dark Mode

Toggle theme with the `data-theme` attribute:

```html
<!-- Light mode (default) -->
<html data-theme="light">
  <!-- Dark mode -->
  <html data-theme="dark"></html>
</html>
```

Or use system preference (automatic):

```html
<!-- Respects prefers-color-scheme -->
<html></html>
```

### Density

Switch between full and minimal (mobile) density:

```html
<!-- Full density (default) -->
<html data-density="full">
  <!-- Minimal density -->
  <html data-density="minimal"></html>
</html>
```

Auto-switches at 640px viewport width.

### Custom Tokens

Override any token in your CSS:

```css
:root {
  /* Custom colors */
  --garden-bg: #ffffff;
  --garden-fg: #000000;

  /* Custom font */
  --garden-font-mono: "JetBrains Mono", monospace;

  /* Custom spacing */
  --garden-space-4: 20px;
}
```

---

## Accessibility

### Keyboard Navigation

All components support keyboard navigation:

- `Tab` — Move focus between elements
- `Enter/Space` — Activate buttons, toggle checkboxes
- `Arrow keys` — Navigate within components
- `Escape` — Close modals, exit fullscreen

### Screen Readers

Components use proper ARIA attributes:

- Buttons have `role="button"` and `aria-pressed`
- Modals have `role="dialog"` and `aria-modal`
- Form inputs have associated labels
- Progress bars have `aria-valuenow/min/max`

### Reduced Motion

Animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --garden-duration-fast: 0ms;
    --garden-duration-normal: 0ms;
  }
}
```

### Focus Indicators

All interactive elements show visible focus rings:

```css
:focus-visible {
  outline: var(--garden-focus-ring);
  outline-offset: 2px;
}
```

---

## Events

All Garden components emit events prefixed with `garden:`:

```javascript
document.querySelector("garden-button").addEventListener("garden:click", (e) => {
  console.log("Button clicked", e.detail);
});
```

Common events:

- `garden:click` — Element clicked
- `garden:change` — Value changed
- `garden:input` — Input received
- `garden:close` — Modal/menu closed
- `garden:play` — Media started
- `garden:pause` — Media paused

---

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

Requires native Web Components support (Custom Elements, Shadow DOM).
