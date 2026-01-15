import { html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden button component.
 * 
 * Interaction states:
 * - Rest: clean border, transparent background
 * - Hover/Focus: dithered pattern fills background, text inverts
 * - Active: solid inversion
 * 
 * @slot - Button label content
 * @fires garden:click - When button is activated
 */
@customElement('garden-button')
export class GardenButton extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: inline-block;
      }
      
      button {
        /* Reset */
        appearance: none;
        border: none;
        background: none;
        font: inherit;
        cursor: pointer;
        
        /* Layout */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--garden-space-2);
        
        /* Sizing */
        padding: var(--garden-space-2) var(--garden-space-4);
        min-height: 2.5rem;
        
        /* Typography */
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        line-height: var(--garden-leading-tight);
        text-decoration: none;
        white-space: nowrap;
        
        /* Visual - Rest state */
        color: var(--garden-fg);
        background-color: transparent;
        border: var(--garden-border-width) solid var(--garden-fg);
        
        /* Transitions */
        transition: 
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out),
          color var(--garden-duration-fast) var(--garden-ease-out);
      }
      
      /* Hover - Dither pattern appears with halo for readability */
      button:hover:not(:disabled) {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        color: var(--garden-bg);
        text-shadow:
          0 0 2px var(--garden-fg),
          0 0 4px var(--garden-fg),
          0 0 6px var(--garden-fg);
      }
      
      /* Focus - Same as hover for keyboard nav */
      button:focus-visible {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        color: var(--garden-bg);
        text-shadow:
          0 0 2px var(--garden-fg),
          0 0 4px var(--garden-fg),
          0 0 6px var(--garden-fg);
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }
      
      /* Active - Full inversion */
      button:active:not(:disabled) {
        background-image: none;
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }
      
      /* Disabled */
      button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
      
      /* === VARIANTS === */
      
      /* Ghost variant - no border at rest */
      :host([variant="ghost"]) button {
        border-color: transparent;
      }
      
      :host([variant="ghost"]) button:hover:not(:disabled) {
        border-color: var(--garden-fg);
      }
      
      /* Solid variant - inverted at rest */
      :host([variant="solid"]) button {
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }
      
      :host([variant="solid"]) button:hover:not(:disabled) {
        background-image: var(--garden-dither-50);
        background-color: var(--garden-bg);
        color: var(--garden-fg);
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 4px var(--garden-bg),
          0 0 6px var(--garden-bg);
      }
      
      :host([variant="solid"]) button:active:not(:disabled) {
        background-image: none;
        background-color: var(--garden-bg);
        color: var(--garden-fg);
      }
      
      /* === SIZES === */
      
      :host([size="sm"]) button {
        padding: var(--garden-space-1) var(--garden-space-3);
        min-height: 2rem;
        font-size: var(--garden-text-xs);
      }
      
      :host([size="lg"]) button {
        padding: var(--garden-space-3) var(--garden-space-6);
        min-height: 3rem;
        font-size: var(--garden-text-base);
      }
      
      /* === FULL WIDTH === */

      :host([full]) {
        display: block;
      }

      :host([full]) button {
        width: 100%;
      }

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) button {
        border: none;
        padding: var(--garden-space-1) 0;
        min-height: auto;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      :host([minimal]) button:hover:not(:disabled) {
        background-image: none;
        background-color: transparent;
        color: var(--garden-fg);
        text-shadow: none;
        text-decoration-thickness: 2px;
      }

      :host([minimal]) button:focus-visible {
        background-image: none;
        background-color: transparent;
        color: var(--garden-fg);
        text-shadow: none;
        text-decoration-thickness: 2px;
      }

      :host([minimal]) button:active:not(:disabled) {
        background-color: transparent;
        color: var(--garden-fg-muted);
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) button {
          border: none;
          padding: var(--garden-space-1) 0;
          min-height: auto;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        :host(:not([density="full"])) button:hover:not(:disabled) {
          background-image: none;
          background-color: transparent;
          color: var(--garden-fg);
          text-shadow: none;
          text-decoration-thickness: 2px;
        }

        :host(:not([density="full"])) button:focus-visible {
          background-image: none;
          background-color: transparent;
          color: var(--garden-fg);
          text-shadow: none;
          text-decoration-thickness: 2px;
        }

        :host(:not([density="full"])) button:active:not(:disabled) {
          background-color: transparent;
          color: var(--garden-fg-muted);
        }
      }
    `
  ];

  /** Button variant */
  @property({ reflect: true })
  variant: 'default' | 'ghost' | 'solid' = 'default';

  /** Button size */
  @property({ reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  /** Disabled state */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Full width */
  @property({ type: Boolean, reflect: true })
  full = false;

  /** Button type attribute */
  @property()
  type: 'button' | 'submit' | 'reset' = 'button';

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  private _handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    this.emit('click', { originalEvent: e });
  }

  override render() {
    return html`
      <button
        type=${this.type}
        ?disabled=${this.disabled}
        @click=${this._handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-button': GardenButton;
  }
}
