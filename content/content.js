/**
 * DARKUFAR v2 — Content Script
 * Управляет включением/выключением тёмной темы.
 * Подход: CSS filter invert + hue-rotate на <html>.
 */

const DARK_CLASS    = 'darkufar-enabled';
const STORAGE_KEY   = 'darkufarEnabled';
const BRIGHTNESS_KEY = 'darkufarBrightness';
const CONTRAST_KEY   = 'darkufarContrast';

/** Применяем/убираем темную тему + filter */
function setFilter(isEnabled, brightness = 100, contrast = 100) {
  const root = document.documentElement;
  if (isEnabled) {
    root.classList.add(DARK_CLASS);
    // CSS-файл уже задаёт filter: invert(1) hue-rotate(180deg).
    // Накладываем яркость и контраст поверх через style на <body>.
    document.body.style.setProperty(
      'filter',
      `brightness(${brightness / 100}) contrast(${contrast / 100})`,
      'important'
    );
  } else {
    root.classList.remove(DARK_CLASS);
    document.body.style.removeProperty('filter');
  }
}

/** Применяем при загрузке (до рендера) */
function init() {
  chrome.storage.local.get([STORAGE_KEY, BRIGHTNESS_KEY, CONTRAST_KEY], (result) => {
    const isEnabled  = result[STORAGE_KEY] !== false;
    const brightness = result[BRIGHTNESS_KEY] ?? 100;
    const contrast   = result[CONTRAST_KEY]   ?? 100;
    setFilter(isEnabled, brightness, contrast);
  });
}

/** Слушаем сообщения от popup и background */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleDarkTheme') {
    chrome.storage.local.get([BRIGHTNESS_KEY, CONTRAST_KEY], (result) => {
      const brightness = result[BRIGHTNESS_KEY] ?? 100;
      const contrast   = result[CONTRAST_KEY]   ?? 100;
      setFilter(message.enabled, brightness, contrast);
    });
    sendResponse({ success: true });

  } else if (message.action === 'applyFilters') {
    const { brightness, contrast } = message;
    const isEnabled = document.documentElement.classList.contains(DARK_CLASS);
    setFilter(isEnabled, brightness, contrast);
    sendResponse({ success: true });

  } else if (message.action === 'getStatus') {
    const isEnabled = document.documentElement.classList.contains(DARK_CLASS);
    sendResponse({ enabled: isEnabled });
  }
  return true;
});

// Запуск
init();
