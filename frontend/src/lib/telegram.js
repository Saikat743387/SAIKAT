// Thin wrapper around the Telegram Mini App JS SDK (loaded via the
// <script src="https://telegram.org/js/telegram-web-app.js"> tag in index.html).

export function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

// Wait for Telegram WebApp SDK to load (with timeout)
export function waitForTelegramWebApp(timeoutMs = 3000) {
  return new Promise((resolve) => {
    // If already loaded, resolve immediately
    if (window.Telegram?.WebApp) {
      resolve(window.Telegram.WebApp);
      return;
    }

    // Otherwise, poll for it
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (window.Telegram?.WebApp) {
        clearInterval(interval);
        resolve(window.Telegram.WebApp);
      } else if (Date.now() - startTime > timeoutMs) {
        // Timeout reached, resolve with null
        clearInterval(interval);
        resolve(null);
      }
    }, 50);
  });
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
  }
  return tg;
}

// The raw, signed string — this (not initDataUnsafe) is what the backend
// verifies. Never trust initDataUnsafe on its own for anything sensitive.
export function getRawInitData() {
  const tg = getTelegramWebApp();
  return tg?.initData || "";
}
