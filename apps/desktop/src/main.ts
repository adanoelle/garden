/**
 * Garden Desktop App - Entry Point
 */

// Global error handler (moved from inline script for CSP compliance)
window.onerror = (msg, url, line, _col, _error) => {
  console.error('[Garden] Global error:', msg, url, line);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div class="error">Error: ${msg}\n\nAt: ${url}:${line}</div>`;
  }
  return true;
};

// Tauri environment validation (development only)
if (import.meta.env.DEV) {
  if (!('__TAURI__' in window)) {
    console.warn(
      '⚠️ [Garden] Tauri global API not detected!\n' +
      'If running in Tauri, set "withGlobalTauri": true in tauri.conf.json\n' +
      'Components requiring Tauri APIs (fullscreen, etc.) will fall back to browser APIs.'
    );
  } else {
    console.log('✅ [Garden] Tauri environment validated');
  }
}

// Import design system tokens (CSS custom properties)
import '@garden/components/styles/tokens.css';

// Import Garden views to register custom elements
import '@garden/views';

// Mount the app shell
const app = document.getElementById('app');
if (app) {
  app.innerHTML = '<garden-app-shell></garden-app-shell>';
}
