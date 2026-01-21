import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Audio block component for displaying audio from the media directory.
 *
 * Designed to work with Tauri's asset:// protocol for local media files.
 * Features a minimal custom UI with waveform visualization possibility.
 *
 * @fires garden:play - When audio starts playing
 * @fires garden:pause - When audio is paused
 * @fires garden:ended - When audio playback ends
 * @fires garden:error - When audio fails to load
 * @fires garden:timeupdate - When playback position changes
 *
 * @example
 * ```html
 * <garden-audio-block
 *   src="asset://localhost/path/to/media/audio/abc123.mp3"
 *   track-title="My Song"
 *   artist="Artist Name"
 *   duration="180"
 * ></garden-audio-block>
 * ```
 */
@customElement('garden-audio-block')
export class GardenAudioBlock extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      .audio-container {
        border: 1px solid var(--garden-fg);
        background-color: var(--garden-bg);
        padding: var(--garden-space-4);
      }

      /* Header with metadata */
      .audio-header {
        display: flex;
        align-items: flex-start;
        gap: var(--garden-space-3);
        margin-bottom: var(--garden-space-3);
      }

      /* Play/Pause button */
      .play-button {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border: 1px solid var(--garden-fg);
        background-color: var(--garden-bg);
        color: var(--garden-fg);
        font-size: var(--garden-text-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out),
          color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .play-button:hover:not(:disabled) {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        color: var(--garden-bg);
        text-shadow:
          0 0 2px var(--garden-fg),
          0 0 4px var(--garden-fg);
      }

      .play-button:active:not(:disabled) {
        background-image: none;
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }

      .play-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .play-button:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }

      /* Metadata */
      .audio-meta {
        flex: 1;
        min-width: 0;
      }

      .audio-title {
        font-size: var(--garden-text-sm);
        font-weight: 700;
        color: var(--garden-fg);
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .audio-artist {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        margin: var(--garden-space-1) 0 0 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Progress bar area */
      .audio-progress {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
      }

      .progress-bar {
        flex: 1;
        height: 4px;
        background-color: var(--garden-bg-subtle, var(--garden-bg));
        border: 1px solid var(--garden-fg);
        cursor: pointer;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        background-color: var(--garden-fg);
        width: 0%;
        transition: width 0.1s linear;
      }

      /* Clickable progress overlay */
      .progress-bar:hover .progress-fill {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
      }

      .progress-bar:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Time display */
      .audio-time {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        font-family: var(--garden-font-mono);
        min-width: 80px;
        text-align: right;
      }

      /* Loading state */
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--garden-space-4);
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      /* Error state */
      .error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--garden-space-4);
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        text-align: center;
        gap: var(--garden-space-2);
      }

      .error-icon {
        font-size: var(--garden-text-xl);
        opacity: 0.5;
      }

      /* Hidden audio element */
      audio {
        display: none;
      }

      /* Compact variant */
      :host([compact]) .audio-container {
        padding: var(--garden-space-2) var(--garden-space-3);
      }

      :host([compact]) .audio-header {
        margin-bottom: var(--garden-space-2);
      }

      :host([compact]) .play-button {
        width: 32px;
        height: 32px;
        font-size: var(--garden-text-base);
      }
    `,
  ];

  /** Source URL for the audio (typically asset:// URL) */
  @property()
  src = '';

  /** Track title */
  @property({ attribute: 'track-title' })
  trackTitle?: string;

  /** Artist name */
  @property()
  artist?: string;

  /** Duration in seconds (from metadata) */
  @property({ type: Number })
  duration?: number;

  /** Autoplay the audio */
  @property({ type: Boolean })
  autoplay = false;

  /** Loop the audio */
  @property({ type: Boolean })
  loop = false;

  /** Compact display mode */
  @property({ type: Boolean, reflect: true })
  compact = false;

  /** Audio element reference */
  @query('audio')
  private _audio?: HTMLAudioElement;

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

  private _handleLoadedMetadata() {
    this._loading = false;
    this._error = null;
    if (this._audio) {
      this._totalDuration = this._audio.duration;
    }
  }

  private _handleError() {
    this._loading = false;
    this._error = 'Failed to load audio';
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
    this._currentTime = 0;
    this.emit('ended', { src: this.src });
  }

  private _handleTimeUpdate() {
    if (this._audio) {
      this._currentTime = this._audio.currentTime;
      this.emit('timeupdate', {
        currentTime: this._currentTime,
        duration: this._totalDuration,
      });
    }
  }

  private _togglePlayPause() {
    if (!this._audio) return;

    if (this._playing) {
      this._audio.pause();
    } else {
      this._audio.play();
    }
  }

  private _handleProgressClick(e: MouseEvent) {
    if (!this._audio || !this._totalDuration) return;

    const bar = e.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * this._totalDuration;

    this._audio.currentTime = newTime;
    this._currentTime = newTime;
  }

  private _handleProgressKeydown(e: KeyboardEvent) {
    if (!this._audio || !this._totalDuration) return;

    const step = 5; // seconds
    if (e.key === 'ArrowRight') {
      this._audio.currentTime = Math.min(this._currentTime + step, this._totalDuration);
    } else if (e.key === 'ArrowLeft') {
      this._audio.currentTime = Math.max(this._currentTime - step, 0);
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

  override render() {
    const displayDuration = this._totalDuration || this.duration || 0;
    const progressPercent = displayDuration > 0
      ? (this._currentTime / displayDuration) * 100
      : 0;

    // Use provided title or generate from src
    const displayTitle = this.trackTitle || this._getFilenameFromSrc();

    return html`
      <div class="audio-container">
        ${this._loading && !this._error ? html`
          <div class="loading">Loading audio...</div>
        ` : nothing}

        ${this._error ? html`
          <div class="error">
            <span class="error-icon">×</span>
            <span>${this._error}</span>
          </div>
        ` : nothing}

        ${!this._loading && !this._error ? html`
          <div class="audio-header">
            <button
              class="play-button"
              @click=${this._togglePlayPause}
              aria-label=${this._playing ? 'Pause' : 'Play'}
            >
              ${this._playing ? '⏸' : '▶'}
            </button>
            <div class="audio-meta">
              ${displayTitle ? html`<p class="audio-title">${displayTitle}</p>` : nothing}
              ${this.artist ? html`<p class="audio-artist">${this.artist}</p>` : nothing}
            </div>
          </div>

          <div class="audio-progress">
            <div
              class="progress-bar"
              tabindex="0"
              role="slider"
              aria-label="Audio progress"
              aria-valuemin="0"
              aria-valuemax=${displayDuration}
              aria-valuenow=${this._currentTime}
              @click=${this._handleProgressClick}
              @keydown=${this._handleProgressKeydown}
            >
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="audio-time">
              ${this._formatTime(this._currentTime)} / ${this._formatTime(displayDuration)}
            </span>
          </div>
        ` : nothing}

        ${this.src ? html`
          <audio
            src=${this.src}
            ?autoplay=${this.autoplay}
            ?loop=${this.loop}
            @loadedmetadata=${this._handleLoadedMetadata}
            @error=${this._handleError}
            @play=${this._handlePlay}
            @pause=${this._handlePause}
            @ended=${this._handleEnded}
            @timeupdate=${this._handleTimeUpdate}
          ></audio>
        ` : nothing}
      </div>
    `;
  }

  /** Extract filename from src URL for fallback title */
  private _getFilenameFromSrc(): string {
    if (!this.src) return '';
    try {
      const url = new URL(this.src);
      const pathname = url.pathname;
      const filename = pathname.split('/').pop() || '';
      // Remove extension and UUID prefix if present
      return filename.replace(/\.[^.]+$/, '').replace(/^[a-f0-9-]{36}\.?/, '');
    } catch {
      return '';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-audio-block': GardenAudioBlock;
  }
}
