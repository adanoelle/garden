import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden modal component.
 *
 * A popup overlay with dithered backdrop for dialogs, notifications, and menus.
 *
 * @slot - Main content
 * @slot header - Header content (optional)
 * @slot footer - Footer content, typically actions (optional)
 * @fires garden:close - When modal is closed (escape, backdrop click, or close button)
 */
@customElement('garden-modal')
export class GardenModal extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: contents;
      }

      /* Backdrop */
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--garden-space-4);

        /* Semi-transparent dithered overlay */
        background-color: color-mix(in srgb, var(--garden-bg) 70%, transparent);
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;

        /* Animation */
        opacity: 0;
        transition: opacity var(--garden-duration-normal) var(--garden-ease-out);
      }

      :host([open]) .backdrop {
        opacity: 1;
      }

      /* Modal window */
      .modal {
        position: relative;
        background-color: var(--garden-bg);
        border: var(--garden-border-width) solid var(--garden-fg);
        max-width: min(500px, calc(100vw - var(--garden-space-8)));
        max-height: calc(100vh - var(--garden-space-8));
        display: flex;
        flex-direction: column;
        overflow: hidden;

        /* Animation */
        transform: scale(0.95) translateY(-10px);
        transition: transform var(--garden-duration-normal) var(--garden-ease-out);
      }

      :host([open]) .modal {
        transform: scale(1) translateY(0);
      }

      /* Size variants */
      :host([size="sm"]) .modal {
        max-width: min(320px, calc(100vw - var(--garden-space-8)));
      }

      :host([size="lg"]) .modal {
        max-width: min(700px, calc(100vw - var(--garden-space-8)));
      }

      :host([size="full"]) .modal {
        max-width: calc(100vw - var(--garden-space-8));
        max-height: calc(100vh - var(--garden-space-8));
        width: 100%;
        height: 100%;
      }

      /* Header */
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--garden-space-3) var(--garden-space-4);
        border-bottom: var(--garden-border-width) solid var(--garden-fg);
        background-color: var(--garden-bg-subtle);
      }

      .modal-title {
        font-size: var(--garden-text-sm);
        font-weight: 400;
        margin: 0;
      }

      /* Close button */
      .close-btn {
        appearance: none;
        background: transparent;
        border: var(--garden-border-width) solid var(--garden-fg);
        color: var(--garden-fg);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        width: 1.75em;
        height: 1.75em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out),
          color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .close-btn:hover {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        color: var(--garden-bg);
        text-shadow:
          0 0 2px var(--garden-fg),
          0 0 4px var(--garden-fg),
          0 0 6px var(--garden-fg);
      }

      .close-btn:active {
        background-image: none;
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }

      /* Content */
      .modal-content {
        padding: var(--garden-space-4);
        overflow-y: auto;
        flex: 1;
      }

      /* Footer */
      .modal-footer {
        display: flex;
        gap: var(--garden-space-2);
        justify-content: flex-end;
        padding: var(--garden-space-3) var(--garden-space-4);
        border-top: var(--garden-border-width) solid var(--garden-fg);
        background-color: var(--garden-bg-subtle);
      }

      /* Hidden state */
      .hidden {
        display: none !important;
      }

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) .backdrop {
        padding: 0;
        background-image: none;
        background-color: var(--garden-bg);
      }

      :host([minimal]) .modal {
        border: none;
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
      }

      :host([minimal]) .modal-header {
        border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
        background-color: transparent;
      }

      :host([minimal]) .modal-footer {
        border-top: var(--garden-divider-width) solid var(--garden-divider-color);
        background-color: transparent;
      }

      :host([minimal]) .close-btn {
        border: none;
      }

      :host([minimal]) .close-btn:hover {
        background-image: none;
        text-shadow: none;
        text-decoration: underline;
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .backdrop {
          padding: 0;
          background-image: none;
          background-color: var(--garden-bg);
        }

        :host(:not([density="full"])) .modal {
          border: none;
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
        }

        :host(:not([density="full"])) .modal-header {
          border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
          background-color: transparent;
        }

        :host(:not([density="full"])) .modal-footer {
          border-top: var(--garden-divider-width) solid var(--garden-divider-color);
          background-color: transparent;
        }

        :host(:not([density="full"])) .close-btn {
          border: none;
        }

        :host(:not([density="full"])) .close-btn:hover {
          background-image: none;
          text-shadow: none;
          text-decoration: underline;
        }
      }
    `,
  ];

  /** Whether the modal is open */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Modal size: sm, md (default), lg, full */
  @property({ reflect: true })
  size: 'sm' | 'md' | 'lg' | 'full' = 'md';

  /** Whether clicking backdrop closes modal */
  @property({ type: Boolean, attribute: 'close-on-backdrop' })
  closeOnBackdrop = true;

  /** Whether pressing Escape closes modal */
  @property({ type: Boolean, attribute: 'close-on-escape' })
  closeOnEscape = true;

  /** Whether to show the close button */
  @property({ type: Boolean, attribute: 'show-close' })
  showClose = true;

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  private _previousActiveElement: HTMLElement | null = null;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleKeydown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeydown);
  }

  private _handleKeydown = (e: KeyboardEvent) => {
    if (!this.open) return;

    if (this.closeOnEscape && e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    // Focus trap - keep Tab cycling within modal
    if (e.key === 'Tab') {
      this._trapFocus(e);
    }
  };

  private _trapFocus(e: KeyboardEvent) {
    const focusableElements = this.shadowRoot?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === firstElement || this.shadowRoot?.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastElement || this.shadowRoot?.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  private _handleBackdropClick(e: MouseEvent) {
    // Only close if clicking directly on backdrop, not modal content
    if (this.closeOnBackdrop && e.target === e.currentTarget) {
      this.close();
    }
  }

  /** Opens the modal */
  show() {
    this._previousActiveElement = document.activeElement as HTMLElement;
    this.open = true;
    this.emit('open', {});

    // Focus the modal for accessibility
    requestAnimationFrame(() => {
      const firstFocusable = this.shadowRoot?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });
  }

  /** Closes the modal */
  close() {
    this.open = false;
    this.emit('close', {});

    // Restore focus
    this._previousActiveElement?.focus();
  }

  /** Toggles the modal */
  toggle() {
    if (this.open) {
      this.close();
    } else {
      this.show();
    }
  }


  override render() {
    return html`
      <div
        class="backdrop ${this.open ? '' : 'hidden'}"
        @click=${this._handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-hidden=${!this.open}
      >
        <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
          <header class="modal-header">
            <span class="modal-title">
              <slot name="header"></slot>
            </span>
            ${this.showClose
              ? html`
                  <button
                    class="close-btn"
                    @click=${this.close}
                    aria-label="Close modal"
                    title="Close"
                  >
                    ×
                  </button>
                `
              : nothing}
          </header>

          <div class="modal-content">
            <slot></slot>
          </div>

          <footer class="modal-footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-modal': GardenModal;
  }
}
