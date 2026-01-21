import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { GardenElement } from '../GardenElement.js';
import { isTauri } from '@garden/types';

/**
 * Fullscreen mode states:
 * - 'normal': Standard inline view
 * - 'gallery': Fullscreen with matte/frame (preserves gallery aesthetic)
 * - 'immersive': Edge-to-edge fullscreen (maximum fidelity)
 */
type FullscreenMode = 'normal' | 'gallery' | 'immersive';

/**
 * Video block component for displaying videos from the media directory.
 *
 * Designed to work with Tauri's asset:// protocol for local media files.
 * Features custom controls below the video (not overlaying) matching the Garden design system.
 *
 * @fires garden:play - When video starts playing
 * @fires garden:pause - When video is paused
 * @fires garden:ended - When video playback ends
 * @fires garden:error - When video fails to load
 * @fires garden:timeupdate - When playback position changes
 *
 * @example
 * ```html
 * <garden-video-block
 *   src="asset://localhost/path/to/media/videos/abc123.mp4"
 *   width="1920"
 *   height="1080"
 *   duration="120"
 * ></garden-video-block>
 * ```
 */
@customElement('garden-video-block')
export class GardenVideoBlock extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      /* Outer wrapper for two floating boxes */
      .video-block {
        display: flex;
        flex-direction: column;
        gap: 3px;
        width: 100%;
      }

      /* Video container - first box */
      .video-container {
        position: relative;
        width: 100%;
        aspect-ratio: var(--aspect-ratio, 16 / 9);
        border: 1px solid var(--garden-fg);
        background-color: #000;
        overflow: hidden;
      }

      video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        background-color: #000;
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
        background-color: #000;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
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
        background-color: #000;
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

      /* Controls bar - second floating box */
      .controls {
        height: 24px;
        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        padding: 0 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Control button base - minimal, borderless */
      .control-button {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border: none;
        background-color: transparent;
        color: var(--garden-fg-muted);
        font-size: 9px;
        font-family: var(--garden-font-mono);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .control-button:hover:not(:disabled) {
        color: var(--garden-fg);
      }

      .control-button:active:not(:disabled) {
        color: var(--garden-fg);
      }

      .control-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .control-button:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 1px;
      }

      /* Progress bar - dithered fill for played portion */
      .progress-bar {
        flex: 1;
        height: 6px;
        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        cursor: pointer;
        position: relative;
        margin: 0 8px;
      }

      .progress-fill {
        height: 100%;
        /* Light dither pattern - always visible while playing */
        background-image: var(--garden-dither-25);
        background-color: var(--garden-fg);
        width: 0%;
        transition: width 0.1s linear;
        pointer-events: none;
        position: relative;
      }

      /* Playhead indicator - small line at current position */
      .progress-fill::after {
        content: '';
        position: absolute;
        right: 0;
        top: -1px;
        bottom: -1px;
        width: 2px;
        background-color: var(--garden-fg);
      }

      .progress-bar:hover {
        height: 8px;
        margin-top: -1px;
        margin-bottom: -1px;
      }

      .progress-bar:hover .progress-fill {
        /* Denser dither on hover for better feedback */
        background-image: var(--garden-dither-50);
      }

      .progress-bar:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Time display - compact */
      .time-display {
        flex-shrink: 0;
        font-size: 9px;
        color: var(--garden-fg-muted);
        font-family: var(--garden-font-mono);
        min-width: 58px;
        text-align: center;
        letter-spacing: -0.02em;
      }

      /* Volume button container for popover positioning */
      .volume-container {
        position: relative;
      }

      /* Volume popover - compact, appears above the button on hover */
      .volume-popover {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        padding: 6px;
        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        opacity: 0;
        visibility: hidden;
        transition:
          opacity var(--garden-duration-fast) var(--garden-ease-out),
          visibility var(--garden-duration-fast) var(--garden-ease-out);
      }

      .volume-container:hover .volume-popover,
      .volume-popover:hover {
        opacity: 1;
        visibility: visible;
      }

      /* Vertical volume slider - compact */
      .volume-slider {
        width: 2px;
        height: 60px;
        background-color: var(--garden-bg-subtle, rgba(0,0,0,0.1));
        border: none;
        cursor: pointer;
        position: relative;
      }

      .volume-fill {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: var(--garden-fg);
        pointer-events: none;
      }

      .volume-slider:hover {
        width: 4px;
        margin-left: -1px;
        margin-right: -1px;
      }

      .volume-slider:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      .volume-label {
        font-size: 8px;
        color: var(--garden-fg-muted);
        font-family: var(--garden-font-mono);
      }

      /* Constrained mode */
      :host([constrained]) .video-container {
        max-height: 80vh;
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
        align-items: center;
        justify-content: center;
      }

      /* Gallery mode - video with matte/frame aesthetic */
      .fullscreen-overlay.gallery {
        background-color: var(--garden-bg);
        padding: 40px;
        box-sizing: border-box;
      }

      .fullscreen-overlay.gallery .fullscreen-video-wrapper {
        width: 100%;
        height: calc(100% - 60px);
        display: flex;
        align-items: center;
        justify-content: center;
        /* Subtle frame around video */
        border: 1px solid var(--garden-fg);
        background-color: #000;
      }

      .fullscreen-overlay.gallery video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /* Immersive mode - edge-to-edge, maximum fidelity */
      .fullscreen-overlay.immersive {
        background-color: #000;
        padding: 0;
      }

      .fullscreen-overlay.immersive .fullscreen-video-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .fullscreen-overlay.immersive video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /* Floating controls - appear on hover in bottom 25% */
      .floating-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: var(--garden-space-4);
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        opacity: 0;
        visibility: hidden;
        transition:
          opacity var(--garden-duration-normal) var(--garden-ease-out),
          visibility var(--garden-duration-normal) var(--garden-ease-out);
      }

      .floating-controls.visible {
        opacity: 1;
        visibility: visible;
      }

      .floating-controls .controls-inner {
        max-width: 800px;
        margin: 0 auto;
        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        padding: 0 var(--garden-space-3);
        height: 32px;
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
      }

      .floating-controls .control-button {
        width: 24px;
        height: 24px;
        font-size: 11px;
      }

      .floating-controls .time-display {
        font-size: 10px;
        min-width: 70px;
      }

      .floating-controls .progress-bar {
        height: 8px;
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

      .floating-controls.visible + .mode-indicator,
      .mode-indicator:hover {
        opacity: 1;
      }
    `,
  ];

  /** Source URL for the video (typically asset:// URL) */
  @property()
  src = '';

  /** Poster image URL (optional) */
  @property()
  poster?: string;

  /** Original width of the video in pixels */
  @property({ type: Number })
  width?: number;

  /** Original height of the video in pixels */
  @property({ type: Number })
  height?: number;

  /** Duration in seconds */
  @property({ type: Number })
  duration?: number;

  /** Autoplay the video */
  @property({ type: Boolean })
  autoplay = false;

  /** Loop the video */
  @property({ type: Boolean })
  loop = false;

  /** Mute the video */
  @property({ type: Boolean })
  muted = false;

  /** Constrain to viewport height */
  @property({ type: Boolean, reflect: true })
  constrained = false;

  /** Controls visibility: 'default' shows controls, 'none' hides them */
  @property({ reflect: true })
  controls: 'default' | 'none' = 'default';

  /** Video element reference */
  @query('video')
  private _video?: HTMLVideoElement;

  /** Loading state */
  @state()
  private _loading = true;

  /** Error state */
  @state()
  private _error: string | null = null;

  /** Playing state */
  @state()
  private _playing = false;

  /** Current playback time in seconds */
  @state()
  private _currentTime = 0;

  /** Total duration (may update after load) */
  @state()
  private _totalDuration = 0;

  /** Current volume (0-1) */
  @state()
  private _volume = 1;

  /** Muted state */
  @state()
  private _isMuted = false;

  /** Current fullscreen mode */
  @state()
  private _fullscreenMode: FullscreenMode = 'normal';

  /** Whether floating controls are visible (for fullscreen modes) */
  @state()
  private _showFloatingControls = false;

  /** Timer for hiding floating controls */
  private _hideControlsTimer?: number;

  override connectedCallback() {
    super.connectedCallback();
    this._isMuted = this.muted;
    // Listen for fullscreen changes to update UI
    document.addEventListener('fullscreenchange', this._handleFullscreenChange);
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', this._handleKeydown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this._handleFullscreenChange);
    document.removeEventListener('keydown', this._handleKeydown);
    if (this._hideControlsTimer) {
      window.clearTimeout(this._hideControlsTimer);
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

  private _handleLoadedMetadata() {
    this._loading = false;
    this._error = null;
    if (this._video) {
      this._totalDuration = this._video.duration;
      this._volume = this._video.volume;
    }
  }

  private _handleError() {
    this._loading = false;
    this._error = 'Failed to load video';
    this.emit('error', { src: this.src, message: this._error });
  }

  private _handlePlay() {
    this._playing = true;
    this.emit('play', { src: this.src });
  }

  private _handlePause() {
    this._playing = false;
    this.emit('pause', { src: this.src });
  }

  private _handleEnded() {
    this._playing = false;
    this.emit('ended', { src: this.src });
  }

  private _handleTimeUpdate() {
    if (this._video) {
      this._currentTime = this._video.currentTime;
      this.emit('timeupdate', {
        currentTime: this._currentTime,
        duration: this._totalDuration,
      });
    }
  }

  private _handleVolumeChange() {
    if (this._video) {
      this._volume = this._video.volume;
      this._isMuted = this._video.muted;
    }
  }

  private _togglePlayPause() {
    if (!this._video) return;

    if (this._playing) {
      this._video.pause();
    } else {
      this._video.play();
    }
  }

  private _handleProgressClick(e: MouseEvent) {
    if (!this._video || !this._totalDuration) return;

    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * this._totalDuration;

    this._video.currentTime = newTime;
    this._currentTime = newTime;
  }

  private _handleProgressKeydown(e: KeyboardEvent) {
    if (!this._video || !this._totalDuration) return;

    const step = 5; // seconds
    if (e.key === 'ArrowRight') {
      this._video.currentTime = Math.min(this._currentTime + step, this._totalDuration);
    } else if (e.key === 'ArrowLeft') {
      this._video.currentTime = Math.max(this._currentTime - step, 0);
    }
  }

  private _toggleMute() {
    if (!this._video) return;
    this._video.muted = !this._video.muted;
    this._isMuted = this._video.muted;
  }

  private _handleVolumeClick(e: MouseEvent) {
    if (!this._video) return;

    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    // Vertical slider: calculate from bottom
    const percent = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));

    this._video.volume = percent;
    this._volume = percent;
    if (percent > 0 && this._video.muted) {
      this._video.muted = false;
      this._isMuted = false;
    }
  }

  private _handleVolumeKeydown(e: KeyboardEvent) {
    if (!this._video) return;

    const step = 0.1;
    if (e.key === 'ArrowUp') {
      this._video.volume = Math.min(1, this._volume + step);
    } else if (e.key === 'ArrowDown') {
      this._video.volume = Math.max(0, this._volume - step);
    }
  }

  /**
   * Enter fullscreen mode (gallery or immersive).
   *
   * Cross-platform implementation:
   * - In Tauri: Uses native window fullscreen API (works on macOS, Linux/Wayland, Windows)
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
          console.warn('[garden-video-block] Fullscreen not supported in this environment');
          return;
        }
      }
      // Only update state after successful fullscreen request
      this._fullscreenMode = mode;
      this._showFloatingControls = true;
      this._resetHideControlsTimer();
    } catch (err) {
      console.warn('[garden-video-block] Failed to enter fullscreen:', err);
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
      this._showFloatingControls = false;
      if (this._hideControlsTimer) {
        window.clearTimeout(this._hideControlsTimer);
      }
    } catch (err) {
      console.warn('[garden-video-block] Failed to exit fullscreen:', err);
      this.emit('fullscreen:error', { mode: 'exit', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  /**
   * Handle clicks on the floating controls background.
   * Stops propagation only for background clicks (not button clicks).
   */
  private _handleControlsBackgroundClick(e: Event) {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
    }
  }

  /**
   * Toggle between fullscreen modes from button click.
   */
  private _handleFullscreenButtonClick() {
    if (this._fullscreenMode === 'normal') {
      this._enterFullscreen('gallery');
    } else {
      this._exitFullscreen();
    }
  }

  /** Reset the timer that auto-hides floating controls */
  private _resetHideControlsTimer() {
    if (this._hideControlsTimer) {
      window.clearTimeout(this._hideControlsTimer);
    }
    this._hideControlsTimer = window.setTimeout(() => {
      if (this._fullscreenMode !== 'normal') {
        this._showFloatingControls = false;
      }
    }, 3000);
  }

  /** Handle mouse movement in fullscreen to show/hide controls */
  private _handleFullscreenMouseMove(e: MouseEvent) {
    if (this._fullscreenMode === 'normal') return;

    // Show controls when mouse is in bottom 25% of screen
    const threshold = window.innerHeight * 0.75;
    if (e.clientY > threshold) {
      this._showFloatingControls = true;
      this._resetHideControlsTimer();
    }
  }

  /** Format time as MM:SS or HH:MM:SS */
  private _formatTime(seconds: number): string {
    if (!isFinite(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /** Get minimal volume icon based on level - dev style using parens */
  private _getVolumeIcon(): string {
    if (this._isMuted || this._volume === 0) return '(×)';
    if (this._volume < 0.33) return '(·)';
    if (this._volume < 0.66) return '(()';
    return '(((';
  }

  /** Render the controls bar (shared between inline and floating) */
  private _renderControls(isFloating = false) {
    const displayDuration = this._totalDuration || this.duration || 0;
    const progressPercent = displayDuration > 0
      ? (this._currentTime / displayDuration) * 100
      : 0;
    const volumePercent = this._isMuted ? 0 : this._volume * 100;
    const isFullscreen = this._fullscreenMode !== 'normal';

    return html`
      <button
        class="control-button"
        @click=${this._togglePlayPause}
        aria-label=${this._playing ? 'Pause' : 'Play'}
        ?disabled=${this._loading || !!this._error}
      >
        ${this._playing ? '‖' : '▶'}
      </button>

      <div
        class="progress-bar"
        tabindex="0"
        role="slider"
        aria-label="Video progress"
        aria-valuemin="0"
        aria-valuemax=${displayDuration}
        aria-valuenow=${this._currentTime}
        @click=${this._handleProgressClick}
        @keydown=${this._handleProgressKeydown}
      >
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>

      <span class="time-display">
        ${this._formatTime(this._currentTime)}/${this._formatTime(displayDuration)}
      </span>

      ${!isFloating ? html`
        <div class="volume-container">
          <button
            class="control-button"
            @click=${this._toggleMute}
            aria-label=${this._isMuted ? 'Unmute' : 'Mute'}
          >
            ${this._getVolumeIcon()}
          </button>
          <div class="volume-popover">
            <div
              class="volume-slider"
              tabindex="0"
              role="slider"
              aria-label="Volume"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow=${Math.round(volumePercent)}
              aria-orientation="vertical"
              @click=${this._handleVolumeClick}
              @keydown=${this._handleVolumeKeydown}
            >
              <div class="volume-fill" style="height: ${volumePercent}%"></div>
            </div>
            <span class="volume-label">${Math.round(volumePercent)}</span>
          </div>
        </div>
      ` : html`
        <button
          class="control-button"
          @click=${this._toggleMute}
          aria-label=${this._isMuted ? 'Unmute' : 'Mute'}
        >
          ${this._getVolumeIcon()}
        </button>
      `}

      <button
        class="control-button"
        @click=${this._handleFullscreenButtonClick}
        aria-label=${isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        title=${isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
      >
        ${isFullscreen ? '×' : '⊞'}
      </button>
    `;
  }

  override render() {
    const aspectRatio = this.width && this.height
      ? `${this.width} / ${this.height}`
      : '16 / 9';

    const isFullscreen = this._fullscreenMode !== 'normal';

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
          @click=${this._togglePlayPause}
        >
          <div class="fullscreen-video-wrapper">
            ${this.src ? html`
              <video
                src=${this.src}
                poster=${this.poster || nothing}
                ?autoplay=${this.autoplay}
                ?loop=${this.loop}
                ?muted=${this.muted}
                playsinline
                @loadedmetadata=${this._handleLoadedMetadata}
                @error=${this._handleError}
                @play=${this._handlePlay}
                @pause=${this._handlePause}
                @ended=${this._handleEnded}
                @timeupdate=${this._handleTimeUpdate}
                @volumechange=${this._handleVolumeChange}
              ></video>
            ` : nothing}
          </div>

          <!-- Floating controls -->
          <div
            class=${classMap({
              'floating-controls': true,
              'visible': this._showFloatingControls,
            })}
            @click=${this._handleControlsBackgroundClick}
          >
            <div class="controls-inner">
              ${this._renderControls(true)}
            </div>
          </div>

          <!-- Mode indicator -->
          <div class="mode-indicator">
            ${this._fullscreenMode === 'gallery' ? 'Gallery' : 'Immersive'} · Esc to exit
          </div>
        </div>
      ` : nothing}

      <!-- Normal inline view -->
      <div class="video-block" style=${isFullscreen ? 'visibility: hidden; height: 0; overflow: hidden;' : ''}>
        <div
          class="video-container"
          style="--aspect-ratio: ${aspectRatio}"
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
            <video
              src=${this.src}
              poster=${this.poster || nothing}
              ?autoplay=${this.autoplay}
              ?loop=${this.loop}
              ?muted=${this.muted}
              playsinline
              @loadedmetadata=${this._handleLoadedMetadata}
              @error=${this._handleError}
              @play=${this._handlePlay}
              @pause=${this._handlePause}
              @ended=${this._handleEnded}
              @timeupdate=${this._handleTimeUpdate}
              @volumechange=${this._handleVolumeChange}
              @click=${this._togglePlayPause}
            ></video>
          ` : nothing}
        </div>

        ${this.controls !== 'none' ? html`
        <div class="controls">
          ${this._renderControls(false)}
        </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-video-block': GardenVideoBlock;
  }
}
