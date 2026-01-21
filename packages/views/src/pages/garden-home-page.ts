import { html, css, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenView } from '../GardenView.js';
import { garden, GardenError } from '@garden/types';
import type { Channel, NewChannel } from '@garden/types';

// Import components for side effects
import '@garden/components';

/**
 * Home page showing list of channels with create functionality.
 *
 * Events:
 * - garden:channel-created: When a new channel is created
 * - garden:channel-deleted: When a channel is deleted
 * - garden:channel-selected: When a channel is clicked
 */
@customElement('garden-home-page')
export class GardenHomePage extends GardenView {
  static override styles: CSSResultGroup = [
    GardenView.sharedStyles,
    css`
      .create-form {
        display: flex;
        gap: var(--garden-space-2);
        margin-bottom: var(--garden-space-4);
      }

      .stats {
        margin-bottom: var(--garden-space-4);
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
      }

      .channels {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-2);
      }

      .channel {
        padding: var(--garden-space-3);
        border: 1px solid var(--garden-fg);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: background-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .channel:hover {
        background-image: var(--garden-dither-25);
        background-size: 2px 2px;
      }

      .channel-info {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-1);
      }

      .channel-title {
        font-weight: 700;
      }

      .channel-description {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      .channel-meta {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
      }

      .channel-actions {
        display: flex;
        gap: var(--garden-space-2);
      }

      .empty {
        color: var(--garden-fg-muted);
        padding: var(--garden-space-4);
        text-align: center;
        border: 1px dashed var(--garden-fg-muted);
      }

      .error {
        padding: var(--garden-space-3);
        background: var(--garden-fg);
        color: var(--garden-bg);
        margin-bottom: var(--garden-space-4);
      }
    `,
  ];

  @property({ type: Array })
  channels: Channel[] = [];

  @state()
  private newChannelTitle = '';

  @state()
  private error: string | null = null;

  private handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    this.newChannelTitle = input.value;
  };

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.createChannel();
    }
  };

  private async createChannel() {
    if (!this.newChannelTitle.trim()) return;

    try {
      const newChannel: NewChannel = {
        title: this.newChannelTitle.trim(),
        description: null,
      };

      const channel = await garden.channels.create(newChannel);
      this.newChannelTitle = '';
      this.error = null;
      this.emit('channel-created', { channel });
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  }

  private async deleteChannel(id: string, e: Event) {
    e.stopPropagation(); // Don't trigger channel selection
    try {
      await garden.channels.delete(id);
      this.error = null;
      this.emit('channel-deleted', { id });
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  }

  private handleChannelClick(channel: Channel) {
    this.emit('channel-selected', { id: channel.id });
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  override render() {
    return html`
      ${this.error ? html`<div class="error">${this.error}</div>` : null}

      <div class="create-form">
        <garden-input
          placeholder="New channel title..."
          .value=${this.newChannelTitle}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
          full
        ></garden-input>
        <garden-button @click=${() => this.createChannel()}>Create</garden-button>
      </div>

      <div class="stats">
        ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''}
      </div>

      ${this.channels.length === 0
        ? html`<div class="empty">No channels yet. Create one above!</div>`
        : html`
            <div class="channels">
              ${this.channels.map(
                (channel) => html`
                  <div class="channel" @click=${() => this.handleChannelClick(channel)}>
                    <div class="channel-info">
                      <span class="channel-title">${channel.title}</span>
                      ${channel.description
                        ? html`<span class="channel-description">${channel.description}</span>`
                        : null}
                      <span class="channel-meta">
                        Created ${this.formatDate(channel.created_at)}
                      </span>
                    </div>
                    <div class="channel-actions">
                      <garden-button
                        variant="ghost"
                        size="sm"
                        @click=${(e: Event) => this.deleteChannel(channel.id, e)}
                      >
                        Delete
                      </garden-button>
                    </div>
                  </div>
                `
              )}
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-home-page': GardenHomePage;
  }
}
