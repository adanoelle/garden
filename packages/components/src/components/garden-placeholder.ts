import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden placeholder component.
 *
 * A dimmed empty cell that maintains grid rhythm when content is sparse.
 * Can optionally be interactive as an "add content" affordance.
 *
 * @fires garden:click - When interactive placeholder is clicked
 */
@customElement('garden-placeholder')
export class GardenPlaceholder extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      .placeholder {
        background-color: var(--garden-bg);
        border: var(--garden-border-width) solid var(--garden-fg);
        opacity: 0.25;
        min-height: var(--garden-placeholder-height, 120px);

        transition:
          opacity var(--garden-duration-fast) var(--garden-ease-out),
          background-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Interactive placeholder */
      :host([interactive]) .placeholder {
        cursor: pointer;
      }

      :host([interactive]) .placeholder:hover {
        opacity: 0.4;
      }

      :host([interactive]) .placeholder:active {
        opacity: 0.5;
      }

      :host([interactive]) .placeholder:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }

      /* Minimal mode */
      :host([minimal]) .placeholder {
        border: none;
        border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
        opacity: 0.15;
      }

      /* Mobile auto-detect */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .placeholder {
          border: none;
          border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
          opacity: 0.15;
        }
      }
    `
  ];

  /** Makes the placeholder clickable (add content affordance) */
  @property({ type: Boolean, reflect: true })
  interactive = false;

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  private _handleClick(e: MouseEvent) {
    if (!this.interactive) return;
    this.emit('click', { originalEvent: e });
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.emit('click', { originalEvent: e });
    }
  }

  override render() {
    return html`
      <div
        class="placeholder"
        tabindex=${this.interactive ? '0' : nothing}
        role=${this.interactive ? 'button' : nothing}
        aria-label=${this.interactive ? 'Add content' : nothing}
        @click=${this.interactive ? this._handleClick : nothing}
        @keydown=${this.interactive ? this._handleKeydown : nothing}
      ></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-placeholder': GardenPlaceholder;
  }
}
