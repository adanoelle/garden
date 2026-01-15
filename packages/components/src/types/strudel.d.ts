// Type declarations for @strudel/web
declare module '@strudel/web' {
  export function initStrudel(): Promise<void>;
  export function hush(): void;
  export function note(pattern: string): Pattern;
  export function s(pattern: string): Pattern;
  export function sound(pattern: string): Pattern;
  export const silence: Pattern;

  export interface Pattern {
    play(): void;
    stop(): void;
    slow(factor: number): Pattern;
    fast(factor: number): Pattern;
    s(sound: string): Pattern;
    cutoff(freq: number): Pattern;
    gain(level: number): Pattern;
    pan(pos: number): Pattern;
    jux(fn: (p: Pattern) => Pattern): Pattern;
    rev(): Pattern;
  }

  // Allow any other exports
  const _default: {
    initStrudel: typeof initStrudel;
    hush: typeof hush;
    note: typeof note;
    s: typeof s;
    sound: typeof sound;
    silence: Pattern;
    [key: string]: any;
  };
  export default _default;
}
