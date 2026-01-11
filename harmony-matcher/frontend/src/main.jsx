import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Dev cleanup: ensure no old service worker interferes with Vite HMR
// Important: avoid any reload loops (e.g. when localStorage is unavailable).
if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
  (async () => {
    const key = '__hm_dev_sw_cleanup_done__';

    let alreadyDone = false;
    try {
      alreadyDone = localStorage.getItem(key) === '1';
    } catch (_) {
      alreadyDone = window.__hm_dev_sw_cleanup_done__ === true;
    }
    if (alreadyDone) return;

    try {
      localStorage.setItem(key, '1');
    } catch (_) {
      window.__hm_dev_sw_cleanup_done__ = true;
    }

    let didCleanup = false;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs?.length) {
        await Promise.all(regs.map((reg) => reg.unregister()));
        didCleanup = true;
      }
    } catch (_) {}

    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        if (keys?.length) {
          await Promise.all(keys.map((k) => caches.delete(k)));
          didCleanup = true;
        }
      }
    } catch (_) {}

    // Only reload if we actually removed something (prevents "refresh loop" feelings).
    if (didCleanup) window.location.reload();
  })();
}

// Register service worker for PWA (only in production to avoid dev WS issues)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show update prompt
                if (window.confirm('تم تحديث التطبيق. هل تريد إعادة التحميل؟')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// PWA install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Show custom install button or banner
  console.log('PWA install prompt available');
});

// Function to trigger install (can be called from UI)
window.installPWA = () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA install');
      } else {
        console.log('User dismissed PWA install');
      }
      deferredPrompt = null;
    });
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
