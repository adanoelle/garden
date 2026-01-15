// Import Garden components
import '@garden/components';

// Tauri APIs will be available here
// import { invoke } from '@tauri-apps/api/core';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <h1>Garden</h1>
    <p>Your personal curation system.</p>
    <garden-button>Get Started</garden-button>
  `;
}
