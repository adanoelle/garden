import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Notes section component for displaying and editing personal notes.
 *
 * Provides a full-width section with a muted heading and editable
 * text area for user notes. The text area has no visible border but
 * maintains proper spatial orientation.
 *
 * @fires garden:notes-change - When notes content changes
 * @fires garden:notes-save - When user finishes editing (blur)
 */
@customElement('garden-notes-section')
export class GardenNotesSection extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-3);
      }

      /* Divider line above notes */
      .divider {
        height: 1px;
        background-color: var(--garden-fg-muted);
        opacity: 0.5;
        margin-bottom: var(--garden-space-2);
      }

      /* Muted heading */
      .heading {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        font-weight: 400;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0;
      }

      /* Notes text area - invisible border, positioned in space */
      .notes-textarea {
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-base);
        line-height: var(--garden-leading-relaxed);
        color: var(--garden-fg);
        background: transparent;
        border: none;
        outline: none;
        resize: vertical;
        min-height: 100px;
        padding: 0;
        width: 100%;
      }

      .notes-textarea::placeholder {
        color: var(--garden-fg-muted);
        opacity: 0.6;
      }

      /* No visible focus indication - blank canvas feel */
      .notes-textarea:focus {
        /* Intentionally no visible focus indicator */
      }

      /* Read-only display for non-editable mode */
      .notes-text {
        font-size: var(--garden-text-base);
        line-height: var(--garden-leading-relaxed);
        color: var(--garden-fg);
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .notes-empty {
        color: var(--garden-fg-muted);
        font-style: italic;
      }
    `,
  ];

  /** Current notes content */
  @property()
  value = '';

  /** Placeholder text when notes are empty */
  @property()
  placeholder = 'Add personal notes about this block...';

  /** Whether notes are editable */
  @property({ type: Boolean })
  editable = true;

  /** Show divider line above section */
  @property({ type: Boolean, attribute: 'show-divider' })
  showDivider = true;

  @state()
  private _isDirty = false;

  private _handleInput(e: InputEvent) {
    const textarea = e.target as HTMLTextAreaElement;
    this._isDirty = textarea.value !== this.value;
    this.emit('notes-change', {
      value: textarea.value,
      isDirty: this._isDirty,
    });
  }

  private _handleBlur(e: FocusEvent) {
    const textarea = e.target as HTMLTextAreaElement;
    if (this._isDirty) {
      this.emit('notes-save', { value: textarea.value });
      this._isDirty = false;
    }
  }

  private _handleKeydown(e: KeyboardEvent) {
    // Save on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      this.emit('notes-save', { value: textarea.value });
      this._isDirty = false;
    }
  }

  override render() {
    return html`
      <div class="section">
        ${this.showDivider ? html`<div class="divider"></div>` : nothing}

        <h3 class="heading">Notes</h3>

        ${this.editable ? html`
          <textarea
            class="notes-textarea"
            .value=${this.value}
            placeholder=${this.placeholder}
            @input=${this._handleInput}
            @blur=${this._handleBlur}
            @keydown=${this._handleKeydown}
            aria-label="Personal notes"
          ></textarea>
        ` : html`
          ${this.value ? html`
            <div class="notes-text">${this.value}</div>
          ` : html`
            <div class="notes-empty">No notes</div>
          `}
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-notes-section': GardenNotesSection;
  }
}
