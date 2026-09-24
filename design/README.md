# Design

The Ledger Loft app uses **The Ledger Loft Co** store design system so the app, store and planners look like one brand.

- `tokens/tokens.json`: source of truth (copied unchanged from the store)
- `tokens/tokens.css`: web variables, light and dark themes
- `tokens/platforms/`: Kotlin (Compose) and Swift (SwiftUI) equivalents
- `tokens/app.css`: app-only accessibility additions (proposed, D-010)
- `preview.html`: visual style guide. Open it in a browser

Rules and component specs: [`docs/l3/design-system.md`](../docs/l3/design-system.md).
Check tokens after any change: `node scripts/check-tokens.mjs`.
