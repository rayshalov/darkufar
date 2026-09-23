/**
 * Скрипт для упаковки расширения в ZIP для загрузки в Chrome Web Store
 * Запуск: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ZIP_NAME = 'darkufar-v1.0.0.zip';

// Файлы и папки для включения в сборку
const INCLUDE = [
  'manifest.json',
  'background',
  'content',
  'popup',
  'icons',
];

// Очищаем dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Копируем файлы
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

INCLUDE.forEach(item => {
  const src = path.join(ROOT, item);
  const dest = path.join(DIST, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`✓ Скопировано: ${item}`);
  } else {
    console.warn(`⚠ Не найдено: ${item}`);
  }
});

// Создаём ZIP
const zipPath = path.join(ROOT, ZIP_NAME);
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  execSync(`cd "${DIST}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  console.log(`\n✅ Архив создан: ${ZIP_NAME}`);
  console.log(`📦 Размер: ${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB`);
  console.log(`\n👉 Загрузите файл "${ZIP_NAME}" в Chrome Web Store Developer Dashboard:`);
  console.log(`   https://chrome.google.com/webstore/devconsole`);
} catch (e) {
  console.error('Ошибка при создании ZIP:', e.message);
}
