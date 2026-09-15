# Contrast validation

`validateContrast(element)` checks a color-contrast ratio against a
configured minimum. Read this doc before relying on it — it does **not**
compute contrast from an element's actual computed colors.

```ts
validateContrast(element: HTMLElement): boolean {
  const ratio = Number(element.dataset.obixContrastRatio ?? "0");
  contrastHooks.forEach((hook) => hook(element, ratio));
  return ratio >= (config.contrastMinimumRatio ?? 4.5);
}
```

## The `data-obix-contrast-ratio` contract

`element.dataset.obixContrastRatio` reads the DOM attribute
`data-obix-contrast-ratio` (camelCase `dataset` keys map to kebab-case
attributes). This engine treats that attribute as **already-known,
externally-supplied** contrast data:

```html
<p data-obix-contrast-ratio="4.8">Body copy</p>
<span data-obix-contrast-ratio="2.1">Low-contrast label</span>
```

```ts
a11y.validateContrast(document.querySelector("span")!); // false — 2.1 < 4.5
```

- Missing the attribute entirely → `Number(undefined ?? "0")` → `0` → the
  check fails against any positive `contrastMinimumRatio`.
- A non-numeric value (e.g. `"n/a"`) → `Number("n/a")` → `NaN` → `NaN >= x`
  is always `false`, so the check fails closed, not open.
- **Nothing in this package computes the ratio itself** — no color
  parsing, no relative-luminance math, no reading of `getComputedStyle`.
  Populating `data-obix-contrast-ratio` correctly is the responsibility of
  whatever produces your markup: a design-token build step that knows the
  intended foreground/background pair, a lint rule, a visual-regression
  tool, or a manual annotation during authoring.

## Threshold: `contrastMinimumRatio`

Defaults to `4.5` (WCAG 2.x's AA threshold for normal text) when
`A11yConfig.contrastMinimumRatio` is not set. The engine applies this one
threshold uniformly — it does not vary the minimum by text size or
`config.wcagLevel` (e.g. it does not automatically switch to `3:1` for
large text or `7:1` for AAA). Pass a different `contrastMinimumRatio` at
`createAccessibilityEngine` time if your use case needs a different
threshold, or wrap `validateContrast` with your own size-aware logic.

## `registerContrastAuditHook(hook)`

```ts
registerContrastAuditHook(hook: (element: HTMLElement, ratio: number) => void): void;
```

Every registered hook runs, in registration order, on **every**
`validateContrast` call — including calls that pass. Hooks are a pure side
channel: they cannot change `validateContrast`'s return value, so use them
for reporting/logging/collection, not for enforcement.

```ts
const failures: Array<{ element: HTMLElement; ratio: number }> = [];

a11y.registerContrastAuditHook((element, ratio) => {
  if (ratio < 4.5) failures.push({ element, ratio });
});

document.querySelectorAll<HTMLElement>("[data-obix-contrast-ratio]").forEach((el) => {
  a11y.validateContrast(el);
});

console.table(failures);
```

## Testing it

```ts
const sampleNode = { dataset: { obixContrastRatio: "3.2" } } as unknown as HTMLElement;
expect(engine.validateContrast(sampleNode)).toBe(false); // 3.2 < 4.5
expect(hook).toHaveBeenCalledWith(sampleNode, 3.2);
```

See [`__tests__/integration.test.ts`](../__tests__/integration.test.ts).
