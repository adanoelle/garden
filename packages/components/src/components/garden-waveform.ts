import { html, css, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden waveform visualizer component.
 *
 * A persistent audio spectrum analyzer that sits at the bottom-right of the screen.
 * Shows solid bars for current amplitude and dithered "ghost" peaks that fall slowly.
 *
 * @fires garden:click - When the visualizer is clicked
 */
@customElement('garden-waveform')
export class GardenWaveform extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        position: fixed;
        bottom: var(--garden-space-4);
        right: var(--garden-space-4);
        z-index: 999;
        pointer-events: auto;
      }

      .visualizer {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        padding: var(--garden-space-2);
        background-color: var(--garden-bg);
        border: var(--garden-border-width) solid var(--garden-fg);
        cursor: pointer;
        min-height: 60px;
      }

      .visualizer:hover {
        background-color: var(--garden-bg-subtle);
      }

      .bar-container {
        position: relative;
        width: 8px;
        height: 48px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }

      /* Ghost peak (dithered) */
      .bar-ghost {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        background-color: transparent;
        transition: height 0.05s linear;
      }

      /* Current amplitude (solid) */
      .bar-solid {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: var(--garden-fg);
        transition: height 0.05s linear;
      }

      /* Idle state */
      :host(:not([playing])) .bar-solid {
        height: 2px !important;
        background-color: var(--garden-fg-muted);
      }

      :host(:not([playing])) .bar-ghost {
        height: 0 !important;
      }

      /* Label */
      .label {
        position: absolute;
        bottom: 100%;
        right: 0;
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        padding-bottom: var(--garden-space-1);
        white-space: nowrap;
        opacity: 0;
        transition: opacity var(--garden-duration-fast) var(--garden-ease-out);
      }

      .visualizer:hover .label {
        opacity: 1;
      }

      /* Borderless variant */
      :host([borderless]) .visualizer {
        background: transparent;
        border: none;
        padding: 0;
      }

      :host([borderless]) .visualizer:hover {
        background: transparent;
      }

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) {
        position: relative;
        bottom: auto;
        right: auto;
      }

      :host([minimal]) .visualizer {
        background: transparent;
        border: none;
        border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
        padding: var(--garden-space-2) 0;
        justify-content: center;
      }

      :host([minimal]) .visualizer:hover {
        background: transparent;
      }

      :host([minimal]) .bar-container {
        width: 4px;
        height: 24px;
      }

      :host([minimal]) .label {
        display: none;
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) {
          position: relative;
          bottom: auto;
          right: auto;
        }

        :host(:not([density="full"])) .visualizer {
          background: transparent;
          border: none;
          border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
          padding: var(--garden-space-2) 0;
          justify-content: center;
        }

        :host(:not([density="full"])) .visualizer:hover {
          background: transparent;
        }

        :host(:not([density="full"])) .bar-container {
          width: 4px;
          height: 24px;
        }

        :host(:not([density="full"])) .label {
          display: none;
        }
      }
    `,
  ];

  /** Number of frequency bars */
  @property({ type: Number })
  bars = 16;

  /** Whether audio is currently playing */
  @property({ type: Boolean, reflect: true })
  playing = false;

  /** Maximum bar height in pixels */
  @property({ type: Number, attribute: 'bar-height' })
  barHeight = 48;

  /** Peak fall speed (higher = faster fall) */
  @property({ type: Number, attribute: 'peak-decay' })
  peakDecay = 0.02;

  /** Hide the border/background */
  @property({ type: Boolean, reflect: true })
  borderless = false;

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  /** Audio analyser node (set externally) */
  analyser: AnalyserNode | null = null;

  @state()
  private _amplitudes: number[] = [];

  @state()
  private _peaks: number[] = [];

  private _animationId: number | null = null;
  private _dataArray: Uint8Array<ArrayBuffer> | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this._initArrays();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._stopAnimation();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('bars')) {
      this._initArrays();
    }
    if (changedProperties.has('playing')) {
      if (this.playing) {
        this._startAnimation();
      } else {
        this._stopAnimation();
      }
    }
  }

  private _initArrays() {
    this._amplitudes = new Array(this.bars).fill(0);
    this._peaks = new Array(this.bars).fill(0);
  }

  /**
   * Connect to an audio source for visualization
   */
  connectAnalyser(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.analyser.fftSize = Math.max(32, this.bars * 4);
    this._dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /**
   * Create analyser from AudioContext
   */
  createAnalyser(audioContext: AudioContext, source?: AudioNode): AnalyserNode {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = Math.max(32, this.bars * 4);
    analyser.smoothingTimeConstant = 0.8;
    this._dataArray = new Uint8Array(analyser.frequencyBinCount);

    if (source) {
      source.connect(analyser);
    }

    this.analyser = analyser;
    return analyser;
  }

  private _startAnimation() {
    if (this._animationId) return;

    const animate = () => {
      this._updateVisualization();
      this._animationId = requestAnimationFrame(animate);
    };

    this._animationId = requestAnimationFrame(animate);
  }

  private _stopAnimation() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }

    // Animate bars down to idle
    this._amplitudes = this._amplitudes.map(() => 0);
    this._peaks = this._peaks.map(() => 0);
    this.requestUpdate();
  }

  private _updateVisualization() {
    if (!this.analyser || !this._dataArray) {
      // Demo mode: generate fake data
      this._updateDemoMode();
      return;
    }

    this.analyser.getByteFrequencyData(this._dataArray as Uint8Array<ArrayBuffer>);

    const binSize = Math.floor(this._dataArray.length / this.bars);
    const newAmplitudes: number[] = [];
    const newPeaks: number[] = [];

    for (let i = 0; i < this.bars; i++) {
      // Average the frequency bins for this bar
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += this._dataArray[i * binSize + j];
      }
      const amplitude = sum / binSize / 255; // Normalize to 0-1

      newAmplitudes.push(amplitude);

      // Update peaks with slow decay
      const currentPeak = this._peaks[i] || 0;
      if (amplitude >= currentPeak) {
        newPeaks.push(amplitude);
      } else {
        newPeaks.push(Math.max(0, currentPeak - this.peakDecay));
      }
    }

    this._amplitudes = newAmplitudes;
    this._peaks = newPeaks;
    this.requestUpdate();
  }

  private _demoTime = 0;
  private _updateDemoMode() {
    // Use modulo to prevent float precision issues from unbounded growth
    this._demoTime = (this._demoTime + 0.1) % (Math.PI * 20);

    const newAmplitudes: number[] = [];
    const newPeaks: number[] = [];

    for (let i = 0; i < this.bars; i++) {
      // Generate varied waveform based on position and time
      // Negative i coefficient makes wave travel left-to-right
      const base = Math.sin(this._demoTime - i * 0.3) * 0.3 + 0.4;
      const variation = Math.sin(this._demoTime * 2.5 - i * 0.7) * 0.2;
      const accent = i % 4 === 0 ? Math.sin(this._demoTime * 4) * 0.15 : 0;
      const amplitude = Math.max(0, Math.min(1, base + variation + accent));

      newAmplitudes.push(amplitude);

      // Update peaks
      const currentPeak = this._peaks[i] || 0;
      if (amplitude >= currentPeak) {
        newPeaks.push(amplitude);
      } else {
        newPeaks.push(Math.max(0, currentPeak - this.peakDecay));
      }
    }

    this._amplitudes = newAmplitudes;
    this._peaks = newPeaks;
    this.requestUpdate();
  }

  private _handleClick() {
    this.emit('click', { playing: this.playing });
  }

  override render() {
    return html`
      <div class="visualizer" @click=${this._handleClick}>
        <span class="label">${this.playing ? 'playing' : 'idle'}</span>
        ${this._amplitudes.map(
          (amp, i) => html`
            <div class="bar-container" style="height: ${this.barHeight}px">
              <div
                class="bar-ghost"
                style="height: ${this._peaks[i] * 100}%"
              ></div>
              <div
                class="bar-solid"
                style="height: ${amp * 100}%"
              ></div>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-waveform': GardenWaveform;
  }
}
