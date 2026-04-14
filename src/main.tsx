import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register the service worker autoUpdate
const updateSW = registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
})


ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
