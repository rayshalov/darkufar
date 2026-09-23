/**
 * DARKUFAR — Popup Script
 * Управляет интерфейсом попапа
 */

const STORAGE_KEY = 'darkufarEnabled';
const BRIGHTNESS_KEY = 'darkufarBrightness';
const CONTRAST_KEY = 'darkufarContrast';
const ADBLOCK_KEY  = 'darkufarAdblock';

const themeCheckbox    = document.getElementById('themeCheckbox');
const statusLabel      = document.getElementById('statusLabel');
const statusDesc       = document.getElementById('statusDesc');
const statusDot        = document.getElementById('statusDot');
const statusText       = document.getElementById('statusText');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue  = document.getElementById('brightnessValue');
const contrastSlider   = document.getElementById('contrastSlider');
const contrastValue    = document.getElementById('contrastValue');
const adblockCheckbox  = document.getElementById('adblockCheckbox');
const adblockDesc      = document.getElementById('adblockDesc');

/** Обновляем UI по состоянию */
function updateUI(isEnabled) {
  themeCheckbox.checked = isEnabled;

  if (isEnabled) {
    statusLabel.textContent = 'Тёмная тема';
    statusDesc.textContent  = 'Включена';
    statusDot.className     = 'popup__status-dot active';
    statusText.textContent  = 'Активно на kufar.by';
    brightnessSlider.disabled = false;
    contrastSlider.disabled   = false;
  } else {
    statusLabel.textContent = 'Тёмная тема';
    statusDesc.textContent  = 'Выключена';
    statusDot.className     = 'popup__status-dot inactive';
    statusText.textContent  = 'Тема не применена';
    brightnessSlider.disabled = true;
    contrastSlider.disabled   = true;
  }
}

/** Применяем яркость и контраст через content script */
function applyFilters(brightness, contrast) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'applyFilters',
      brightness,
      contrast
    }).catch(() => {});
  });
}

/** Загружаем состояние из storage */
async function loadState() {
  const result = await chrome.storage.local.get([STORAGE_KEY, BRIGHTNESS_KEY, CONTRAST_KEY, ADBLOCK_KEY]);

  const isEnabled  = result[STORAGE_KEY] !== false;
  const brightness = result[BRIGHTNESS_KEY] ?? 100;
  const contrast   = result[CONTRAST_KEY]   ?? 100;
  const adblockOn  = result[ADBLOCK_KEY]    !== false; // по умолчанию включён

  updateUI(isEnabled);

  brightnessSlider.value      = brightness;
  brightnessValue.textContent = brightness + '%';

  contrastSlider.value      = contrast;
  contrastValue.textContent = contrast + '%';

  adblockCheckbox.checked  = adblockOn;
  adblockDesc.textContent  = adblockOn ? 'Баннеры заблокированы' : 'Реклама не блокируется';
}

/** Переключатель адблока */
adblockCheckbox.addEventListener('change', async () => {
  const enabled = adblockCheckbox.checked;
  await chrome.storage.local.set({ [ADBLOCK_KEY]: enabled });
  adblockDesc.textContent = enabled ? 'Баннеры заблокированы' : 'Реклама не блокируется';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'toggleAdblock',
      enabled
    }).catch(() => {});
  });
});

/** Переключаем тему */
themeCheckbox.addEventListener('change', async () => {
  const isEnabled = themeCheckbox.checked;

  await chrome.storage.local.set({ [STORAGE_KEY]: isEnabled });
  updateUI(isEnabled);

  // Отправляем в background для обновления всех вкладок
  chrome.runtime.sendMessage({
    action: 'setThemeState',
    enabled: isEnabled
  });

  // Также сразу обновляем текущую вкладку
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'toggleDarkTheme',
      enabled: isEnabled
    }).catch(() => {});
  });
});

/** Слайдер яркости */
brightnessSlider.addEventListener('input', () => {
  const val = brightnessSlider.value;
  brightnessValue.textContent = val + '%';
  chrome.storage.local.set({ [BRIGHTNESS_KEY]: parseInt(val) });

  const contrast = parseInt(contrastSlider.value);
  applyFilters(parseInt(val), contrast);
});

/** Слайдер контраста */
contrastSlider.addEventListener('input', () => {
  const val = contrastSlider.value;
  contrastValue.textContent = val + '%';
  chrome.storage.local.set({ [CONTRAST_KEY]: parseInt(val) });

  const brightness = parseInt(brightnessSlider.value);
  applyFilters(brightness, parseInt(val));
});

// Инициализация
loadState();
