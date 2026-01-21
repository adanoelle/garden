import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Archive information component for displaying block metadata.
 *
 * Displays archival metadata in a label/value format. Used alongside
 * the block frame to show context about when and where content was
 * originally found.
 *
 * @fires garden:source-click - When the source link is clicked
 * @fires garden:channels-click - When the channels link is clicked
 */
@customElement('garden-archive-info')
export class GardenArchiveInfo extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .info-list {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-2);
      }

      /* Spacer pushes channels link to bottom */
      .spacer {
        flex: 1;
        min-height: var(--garden-space-4);
      }

      .channels-row {
        margin-top: auto;
      }

      .info-row {
        display: flex;
        gap: var(--garden-space-3);
        font-size: var(--garden-text-sm);
        line-height: var(--garden-leading-normal);
      }

      .label {
        color: var(--garden-fg-muted);
        min-width: 80px;
        text-align: right;
        flex-shrink: 0;
      }

      .value {
        color: var(--garden-fg);
      }

      /* Links have muted color, underline on hover */
      .value-link {
        color: var(--garden-fg-muted);
        text-decoration: none;
        cursor: pointer;
      }

      .value-link:hover {
        text-decoration: underline;
      }

      .value-link:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* External link indicator */
      .external-link::after {
        content: ' \\2197'; /* arrow */
        font-size: 0.8em;
      }

      /* Channels count as clickable link */
      .channels-link {
        color: var(--garden-fg-muted);
        text-decoration: none;
        cursor: pointer;
      }

      .channels-link:hover {
        text-decoration: underline;
      }
    `,
  ];

  /** When the block was archived (created_at) */
  @property()
  archivedAt?: string;

  /** Block content type (e.g., "Image", "Text", "Link") */
  @property()
  type?: string;

  /** Source URL where content was originally found */
  @property()
  sourceUrl?: string;

  /** Custom display text for the source link */
  @property()
  sourceTitle?: string;

  /** Creator/author of the original content */
  @property()
  creator?: string;

  /** Original publication date */
  @property()
  originalDate?: string;

  /** Number of channels this block belongs to */
  @property({ type: Number })
  channelCount?: number;

  private _formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  private _handleSourceClick(e: MouseEvent) {
    if (this.sourceUrl) {
      this.emit('source-click', { url: this.sourceUrl, originalEvent: e });
    }
  }

  private _handleChannelsClick(e: MouseEvent) {
    e.preventDefault();
    this.emit('channels-click', { originalEvent: e });
  }

  override render() {
    return html`
      <div class="info-list">
        ${this.archivedAt ? html`
          <div class="info-row">
            <span class="label">Archived</span>
            <span class="value">${this._formatDate(this.archivedAt)}</span>
          </div>
        ` : nothing}

        ${this.type ? html`
          <div class="info-row">
            <span class="label">Type</span>
            <span class="value">${this.type}</span>
          </div>
        ` : nothing}

        ${this.sourceUrl ? html`
          <div class="info-row">
            <span class="label">Source</span>
            <a
              class="value-link external-link"
              href=${this.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              @click=${this._handleSourceClick}
            >${this.sourceTitle || new URL(this.sourceUrl).hostname}</a>
          </div>
        ` : nothing}

        ${this.creator ? html`
          <div class="info-row">
            <span class="label">Creator</span>
            <span class="value">${this.creator}</span>
          </div>
        ` : nothing}

        ${this.originalDate ? html`
          <div class="info-row">
            <span class="label">Date</span>
            <span class="value">${this.originalDate}</span>
          </div>
        ` : nothing}
      </div>

      <!-- Spacer pushes channels link to bottom -->
      <div class="spacer"></div>

      ${this.channelCount !== undefined ? html`
        <div class="info-row channels-row">
          <span class="label"></span>
          <a
            class="channels-link"
            href="#"
            @click=${this._handleChannelsClick}
          >In ${this.channelCount} channel${this.channelCount !== 1 ? 's' : ''}</a>
        </div>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-archive-info': GardenArchiveInfo;
  }
}
