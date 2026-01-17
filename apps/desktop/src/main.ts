/**
 * Garden Desktop App - Entry Point
 */
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { garden, GardenError } from '@garden/types';
import type { Channel, NewChannel } from '@garden/types';

// Import Garden components to register custom elements
import '@garden/components';

/**
 * Main application shell.
 */
@customElement('garden-app')
class GardenApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--garden-font-mono);
      padding: var(--garden-space-4);
    }

    h1 {
      margin: 0 0 var(--garden-space-4);
      font-size: var(--garden-text-2xl);
      font-weight: 400;
    }

    .error {
      padding: var(--garden-space-3);
      background: var(--garden-fg);
      color: var(--garden-bg);
      margin-bottom: var(--garden-space-4);
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

    .empty {
      color: var(--garden-fg-muted);
      padding: var(--garden-space-4);
      text-align: center;
      border: 1px dashed var(--garden-fg-muted);
    }

    .create-form {
      display: flex;
      gap: var(--garden-space-2);
      margin-bottom: var(--garden-space-4);
    }

    .create-form input {
      flex: 1;
      padding: var(--garden-space-2);
      border: 1px solid var(--garden-fg);
      background: var(--garden-bg);
      color: var(--garden-fg);
      font-family: inherit;
      font-size: inherit;
    }

    .create-form input:focus {
      outline: 2px solid var(--garden-fg);
      outline-offset: -2px;
    }

    .stats {
      margin-bottom: var(--garden-space-4);
      font-size: var(--garden-text-sm);
      color: var(--garden-fg-muted);
    }

    .loading {
      color: var(--garden-fg-muted);
    }
  `;

  @state()
  private channels: Channel[] = [];

  @state()
  private loading = true;

  @state()
  private error: string | null = null;

  @state()
  private newChannelTitle = '';

  override async connectedCallback() {
    super.connectedCallback();
    await this.loadChannels();
  }

  private async loadChannels() {
    this.loading = true;
    this.error = null;

    try {
      const page = await garden.channels.list({ limit: 50 });
      this.channels = page.items;
    } catch (e) {
      if (e instanceof GardenError) {
        this.error = `${e.code}: ${e.message}`;
      } else {
        this.error = String(e);
      }
    } finally {
      this.loading = false;
    }
  }

  private async createChannel() {
    if (!this.newChannelTitle.trim()) return;

    try {
      const newChannel: NewChannel = {
        title: this.newChannelTitle.trim(),
        description: null,
      };

      await garden.channels.create(newChannel);
      this.newChannelTitle = '';
      await this.loadChannels();
    } catch (e) {
      if (e instanceof GardenError) {
        this.error = `${e.code}: ${e.message}`;
      } else {
        this.error = String(e);
      }
    }
  }

  private async deleteChannel(id: string) {
    try {
      await garden.channels.delete(id);
      await this.loadChannels();
    } catch (e) {
      if (e instanceof GardenError) {
        this.error = `${e.code}: ${e.message}`;
      } else {
        this.error = String(e);
      }
    }
  }

  private handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.newChannelTitle = input.value;
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.createChannel();
    }
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  override render() {
    return html`
      <h1>Garden</h1>

      ${this.error ? html`<div class="error">${this.error}</div>` : null}

      <div class="create-form">
        <input
          type="text"
          placeholder="New channel title..."
          .value=${this.newChannelTitle}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
        />
        <garden-button @click=${this.createChannel}>Create</garden-button>
      </div>

      <div class="stats">
        ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''}
      </div>

      ${this.loading
        ? html`<div class="loading">Loading...</div>`
        : this.channels.length === 0
          ? html`<div class="empty">No channels yet. Create one above!</div>`
          : html`
              <div class="channels">
                ${this.channels.map(
                  (channel) => html`
                    <div class="channel">
                      <div class="channel-info">
                        <span class="channel-title">${channel.title}</span>
                        ${channel.description
                          ? html`<span class="channel-description"
                              >${channel.description}</span
                            >`
                          : null}
                        <span class="channel-meta">
                          Created ${this.formatDate(channel.created_at)}
                        </span>
                      </div>
                      <garden-button
                        variant="ghost"
                        size="sm"
                        @click=${() => this.deleteChannel(channel.id)}
                      >
                        Delete
                      </garden-button>
                    </div>
                  `
                )}
              </div>
            `}
    `;
  }
}

// Mount the app
const app = document.getElementById('app');
if (app) {
  app.innerHTML = '<garden-app></garden-app>';
}
