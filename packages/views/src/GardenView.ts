import { LitElement, css, CSSResultGroup } from 'lit';

/**
 * Base class for all Garden view components (pages and layouts).
 * Provides shared theming, navigation utilities, and common patterns.
 *
 * Views differ from components in that they:
 * - Compose multiple components into page-level layouts
 * - Manage application state and data fetching
 * - Handle routing and navigation
 */
export class GardenView extends LitElement {
  /**
   * Shared styles that all Garden views inherit.
   */
  static sharedStyles: CSSResultGroup = css`
    :host {
      display: block;
      box-sizing: border-box;
      font-family: var(--garden-font-mono);
      color: var(--garden-fg);
      background: var(--garden-bg);
    }

    :host *,
    :host *::before,
    :host *::after {
      box-sizing: inherit;
    }

    :host([hidden]) {
      display: none !important;
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

  /**
   * Navigate to a route within the application.
   * Emits a navigation event that the app shell can handle.
   */
  protected navigate(route: string, params?: Record<string, string>): void {
    this.emit('navigate', { route, params });
  }

  /**
   * Go back in navigation history.
   */
  protected goBack(): void {
    this.emit('navigate-back');
  }
}
