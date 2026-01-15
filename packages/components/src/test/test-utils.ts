import { fixture, html } from '@open-wc/testing';

/**
 * Wait for component to complete its update cycle
 */
export async function waitForUpdate(el: HTMLElement): Promise<void> {
  if ('updateComplete' in el) {
    await (el as any).updateComplete;
  }
}

/**
 * Simulate keyboard event on element
 */
export function pressKey(
  el: HTMLElement,
  key: string,
  options: Partial<KeyboardEventInit> = {}
): void {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    ...options,
  });
  el.dispatchEvent(event);
}

/**
 * Query shadow DOM
 */
export function queryShadow<T extends Element>(
  host: HTMLElement,
  selector: string
): T | null {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
}

/**
 * Query all in shadow DOM
 */
export function queryShadowAll<T extends Element>(
  host: HTMLElement,
  selector: string
): T[] {
  return Array.from(host.shadowRoot?.querySelectorAll<T>(selector) ?? []);
}

/**
 * Set theme for testing
 */
export function setTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Create fixture with standard setup
 */
export async function gardenFixture<T extends HTMLElement>(
  template: ReturnType<typeof html>
): Promise<T> {
  return fixture<T>(template);
}
