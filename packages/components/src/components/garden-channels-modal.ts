import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Channel item data structure for the modal.
 */
export interface ChannelItem {
  id: string;
  title: string;
  description?: string;
  blockCount?: number;
}

/**
 * Modal component displaying channels that contain a block.
 *
 * Opens as an overlay with a list of channels. Each channel item
 * is clickable to navigate to that channel.
 *
 * @fires garden:channel-select - When a channel is clicked
 * @fires garden:modal-close - When modal is closed
 */
@customElement('garden-channels-modal')
export class GardenChannelsModal extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: contents;
      }

      /* Backdrop overlay */
      .backdrop {
        position: fixed;
        inset: 0;
        background-color: var(--garden-bg);
        opacity: 0.9;
        z-index: 100;
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

        min-width: 320px;
        max-width: 480px;
        max-height: 80vh;

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

      /* Channel list */
      .channel-list {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-2);
        overflow-y: auto;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      /* Channel item */
      .channel-item {
        display: block;
      }

      .channel-link {
        display: block;
        padding: var(--garden-space-3);
        text-decoration: none;
        color: var(--garden-fg);
        border: 1px solid transparent;
        transition: all var(--garden-duration-fast) var(--garden-ease-out);
      }

      .channel-link:hover {
        background-image: var(--garden-dither-50);
        color: var(--garden-bg);
      }

      .channel-link:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: -2px;
      }

      .channel-title {
        font-size: var(--garden-text-base);
        font-weight: 400;
        margin: 0 0 var(--garden-space-1) 0;
      }

      .channel-meta {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
      }

      .channel-link:hover .channel-meta {
        color: var(--garden-bg);
        opacity: 0.8;
      }

      /* Empty state */
      .empty {
        text-align: center;
        color: var(--garden-fg-muted);
        font-style: italic;
        padding: var(--garden-space-6);
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

  /** List of channels to display */
  @property({ type: Array })
  channels: ChannelItem[] = [];

  /** Title shown in the modal header */
  @property()
  modalTitle = 'Channels';

  override connectedCallback() {
    super.connectedCallback();
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        document.addEventListener('keydown', this._handleKeydown);
        // Focus the modal for keyboard navigation
        this.updateComplete.then(() => {
          const firstLink = this.shadowRoot?.querySelector('.channel-link') as HTMLElement;
          firstLink?.focus();
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

  private _handleChannelClick(e: MouseEvent, channel: ChannelItem) {
    e.preventDefault();
    this.emit('channel-select', { channel });
    this._close();
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

        ${this.channels.length > 0 ? html`
          <ul class="channel-list" role="list">
            ${this.channels.map(channel => html`
              <li class="channel-item">
                <a
                  class="channel-link"
                  href="#"
                  @click=${(e: MouseEvent) => this._handleChannelClick(e, channel)}
                >
                  <h3 class="channel-title">${channel.title}</h3>
                  ${channel.blockCount !== undefined ? html`
                    <span class="channel-meta">${channel.blockCount} block${channel.blockCount !== 1 ? 's' : ''}</span>
                  ` : nothing}
                </a>
              </li>
            `)}
          </ul>
        ` : html`
          <div class="empty">No channels</div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-channels-modal': GardenChannelsModal;
  }
}
