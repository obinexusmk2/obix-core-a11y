# @obinexusltd/obix-core-a11y

Focus management, screen-reader announcements, and contrast validation for
the OBIX SDK — a small runtime accessibility engine, not a static audit
tool.

## The problem it owns

Accessibility behavior (focus traps, live-region announcements, contrast
checks) tends to get reimplemented ad hoc per component, with subtly
different keyboard-wrap logic or ARIA attributes each time. This package
centralizes the runtime pieces behind one `A11yEngine`: a single focus-trap
implementation shared by every modal/drawer/menu, one
`announceToScreenReader` path for live regions, and a `validateContrast`
hook point so contrast failures can be caught and reported consistently.

## Install

```bash
npm install @obinexusltd/obix-core-a11y
```

## API

```ts
import {
  createAccessibilityEngine,
  WCAGLevel,
  type A11yConfig,
  type A11yEngine,
  type A11yAuditResult,
  type FocusManager,
  type AriaAutomation,
} from "@obinexusltd/obix-core-a11y";
```

| Export | Description |
|--------|-------------|
| `createAccessibilityEngine(config: A11yConfig)` | Factory. Returns an `A11yEngine` bound to that config. |
| `audit()` | Runs the engine's built-in checks and returns an `A11yAuditResult`. See [docs/audit-and-config.md](docs/audit-and-config.md). |
| `enforceFocus(trap, container?)` | Enables/disables a keyboard focus trap on `container`. Delegates to the engine's `FocusManager`. |
| `announceToScreenReader(message, priority)` | Inserts a transient `aria-live` region so assistive tech announces `message`. See [docs/screen-reader-announcements.md](docs/screen-reader-announcements.md). |
| `validateContrast(element)` | Reads a contrast ratio off `element` and checks it against `config.contrastMinimumRatio`. See [docs/contrast-validation.md](docs/contrast-validation.md). |
| `registerContrastAuditHook(hook)` | Registers a callback invoked on every `validateContrast` call with `(element, ratio)`. |
| `getFocusManager()` | Returns the engine's `FocusManager` directly, for save/restore-focus and lower-level trap control. See [docs/focus-management.md](docs/focus-management.md). |

See [docs/api-reference.md](docs/api-reference.md) for the full type
reference.

## Example

```ts
import { createAccessibilityEngine, WCAGLevel } from "@obinexusltd/obix-core-a11y";

const a11y = createAccessibilityEngine({
  wcagLevel: WCAGLevel.AA,
  focusManagement: true,
  contrastMinimumRatio: 4.5,
});

const modal = document.querySelector<HTMLElement>("#modal")!;

// Trap keyboard focus inside the modal while it's open.
a11y.getFocusManager().saveFocusState();
a11y.enforceFocus(true, modal);

// Tell assistive tech the modal opened.
a11y.announceToScreenReader("Dialog opened", "polite");

// ...on close:
a11y.enforceFocus(false);
a11y.getFocusManager().restoreFocusState();
```

## Docs

- [docs/api-reference.md](docs/api-reference.md) — full type and method reference
- [docs/focus-management.md](docs/focus-management.md) — the focus trap, save/restore focus, `FocusManager`
- [docs/screen-reader-announcements.md](docs/screen-reader-announcements.md) — `announceToScreenReader` and live regions
- [docs/contrast-validation.md](docs/contrast-validation.md) — `validateContrast`, contrast audit hooks, and the `data-obix-contrast-ratio` contract
- [docs/audit-and-config.md](docs/audit-and-config.md) — `A11yConfig`, `audit()`, and which config fields the engine actually reads

## Boundary

- `validateContrast` does not compute color contrast from computed styles.
  It reads `element.dataset.obixContrastRatio` (i.e. a
  `data-obix-contrast-ratio` attribute) as an already-known ratio and
  compares it to `contrastMinimumRatio`. Something else (a build step, a
  design-token pipeline, a manual annotation) is responsible for putting a
  correct ratio on the element in the first place — see
  [docs/contrast-validation.md](docs/contrast-validation.md).
- `audit()` currently implements exactly one check: whether
  `focusManagement` is enabled and nothing is focused. It is not a WCAG 2.2
  rule engine — `config.wcagLevel` is accepted but not read by any check.
- `A11yConfig.ariaAutomation` and `A11yConfig.testMode` are typed but not
  currently read by `createAccessibilityEngine` — there is no automatic
  ARIA labeling/role/description/live-region behavior driven by
  `ariaAutomation` yet; `announceToScreenReader`'s `priority` is passed
  explicitly by the caller on every call instead.
- The focus trap wraps focus only at the `Tab` boundaries (forward off the
  last focusable element, backward off the first). It does not intercept
  mouse clicks or programmatic `.focus()` calls that land outside
  `container`.
- `saveFocusState`/`restoreFocusState` hold a single saved element, not a
  stack — nesting two `saveFocusState()` calls (e.g. two modals opened in
  sequence) overwrites the first saved element.
- ⚠️ [package.json](package.json)'s `peerDependencies` currently lists
  `@obinexusltd/obix-core-a11y` itself (likely copied from another
  package's template) rather than an actual peer — worth fixing before
  publishing.

MIT — OBINexus Computing
