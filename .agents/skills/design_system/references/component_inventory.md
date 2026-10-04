# Component Inventory

Every public export of `packages/design-system/src/index.ts`, grouped, with when-to-use notes. If this file and `index.ts` disagree, `index.ts` wins. Last verified against `origin/main` when the skill was authored; re-check the file when in doubt.

## Zero-style primitives (no built-in styling; style from app CSS)

- `AppDocument`: root html/head/body shell for SSR apps. Props: `lang` (default `"en"`), `theme` (applied as `data-theme`, default `"dark"`; webapp passes `"light"`), `head`, `children`, `scripts`. The only place raw document elements live outside this package's own sources.
- `Img`: typed `<img>` so app code never writes a raw img element. All attributes pass through; styling stays in app CSS.
- `PlainButton`: unstyled native button, `type` defaults to `"button"` so it never submits a form by accident. Use `Button` or `IconButton` when the designed look is wanted.
- SVG building blocks: `Svg`, `SvgLine`, `SvgPath`, `SvgCircle`, `SvgDefs`, `SvgGradientStop`, `SvgRect`. Used for charts and brand marks; no styling of their own.

## Icons

- `SvgIcon`: base icon wrapper.
- Icon set: `FeyMark` (brand mark), `ChatIcon`, `MoonIcon`, `SunIcon`, `LinkIcon`, `CompassIcon`, `CalendarIcon`, `BookmarkIcon`, `ChartIcon`, `PresentationIcon`, `SettingsIcon`, `ArrowRightIcon`, `SendIcon`, `MinimizeIcon`.
- Add new icons in `src/icons.tsx` and export from `index.ts`.

## Inputs and controls

- `TextInput`: single-line text input.
- `NumberInput`: numeric field; supports `units` (for example `฿`, `%`) and `step`.
- `DateInput`: date field.
- `Selector`: single-select dropdown; supports `options`, `value`, `onChange`, `label`, `isDisabled` (used with `lockType` dialogs that lock the category).
- `SegmentedControl` + `SegmentedControlItem`: toggle groups and segments.

## Text and layout

- `Text`: text node (`span` default; `as="p"` for paragraphs).
- `Heading`: semantic h1 to h6 via `level` (type `HeadingLevel`).
- `Stack`: vertical stack; also used with `as="main"` for landmarks.
- `HStack`: horizontal stack.
- `Grid`: grid layout.
- `Card`: surface container; variants such as `variant="transparent"` and `padding={0}` are used by the dashboard shell.

## Actions

- `Button`: themed button.
- `IconButton`: icon-only themed button.
- `Badge`: small status label.

## Overlays and dialogs

- `Dialog`, `DialogHeader`: modal shell and header. Pass `hasDivider` on `DialogHeader` (see the skill's Dialog/Layout section).
- `Layout`, `LayoutContent`, `LayoutFooter`: dialog body scaffolding for form dialogs. Use `hasDivider` on `LayoutFooter` and `defaultHasDividers` on `Layout` so `LayoutContent` keeps its padding.

## Data display

- `Table` plus helpers `proportional`, `pixel`, and `useTableRowExpansion` (expandable detail rows). Types: `TableColumn`, `TableProps`, `TableDensity`, `UseTableRowExpansionConfig`.

## Tabs

- `TabList` + `Tab`.

## Chat

- `ChatComposer`, `ChatMessage`, `ChatMessageBubble`, `ChatMessageList`, `ChatToolCalls`, `ChatLayout`. Types include `ChatMessageSender` and `ChatToolCallItem`.

## Theme

- `mastercardTheme`: the built theme object (re-exported from `./mastercard`). Applied with `<Theme theme={mastercardTheme} mode="light">`.

## Not exported here, despite older docs

- `Box`: mentioned in `README.md` and the ESLint hint, but not exported by `index.ts`. Use `Stack`, `HStack`, `Grid`, or `Card`, or add a primitive.
- `neutralTheme`: mentioned in `README.md`; that theme lives with the landing app's own setup, not here.

## Adding a missing piece

New raw-element primitives belong in `packages/design-system/src/<Name>.tsx` with a typed props interface and an export in `index.ts`, following `Img` / `PlainButton` as models. New theme tokens belong in `src/mastercardTheme.ts` plus a `theme:build` run.

Every component above also exports its props type (`ButtonProps`, `DialogProps`, and so on) from the same entry point, so app code never needs a deep import.
