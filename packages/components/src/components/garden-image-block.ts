import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { GardenElement } from '../GardenElement.js';
import { isTauri } from '@garden/types';

/**
 * Fullscreen mode states:
 * - 'normal': Standard inline view with frame
 * - 'gallery': Fullscreen with matte/frame (preserves gallery aesthetic)
 * - 'immersive': Edge-to-edge fullscreen (maximum fidelity)
 */
type FullscreenMode = 'normal' | 'gallery' | 'immersive';

/**
 * Image block component for displaying images as framed gallery pieces.
 *
 * Designed with a gallery director's sensibility: images are treated as
 * artwork deserving proper framing, generous matte space, and thoughtful
 * presentation. Features two fullscreen modes for intimate viewing.
 *
 * @fires garden:load - When the image loads successfully
 * @fires garden:error - When the image fails to load
 * @fires garden:click - When the image is clicked (if clickable)
 * @fires garden:fullscreen - When entering/exiting fullscreen
 *
 * @example
 * ```html
 * <garden-image-block
 *   src="asset://localhost/path/to/media/images/abc123.jpg"
 *   alt="A beautiful landscape"
 *   width="1920"
 *   height="1080"
 * ></garden-image-block>
 * ```
 *
 * Keyboard shortcuts:
 * - F: Toggle gallery fullscreen (with matte)
 * - Shift+F: Enter immersive fullscreen (edge-to-edge)
 * - Escape: Exit fullscreen
 */
@customElement('garden-image-block')
export class GardenImageBlock extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      /* ========================================
       * Inline Framed Presentation
       * ======================================== */

      .image-block {
        display: flex;
        flex-direction: column;
        gap: 3px;
        width: 100%;
      }

      /* Frame container - the gallery frame */
      .frame {
        position: relative;
        width: 100%;
        border: 1px solid var(--garden-fg);
        background-color: var(--garden-bg-subtle, var(--garden-bg));
        overflow: hidden;
        cursor: pointer;
        transition: background-image var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Dither on hover - gallery interaction */
      .frame:hover {
        background-image: var(--garden-dither-25);
      }

      .frame:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Aspect ratio when dimensions known */
      .frame[data-aspect] {
        aspect-ratio: var(--aspect-ratio, auto);
      }

      img {
        display: block;
        width: 100%;
        height: auto;
        object-fit: contain;
      }

      /* Constrained mode - limit dimensions */
      :host([constrained]) .frame {
        max-height: 80vh;
      }

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

      /* ========================================
       * Frameless Mode (for embedding in block-frame)
       * Removes border but keeps natural image sizing with matte effect
       * ======================================== */

      :host([frameless]) .frame {
        border: none;
        background-color: transparent;
      }

      :host([frameless]) .frame:hover {
        background-image: none;
        cursor: pointer;
      }

      :host([frameless]) .plaque {
        display: none;
      }

      /* Loading state */
      .loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        font-family: var(--garden-font-mono);
      }

      /* Error state */
      .error {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
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

      /* Hidden image during loading */
      img.hidden {
        visibility: hidden;
        position: absolute;
      }

      /* ========================================
       * Museum Plaque (inline caption)
       * ======================================== */

      .plaque {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--garden-space-1) var(--garden-space-2);
        font-size: var(--garden-text-xs);
        font-family: var(--garden-font-mono);
        color: var(--garden-fg-muted);
        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        min-height: 20px;
      }

      .plaque-caption {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .plaque-dimensions {
        flex-shrink: 0;
        margin-left: var(--garden-space-2);
        opacity: 0.7;
      }

      /* ========================================
       * Fullscreen Modes
       * ======================================== */

      /* Fullscreen overlay - covers entire screen */
      .fullscreen-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      /* Gallery mode - image with matte/frame aesthetic */
      .fullscreen-overlay.gallery {
        background-color: var(--garden-bg);
        padding: 40px;
        box-sizing: border-box;
      }

      .fullscreen-overlay.gallery .fullscreen-image-wrapper {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Subtle frame around image */
        border: 1px solid var(--garden-fg);
        background-color: var(--garden-bg-subtle, var(--garden-bg));
        overflow: hidden;
      }

      .fullscreen-overlay.gallery img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      /* Immersive mode - edge-to-edge, maximum fidelity */
      .fullscreen-overlay.immersive {
        background-color: #000;
        padding: 0;
      }

      .fullscreen-overlay.immersive .fullscreen-image-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .fullscreen-overlay.immersive img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      /* Floating plaque - appears on hover in fullscreen */
      .floating-plaque {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        padding: var(--garden-space-2) var(--garden-space-4);
        font-size: var(--garden-text-sm);
        font-family: var(--garden-font-mono);
        color: var(--garden-fg);
        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        opacity: 0;
        visibility: hidden;
        transition:
          opacity var(--garden-duration-normal) var(--garden-ease-out),
          visibility var(--garden-duration-normal) var(--garden-ease-out);
        white-space: nowrap;
        max-width: calc(100% - 80px);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .floating-plaque.visible {
        opacity: 1;
        visibility: visible;
      }

      /* Immersive mode plaque - white on dark */
      .fullscreen-overlay.immersive .floating-plaque {
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.3);
      }

      /* Mode indicator badge */
      .mode-indicator {
        position: absolute;
        top: var(--garden-space-4);
        right: var(--garden-space-4);
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        font-family: var(--garden-font-mono);
        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        padding: var(--garden-space-1) var(--garden-space-2);
        opacity: 0;
        transition: opacity var(--garden-duration-fast) var(--garden-ease-out);
      }

      .floating-plaque.visible + .mode-indicator,
      .mode-indicator:hover {
        opacity: 1;
      }

      /* Immersive mode indicator */
      .fullscreen-overlay.immersive .mode-indicator {
        background-color: rgba(0, 0, 0, 0.8);
        color: rgba(255, 255, 255, 0.7);
        border-color: rgba(255, 255, 255, 0.3);
      }
    `,
  ];

  /** Source URL for the image (typically asset:// URL) */
  @property()
  src = '';

  /** Alt text for accessibility - displayed as caption */
  @property()
  alt = '';

  /** Original width of the image in pixels */
  @property({ type: Number })
  width?: number;

  /** Original height of the image in pixels */
  @property({ type: Number })
  height?: number;

  /** Makes the image clickable (emits garden:click event) */
  @property({ type: Boolean, reflect: true })
  clickable = false;

  /** Constrain image to viewport height */
  @property({ type: Boolean, reflect: true })
  constrained = false;

  /** Cover mode - fill container */
  @property({ type: Boolean, reflect: true })
  cover = false;

  /** Hide the caption plaque */
  @property({ type: Boolean, reflect: true })
  hideCaption = false;

  /** Frameless mode - removes border and plaque for embedding in parent frames */
  @property({ type: Boolean, reflect: true })
  frameless = false;

  /** Loading state */
  @state()
  private _loading = true;

  /** Error state */
  @state()
  private _error: string | null = null;

  /** Current fullscreen mode */
  @state()
  private _fullscreenMode: FullscreenMode = 'normal';

  /** Whether floating plaque is visible (for fullscreen modes) */
  @state()
  private _showFloatingPlaque = false;

  /** Timer for hiding floating plaque */
  private _hidePlaqueTimer?: number;

  override connectedCallback() {
    super.connectedCallback();
    // Listen for fullscreen changes to update UI
    document.addEventListener('fullscreenchange', this._handleFullscreenChange);
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', this._handleKeydown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this._handleFullscreenChange);
    document.removeEventListener('keydown', this._handleKeydown);
    if (this._hidePlaqueTimer) {
      window.clearTimeout(this._hidePlaqueTimer);
    }
  }

  /** Handle fullscreen state changes (browser API) */
  private _handleFullscreenChange = () => {
    // If browser exits fullscreen (e.g., via Escape), reset our mode
    if (!document.fullscreenElement && this._fullscreenMode !== 'normal') {
      this._fullscreenMode = 'normal';
    }
  };

  /**
   * Handle keyboard shortcuts for fullscreen modes
   * F = Gallery fullscreen (with matte)
   * Shift+F = Immersive fullscreen (edge-to-edge)
   * Escape = Exit fullscreen
   */
  private _handleKeydown = (e: KeyboardEvent) => {
    // Only respond if this component is focused or in fullscreen
    if (this._fullscreenMode === 'normal' && !this.contains(document.activeElement) && document.activeElement !== this) {
      return;
    }

    if (e.key === 'Escape' && this._fullscreenMode !== 'normal') {
      e.preventDefault();
      this._exitFullscreen();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+F: Immersive mode
        this._enterFullscreen('immersive');
      } else {
        // F: Gallery mode (or toggle if already in gallery)
        if (this._fullscreenMode === 'gallery') {
          this._exitFullscreen();
        } else {
          this._enterFullscreen('gallery');
        }
      }
    }
  };

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

  private _handleFrameClick(e: MouseEvent) {
    // If clickable mode, emit click event
    if (this.clickable) {
      this.emit('click', { src: this.src, originalEvent: e });
      return;
    }

    // Otherwise, enter gallery fullscreen
    this._enterFullscreen('gallery');
  }

  private _handleFrameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.clickable) {
        this.emit('click', { src: this.src, originalEvent: e });
      } else {
        this._enterFullscreen('gallery');
      }
    }
  }

  /**
   * Enter fullscreen mode (gallery or immersive).
   *
   * Cross-platform implementation:
   * - In Tauri: Uses native window fullscreen API
   * - In browser: Uses standard Fullscreen API on document element
   */
  private async _enterFullscreen(mode: 'gallery' | 'immersive') {
    try {
      if (isTauri()) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().setFullscreen(true);
      } else {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          console.warn('[garden-image-block] Fullscreen not supported in this environment');
          return;
        }
      }
      // Only update state after successful fullscreen request
      this._fullscreenMode = mode;
      this._showFloatingPlaque = true;
      this._resetHidePlaqueTimer();
      this.emit('fullscreen', { mode, src: this.src });
    } catch (err) {
      console.warn('[garden-image-block] Failed to enter fullscreen:', err);
      this.emit('fullscreen:error', { mode, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  /**
   * Exit fullscreen mode.
   */
  private async _exitFullscreen() {
    try {
      if (isTauri()) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().setFullscreen(false);
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      }
      // Only update state after successful exit
      this._fullscreenMode = 'normal';
      this._showFloatingPlaque = false;
      if (this._hidePlaqueTimer) {
        window.clearTimeout(this._hidePlaqueTimer);
      }
      this.emit('fullscreen', { mode: 'normal', src: this.src });
    } catch (err) {
      console.warn('[garden-image-block] Failed to exit fullscreen:', err);
      this.emit('fullscreen:error', { mode: 'exit', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  /** Handle click on fullscreen overlay to exit */
  private _handleOverlayClick() {
    this._exitFullscreen();
  }

  /** Reset the timer that auto-hides floating plaque */
  private _resetHidePlaqueTimer() {
    if (this._hidePlaqueTimer) {
      window.clearTimeout(this._hidePlaqueTimer);
    }
    this._hidePlaqueTimer = window.setTimeout(() => {
      if (this._fullscreenMode !== 'normal') {
        this._showFloatingPlaque = false;
      }
    }, 3000);
  }

  /** Handle mouse movement in fullscreen to show/hide plaque */
  private _handleFullscreenMouseMove() {
    if (this._fullscreenMode === 'normal') return;

    this._showFloatingPlaque = true;
    this._resetHidePlaqueTimer();
  }

  /** Format dimensions for display */
  private _formatDimensions(): string {
    if (this.width && this.height) {
      return `${this.width} × ${this.height}`;
    }
    return '';
  }

  /** Get plaque content */
  private _getPlaqueContent(): string {
    const parts: string[] = [];
    if (this.alt) {
      parts.push(this.alt);
    }
    const dims = this._formatDimensions();
    if (dims) {
      parts.push(dims);
    }
    return parts.join(' · ');
  }

  /** Check if we have any caption content */
  private _hasCaptionContent(): boolean {
    return !!(this.alt || (this.width && this.height));
  }

  override render() {
    const aspectRatio = this.width && this.height
      ? `${this.width} / ${this.height}`
      : undefined;

    const isFullscreen = this._fullscreenMode !== 'normal';
    const plaqueContent = this._getPlaqueContent();
    const showPlaque = !this.hideCaption && this._hasCaptionContent();

    return html`
      ${isFullscreen ? html`
        <!-- Fullscreen overlay -->
        <div
          class=${classMap({
            'fullscreen-overlay': true,
            'gallery': this._fullscreenMode === 'gallery',
            'immersive': this._fullscreenMode === 'immersive',
          })}
          @mousemove=${this._handleFullscreenMouseMove}
          @click=${this._handleOverlayClick}
        >
          <div class="fullscreen-image-wrapper">
            ${this.src ? html`
              <img
                src=${this.src}
                alt=${this.alt}
                @click=${(e: Event) => e.stopPropagation()}
              />
            ` : nothing}
          </div>

          <!-- Floating museum plaque -->
          ${plaqueContent ? html`
            <div class=${classMap({
              'floating-plaque': true,
              'visible': this._showFloatingPlaque,
            })}>
              ${plaqueContent}
            </div>
          ` : nothing}

          <!-- Mode indicator -->
          <div class="mode-indicator">
            ${this._fullscreenMode === 'gallery' ? 'Gallery' : 'Immersive'} · Esc to exit
          </div>
        </div>
      ` : nothing}

      <!-- Normal inline view -->
      <div class="image-block" style=${isFullscreen ? 'visibility: hidden; height: 0; overflow: hidden;' : ''}>
        <div
          class="frame"
          style=${aspectRatio ? `--aspect-ratio: ${aspectRatio}` : ''}
          ?data-aspect=${!!aspectRatio}
          tabindex="0"
          role="button"
          aria-label=${this.alt || 'View image'}
          @click=${this._handleFrameClick}
          @keydown=${this._handleFrameKeydown}
        >
          ${this._loading && !this._error ? html`
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

        ${showPlaque ? html`
          <div class="plaque">
            <span class="plaque-caption">${this.alt || ''}</span>
            ${this._formatDimensions() ? html`
              <span class="plaque-dimensions">${this._formatDimensions()}</span>
            ` : nothing}
          </div>
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
