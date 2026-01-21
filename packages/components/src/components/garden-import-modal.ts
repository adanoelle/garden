import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Detected content type for import.
 */
export type ImportContentType = 'url-media' | 'url-webpage' | 'text' | null;

/**
 * Media subtype for URL media.
 */
export type MediaSubtype = 'image' | 'video' | 'audio' | null;

/**
 * Form values for import metadata.
 */
export interface ImportFormValues {
  title: string;
  sourceUrl: string;
  creator: string;
  originalDate: string;
  notes: string;
}

/**
 * Import modal component for adding blocks to a channel.
 *
 * Provides a unified interface for importing:
 * - Media URLs (images, videos, audio)
 * - Webpage URLs (links)
 * - Plain text
 *
 * Auto-detects content type and shows appropriate preview.
 *
 * @fires garden:import - When import is initiated with { input, type, formValues }
 * @fires garden:modal-close - When modal is closed
 */
@customElement('garden-import-modal')
export class GardenImportModal extends GardenElement {
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

      /* Modal container - larger than metadata modal */
      .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 101;

        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        padding: var(--garden-space-6);

        min-width: 600px;
        max-width: 800px;
        max-height: 90vh;

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

      .channel-name {
        color: var(--garden-fg);
        font-weight: 700;
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

      /* Main input area */
      .input-section {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-2);
      }

      .main-input {
        width: 100%;
        min-height: 80px;
        padding: var(--garden-space-3);
        border: 1px solid var(--garden-fg);
        background: var(--garden-bg);
        color: var(--garden-fg);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        resize: vertical;
      }

      .main-input:focus {
        outline: 2px solid var(--garden-fg);
        outline-offset: -2px;
      }

      .main-input::placeholder {
        color: var(--garden-fg-muted);
        opacity: 0.6;
      }

      .input-hint {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
      }

      .detected-type {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        padding: var(--garden-space-1) var(--garden-space-2);
        border: 1px solid var(--garden-fg-muted);
        display: inline-block;
        align-self: flex-start;
      }

      /* Preview section */
      .preview-section {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-4);
        padding-top: var(--garden-space-4);
        border-top: 1px dashed var(--garden-fg-muted);
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }

      .preview-row {
        display: flex;
        gap: var(--garden-space-4);
      }

      /* Preview area */
      .preview-area {
        flex: 0 0 200px;
        min-height: 150px;
        max-height: 250px;
        border: 1px solid var(--garden-fg-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: var(--garden-bg-subtle, var(--garden-skimming));
      }

      .preview-area img,
      .preview-area video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .preview-text {
        flex: 1;
        max-height: 150px;
        overflow-y: auto;
        padding: var(--garden-space-2);
        border: 1px solid var(--garden-fg-muted);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--garden-bg-subtle, var(--garden-skimming));
      }

      .preview-placeholder {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        text-align: center;
      }

      .preview-icon {
        font-size: var(--garden-text-3xl);
        opacity: 0.6;
      }

      .preview-link {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-2);
        padding: var(--garden-space-3);
        border: 1px solid var(--garden-fg-muted);
        background: var(--garden-bg-subtle, var(--garden-skimming));
      }

      .preview-link-url {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg);
        word-break: break-all;
        text-decoration: underline;
      }

      .preview-link-hint {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
      }

      /* Metadata form */
      .metadata-form {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-3);
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-1);
      }

      .field-row {
        display: flex;
        gap: var(--garden-space-3);
      }

      .field-row .field {
        flex: 1;
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

      /* Footer with actions */
      .footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--garden-space-3);
        padding-top: var(--garden-space-4);
        border-top: 1px solid var(--garden-fg-muted);
      }

      .error-message {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg);
        background: var(--garden-fg);
        color: var(--garden-bg);
        padding: var(--garden-space-2) var(--garden-space-3);
        margin-right: auto;
      }

      .importing-message {
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

  /** Channel ID to import to */
  @property({ attribute: 'channel-id' })
  channelId = '';

  /** Channel title for display */
  @property({ attribute: 'channel-title' })
  channelTitle = '';

  /** Main input value */
  @state()
  private _inputValue = '';

  /** Detected content type */
  @state()
  private _detectedType: ImportContentType = null;

  /** Media subtype for URL media */
  @state()
  private _mediaSubtype: MediaSubtype = null;

  /** Form values for metadata */
  @state()
  private _formValues: ImportFormValues = {
    title: '',
    sourceUrl: '',
    creator: '',
    originalDate: '',
    notes: '',
  };

  /** Import in progress */
  @state()
  private _importing = false;

  /** Error message */
  @state()
  private _error: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        // Reset state when opening
        this._inputValue = '';
        this._detectedType = null;
        this._mediaSubtype = null;
        this._formValues = {
          title: '',
          sourceUrl: '',
          creator: '',
          originalDate: '',
          notes: '',
        };
        this._importing = false;
        this._error = null;

        document.addEventListener('keydown', this._handleKeydown);

        // Focus main input
        this.updateComplete.then(() => {
          const mainInput = this.shadowRoot?.querySelector('.main-input') as HTMLElement;
          mainInput?.focus();
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

  /** Public method to open the modal */
  show() {
    this.open = true;
  }

  /** Public method to close the modal */
  close() {
    this._close();
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this._close();
    }
  }

  private _handleBackdropClick() {
    this._close();
  }

  private _close() {
    this.open = false;
    this.emit('modal-close', {});
  }

  private _handleMainInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this._inputValue = textarea.value;
    this._error = null;

    // Detect content type
    const result = this._detectContentType(this._inputValue);
    this._detectedType = result.type;
    this._mediaSubtype = result.mediaSubtype;

    // Auto-fill form values based on detected type
    this._autoFillFormValues();
  }

  private _detectContentType(input: string): { type: ImportContentType; mediaSubtype: MediaSubtype } {
    const trimmed = input.trim();
    if (!trimmed) return { type: null, mediaSubtype: null };

    // Check if it's a URL
    try {
      const url = new URL(trimmed);

      // Check for media extensions
      const imageExts = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
      const videoExts = /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i;
      const audioExts = /\.(mp3|wav|ogg|flac|aac|m4a|opus|weba)$/i;

      if (imageExts.test(url.pathname)) {
        return { type: 'url-media', mediaSubtype: 'image' };
      }
      if (videoExts.test(url.pathname)) {
        return { type: 'url-media', mediaSubtype: 'video' };
      }
      if (audioExts.test(url.pathname)) {
        return { type: 'url-media', mediaSubtype: 'audio' };
      }

      // It's a URL but not media - treat as webpage/link
      return { type: 'url-webpage', mediaSubtype: null };
    } catch {
      // Not a URL - treat as text
      return { type: 'text', mediaSubtype: null };
    }
  }

  private _autoFillFormValues() {
    const trimmed = this._inputValue.trim();

    if (this._detectedType === 'url-media' || this._detectedType === 'url-webpage') {
      // Auto-fill source URL
      this._formValues = {
        ...this._formValues,
        sourceUrl: trimmed,
      };

      // Try to extract title from URL
      try {
        const url = new URL(trimmed);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const filename = pathParts[pathParts.length - 1];
        if (filename) {
          // Remove extension for title
          const title = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
          this._formValues = {
            ...this._formValues,
            title: title || url.hostname,
          };
        } else {
          this._formValues = {
            ...this._formValues,
            title: url.hostname,
          };
        }
      } catch {
        // Ignore URL parsing errors
      }
    } else if (this._detectedType === 'text') {
      // Use first line as title
      const lines = trimmed.split('\n');
      const firstLine = lines[0].slice(0, 60);
      this._formValues = {
        ...this._formValues,
        title: firstLine + (lines[0].length > 60 ? '...' : ''),
        sourceUrl: '',
      };
    }
  }

  private _handleFormInput(field: keyof ImportFormValues, e: Event) {
    const input = e.target as HTMLInputElement | HTMLTextAreaElement;
    this._formValues = {
      ...this._formValues,
      [field]: input.value,
    };
  }

  private _handleImport() {
    if (!this._inputValue.trim() || !this._detectedType || this._importing) return;

    this._importing = true;
    this._error = null;

    // Emit import event - parent handles actual import
    this.emit('import', {
      input: this._inputValue.trim(),
      type: this._detectedType,
      mediaSubtype: this._mediaSubtype,
      formValues: { ...this._formValues },
      channelId: this.channelId,
    });
  }

  /** Called by parent when import succeeds */
  importSuccess() {
    this._importing = false;
    this._close();
  }

  /** Called by parent when import fails */
  importError(message: string) {
    this._importing = false;
    this._error = message;
  }

  private _renderPreview() {
    if (!this._detectedType) {
      return html`
        <div class="preview-area">
          <div class="preview-placeholder">
            Preview will appear here
          </div>
        </div>
      `;
    }

    if (this._detectedType === 'url-media') {
      const url = this._inputValue.trim();

      if (this._mediaSubtype === 'image') {
        return html`
          <div class="preview-area">
            <img src=${url} alt="Preview" @error=${() => { this._error = 'Failed to load image'; }} />
          </div>
        `;
      }

      if (this._mediaSubtype === 'video') {
        return html`
          <div class="preview-area">
            <video src=${url} controls muted @error=${() => { this._error = 'Failed to load video'; }}></video>
          </div>
        `;
      }

      if (this._mediaSubtype === 'audio') {
        return html`
          <div class="preview-area">
            <div class="preview-placeholder">
              <span class="preview-icon">♫</span>
              <div>Audio file</div>
            </div>
          </div>
        `;
      }
    }

    if (this._detectedType === 'url-webpage') {
      const url = this._inputValue.trim();
      let hostname = '';
      try {
        hostname = new URL(url).hostname;
      } catch {
        hostname = url;
      }

      return html`
        <div class="preview-link">
          <span class="preview-link-url">${url}</span>
          <span class="preview-link-hint">Link to ${hostname}</span>
        </div>
      `;
    }

    if (this._detectedType === 'text') {
      return html`
        <div class="preview-text">${this._inputValue.trim()}</div>
      `;
    }

    return nothing;
  }

  private _getTypeLabel(): string {
    if (this._detectedType === 'url-media') {
      return `Media (${this._mediaSubtype})`;
    }
    if (this._detectedType === 'url-webpage') {
      return 'Link';
    }
    if (this._detectedType === 'text') {
      return 'Text';
    }
    return '';
  }

  override render() {
    if (!this.open) return nothing;

    const canImport = this._inputValue.trim() && this._detectedType && !this._importing;

    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}></div>
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header class="header">
          <h2 id="modal-title" class="title">
            Import to: <span class="channel-name">${this.channelTitle || 'Channel'}</span>
          </h2>
          <button
            class="close-button"
            @click=${this._close}
            aria-label="Close modal"
          >×</button>
        </header>

        <div class="input-section">
          <textarea
            class="main-input"
            placeholder="Paste URL, text, or drop a file..."
            .value=${this._inputValue}
            @input=${this._handleMainInput}
            ?disabled=${this._importing}
          ></textarea>
          <div class="input-hint">
            ${this._detectedType
              ? html`<span class="detected-type">${this._getTypeLabel()}</span>`
              : 'Supports: image/video/audio URLs, webpage links, or plain text'}
          </div>
        </div>

        ${this._detectedType ? html`
          <div class="preview-section">
            <div class="preview-row">
              ${this._renderPreview()}
              <div class="metadata-form">
                <div class="field">
                  <label class="field-label" for="title">Title</label>
                  <input
                    id="title"
                    class="field-input"
                    type="text"
                    .value=${this._formValues.title}
                    @input=${(e: Event) => this._handleFormInput('title', e)}
                    placeholder="Block title"
                    ?disabled=${this._importing}
                  />
                </div>

                <div class="field">
                  <label class="field-label" for="source-url">Source URL</label>
                  <input
                    id="source-url"
                    class="field-input"
                    type="url"
                    .value=${this._formValues.sourceUrl}
                    @input=${(e: Event) => this._handleFormInput('sourceUrl', e)}
                    placeholder="https://..."
                    ?disabled=${this._importing}
                  />
                </div>

                <div class="field-row">
                  <div class="field">
                    <label class="field-label" for="creator">Creator</label>
                    <input
                      id="creator"
                      class="field-input"
                      type="text"
                      .value=${this._formValues.creator}
                      @input=${(e: Event) => this._handleFormInput('creator', e)}
                      placeholder="Author or artist"
                      ?disabled=${this._importing}
                    />
                  </div>

                  <div class="field">
                    <label class="field-label" for="original-date">Date</label>
                    <input
                      id="original-date"
                      class="field-input"
                      type="text"
                      .value=${this._formValues.originalDate}
                      @input=${(e: Event) => this._handleFormInput('originalDate', e)}
                      placeholder="e.g., 2024"
                      ?disabled=${this._importing}
                    />
                  </div>
                </div>

                <div class="field">
                  <label class="field-label" for="notes">Notes</label>
                  <input
                    id="notes"
                    class="field-input"
                    type="text"
                    .value=${this._formValues.notes}
                    @input=${(e: Event) => this._handleFormInput('notes', e)}
                    placeholder="Optional notes"
                    ?disabled=${this._importing}
                  />
                </div>
              </div>
            </div>
          </div>
        ` : nothing}

        <footer class="footer">
          ${this._error ? html`
            <span class="error-message">${this._error}</span>
          ` : nothing}

          ${this._importing ? html`
            <span class="importing-message">Importing...</span>
          ` : nothing}

          <garden-button
            variant="ghost"
            size="sm"
            @click=${this._close}
            ?disabled=${this._importing}
          >
            Cancel
          </garden-button>

          <garden-button
            variant="solid"
            size="sm"
            @click=${this._handleImport}
            ?disabled=${!canImport}
          >
            Import
          </garden-button>
        </footer>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-import-modal': GardenImportModal;
  }
}
