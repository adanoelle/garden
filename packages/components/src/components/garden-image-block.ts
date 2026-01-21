import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Image block component for displaying images from the media directory.
 *
 * Designed to work with Tauri's asset:// protocol for local media files.
 * Provides loading states, error handling, and accessibility features.
 *
 * @fires garden:load - When the image loads successfully
 * @fires garden:error - When the image fails to load
 * @fires garden:click - When the image is clicked (if clickable)
 *
 * @example
 * ```html
 * <garden-image-block
 *   src="asset://localhost/path/to/media/images/abc123.jpg"
 *   alt="A beautiful landscape"
 *   width="800"
 *   height="600"
 * ></garden-image-block>
 * ```
 */
@customElement('garden-image-block')
export class GardenImageBlock extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      .image-container {
        position: relative;
        width: 100%;
        background-color: var(--garden-bg-subtle, var(--garden-bg));
      }

      /* Aspect ratio container when dimensions are known */
      .image-container[data-aspect] {
        aspect-ratio: var(--aspect-ratio, auto);
      }

      img {
        display: block;
        width: 100%;
        height: auto;
        object-fit: contain;
      }

      /* Constrained mode - limit dimensions */
      :host([constrained]) img {
        max-width: 100%;
        max-height: 80vh;
        width: auto;
        height: auto;
        margin: 0 auto;
      }

      /* Cover mode - fill container */
      :host([cover]) img {
        object-fit: cover;
        height: 100%;
      }

      /* Loading state */
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      /* Error state */
      .error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        padding: var(--garden-space-4);
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        text-align: center;
        gap: var(--garden-space-2);
      }

      .error-icon {
        font-size: var(--garden-text-2xl);
        opacity: 0.5;
      }

      /* Clickable state */
      :host([clickable]) .image-container {
        cursor: pointer;
        transition: opacity var(--garden-duration-fast) var(--garden-ease-out);
      }

      :host([clickable]) .image-container:hover {
        opacity: 0.9;
      }

      :host([clickable]) .image-container:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }

      /* Hidden image during loading */
      img.hidden {
        visibility: hidden;
        position: absolute;
      }
    `,
  ];

  /** Source URL for the image (typically asset:// URL) */
  @property()
  src = '';

  /** Alt text for accessibility */
  @property()
  alt = '';

  /** Original width of the image in pixels */
  @property({ type: Number })
  width?: number;

  /** Original height of the image in pixels */
  @property({ type: Number })
  height?: number;

  /** Makes the image clickable */
  @property({ type: Boolean, reflect: true })
  clickable = false;

  /** Constrain image to viewport */
  @property({ type: Boolean, reflect: true })
  constrained = false;

  /** Cover mode - fill container */
  @property({ type: Boolean, reflect: true })
  cover = false;

  /** Loading state */
  @state()
  private _loading = true;

  /** Error state */
  @state()
  private _error: string | null = null;

  private _handleLoad() {
    this._loading = false;
    this._error = null;
    this.emit('load', { src: this.src });
  }

  private _handleError() {
    this._loading = false;
    this._error = 'Failed to load image';
    this.emit('error', { src: this.src, message: this._error });
  }

  private _handleClick(e: MouseEvent) {
    if (!this.clickable) return;
    this.emit('click', { src: this.src, originalEvent: e });
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.emit('click', { src: this.src, originalEvent: e });
    }
  }

  override render() {
    const aspectRatio = this.width && this.height
      ? `${this.width} / ${this.height}`
      : undefined;

    return html`
      <div
        class="image-container"
        style=${aspectRatio ? `--aspect-ratio: ${aspectRatio}` : ''}
        ?data-aspect=${!!aspectRatio}
        tabindex=${this.clickable ? '0' : nothing}
        role=${this.clickable ? 'button' : nothing}
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
      >
        ${this._loading ? html`
          <div class="loading">Loading...</div>
        ` : nothing}

        ${this._error ? html`
          <div class="error">
            <span class="error-icon">×</span>
            <span>${this._error}</span>
          </div>
        ` : nothing}

        ${this.src ? html`
          <img
            class=${this._loading ? 'hidden' : ''}
            src=${this.src}
            alt=${this.alt}
            @load=${this._handleLoad}
            @error=${this._handleError}
          />
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-image-block': GardenImageBlock;
  }
}
