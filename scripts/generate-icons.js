#!/usr/bin/env node
/**
 * Генератор иконок для расширения Darkufar
 * Создаёт PNG иконки через Canvas API
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size, isActive = true) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const scale = size / 128;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // --- Фон с закруглёнными углами ---
  const cornerRadius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
  ctx.closePath();

  // Градиент фона
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  if (isActive) {
    bgGrad.addColorStop(0, '#0a1a10');
    bgGrad.addColorStop(1, '#1a3020');
  } else {
    bgGrad.addColorStop(0, '#1a1a1a');
    bgGrad.addColorStop(1, '#2a2a2a');
  }
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // --- Луна ---
  const moonColor = isActive ? '#00AD64' : '#555555';
  const moonX = cx + size * 0.05;
  const moonY = cy;
  const moonR = size * 0.28;

  ctx.save();
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fillStyle = moonColor;
  ctx.fill();

  // "откусываем" кусок для формы полумесяца
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(moonX + moonR * 0.55, moonY - moonR * 0.1, moonR * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // --- Звёздочки ---
  if (isActive) {
    const starColor = '#00c974';
    const stars = [
      { x: cx - size * 0.25, y: cy - size * 0.25, r: size * 0.035 },
      { x: cx + size * 0.25, y: cy - size * 0.15, r: size * 0.024 },
      { x: cx - size * 0.15, y: cy + size * 0.28, r: size * 0.020 },
    ];

    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = starColor;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  // --- Буква K (маленькая, снизу справа) ---
  if (isActive) {
    const kSize = size * 0.28;
    const kX = size * 0.62;
    const kY = size * 0.62;

    ctx.font = `bold ${kSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(0, 173, 100, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', kX, kY);
  }

  return canvas;
}

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  // Активная иконка
  const activeCanvas = drawIcon(size, true);
  const activeBuffer = activeCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), activeBuffer);
  console.log(`✓ icon${size}.png создана`);

  // Неактивная (серая) иконка
  const inactiveCanvas = drawIcon(size, false);
  const inactiveBuffer = inactiveCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon${size}_off.png`), inactiveBuffer);
  console.log(`✓ icon${size}_off.png создана`);
});

console.log('\n✅ Все иконки успешно созданы в папке icons/');
