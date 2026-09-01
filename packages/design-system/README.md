# @excited-live/design-system

Design system for excited.live app UIs. Apps/webapp must render **zero raw HTML
elements** (enforced by ESLint): every element comes from Astryx
(`@astryxdesign/core`), this package, or a local component composed from this
package.

## Layers

1. **Astryx components** (re-exported for one import surface): `Card`, `Button`,
   `Badge`, `IconButton`, `Theme`, `neutralTheme`.
2. **Zero-style primitives** — typed wrappers with *no* built-in styling so app
   stylesheets keep full control:
   - `Box` — polymorphic container (`as` default `"div"`)
   - `Text` — text node (`span` default, `as="p"` for paragraphs)
   - `Heading` — semantic `h1`–`h6` via `level`
   - `PlainButton` — unstyled `<button>`, defaults `type="button"`
   - `Svg`, `SvgLine`, `SvgPath` — inline-SVG building blocks (charts, marks)
3. **Brand + icons** — `FeyMark`, `SvgIcon` base, and the stroke icon set.

## Rule for new UI

Prefer Astryx components. If the design needs a raw element, add a primitive
here and use the primitive. Raw elements live only inside this package.
