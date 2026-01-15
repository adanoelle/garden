/**
 * Simple syntax highlighter for Strudel patterns.
 * Returns HTML with spans for different token types.
 */

// Strudel functions
const FUNCTIONS = [
  'note', 's', 'sound', 'n', 'gain', 'pan', 'speed', 'cut', 'cutoff', 'lpf', 'hpf',
  'resonance', 'delay', 'delaytime', 'delayfeedback', 'room', 'size', 'orbit',
  'slow', 'fast', 'rev', 'jux', 'every', 'sometimes', 'often', 'rarely',
  'stack', 'cat', 'seq', 'polyrhythm', 'polymeter',
  'play', 'stop', 'hush', 'silence',
  'struct', 'mask', 'euclidean', 'euclid',
  'add', 'sub', 'mul', 'div', 'mod',
  'sine', 'saw', 'square', 'triangle', 'noise',
  'chord', 'arp', 'strum',
  'decay', 'attack', 'sustain', 'release',
];

// Numbers
const NUMBER = /\b(\d+\.?\d*)\b/g;

// Strings (both single and double quoted)
const STRING = /(["'`][^"'`]*["'`])/g;

// Comments
const COMMENT = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;

export function highlightStrudel(code: string): string {
  // Escape HTML first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Use placeholder tokens to avoid regex conflicts with HTML tags
  const tokens: string[] = [];
  const tokenize = (match: string, className: string): string => {
    const index = tokens.length;
    tokens.push(`<span class="${className}">${match}</span>`);
    // Use non-numeric placeholder to avoid NUMBER regex matching
    return `\x01T${index}T\x01`;
  };

  // Comments (do first to avoid highlighting inside comments)
  html = html.replace(COMMENT, (m) => tokenize(m, 'hl-comment'));

  // Strings
  html = html.replace(STRING, (m) => tokenize(m, 'hl-string'));

  // Numbers (but not inside already tokenized content)
  html = html.replace(NUMBER, (m) => tokenize(m, 'hl-number'));

  // Functions
  const funcPattern = new RegExp(`\\b(${FUNCTIONS.join('|')})\\b`, 'g');
  html = html.replace(funcPattern, (m) => tokenize(m, 'hl-function'));

  // Restore tokens
  html = html.replace(/\x01T(\d+)T\x01/g, (_, index) => tokens[parseInt(index)]);

  return html;
}

/**
 * CSS styles for the highlighter.
 * Uses CSS custom properties so it works with light/dark themes.
 */
export const highlightStyles = `
  .hl-function {
    color: var(--garden-fg);
    font-weight: 700;
  }

  .hl-string {
    color: var(--garden-fg);
    opacity: 0.85;
  }

  .hl-number {
    color: var(--garden-fg-muted);
  }

  .hl-comment {
    color: var(--garden-fg-muted);
    font-style: italic;
  }
`;
