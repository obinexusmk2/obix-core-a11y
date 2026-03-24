/**
 * OBIX Accessibility - WCAG 2.2 enforcement, focus management, ARIA automation
 * Comprehensive accessibility engine for inclusive UI/UX
 */
export declare enum WCAGLevel {
    A = "A",
    AA = "AA",
    AAA = "AAA"
}
export interface FocusManager {
    setFocus(element: HTMLElement): void;
    getFocusedElement(): HTMLElement | null;
    saveFocusState(): void;
    restoreFocusState(): void;
    manageFocusTrap(enabled: boolean, container?: HTMLElement): void;
}
export interface AriaAutomation {
    autoLabel: boolean;
    autoRole: boolean;
    autoDescribe: boolean;
    autoLive: boolean;
    liveRegionPriority: "polite" | "assertive";
}
export interface A11yConfig {
    wcagLevel: WCAGLevel;
    focusManagement: boolean;
    ariaAutomation?: AriaAutomation;
    contrastMinimumRatio?: number;
    testMode?: boolean;
}
export interface A11yAuditResult {
    violations: Array<{
        id: string;
        impact: "minor" | "moderate" | "serious" | "critical";
        message: string;
        nodes: HTMLElement[];
    }>;
    passes: number;
    timestamp: number;
}
export interface A11yEngine {
    audit(): A11yAuditResult;
    enforceFocus(trap: boolean, container?: HTMLElement): void;
    announceToScreenReader(message: string, priority: "polite" | "assertive"): void;
    validateContrast(element: HTMLElement): boolean;
    registerContrastAuditHook(hook: (element: HTMLElement, ratio: number) => void): void;
    getFocusManager(): FocusManager;
}
export declare function createAccessibilityEngine(config: A11yConfig): A11yEngine;
//# sourceMappingURL=index.d.ts.map