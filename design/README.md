# Design

The Ledger Loft app uses **The Ledger Loft Co** store design system (plus 3 approved text tones, D-010; copy `tokens/` back to the store) so the app, store and planners look like one brand.

- `tokens/tokens.json`: source of truth (copied unchanged from the store)
- `tokens/tokens.css`: web variables, light and dark themes
- `tokens/platforms/`: Kotlin (Compose) and Swift (SwiftUI) equivalents
- `tokens/app.css`: app-only semantic tokens (focus, control border, positive/negative)
- `components.css`: shared component styles
- `preview.html`: visual style guide
- `screens/`: clickable screen prototypes. Start at `screens/index.html`. Spec: [`docs/l3/screens.md`](../docs/l3/screens.md)

Rules and component specs: [`docs/l3/design-system.md`](../docs/l3/design-system.md).
Check tokens after any change: `node scripts/check-tokens.mjs`.
