/**
 * DARKUFAR — Ad Blocker v3
 * Работает через класс html.darkufar-adblock.
 * Отдельно ищет баннеры ставочников по содержимому.
 */

const ADBLOCK_KEY   = 'darkufarAdblock';
const ADBLOCK_CLASS = 'darkufar-adblock';

// =========================================================
// Домены, контент которых = реклама (НЕ объявления Куфара)
// =========================================================

const BETTING_DOMAINS = [
  'belbet', '1xbet', 'fonbet.by', 'fonbet.ru',
  'parimatch', 'betcity', 'olimpbet', 'pari.ru',
  'bingoboom', 'liga-stavok', 'zenit.bet', 'winline',
  'melbet', 'sbobet', 'betsson', 'bwin',
];

const AD_NETWORK_DOMAINS = [
  'an.yandex.ru', 'doubleclick.net', 'googlesyndication',
  'googletagservices', 'adfox.ru', 'adfox.me', 'mytarget.ru',
];

// =========================================================
// Включение / выключение через класс на <html>
// =========================================================

function enableAdblock() {
  document.documentElement.classList.add(ADBLOCK_CLASS);
  scanAndHide();
  startObserver();
}

function disableAdblock() {
  document.documentElement.classList.remove(ADBLOCK_CLASS);
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // Показываем обратно то, что скрыли вручную
  document.querySelectorAll('[data-darkufar-ad="true"]').forEach(el => {
    el.removeAttribute('data-darkufar-ad');
  });
}

// =========================================================
// Сканирование — ищем рекламу и помечаем data-darkufar-ad
// =========================================================

function markAdEl(el) {
  if (!el || el.hasAttribute('data-darkufar-ad')) return;
  el.setAttribute('data-darkufar-ad', 'true');
}

/** Проверяем iframe */
function checkIframe(iframe) {
  const src = iframe.src || iframe.getAttribute('src') || '';
  if (!src) return;
  const isBettingIframe = BETTING_DOMAINS.some(d => src.includes(d));
  const isAdNetIframe   = AD_NETWORK_DOMAINS.some(d => src.includes(d));
  if (isBettingIframe || isAdNetIframe) {
    markAdEl(iframe);
    // Скрываем родителя если он однозначно обёртка
    const parent = iframe.parentElement;
    if (parent && parent !== document.body && parent.children.length === 1) {
      markAdEl(parent);
    }
  }
}

/**
 * Ищем элемент-баннер ставочников:
 * - содержит ссылку ИЛИ изображение с доменом ставочника
 * - при этом это НЕ карточка объявления (не содержит цену / кнопку "Позвонить")
 */
function checkBettingBanner(el) {
  if (el.hasAttribute('data-darkufar-ad')) return;

  // Ищем ссылки на ставочные домены внутри элемента
  const links = el.querySelectorAll('a[href]');
  let foundBettingLink = false;
  for (const a of links) {
    const href = a.href || '';
    if (BETTING_DOMAINS.some(d => href.includes(d))) {
      foundBettingLink = true;
      break;
    }
  }

  // Ищем img с src ставочника
  if (!foundBettingLink) {
    const imgs = el.querySelectorAll('img[src]');
    for (const img of imgs) {
      const src = img.src || '';
      if (BETTING_DOMAINS.some(d => src.includes(d))) {
        foundBettingLink = true;
        break;
      }
    }
  }

  if (!foundBettingLink) return;

  // Убеждаемся, что это НЕ карточка объявления Куфара
  // (у объявлений есть кнопка "Позвонить", цена, ссылки на kufar.by)
  const text = el.innerText || '';
  const hasKufarLink = el.querySelector('a[href*="kufar.by"]');
  const looksLikeListing = text.includes('Позвонить') ||
    text.includes('Написать') ||
    hasKufarLink;

  if (looksLikeListing) return;

  // Это баннер — помечаем
  markAdEl(el);
}

/**
 * Отдельный поиск belbet и подобных через textContent / innerHTML.
 * Ищем блоки, содержащие текст/логотип ставочника.
 */
function scanForBettingText() {
  // Ищем элементы у которых в тексте есть точное название ставочника
  // и размер > 200px по ширине (значит это баннер, а не текст в объявлении)
  const allDivs = document.querySelectorAll('div, section, aside');
  for (const el of allDivs) {
    if (el.hasAttribute('data-darkufar-ad')) continue;
    if (el.children.length === 0) continue; // только контейнеры

    const rect = el.getBoundingClientRect();
    // Только широкие блоки (баннеры) — игнорируем маленькие карточки
    if (rect.width < window.innerWidth * 0.4) continue;
    if (rect.height < 50 || rect.height > window.innerHeight * 1.5) continue;

    // Проверяем вложенные ссылки и картинки на ставочников
    checkBettingBanner(el);
  }
}

function scanAndHide() {
  // 1. iframe рекламных сетей
  document.querySelectorAll('iframe').forEach(checkIframe);

  // 2. Баннеры с ставочным контентом
  scanForBettingText();
}

// =========================================================
// MutationObserver
// =========================================================

let observer = null;
let scanTimer = null;

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanAndHide, 300);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// =========================================================
// Сообщения от popup
// =========================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleAdblock') {
    if (message.enabled) {
      enableAdblock();
    } else {
      disableAdblock();
    }
    sendResponse({ success: true });
  }
  return true;
});

// =========================================================
// Инициализация
// =========================================================

function init() {
  chrome.storage.local.get([ADBLOCK_KEY], (result) => {
    const isEnabled = result[ADBLOCK_KEY] !== false;
    if (isEnabled) {
      // Класс добавляем сразу (CSS уже загружен через манифест)
      document.documentElement.classList.add(ADBLOCK_CLASS);
      // JS-сканирование — после DOMContentLoaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          scanAndHide();
          startObserver();
        });
      } else {
        scanAndHide();
        startObserver();
      }
    }
  });
}

init();
