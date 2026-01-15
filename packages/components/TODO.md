# Garden - Current State & Next Steps

## What's Done

- [x] Project scaffold (Vite + Lit + TypeScript)
- [x] Design tokens in `src/styles/tokens.css`
- [x] `GardenElement` base class
- [x] `<garden-button>` with all variants and states

## What's Next

### Immediate: `<garden-input>`

Text input following the same interaction model:
- Rest: border, transparent background
- Focus: dither pattern, text stays readable
- Consider: should the dither be inside the input or on a wrapper?

### Then: `<garden-card>`

Content container for blocks:
- Subtle border or borderless?
- Hover state for clickable cards?
- Slots for header, content, footer

### Then: `<garden-block>`

The Strudel integration - a code block that:
- Displays pattern code with syntax highlighting
- Has play/stop controls
- Integrates with Strudel's `.markcss()` for native theming
- Lazy-loads Strudel packages

## Open Questions

1. **Dither density** - Is 50% right for hover, or should it be lighter (25%)?
2. **Transition timing** - 100ms feels snappy, but should active state be instant (0ms)?
3. **Focus rings** - Currently using `--garden-accent` (Hague Blue). Keep or use fg color?

## Testing Checklist

When modifying components, verify:
- [ ] Light mode looks correct
- [ ] Dark mode looks correct (toggle theme button)
- [ ] Hover state shows dither
- [ ] Active (mousedown) shows solid inversion
- [ ] Keyboard focus matches hover visually
- [ ] Disabled state is obviously disabled
- [ ] Pressed state persists correctly (for button)

## Quick Commands

```bash
# Dev server
npm run dev

# View demo
open http://localhost:5173/demo/index.html

# Build for production
npm run build
```
