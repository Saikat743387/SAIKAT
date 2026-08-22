// Thin wrapper around the Telegram Mini App JS SDK (loaded via the
// <script src="https://telegram.org/js/telegram-web-app.js"> tag in index.html).

export function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
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
