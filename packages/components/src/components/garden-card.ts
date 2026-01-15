import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden card component.
 *
 * A content container with optional slots for header, content, and footer.
 * Can be made clickable or act as a link.
 *
 * Interaction states (when clickable):
 * - Rest: subtle border
 * - Hover: subtle background shift (NOT dither - per design decision)
 * - Active: slightly darker background
 *
 * @slot header - Optional header section
 * @slot - Default slot for main content
 * @slot footer - Optional footer section
 * @fires garden:click - When clickable card is clicked
 */
@customElement('garden-card')
export class GardenCard extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      .card {
        background-color: var(--garden-bg);
        border: var(--garden-border-width) solid var(--garden-fg);
        padding: 0;

        /* Reset for when it's an anchor */
        text-decoration: none;
        color: inherit;
        display: block;

        transition:
          border-color var(--garden-duration-fast) var(--garden-ease-out),
          background-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Clickable card - subtle hover feedback */
      :host([clickable]) .card,
      .card[href] {
        cursor: pointer;
      }

      :host([clickable]) .card:hover,
      .card[href]:hover {
        /* Subtle bg shift - NOT dither pattern */
        background-color: var(--garden-bg-subtle);
      }

      :host([clickable]) .card:active,
      .card[href]:active {
        background-color: var(--garden-bg-muted);
      }

      /* Focus for keyboard navigation */
      :host([clickable]) .card:focus-visible,
      .card[href]:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }

      /* Slots layout */
      .card-header {
        padding: var(--garden-space-3) var(--garden-space-4);
        border-bottom: var(--garden-border-width) solid var(--garden-fg);
      }

      .card-content {
        padding: var(--garden-space-4);
      }

      .card-footer {
        padding: var(--garden-space-3) var(--garden-space-4);
        border-top: var(--garden-border-width) solid var(--garden-fg);
      }

      /* Hide empty slots */
      .card-header:not(:has(::slotted(*))) {
        display: none;
      }

      .card-footer:not(:has(::slotted(*))) {
        display: none;
      }

      /* Fallback for browsers without :has() support */
      .card-header.empty,
      .card-footer.empty {
        display: none;
      }

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) .card {
        border: none;
        border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
        padding-bottom: var(--garden-space-4);
      }

      :host([minimal]) .card-header {
        padding: var(--garden-space-2) 0;
        border-bottom: none;
      }

      :host([minimal]) .card-content {
        padding: var(--garden-space-2) 0;
      }

      :host([minimal]) .card-footer {
        padding: var(--garden-space-2) 0;
        border-top: none;
      }

      :host([minimal][clickable]) .card:hover,
      :host([minimal]) .card[href]:hover {
        background-color: transparent;
      }

      :host([minimal][clickable]) .card:active,
      :host([minimal]) .card[href]:active {
        background-color: transparent;
        opacity: 0.7;
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .card {
          border: none;
          border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
          padding-bottom: var(--garden-space-4);
        }

        :host(:not([density="full"])) .card-header {
          padding: var(--garden-space-2) 0;
          border-bottom: none;
        }

        :host(:not([density="full"])) .card-content {
          padding: var(--garden-space-2) 0;
        }

        :host(:not([density="full"])) .card-footer {
          padding: var(--garden-space-2) 0;
          border-top: none;
        }

        :host(:not([density="full"])[clickable]) .card:hover,
        :host(:not([density="full"])) .card[href]:hover {
          background-color: transparent;
        }

        :host(:not([density="full"])[clickable]) .card:active,
        :host(:not([density="full"])) .card[href]:active {
          background-color: transparent;
          opacity: 0.7;
        }
      }
    `,
  ];

  /** Makes the card interactive/clickable */
  @property({ type: Boolean, reflect: true })
  clickable = false;

  /** If set, renders as an anchor element */
  @property()
  href?: string;

  /** Target for anchor (when href is set) */
  @property()
  target?: '_blank' | '_self' | '_parent' | '_top';

  /** Rel attribute for anchor */
  @property()
  rel?: string;

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  private _handleClick(e: MouseEvent) {
    if (!this.clickable && !this.href) return;
    this.emit('click', { originalEvent: e });
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.clickable || this.href) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.emit('click', { originalEvent: e });
    }
  }

  private _renderContent() {
    return html`
      <div class="card-header">
        <slot name="header"></slot>
      </div>
      <div class="card-content">
        <slot></slot>
      </div>
      <div class="card-footer">
        <slot name="footer"></slot>
      </div>
    `;
  }

  override render() {
    // Render as anchor if href is provided
    if (this.href) {
      const rel = this.rel || (this.target === '_blank' ? 'noopener noreferrer' : undefined);
      return html`
        <a
          class="card"
          href=${this.href}
          target=${this.target || nothing}
          rel=${rel || nothing}
          @click=${this._handleClick}
        >
          ${this._renderContent()}
        </a>
      `;
    }

    // Render as div (with tabindex if clickable)
    return html`
      <div
        class="card"
        tabindex=${this.clickable ? '0' : nothing}
        role=${this.clickable ? 'button' : nothing}
        @click=${this.clickable ? this._handleClick : nothing}
        @keydown=${this.clickable ? this._handleKeydown : nothing}
      >
        ${this._renderContent()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-card': GardenCard;
  }
}
