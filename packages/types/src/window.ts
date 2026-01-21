/**
 * Window utilities for Garden.
 *
 * Provides cross-platform window operations that work in both Tauri desktop
 * and web browser contexts. In Tauri, uses native window APIs. In browsers,
 * falls back to standard Fullscreen API.
 *
 * @example
 * ```typescript
 * import { gardenWindow } from '@garden/types';
 *
 * // Toggle fullscreen
 * await gardenWindow.toggleFullscreen();
 *
 * // Check if in Tauri context
 * if (gardenWindow.isTauri()) {
 *   console.log('Running in desktop app');
 * }
 * ```
 */

// Extend Window interface to include Tauri globals
declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

/**
 * Check if we're running in a Tauri context.
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Set window fullscreen state.
 *
 * In Tauri: Uses native window fullscreen API (cross-platform).
 * In browser: Uses standard Fullscreen API on document element.
 *
 * @param fullscreen - Whether to enter or exit fullscreen
 * @returns Promise that resolves when the operation completes
 * @throws If fullscreen is not supported or fails
 */
export async function setFullscreen(fullscreen: boolean): Promise<void> {
  if (isTauri()) {
    // Use Tauri's window API
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setFullscreen(fullscreen);
  } else {
    // Browser fallback using Fullscreen API
    if (fullscreen) {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        throw new Error('Fullscreen not supported');
      }
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    }
  }
}

/**
 * Check if window is currently in fullscreen mode.
 *
 * @returns Promise resolving to true if fullscreen, false otherwise
 */
export async function isFullscreen(): Promise<boolean> {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    return await getCurrentWindow().isFullscreen();
  } else {
    return document.fullscreenElement !== null;
  }
}

/**
 * Toggle fullscreen state.
 *
 * @returns Promise resolving to the new fullscreen state
 */
export async function toggleFullscreen(): Promise<boolean> {
  const currentState = await isFullscreen();
  await setFullscreen(!currentState);
  return !currentState;
}

/**
 * Check if fullscreen is supported on this platform.
 *
 * @returns true if fullscreen operations are supported
 */
export function isFullscreenSupported(): boolean {
  if (isTauri()) {
    // Tauri window fullscreen is always supported
    return true;
  }
  return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
}

/**
 * Unified window utilities.
 */
export const gardenWindow = {
  isTauri,
  setFullscreen,
  isFullscreen,
  toggleFullscreen,
  isFullscreenSupported,
};

export default gardenWindow;
