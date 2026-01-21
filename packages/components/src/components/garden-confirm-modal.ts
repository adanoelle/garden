import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Confirmation modal for destructive actions.
 *
 * Opens as a centered overlay asking the user to confirm an action.
 * Uses danger styling for the confirm button to indicate destructive actions.
 *
 * @fires garden:confirm - When user confirms the action
 * @fires garden:cancel - When user cancels
 * @fires garden:modal-close - When modal is closed by any means
 */
@customElement('garden-confirm-modal')
export class GardenConfirmModal extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: contents;
      }

      /* Backdrop overlay with dither */
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background-color: color-mix(in srgb, var(--garden-bg) 70%, transparent);
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
      }

      /* Modal container */
      .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 101;

        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        padding: var(--garden-space-5);

        min-width: 300px;
        max-width: 400px;

        display: flex;
        flex-direction: column;
        gap: var(--garden-space-4);
      }

      /* Modal header */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .title {
        font-size: var(--garden-text-lg);
        font-weight: 700;
        margin: 0;
      }

      /* Close button */
      .close-button {
        background: transparent;
        border: none;
        padding: var(--garden-space-1);
        cursor: pointer;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-xl);
        line-height: 1;
        transition: color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .close-button:hover {
        color: var(--garden-fg);
      }

      .close-button:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Message */
      .message {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        line-height: var(--garden-leading-normal);
        margin: 0;
      }

      /* Item name highlight */
      .item-name {
        font-weight: 700;
        color: var(--garden-fg);
      }

      /* Footer with buttons */
      .footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--garden-space-2);
        padding-top: var(--garden-space-3);
        border-top: 1px solid var(--garden-fg-muted);
      }

      /* Danger button styling */
      .danger-button {
        background: var(--garden-fg);
        color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        padding: var(--garden-space-2) var(--garden-space-3);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        cursor: pointer;
        transition: all var(--garden-duration-fast) var(--garden-ease-out);
      }

      .danger-button:hover {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
      }

      .danger-button:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Hidden state */
      :host(:not([open])) .backdrop,
      :host(:not([open])) .modal {
        display: none;
      }
    `,
  ];

  /** Whether the modal is open */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Title shown in the modal header */
  @property()
  modalTitle = 'Confirm';

  /** Message shown in the modal body */
  @property()
  message = 'Are you sure?';

  /** Name of the item being acted upon (displayed in bold) */
  @property()
  itemName = '';

  /** Text for the confirm button */
  @property()
  confirmText = 'Delete';

  /** Text for the cancel button */
  @property()
  cancelText = 'Cancel';

  override connectedCallback() {
    super.connectedCallback();
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        document.addEventListener('keydown', this._handleKeydown);
        // Focus the cancel button by default (safer option)
        this.updateComplete.then(() => {
          const cancelBtn = this.shadowRoot?.querySelector('garden-button') as HTMLElement;
          cancelBtn?.focus();
        });
      } else {
        document.removeEventListener('keydown', this._handleKeydown);
      }
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeydown);
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this._cancel();
    }
  }

  private _handleBackdropClick() {
    this._cancel();
  }

  private _cancel() {
    this.open = false;
    this.emit('cancel', {});
    this.emit('modal-close', {});
  }

  private _confirm() {
    this.open = false;
    this.emit('confirm', {});
    this.emit('modal-close', {});
  }

  override render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}></div>
      <div
        class="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
      >
        <header class="header">
          <h2 id="modal-title" class="title">${this.modalTitle}</h2>
          <button
            class="close-button"
            @click=${this._cancel}
            aria-label="Close"
          >×</button>
        </header>

        <p id="modal-message" class="message">
          ${this.message}
          ${this.itemName ? html`<span class="item-name">${this.itemName}</span>` : nothing}
        </p>

        <footer class="footer">
          <garden-button
            variant="ghost"
            size="sm"
            @click=${this._cancel}
          >
            ${this.cancelText}
          </garden-button>
          <button
            class="danger-button"
            @click=${this._confirm}
          >
            ${this.confirmText}
          </button>
        </footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-confirm-modal': GardenConfirmModal;
  }
}
