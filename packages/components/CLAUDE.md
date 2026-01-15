# Garden Component Library - Claude Code Context

## Project Overview

Garden is a Lit-based web component library with PC-98 inspired aesthetics and a Farrow & Ball color palette. It's designed to be the UI foundation for a Tauri desktop app - an Are.na-inspired content curation tool with integrated Strudel patterns for generative audio.

## Design Philosophy

- **Are.na's minimalism** as foundation - content-forward, no visual noise
- **PC-98's intentionality** and warmth as soul - constraint as creative material
- **Two colors only** - foreground and background, warm-shifted
- **Hierarchy through size and weight**, not color proliferation

## Interaction Model

This is the core pattern for ALL interactive components:

| State | Visual | Implementation |
|-------|--------|----------------|
| Rest | Clean, minimal, border only | `background: transparent; border: 1px solid var(--garden-fg)` |
| Hover/Focus | Dithered pattern appears, text inverts | `background-image: var(--garden-dither-50); color: var(--garden-bg)` |
| Active | Solid inversion | `background-color: var(--garden-fg); color: var(--garden-bg)` |
| Pressed | Solid inversion (persists) | Same as active, but stays after release |
| Pressed+Hover | Dither reveals background | Inverse of normal hover |
| Disabled | 50% opacity, no interactions | `opacity: 0.5; cursor: not-allowed` |

## Color Palette (Farrow & Ball inspired)

```css
/* Light mode */
--garden-pointing: #f4f2e9;      /* Warm white - primary background */
--garden-wimborne: #f2efdf;      /* Creamier white - subtle bg */
--garden-skimming: #e7e1d3;      /* Warm gray - muted bg */
--garden-purbeck: #b8ad98;       /* Mid neutral */
--garden-moles-breath: #8b8074;  /* Warm dark - muted text */
--garden-hague: #4a5568;         /* Deep accent */
--garden-railings: #2d3748;      /* Near black - primary foreground */

/* Semantic mappings */
--garden-bg: var(--garden-pointing);
--garden-fg: var(--garden-railings);
--garden-fg-muted: var(--garden-moles-breath);
```

Dark mode inverts bg/fg and adjusts dither patterns accordingly.

## Dither Patterns

SVG-based for crisp scaling at any size:

- `--garden-dither-25` - 25% density, subtle texture (4x4 grid, 1 pixel filled)
- `--garden-dither-50` - 50% density, balanced checkerboard (2x2 alternating)
- `--garden-dither-75` - 75% density, heavy texture (4x4 grid, 1 pixel empty)

**Current default for hover states is dither-50.** Adjust if it feels too heavy/light.

## Typography

Commit Mono throughout. No font mixing. Hierarchy via:
- Size: `--garden-text-xs` through `--garden-text-3xl`
- Weight: 400 (normal) vs 700 (bold) sparingly
- Spacing: generous line-height (`--garden-leading-normal: 1.5`)

## Technical Stack

- **Lit 3.x** - Web components with reactive properties
- **TypeScript** - Strict mode enabled
- **Vite** - Dev server and build
- **Shadow DOM** - Encapsulation, CSS custom properties pierce through
- **Strudel** - Optional peer dependency for `<garden-block>` audio component

## File Structure

```
src/
├── GardenElement.ts    # Base class - extend this for all components
├── index.ts            # Public exports
├── components/
│   ├── garden-button.ts
│   └── (future components)
└── styles/
    └── tokens.css      # Design tokens - import in HTML, vars available globally
demo/
└── index.html          # Component showcase, run with `npm run dev`
```

## Component Architecture

All components extend `GardenElement`:

```typescript
import { html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

@customElement('garden-example')
export class GardenExample extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      /* Component-specific styles */
    `
  ];

  @property({ reflect: true })
  variant: 'default' | 'ghost' = 'default';

  override render() {
    return html`...`;
  }
}
```

Key patterns:
- Always include `GardenElement.sharedStyles` first
- Use `reflect: true` for attributes that affect styling
- Emit events via `this.emit('eventname', detail)` - auto-prefixes with `garden:`
- Access theme via `this.getTheme()` if needed

## Current Components

### `<garden-button>`

Variants: `default`, `ghost`, `solid`
Sizes: `sm`, `md`, `lg`
States: `disabled`, `pressed`, `full`

```html
<garden-button variant="ghost" size="lg" pressed>Label</garden-button>
```

## Planned Components

1. **`<garden-input>`** - Text input with same interaction model
2. **`<garden-card>`** - Content container
3. **`<garden-block>`** - Strudel-enabled code block for live-coding patterns

## Development Workflow

```bash
npm run dev      # Start Vite dev server
npm run build    # Build library to dist/
```

Demo page at `http://localhost:5173/demo/index.html`

## Design Decisions to Preserve

1. **No gradients** - Flat colors and dither patterns only
2. **No rounded corners** - `border-radius: 0` or max 2-4px
3. **No shadows** - Depth via layering and dither density
4. **No color for state** - Inversion and texture only
5. **Transitions are fast** - 100-200ms, `ease-out` curve

## Common Tasks

### Adjusting dither density on hover
In component CSS, change `var(--garden-dither-50)` to `25` or `75`.

### Adding a new component
1. Create `src/components/garden-{name}.ts`
2. Extend `GardenElement`
3. Export from `src/index.ts`
4. Add demo section in `demo/index.html`

### Testing dark mode
Click "toggle theme" in demo, or add `data-theme="dark"` to `<html>`.
