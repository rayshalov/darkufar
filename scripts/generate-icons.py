#!/usr/bin/env python3
"""
Генератор PNG иконок для расширения Darkufar
Использует только стандартную библиотеку Python (struct + zlib для PNG)
"""

import struct
import zlib
import math
import os

def create_png(width, height, pixels):
    """Создаёт PNG файл из массива пикселей (RGBA)"""
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    
    raw = b''
    for row in range(height):
        raw += b'\x00'  # filter type = None
        for col in range(width):
            r, g, b, a = pixels[row][col]
            raw += bytes([r, g, b])
    
    compressed = zlib.compress(raw, 9)
    
    signature = b'\x89PNG\r\n\x1a\n'
    png = signature
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

def lerp(a, b, t):
    return a + (b - a) * t

def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))

def blend(bg, fg, alpha):
    """Alpha blending"""
    a = alpha / 255.0
    return (
        clamp(fg[0] * a + bg[0] * (1 - a)),
        clamp(fg[1] * a + bg[1] * (1 - a)),
        clamp(fg[2] * a + bg[2] * (1 - a)),
        255
    )

def draw_icon(size, active=True):
    """Рисует иконку расширения"""
    pixels = [[(0, 0, 0, 0)] * size for _ in range(size)]
    
    cx = size / 2
    cy = size / 2
    r = size / 2
    corner = size * 0.22
    
    # Цвета
    if active:
        bg1 = (10, 26, 16)
        bg2 = (26, 48, 32)
        moon_color = (0, 173, 100)
        star_color = (0, 201, 116)
    else:
        bg1 = (26, 26, 26)
        bg2 = (42, 42, 42)
        moon_color = (85, 85, 85)
        star_color = (60, 60, 60)
    
    for y in range(size):
        for x in range(size):
            # Закруглённые углы
            dx = min(x, size - 1 - x)
            dy = min(y, size - 1 - y)
            if dx < corner and dy < corner:
                dist = math.sqrt((dx - corner)**2 + (dy - corner)**2)
                if dist > corner:
                    continue
            
            # Градиентный фон
            t = (x + y) / (2 * size)
            bg = (
                clamp(lerp(bg1[0], bg2[0], t)),
                clamp(lerp(bg1[1], bg2[1], t)),
                clamp(lerp(bg1[2], bg2[2], t)),
                255
            )
            pixels[y][x] = bg
    
    # Рисуем луну (полумесяц)
    moon_cx = cx + size * 0.05
    moon_cy = cy
    moon_r = size * 0.28
    cutout_cx = moon_cx + moon_r * 0.55
    cutout_cy = moon_cy - moon_r * 0.1
    cutout_r = moon_r * 0.78
    
    for y in range(size):
        for x in range(size):
            if pixels[y][x][3] == 0:
                continue
            
            # В круге луны?
            dist_moon = math.sqrt((x - moon_cx)**2 + (y - moon_cy)**2)
            if dist_moon <= moon_r:
                # Не в вырезе?
                dist_cut = math.sqrt((x - cutout_cx)**2 + (y - cutout_cy)**2)
                if dist_cut > cutout_r:
                    # Плавный край луны
                    aa = 1.0
                    if dist_moon > moon_r - 1.5:
                        aa = (moon_r - dist_moon) / 1.5
                    # Плавный край выреза
                    if dist_cut < cutout_r + 1.5:
                        aa = min(aa, (dist_cut - cutout_r + 1.5) / 1.5)
                    
                    aa = max(0.0, min(1.0, aa))
                    mc = (*moon_color, int(255 * aa))
                    pixels[y][x] = blend(pixels[y][x][:3], moon_color, int(255 * aa))
    
    # Звёздочки
    if active:
        stars = [
            (cx - size * 0.25, cy - size * 0.25, size * 0.035),
            (cx + size * 0.25, cy - size * 0.15, size * 0.024),
            (cx - size * 0.15, cy + size * 0.28, size * 0.020),
        ]
        for (sx, sy, sr) in stars:
            for y in range(size):
                for x in range(size):
                    if pixels[y][x][3] == 0:
                        continue
                    d = math.sqrt((x - sx)**2 + (y - sy)**2)
                    if d <= sr:
                        aa = 1.0 if d < sr - 1 else (sr - d)
                        aa = max(0, min(1, aa))
                        pixels[y][x] = blend(pixels[y][x][:3], star_color, int(255 * 0.9 * aa))
    
    return pixels

def save_icon(pixels, size, filepath):
    png_data = create_png(size, size, pixels)
    with open(filepath, 'wb') as f:
        f.write(png_data)

# Создаём папку иконок
icons_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')
os.makedirs(icons_dir, exist_ok=True)

sizes = [16, 48, 128]

for size in sizes:
    # Активная
    pixels = draw_icon(size, active=True)
    path_on = os.path.join(icons_dir, f'icon{size}.png')
    save_icon(pixels, size, path_on)
    print(f'✓ icon{size}.png')
    
    # Неактивная
    pixels = draw_icon(size, active=False)
    path_off = os.path.join(icons_dir, f'icon{size}_off.png')
    save_icon(pixels, size, path_off)
    print(f'✓ icon{size}_off.png')

print('\n✅ Все иконки успешно созданы!')
