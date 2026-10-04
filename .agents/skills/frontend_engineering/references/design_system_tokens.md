# Design System & Token Customization

## Mastercard Theme Token Overrides

Token definitions and component overrides are declared in `packages/design-system/src/mastercardTheme.ts`.

### Theme Compilation Pipeline
1. Edit tokens or component configs in `mastercardTheme.ts`.
2. Run compilation:
   ```bash
   pnpm --filter @excited-live/design-system theme:build
   ```
3. This emits:
   - `packages/design-system/src/mastercard-theme.css`
   - `packages/design-system/src/mastercard.js`

### Modal Dialog Configuration
When using large container border radii (e.g. `--radius-container: 40px`), the default spacing of 16px is insufficient and causes content to touch the curved edges.

To fix this:
```ts
components: {
  dialog: {
    base: {
      padding: "28px 32px",
    },
  },
}
```

This sets:
```css
.astryx-dialog {
  --astryx-dialog-padding-inline: 32px;
  --astryx-dialog-padding-block-start: 28px;
  --astryx-dialog-padding-block-end: 28px;
}
```

### Layout Dividers Behavior
In Astryx Design System:
- When `<DialogHeader>` or `<LayoutFooter>` does not have `hasDivider`, `LayoutContent` collapses its block padding to 0 via ancestor `:has()` selectors.
- Setting `hasDivider` preserves vertical padding (`28px`), giving proper separation between header, form content, and action footer.
