import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

// Fonts are bundled, not loaded from a CDN, so nothing leaves the device.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import '@/global-styles/index.scss';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element in index.html.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
