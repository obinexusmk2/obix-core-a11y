import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAccessibilityEngine, WCAGLevel } from '../src/index.js';

const setupDocumentStub = () => {
  const listeners: Record<string, (event: KeyboardEvent) => void> = {};
  const first = { focus: vi.fn(), hasAttribute: () => false } as unknown as HTMLElement;
  const last = { focus: vi.fn(), hasAttribute: () => false } as unknown as HTMLElement;

  const documentStub = {
    activeElement: last,
    addEventListener: (type: string, handler: (event: KeyboardEvent) => void) => {
      listeners[type] = handler;
    },
    removeEventListener: vi.fn(),
    createElement: () => ({
      setAttribute: vi.fn(),
      style: {},
      textContent: '',
      remove: vi.fn()
    }),
    body: { appendChild: vi.fn() }
  } as unknown as Document;

  const container = {
    querySelectorAll: () => [first, last],
    querySelector: () => first
  } as unknown as HTMLElement;

  return { documentStub, container, listeners };
};

describe('obix-accessibility integration', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('manages modal focus traps and runs contrast audit hooks', () => {
    const { documentStub, container, listeners } = setupDocumentStub();
    vi.stubGlobal('document', documentStub);

    const engine = createAccessibilityEngine({ wcagLevel: WCAGLevel.AA, focusManagement: true, contrastMinimumRatio: 4.5 });
    const hook = vi.fn();
    engine.registerContrastAuditHook(hook);

    engine.enforceFocus(true, container);
    listeners.keydown?.({ key: 'Tab', shiftKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);

    const sampleNode = { dataset: { obixContrastRatio: '3.2' } } as unknown as HTMLElement;
    expect(engine.validateContrast(sampleNode)).toBe(false);
    expect(hook).toHaveBeenCalledWith(sampleNode, 3.2);
  });
});
