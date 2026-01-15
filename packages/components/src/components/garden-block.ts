import { html, css, CSSResultGroup, nothing, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';
import { highlightStrudel, highlightStyles } from '../utils/strudel-highlight.js';

/**
 * Garden block component for Strudel live-coding patterns.
 *
 * Displays pattern code with play/stop controls. Integrates with
 * Strudel via lazy-loading when @strudel/web is available.
 *
 * @fires garden:play - When play button clicked
 * @fires garden:stop - When stop button clicked
 * @fires garden:change - When code is edited (in editable mode)
 * @fires garden:error - When an error occurs during playback
 */
@customElement('garden-block')
export class GardenBlock extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
        font-family: var(--garden-font-mono);
      }

      .block {
        border: var(--garden-border-width) solid var(--garden-fg);
        background-color: var(--garden-bg);
      }

      /* Header with controls */
      .block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--garden-space-2) var(--garden-space-3);
        border-bottom: var(--garden-border-width) solid var(--garden-fg);
        background-color: var(--garden-bg-subtle);
        transition: background-image var(--garden-duration-fast) var(--garden-ease-out);
      }

      .block-label {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
      }

      .block-controls {
        display: flex;
        gap: var(--garden-space-2);
      }

      /* Play/Stop buttons - small, inline */
      .control-btn {
        appearance: none;
        border: var(--garden-border-width) solid var(--garden-fg);
        background: transparent;
        color: var(--garden-fg);
        font-family: inherit;
        font-size: var(--garden-text-xs);
        padding: var(--garden-space-1) var(--garden-space-2);
        cursor: pointer;
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out),
          color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .control-btn:hover:not(:disabled) {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        color: var(--garden-bg);
        text-shadow:
          0 0 2px var(--garden-fg),
          0 0 4px var(--garden-fg),
          0 0 6px var(--garden-fg);
      }

      .control-btn:active:not(:disabled) {
        background-image: none;
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }

      .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Playing state indicator */
      :host([playing]) .block-header {
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
      }

      /* Code area */
      .block-code {
        padding: var(--garden-space-3);
        margin: 0;
        font-size: var(--garden-text-sm);
        line-height: var(--garden-leading-relaxed);
        white-space: pre-wrap;
        word-break: break-word;
        overflow-x: auto;
      }

      /* Textarea for editing */
      .block-textarea {
        width: 100%;
        min-height: 100px;
        padding: var(--garden-space-3);
        border: none;
        background: transparent;
        color: var(--garden-fg);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        line-height: var(--garden-leading-relaxed);
        resize: vertical;
      }

      .block-textarea:focus {
        outline: none;
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 4px var(--garden-bg),
          0 0 6px var(--garden-bg);
      }

      /* Error state */
      .block-error {
        padding: var(--garden-space-2) var(--garden-space-3);
        background-color: var(--garden-bg-muted);
        color: var(--garden-fg);
        font-size: var(--garden-text-xs);
        border-top: var(--garden-border-width) solid var(--garden-fg);
      }

      /* Editor container for overlay approach */
      .block-editor {
        position: relative;
        min-height: 100px;
      }

      /* Highlighted code backdrop */
      .block-highlight {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        padding: var(--garden-space-3);
        font-size: var(--garden-text-sm);
        line-height: var(--garden-leading-relaxed);
        white-space: pre-wrap;
        word-break: break-word;
        pointer-events: none;
        color: transparent;
      }

      /* Show highlighted code */
      .block-highlight code {
        color: var(--garden-fg);
      }

      /* Textarea sits on top, transparent text */
      .block-editor .block-textarea {
        position: relative;
        background: transparent;
        caret-color: var(--garden-fg);
      }

      /* Syntax highlighting colors */
      ${unsafeCSS(highlightStyles)}

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) .block {
        border: none;
        border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
      }

      :host([minimal]) .block-header {
        border-bottom: none;
        background-color: transparent;
        background-image: none !important;
        padding: var(--garden-space-2) 0;
      }

      :host([minimal]) .control-btn {
        border: none;
        padding: var(--garden-space-1);
      }

      :host([minimal]) .control-btn:hover:not(:disabled) {
        background-image: none;
        text-shadow: none;
        text-decoration: underline;
      }

      :host([minimal]) .block-code {
        padding: var(--garden-space-2) 0;
      }

      :host([minimal]) .block-error {
        border-top: none;
        padding: var(--garden-space-2) 0;
        background-color: transparent;
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .block {
          border: none;
          border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
        }

        :host(:not([density="full"])) .block-header {
          border-bottom: none;
          background-color: transparent;
          background-image: none !important;
          padding: var(--garden-space-2) 0;
        }

        :host(:not([density="full"])) .control-btn {
          border: none;
          padding: var(--garden-space-1);
        }

        :host(:not([density="full"])) .control-btn:hover:not(:disabled) {
          background-image: none;
          text-shadow: none;
          text-decoration: underline;
        }

        :host(:not([density="full"])) .block-code {
          padding: var(--garden-space-2) 0;
        }

        :host(:not([density="full"])) .block-error {
          border-top: none;
          padding: var(--garden-space-2) 0;
          background-color: transparent;
        }
      }
    `,
  ];

  /** The Strudel pattern code */
  @property()
  code = '';

  /** Whether the pattern is currently playing */
  @property({ type: Boolean, reflect: true })
  playing = false;

  /** Read-only mode (no editing) */
  @property({ type: Boolean, reflect: true })
  readonly = false;

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  /** Error message if Strudel fails */
  @state()
  private _error: string | null = null;

  /** Loading state */
  @state()
  private _loading = false;

  /** Strudel module interface for type safety */
  private static _strudelInitialized = false;
  private static _strudelModule: {
    initStrudel?: () => Promise<void>;
    getAudioContext?: () => AudioContext;
    getDestination?: () => AudioNode;
    hush?: () => void;
    [key: string]: unknown;
  } | null = null;
  private static _audioContext: AudioContext | null = null;
  private static _analyser: AnalyserNode | null = null;

  /** Get the audio analyser node for visualization */
  static getAnalyser(): AnalyserNode | null {
    return GardenBlock._analyser;
  }

  /** Get the audio context */
  static getAudioContext(): AudioContext | null {
    return GardenBlock._audioContext;
  }

  /** Check if we're in minimal mode (explicit or auto-detected) */
  private _isMinimalMode(): boolean {
    if (this.density === 'full') return false;
    if (this.minimal || this.density === 'minimal') return true;
    // Auto-detect based on viewport width
    return typeof window !== 'undefined' && window.innerWidth <= 640;
  }

  /**
   * Validate Strudel code for potentially dangerous operations.
   * Returns an error message if unsafe, or null if safe.
   */
  private _validateCode(code: string): string | null {
    // Patterns that could be used for code injection or data exfiltration
    const dangerousPatterns: Array<[RegExp, string]> = [
      [/\bfetch\s*\(/, 'Network requests (fetch) are not allowed'],
      [/\bimport\s*\(/, 'Dynamic imports are not allowed'],
      [/\beval\s*\(/, 'eval() is not allowed'],
      [/\bFunction\s*\(/, 'Function constructor is not allowed'],
      [/\bnew\s+Function\b/, 'Function constructor is not allowed'],
      [/\bWorker\s*\(/, 'Web Workers are not allowed'],
      [/\blocalStorage\b/, 'localStorage access is not allowed'],
      [/\bsessionStorage\b/, 'sessionStorage access is not allowed'],
      [/\bdocument\s*\./, 'DOM manipulation is not allowed'],
      [/\bwindow\s*\./, 'window access is not allowed'],
      [/\bglobalThis\b/, 'globalThis access is not allowed'],
      [/\bXMLHttpRequest\b/, 'XHR requests are not allowed'],
      [/\bWebSocket\b/, 'WebSocket connections are not allowed'],
    ];

    for (const [pattern, message] of dangerousPatterns) {
      if (pattern.test(code)) {
        return message;
      }
    }

    return null;
  }

  private async _initStrudel(): Promise<boolean> {
    if (GardenBlock._strudelInitialized) return true;

    this._loading = true;
    this._error = null;

    try {
      // Dynamic import of Strudel
      GardenBlock._strudelModule = await import('@strudel/web');

      // Initialize Strudel audio context
      if (GardenBlock._strudelModule.initStrudel) {
        await GardenBlock._strudelModule.initStrudel();
      }

      // Try to get the audio context from Strudel's global state
      if (GardenBlock._strudelModule.getAudioContext) {
        GardenBlock._audioContext = GardenBlock._strudelModule.getAudioContext();
      } else if (typeof window !== 'undefined') {
        // Strudel stores audio context globally
        const win = window as any;
        GardenBlock._audioContext = win.strudel?.audioContext ||
                                     win.getAudioContext?.() ||
                                     win.superdough?.ac;
      }

      // Create analyser node for visualization
      if (GardenBlock._audioContext) {
        GardenBlock._analyser = GardenBlock._audioContext.createAnalyser();
        GardenBlock._analyser.fftSize = 256;
        GardenBlock._analyser.smoothingTimeConstant = 0.7;

        // Try to connect to Strudel's master output
        // Strudel uses superdough which has a master gain node
        const win = typeof window !== 'undefined' ? window as any : null;
        const masterGain = win?.superdough?.master ||
                          win?.strudel?.master ||
                          GardenBlock._strudelModule.getDestination?.();

        if (masterGain && masterGain.connect) {
          // Insert analyser between master and destination
          masterGain.disconnect();
          masterGain.connect(GardenBlock._analyser);
          GardenBlock._analyser.connect(GardenBlock._audioContext.destination);
        }
        // If no master gain found, analyser won't capture audio but won't break
      }

      GardenBlock._strudelInitialized = true;
      this._loading = false;

      // Emit event so waveform can connect
      this.emit('strudel-ready', {
        audioContext: GardenBlock._audioContext,
        analyser: GardenBlock._analyser,
      });

      return true;
    } catch (e) {
      this._loading = false;
      this._error = `Failed to load Strudel: ${(e as Error).message}`;
      this.emit('error', { message: this._error, originalError: e });
      return false;
    }
  }

  private async _play() {
    // Validate code before execution
    const validationError = this._validateCode(this.code);
    if (validationError) {
      this._error = validationError;
      this.emit('error', { message: this._error, type: 'validation' });
      return;
    }

    const initialized = await this._initStrudel();
    if (!initialized) return;

    try {
      this._error = null;

      // Strudel uses eval-like pattern execution
      // The code should end with .play() or we wrap it
      const strudelModule = GardenBlock._strudelModule;
      if (!strudelModule) {
        throw new Error('Strudel module not loaded');
      }

      // Create a function that has access to all Strudel functions
      // Note: This is inherently unsafe, but we've validated the code above
      // to block known dangerous patterns. For full security, consider
      // using a sandboxed iframe or Web Worker.
      const evalInStrudelContext = new Function(
        ...Object.keys(strudelModule),
        `return (async () => { ${this.code} })();`
      );

      // Execute with Strudel functions in scope
      await evalInStrudelContext(...Object.values(strudelModule));

      this.playing = true;
      this.emit('play', { code: this.code });
    } catch (e) {
      this._error = (e as Error).message;
      this.emit('error', { message: this._error, type: 'runtime' });
    }
  }

  private _stop() {
    // Use Strudel's hush() to stop all audio
    if (GardenBlock._strudelModule?.hush) {
      GardenBlock._strudelModule.hush();
    }
    this.playing = false;
    this.emit('stop', {});
  }

  private _handleInput(e: InputEvent) {
    const textarea = e.target as HTMLTextAreaElement;
    this.code = textarea.value;
    this.emit('change', { code: this.code, originalEvent: e });
  }

  private _syncScroll(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    const highlight = this.shadowRoot?.querySelector('.block-highlight') as HTMLElement;
    if (highlight) {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
  }

  override render() {
    return html`
      <div class="block">
        <div class="block-header">
          <span class="block-label">${this._loading ? 'loading...' : 'strudel pattern'}</span>
          <div class="block-controls">
            <button
              class="control-btn"
              @click=${this._play}
              ?disabled=${this.playing || this._loading}
              aria-label="Play pattern"
              title="Play"
            >
              ▶
            </button>
            <button
              class="control-btn"
              @click=${this._stop}
              ?disabled=${!this.playing}
              aria-label="Stop pattern"
              title="Stop"
            >
              ■
            </button>
          </div>
        </div>

        ${this.readonly || this._isMinimalMode()
          ? html`<pre class="block-code"><code>${unsafeHTML(highlightStrudel(this.code))}</code></pre>`
          : html`
              <div class="block-editor">
                <div class="block-highlight"><code>${unsafeHTML(highlightStrudel(this.code))}</code></div>
                <textarea
                  class="block-textarea"
                  .value=${this.code}
                  @input=${this._handleInput}
                  @scroll=${this._syncScroll}
                  placeholder="Enter Strudel pattern..."
                  aria-label="Strudel pattern code"
                  spellcheck="false"
                ></textarea>
              </div>
            `}

        ${this._error ? html`<div class="block-error">${this._error}</div>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-block': GardenBlock;
  }
}
