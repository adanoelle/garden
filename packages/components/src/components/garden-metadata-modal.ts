import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Metadata values for editing.
 */
export interface MetadataValues {
  sourceUrl: string;
  sourceTitle: string;
  creator: string;
  originalDate: string;
  altText: string;
}

/**
 * Modal component for editing block archive metadata.
 *
 * Shows all metadata fields regardless of whether they have values.
 * Implements a two-phase save: Save -> Confirm.
 *
 * @fires garden:metadata-save - When metadata is confirmed and saved
 * @fires garden:modal-close - When modal is closed
 */
@customElement('garden-metadata-modal')
export class GardenMetadataModal extends GardenElement {
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
        padding: var(--garden-space-6);

        min-width: 400px;
        max-width: 520px;
        max-height: 85vh;

        display: flex;
        flex-direction: column;
        gap: var(--garden-space-4);
      }

      /* Modal header */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: var(--garden-space-3);
        border-bottom: 1px solid var(--garden-fg-muted);
      }

      .title {
        font-size: var(--garden-text-lg);
        font-weight: 400;
        margin: 0;
      }

      /* Close button */
      .close-button {
        background: transparent;
        border: none;
        padding: var(--garden-space-2);
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

      /* Form content */
      .form-content {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-4);
        overflow-y: auto;
        padding-right: var(--garden-space-2);
      }

      /* Form field */
      .field {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-1);
      }

      .field-label {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        font-weight: 400;
      }

      .field-input {
        width: 100%;
        padding: var(--garden-space-2);
        border: 1px solid var(--garden-fg);
        background: var(--garden-bg);
        color: var(--garden-fg);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
      }

      .field-input:focus {
        outline: 2px solid var(--garden-fg);
        outline-offset: -2px;
      }

      .field-input::placeholder {
        color: var(--garden-fg-muted);
        opacity: 0.6;
      }

      .field-textarea {
        min-height: 60px;
        resize: vertical;
      }

      .field-hint {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        opacity: 0.8;
      }

      /* Footer with actions */
      .footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--garden-space-3);
        padding-top: var(--garden-space-4);
        border-top: 1px solid var(--garden-fg-muted);
      }

      /* Confirmation state */
      .confirm-message {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        align-self: center;
        margin-right: auto;
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

  /** Current metadata values */
  @property({ type: Object })
  values: MetadataValues = {
    sourceUrl: '',
    sourceTitle: '',
    creator: '',
    originalDate: '',
    altText: '',
  };

  /** Whether the block is a link (deprecated, use showAltText) */
  @property({ type: Boolean, attribute: 'is-link' })
  isLink = false;

  /** Whether to show the alt text field (for links, images, videos) */
  @property({ type: Boolean, attribute: 'show-alt-text' })
  showAltText = false;

  /** Title shown in the modal header */
  @property()
  modalTitle = 'Edit Archive Metadata';

  /** Local form state */
  @state()
  private _formValues: MetadataValues = {
    sourceUrl: '',
    sourceTitle: '',
    creator: '',
    originalDate: '',
    altText: '',
  };

  /** Whether we're in confirmation state */
  @state()
  private _pendingConfirm = false;

  override connectedCallback() {
    super.connectedCallback();
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        // Reset form to current values when opening
        this._formValues = { ...this.values };
        this._pendingConfirm = false;
        document.addEventListener('keydown', this._handleKeydown);
        // Focus first input
        this.updateComplete.then(() => {
          const firstInput = this.shadowRoot?.querySelector('.field-input') as HTMLElement;
          firstInput?.focus();
        });
      } else {
        document.removeEventListener('keydown', this._handleKeydown);
      }
    }

    // Also update form values if values prop changes while open
    if (changedProperties.has('values') && this.open) {
      this._formValues = { ...this.values };
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
      if (this._pendingConfirm) {
        // Cancel confirmation, go back to editing
        this._pendingConfirm = false;
      } else {
        this._close();
      }
    }
  }

  private _handleBackdropClick() {
    if (this._pendingConfirm) {
      this._pendingConfirm = false;
    } else {
      this._close();
    }
  }

  private _close() {
    this.open = false;
    this._pendingConfirm = false;
    this.emit('modal-close', {});
  }

  private _handleInput(field: keyof MetadataValues, e: Event) {
    const input = e.target as HTMLInputElement | HTMLTextAreaElement;
    this._formValues = {
      ...this._formValues,
      [field]: input.value,
    };
    // Reset confirm state if user edits after clicking save
    if (this._pendingConfirm) {
      this._pendingConfirm = false;
    }
  }

  private _handleSaveClick() {
    if (this._pendingConfirm) {
      // Confirm was clicked - emit save event
      this.emit('metadata-save', { values: this._formValues });
      this._close();
    } else {
      // First click - enter confirmation state
      this._pendingConfirm = true;
    }
  }

  private _handleCancelClick() {
    if (this._pendingConfirm) {
      this._pendingConfirm = false;
    } else {
      this._close();
    }
  }

  override render() {
    if (!this.open) return nothing;

    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}></div>
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header class="header">
          <h2 id="modal-title" class="title">${this.modalTitle}</h2>
          <button
            class="close-button"
            @click=${this._close}
            aria-label="Close modal"
          >×</button>
        </header>

        <div class="form-content">
          <div class="field">
            <label class="field-label" for="source-url">Source URL</label>
            <input
              id="source-url"
              class="field-input"
              type="url"
              .value=${this._formValues.sourceUrl}
              @input=${(e: Event) => this._handleInput('sourceUrl', e)}
              placeholder="https://..."
            />
            <span class="field-hint">Where this content was originally found</span>
          </div>

          <div class="field">
            <label class="field-label" for="source-title">Source Title</label>
            <input
              id="source-title"
              class="field-input"
              type="text"
              .value=${this._formValues.sourceTitle}
              @input=${(e: Event) => this._handleInput('sourceTitle', e)}
              placeholder="Custom link text"
            />
            <span class="field-hint">Display text for the source link (defaults to hostname)</span>
          </div>

          <div class="field">
            <label class="field-label" for="creator">Creator</label>
            <input
              id="creator"
              class="field-input"
              type="text"
              .value=${this._formValues.creator}
              @input=${(e: Event) => this._handleInput('creator', e)}
              placeholder="Author or artist name"
            />
          </div>

          <div class="field">
            <label class="field-label" for="original-date">Original Date</label>
            <input
              id="original-date"
              class="field-input"
              type="text"
              .value=${this._formValues.originalDate}
              @input=${(e: Event) => this._handleInput('originalDate', e)}
              placeholder="e.g., 2024, January 2024, 2024-01-15"
            />
            <span class="field-hint">When the original content was published</span>
          </div>

          ${this.showAltText || this.isLink ? html`
            <div class="field">
              <label class="field-label" for="alt-text">Alt Text</label>
              <textarea
                id="alt-text"
                class="field-input field-textarea"
                .value=${this._formValues.altText}
                @input=${(e: Event) => this._handleInput('altText', e)}
                placeholder="Describe the content for accessibility"
              ></textarea>
              <span class="field-hint">Alternative text for screen readers</span>
            </div>
          ` : nothing}
        </div>

        <footer class="footer">
          ${this._pendingConfirm ? html`
            <span class="confirm-message">Save changes?</span>
          ` : nothing}

          <garden-button
            variant="ghost"
            size="sm"
            @click=${this._handleCancelClick}
          >
            ${this._pendingConfirm ? 'Cancel' : 'Close'}
          </garden-button>

          <garden-button
            variant=${this._pendingConfirm ? 'solid' : 'default'}
            size="sm"
            @click=${this._handleSaveClick}
          >
            ${this._pendingConfirm ? 'Confirm' : 'Save'}
          </garden-button>
        </footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-metadata-modal': GardenMetadataModal;
  }
}
