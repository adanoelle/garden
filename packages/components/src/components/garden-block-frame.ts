import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Block frame component for displaying block content.
 *
 * Renders as a "digital picture frame" with gallery-style presentation.
 * The frame is the constant - content fits within it proportionally,
 * with the matte being the natural remaining space.
 *
 * Design philosophy (Gallery Director's perspective):
 * - The work is paramount. Presentation serves the art.
 * - Breathing room is earned. Smaller pieces get more matte.
 * - The viewing experience is sacred. Frame fits in viewport.
 * - The frame should disappear. Subtle, inevitable.
 *
 * @slot - Default slot for block content (images, video, text, etc.)
 * @fires garden:click - When frame is clicked (if clickable)
 * @fires garden:menu-click - When menu button is clicked
 */
@customElement('garden-block-frame')
export class GardenBlockFrame extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      .frame {
        /* Fixed frame fills available space with max bounds */
        width: 100%;
        max-height: var(--garden-frame-max-height, 70vh);

        /* Gallery-style aspect ratio */
        aspect-ratio: 4 / 3;

        /* Minimum breathing room - never edge-to-edge */
        padding: var(--garden-frame-min-padding, var(--garden-space-4));

        /* Subtle frame border */
        border: 1px solid var(--garden-fg);
        background-color: var(--garden-bg);

        /* Center content */
        display: flex;
        align-items: center;
        justify-content: center;

        /* Contain child overflow */
        overflow: hidden;

        /* Position relative for menu button */
        position: relative;

        /* Smooth transitions */
        transition: border-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Auto-height mode for text/expandable content */
      :host([auto-height]) .frame {
        aspect-ratio: auto;
        min-height: 200px;
        max-height: 80vh;
      }

      /* Content wrapper - constrains and centers with matte effect */
      .content {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Matte effect - creates breathing room around slotted content */
        padding: var(--garden-frame-matte, 10%);
        box-sizing: border-box;
      }

      /* Slotted media fits within the padded content area */
      ::slotted(img),
      ::slotted(video),
      ::slotted(garden-video-block),
      ::slotted(garden-image-block) {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      /* Style slotted text content */
      ::slotted(p),
      ::slotted(span),
      ::slotted(div) {
        max-width: 100%;
        overflow-wrap: break-word;
        text-align: center;
        font-size: var(--garden-text-base);
        line-height: var(--garden-leading-relaxed);
      }

      /* Menu button - appears on hover */
      .menu-button {
        position: absolute;
        top: var(--garden-space-2);
        right: var(--garden-space-2);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--garden-bg);
        border: 1px solid transparent;
        cursor: pointer;
        opacity: 0;
        transition: opacity var(--garden-duration-fast) var(--garden-ease-out),
                    border-color var(--garden-duration-fast) var(--garden-ease-out);
        font-size: var(--garden-text-base);
        color: var(--garden-fg-muted);
      }

      .frame:hover .menu-button,
      .menu-button:focus-visible {
        opacity: 1;
      }

      .menu-button:hover {
        border-color: var(--garden-fg);
        color: var(--garden-fg);
      }

      .menu-button:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 1px;
      }

      /* Clickable frame styling */
      :host([clickable]) .frame {
        cursor: pointer;
      }

      :host([clickable]) .frame:hover {
        border-color: var(--garden-fg-muted);
      }

      :host([clickable]) .frame:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }
    `,
  ];

  /** Allow height to expand for text content */
  @property({ type: Boolean, reflect: true, attribute: 'auto-height' })
  autoHeight = false;

  /** Makes the frame clickable */
  @property({ type: Boolean, reflect: true })
  clickable = false;

  /** Show menu button on hover */
  @property({ type: Boolean, reflect: true, attribute: 'show-menu' })
  showMenu = false;

  /** Custom max height (CSS value) */
  @property({ attribute: 'max-height' })
  maxHeight?: string;

  private _handleClick(e: MouseEvent) {
    if (!this.clickable) return;
    this.emit('click', { originalEvent: e });
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.emit('click', { originalEvent: e });
    }
  }

  private _handleMenuClick(e: MouseEvent) {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    this.emit('menu-click', {
      x: rect.right,
      y: rect.bottom,
      originalEvent: e,
    });
  }

  override render() {
    const frameStyle = this.maxHeight
      ? `--garden-frame-max-height: ${this.maxHeight}`
      : '';

    return html`
      <div
        class="frame"
        style=${frameStyle || nothing}
        tabindex=${this.clickable ? '0' : nothing}
        role=${this.clickable ? 'button' : nothing}
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
      >
        ${this.showMenu ? html`
          <button
            class="menu-button"
            @click=${this._handleMenuClick}
            aria-label="Block menu"
            title="More options"
          >...</button>
        ` : nothing}
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-block-frame': GardenBlockFrame;
  }
}
