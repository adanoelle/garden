import { LitElement, css, CSSResultGroup } from 'lit';

/**
 * Base class for all Garden components.
 * Provides shared theming, token access, and common utilities.
 */
export class GardenElement extends LitElement {
  /**
   * Shared styles that all Garden components inherit.
   * Includes CSS custom property consumption and base resets.
   */
  static sharedStyles: CSSResultGroup = css`
    :host {
      box-sizing: border-box;
      font-family: var(--garden-font-mono);
      color: var(--garden-fg);
    }
    
    :host *,
    :host *::before,
    :host *::after {
      box-sizing: inherit;
    }
    
    :host([hidden]) {
      display: none !important;
    }
    
    /* Focus visible for keyboard navigation */
    :host(:focus-visible) {
      outline: var(--garden-focus-ring);
      outline-offset: var(--garden-focus-offset);
    }
  `;

  /**
   * Emit a custom event with Garden namespace.
   */
  protected emit<T>(name: string, detail?: T, options?: EventInit): boolean {
    const event = new CustomEvent(`garden:${name}`, {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail,
      ...options,
    });
    return this.dispatchEvent(event);
  }

  /**
   * Query the theme from context (data-theme attribute on document or parent).
   */
  protected getTheme(): 'light' | 'dark' {
    const root = this.closest('[data-theme]') || document.documentElement;
    return (root.getAttribute('data-theme') as 'light' | 'dark') || 'light';
  }
}
