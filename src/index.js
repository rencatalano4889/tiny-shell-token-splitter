/**
 * Public entry point for tiny-shell-token-splitter.
 *
 * Kept separate from core.js so consumers can import from a stable path
 * (`tiny-shell-token-splitter`) while the implementation stays testable
 * in isolation and free of re-export churn.
 */
export { splitShellTokens, ShellSyntaxError } from './core.js';
