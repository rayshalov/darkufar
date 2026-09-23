/**
 * DARKUFAR — Background Service Worker
 * Управляет состоянием расширения и иконкой
 */

const STORAGE_KEY = 'darkufarEnabled';

/** Обновляем иконку в зависимости от состояния */
async function updateIcon(isEnabled) {
  const iconPath = isEnabled
    ? {
        16:  'icons/icon16.png',
        48:  'icons/icon48.png',
        128: 'icons/icon128.png'
      }
    : {
        16:  'icons/icon16_off.png',
        48:  'icons/icon48_off.png',
        128: 'icons/icon128_off.png'
      };

  try {
    await chrome.action.setIcon({ path: iconPath });
  } catch (e) {
    // Игнорируем ошибку если иконки выключенного состояния не существуют
  }
}

/** Инициализация при установке расширения */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // По умолчанию тёмная тема включена
    await chrome.storage.local.set({ [STORAGE_KEY]: true });
    console.log('[Darkufar] Расширение установлено. Тёмная тема включена.');
  }
});

/** Слушаем сообщения от popup */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setThemeState') {
    const { enabled } = message;

    chrome.storage.local.set({ [STORAGE_KEY]: enabled }, () => {
      updateIcon(enabled);

      // Уведомляем все вкладки Куфара
      chrome.tabs.query({ url: '*://*.kufar.by/*' }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleDarkTheme',
            enabled
          }).catch(() => {
            // Вкладка может быть не загружена — игнорируем
          });
        });
      });

      sendResponse({ success: true, enabled });
    });

    return true;
  }

  if (message.action === 'getThemeState') {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const enabled = result[STORAGE_KEY] !== false;
      sendResponse({ enabled });
    });
    return true;
  }
});

/** При запуске браузера синхронизируем иконку */
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const enabled = result[STORAGE_KEY] !== false;
  await updateIcon(enabled);
});
