# @garden/components

Garden design system - Lit web components with PC-98 inspired aesthetics and Farrow & Ball color palette.

## Design Philosophy

- **Are.na's minimalism** as foundation
- **PC-98's intentionality** and warmth as soul  
- **Constraint as creative material**

## Interaction Model

| State | Visual |
|-------|--------|
| Rest | Clean, minimal, no borders |
| Hover/Focus | Dithered pattern appears (texture) |
| Active | Full inversion (event) |

## Development

```bash
npm install
npm run dev
```

Open `demo/index.html` in browser to see components.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Usage with Tauri

The built library drops directly into your Tauri frontend. Import components and tokens:

```js
import '@garden/components';
import '@garden/components/styles/tokens.css';
```

## Strudel Integration

Strudel is an optional peer dependency for the `<garden-block>` component:

```bash
npm install @strudel/web
```
