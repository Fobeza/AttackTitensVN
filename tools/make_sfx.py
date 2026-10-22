#!/usr/bin/env python3
"""
make_sfx.py — генерация аудио для игры синтезом (без внешних источников).
WAV пишутся в game/assets/audio/_wav, затем ffmpeg -> game/assets/audio/*.mp3 + *.ogg.
Без ffmpeg: остаются WAV — движок пробует .ogg → .mp3 → .wav сам.
Запуск из корня проекта: python3 tools/make_sfx.py
"""
import math
import os
import random
import shutil
import struct
import subprocess
import wave

SR = 44100
OUT = "game/assets/audio"
TMP = os.path.join(OUT, "_wav")
random.seed(7)

NAMES = []


def w(name, samples, peak=0.75):
    os.makedirs(TMP, exist_ok=True)
    mx = max(0.0001, max(abs(s) for s in samples))
    g = peak / mx
    path = os.path.join(TMP, name + ".wav")
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * g)) * 32767)) for s in samples))
    NAMES.append(name)
    print(f"  wav {name}: {len(samples)/SR:.1f}s")


def sec(t): return int(t * SR)
def sine(f, t, ph=0.0): return math.sin(2 * math.pi * f * t + ph)
def decay(t, d): return math.exp(-t / d)


def crossfade_loop(buf, fade=sec(0.5)):
    """Склеиваем хвост с началом для бесшовного лупа."""
    for i in range(fade):
        a = i / fade
        buf[-fade + i] = buf[-fade + i] * (1 - a) + buf[i] * a
    return buf


def tension_pad(dur=12.0):
    """Тёмный эмбиент-пад: кластер Am + ветер (луп 12с)."""
    n = sec(dur)
    out = [0.0] * n
    freqs = [110.0, 130.81, 164.81, 220.0]
    for idx, f in enumerate(freqs):
        for i in range(n):
            t = i / SR
            lfo = 0.72 + 0.28 * math.sin(2 * math.pi * (2.0 / dur) * t + idx * 1.57)
            out[i] += 0.09 * lfo * sine(f, t) + 0.012 * sine(f * 2.002, t, 0.4)
    b = 0.0
    lp = 0.0
    for i in range(n):  # ветер: броуновский шум -> lowpass
        b += random.uniform(-1, 1) * 0.02
        b = max(-1.0, min(1.0, b * 0.9995))
        lp += (b - lp) * 0.04
        out[i] += lp * 0.55
    return crossfade_loop(out)


def steps(dur, knocks):
    """Шаги по камню: глухой удар + шум подошвы."""
    n = sec(dur)
    out = [0.0] * n
    for t0, vol in knocks:
        start = sec(t0)
        L = min(sec(0.30), n - start)
        for j in range(L):
            t = j / SR
            noise = random.uniform(-1, 1) * decay(t, 0.035) * 0.45
            thump = sine(63, t) * decay(t, 0.10)
            out[start + j] += vol * (noise * 0.4 + thump * 0.65)
    d = sec(0.19)  # коридорное эхо
    for i in range(n - d):
        out[i + d] += out[i] * 0.28
    return out


def door_metal(dur=1.25):
    """Лязг тюремной двери: металлический удар + низкий гул."""
    n = sec(dur)
    out = [0.0] * n
    for i in range(sec(0.5)):
        t = i / SR
        m = (0.5 * sine(233, t) * decay(t, 0.06) + 0.35 * sine(349.3, t) * decay(t, 0.09)
             + 0.22 * sine(523, t) * decay(t, 0.12) + 0.15 * sine(742, t) * decay(t, 0.14))
        out[i] += m + random.uniform(-1, 1) * decay(t, 0.02) * 0.35
    s2 = sec(0.38)
    for j in range(min(sec(0.6), n - s2)):
        t = j / SR
        out[s2 + j] += sine(56, t) * decay(t, 0.13) * 0.8 + random.uniform(-1, 1) * decay(t, 0.05) * 0.12
    return out


def click(dur=0.07):
    n = sec(dur)
    return [sine(1250, i / SR) * decay(i / SR, 0.016) * 0.75 +
            random.uniform(-1, 1) * decay(i / SR, 0.009) * 0.10 for i in range(n)]


def tick(dur=0.11):
    """Мягкий сигнал очков/тоста."""
    n = sec(dur)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        if t < 0.05:
            out[i] += sine(880, t) * decay(t, 0.02) * 0.5
        s5 = sec(0.04)
        if i >= s5:
            out[i] += sine(1244, t - 0.04) * decay(t - 0.04, 0.02) * 0.45
    return out


print("→ синтез...")
w("tension_pad", tension_pad())
w("steps", steps(1.7, [(0.0, 1.0), (0.55, 0.85), (1.05, 0.7)]))
w("steps_away", steps(2.1, [(0.0, 0.9), (0.55, 0.55), (1.05, 0.30)]))
w("door_metal", door_metal())
w("click", click())
w("tick", tick())

ffmpeg = shutil.which("ffmpeg")
if not ffmpeg:
    try:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg = None
if ffmpeg:
    print("→ конверсия ffmpeg...")
    for name in NAMES:
        src = os.path.join(TMP, name + ".wav")
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", src,
                        "-codec:a", "libmp3lame", "-q:a", "5", os.path.join(OUT, name + ".mp3")], check=True)
        subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", src,
                        "-c:a", "libvorbis", "-q:a", "4", os.path.join(OUT, name + ".ogg")], check=True)
    shutil.rmtree(TMP)
    print("✓ готово: mp3 + ogg")
else:
    print("⚠ ffmpeg не найден — оставлены WAV в", TMP)
