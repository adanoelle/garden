import { html, css, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden tooltip component.
 *
 * A wrapper that shows a tooltip on hover/focus of its content.
 * Position defaults to top, adjusts if near viewport edges.
 *
 * @slot - Content that triggers the tooltip
 *
 * @example
 * ```html
 * <garden-tooltip text="Edit this item">
 *   <garden-button>Edit</garden-button>
 * </garden-tooltip>
 * ```
 */
@customElement('garden-tooltip')
export class GardenTooltip extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }

      .trigger {
        display: inline-block;
      }

      .tooltip {
        position: absolute;
        padding: var(--garden-space-1) var(--garden-space-2);
        background: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        color: var(--garden-fg);
        font-size: var(--garden-text-xs);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        z-index: 1000;

        transition: opacity var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Visible state */
      :host([visible]) .tooltip {
        opacity: 1;
      }

      /* Position: top (default) */
      .tooltip[data-position="top"] {
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
      }

      /* Position: bottom */
      .tooltip[data-position="bottom"] {
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
      }

      /* Position: left */
      .tooltip[data-position="left"] {
        right: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
      }

      /* Position: right */
      .tooltip[data-position="right"] {
        left: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
      }

      /* Muted secondary text */
      .tooltip-hint {
        color: var(--garden-fg-muted);
        margin-left: var(--garden-space-1);
      }

      /* Mobile: hide tooltips (touch doesn't have hover) */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .tooltip {
          display: none;
        }
      }
    `
  ];

  /** Tooltip text content */
  @property()
  text = '';

  /** Optional hint text (dimmed, shown after main text) */
  @property()
  hint?: string;

  /** Preferred position */
  @property()
  position: 'top' | 'bottom' | 'left' | 'right' = 'top';

  /** Delay before showing (ms) */
  @property({ type: Number })
  delay = 200;

  /** Density override */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  @state()
  private _visible = false;

  private _showTimeout: number | null = null;
  private _hideTimeout: number | null = null;

  private _show() {
    // Clear any pending hide
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }

    // Delay show
    if (this._showTimeout) return;
    this._showTimeout = window.setTimeout(() => {
      this._visible = true;
      this.toggleAttribute('visible', true);
      this._showTimeout = null;
    }, this.delay);
  }

  private _hide() {
    // Clear any pending show
    if (this._showTimeout) {
      clearTimeout(this._showTimeout);
      this._showTimeout = null;
    }

    // Small delay before hiding to prevent flicker
    if (this._hideTimeout) return;
    this._hideTimeout = window.setTimeout(() => {
      this._visible = false;
      this.toggleAttribute('visible', false);
      this._hideTimeout = null;
    }, 50);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._showTimeout) clearTimeout(this._showTimeout);
    if (this._hideTimeout) clearTimeout(this._hideTimeout);
  }

  override render() {
    return html`
      <div
        class="trigger"
        @mouseenter=${this._show}
        @mouseleave=${this._hide}
        @focusin=${this._show}
        @focusout=${this._hide}
      >
        <slot></slot>
      </div>
      <div
        class="tooltip"
        data-position=${this.position}
        role="tooltip"
        aria-hidden=${!this._visible}
      >
        ${this.text}${this.hint ? html`<span class="tooltip-hint">${this.hint}</span>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-tooltip': GardenTooltip;
  }
}
