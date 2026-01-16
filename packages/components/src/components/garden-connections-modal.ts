import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { GardenElement } from '../GardenElement.js';

/**
 * A channel connection for a block.
 */
export interface BlockConnection {
  channelId: string;
  channelTitle: string;
  connectedAt?: string; // ISO date string
  isSource?: boolean;   // True if this is where the block was originally added
}

/**
 * Garden connections modal component.
 *
 * Shows all channels a block appears in, with options to:
 * - Navigate to any channel
 * - Remove the block from a channel
 * - Connect to another channel (opens waypoint)
 *
 * @fires garden:navigate - When user clicks to navigate to a channel
 * @fires garden:disconnect - When user removes block from a channel
 * @fires garden:connect-request - When user wants to connect to another channel
 * @fires garden:close - When modal is closed
 *
 * @example
 * ```html
 * <garden-connections-modal
 *   block-id="block-123"
 *   block-title="Commit Mono"
 *   .connections=${[
 *     { channelId: 'ch-1', channelTitle: 'Typography', isSource: true },
 *     { channelId: 'ch-2', channelTitle: 'Design Systems' }
 *   ]}
 *   open
 * ></garden-connections-modal>
 * ```
 */
@customElement('garden-connections-modal')
export class GardenConnectionsModal extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 1000;
      }

      :host([open]) {
        display: block;
      }

      /* Backdrop */
      .backdrop {
        position: absolute;
        inset: 0;
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
        opacity: 0;
        transition: opacity var(--garden-duration-normal) var(--garden-ease-out);
      }

      :host([open]) .backdrop {
        opacity: 1;
      }

      /* Modal container */
      .modal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(400px, calc(100vw - var(--garden-space-8)));
        max-height: calc(100vh - var(--garden-space-16));
        background: var(--garden-bg);
        border: var(--garden-border-width) solid var(--garden-fg);
        display: flex;
        flex-direction: column;
        overflow: hidden;

        opacity: 0;
        transform: translate(-50%, -48%);
        transition:
          opacity var(--garden-duration-fast) var(--garden-ease-out),
          transform var(--garden-duration-fast) var(--garden-ease-out);
      }

      :host([open]) .modal {
        opacity: 1;
        transform: translate(-50%, -50%);
      }

      /* Header */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--garden-space-3) var(--garden-space-4);
        border-bottom: var(--garden-border-width) solid var(--garden-fg);
      }

      .title {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg);
      }

      .title .block-name {
        font-weight: 700;
      }

      .title .count {
        color: var(--garden-fg-muted);
      }

      .close-btn {
        appearance: none;
        background: none;
        border: none;
        font: inherit;
        font-size: var(--garden-text-lg);
        color: var(--garden-fg-muted);
        cursor: pointer;
        padding: var(--garden-space-1);
        line-height: 1;
        transition: color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .close-btn:hover {
        color: var(--garden-fg);
      }

      /* Content */
      .content {
        flex: 1;
        overflow-y: auto;
        padding: var(--garden-space-3) 0;
      }

      /* Connection item */
      .connection {
        display: flex;
        align-items: center;
        padding: var(--garden-space-2) var(--garden-space-4);
        transition: background-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .connection:hover {
        background-color: var(--garden-bg-subtle);
      }

      .connection-title {
        flex: 1;
        font-size: var(--garden-text-sm);
        cursor: pointer;
      }

      .connection-title:hover {
        text-decoration: underline;
      }

      .source-badge {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        margin-left: var(--garden-space-2);
      }

      .connection-actions {
        display: flex;
        align-items: center;
        gap: var(--garden-space-1);
      }

      .action-btn {
        appearance: none;
        background: none;
        border: 1px solid transparent;
        font: inherit;
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        cursor: pointer;
        padding: var(--garden-space-1) var(--garden-space-2);
        transition:
          color var(--garden-duration-fast) var(--garden-ease-out),
          border-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .action-btn:hover {
        color: var(--garden-fg);
        border-color: var(--garden-fg);
      }

      .action-btn:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 1px;
      }

      .action-btn.remove:hover {
        color: var(--garden-fg);
      }

      /* Empty state */
      .empty {
        padding: var(--garden-space-4);
        text-align: center;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      /* Footer with add action */
      .footer {
        padding: var(--garden-space-3) var(--garden-space-4);
        border-top: var(--garden-border-width) solid var(--garden-fg-muted);
      }

      .add-connection {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        cursor: pointer;
        transition: color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .add-connection:hover {
        color: var(--garden-fg);
      }

      .add-connection::before {
        content: '+';
        font-size: var(--garden-text-base);
      }

      /* Confirm disconnect */
      .confirm-disconnect {
        padding: var(--garden-space-3) var(--garden-space-4);
        background: var(--garden-bg-subtle);
        border-top: 1px solid var(--garden-fg-muted);
      }

      .confirm-message {
        font-size: var(--garden-text-sm);
        margin-bottom: var(--garden-space-3);
      }

      .confirm-message .warning {
        color: var(--garden-fg);
        font-weight: 700;
      }

      .confirm-actions {
        display: flex;
        gap: var(--garden-space-2);
        justify-content: flex-end;
      }

      /* Mobile */
      @media (max-width: 640px) {
        .modal {
          width: calc(100vw - var(--garden-space-4));
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .backdrop,
        .modal {
          transition: none;
        }
      }
    `
  ];

  /** Block ID */
  @property({ attribute: 'block-id' })
  blockId = '';

  /** Block title for display */
  @property({ attribute: 'block-title' })
  blockTitle = '';

  /** List of channel connections */
  @property({ type: Array })
  connections: BlockConnection[] = [];

  /** Whether modal is open */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Channel pending disconnect confirmation */
  @property({ type: String })
  private _pendingDisconnect: string | null = null;

  private _boundKeyHandler = this._handleKeydown.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._boundKeyHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._boundKeyHandler);
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (this._pendingDisconnect) {
        this._pendingDisconnect = null;
      } else {
        this.close();
      }
    }
  }

  private _handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private _navigateToChannel(connection: BlockConnection) {
    this.emit('navigate', {
      id: connection.channelId,
      title: connection.channelTitle,
      type: 'channel'
    });
    this.close();
  }

  private _requestDisconnect(connection: BlockConnection) {
    // If this is the last connection, show warning
    if (this.connections.length === 1) {
      this._pendingDisconnect = connection.channelId;
    } else {
      this._confirmDisconnect(connection);
    }
  }

  private _confirmDisconnect(connection: BlockConnection) {
    this.emit('disconnect', {
      blockId: this.blockId,
      blockTitle: this.blockTitle,
      channelId: connection.channelId,
      channelTitle: connection.channelTitle,
      isLastConnection: this.connections.length === 1
    });
    this._pendingDisconnect = null;

    // Remove from local list for immediate UI feedback
    this.connections = this.connections.filter(c => c.channelId !== connection.channelId);

    // Close if no connections left
    if (this.connections.length === 0) {
      this.close();
    }
  }

  private _cancelDisconnect() {
    this._pendingDisconnect = null;
  }

  private _requestConnect() {
    this.emit('connect-request', {
      blockId: this.blockId,
      blockTitle: this.blockTitle
    });
    this.close();
  }

  /** Show the modal */
  show() {
    this.open = true;
    this._pendingDisconnect = null;
  }

  /** Close the modal */
  close() {
    this.open = false;
    this._pendingDisconnect = null;
    this.emit('close', {});
  }

  private _renderConnection(connection: BlockConnection) {
    return html`
      <div class="connection">
        <span
          class="connection-title"
          @click=${() => this._navigateToChannel(connection)}
          tabindex="0"
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') this._navigateToChannel(connection);
          }}
        >
          ${connection.channelTitle}
          ${connection.isSource ? html`<span class="source-badge">(source)</span>` : nothing}
        </span>
        <div class="connection-actions">
          <button
            class="action-btn"
            @click=${() => this._navigateToChannel(connection)}
            title="Go to channel"
          >→</button>
          <button
            class="action-btn remove"
            @click=${() => this._requestDisconnect(connection)}
            title="Remove from channel"
          >⊖</button>
        </div>
      </div>
    `;
  }

  private _renderConfirmDisconnect() {
    const connection = this.connections.find(c => c.channelId === this._pendingDisconnect);
    if (!connection) return nothing;

    return html`
      <div class="confirm-disconnect">
        <p class="confirm-message">
          <span class="warning">This is the last connection.</span><br>
          Removing "${this.blockTitle}" from "${connection.channelTitle}" will leave it unconnected.
        </p>
        <div class="confirm-actions">
          <garden-button variant="ghost" size="sm" @click=${this._cancelDisconnect}>
            Cancel
          </garden-button>
          <garden-button size="sm" @click=${() => this._confirmDisconnect(connection)}>
            Remove anyway
          </garden-button>
        </div>
      </div>
    `;
  }

  override render() {
    const count = this.connections.length;

    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Block connections">
        <div class="header">
          <span class="title">
            "<span class="block-name">${this.blockTitle}</span>"
            <span class="count">appears in ${count} channel${count !== 1 ? 's' : ''}</span>
          </span>
          <button class="close-btn" @click=${() => this.close()} aria-label="Close">×</button>
        </div>

        <div class="content">
          ${count === 0 ? html`
            <p class="empty">This block isn't connected to any channels yet.</p>
          ` : html`
            ${repeat(
              this.connections,
              conn => conn.channelId,
              conn => this._renderConnection(conn)
            )}
          `}
        </div>

        ${this._pendingDisconnect ? this._renderConfirmDisconnect() : html`
          <div class="footer">
            <div
              class="add-connection"
              @click=${this._requestConnect}
              tabindex="0"
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') this._requestConnect();
              }}
            >
              Connect to another channel...
            </div>
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-connections-modal': GardenConnectionsModal;
  }
}
