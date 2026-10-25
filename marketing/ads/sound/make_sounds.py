"""Synthesizes the ads' music bed and sound effects (stdlib only, deterministic).

    python3 sound/make_sounds.py   # writes public/music/bed.wav and public/sfx/*.wav

Taps use the app's own click (assets/sounds/click.wav), copied as public/sfx/click.wav.
"""
import math
import random
import shutil
import struct
import wave
from pathlib import Path

RATE = 44100
HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / 'public'
APP_CLICK = HERE.parents[2] / 'assets' / 'sounds' / 'click.wav'

rng = random.Random(7)


def write(path: Path, samples: list[float], gain: float = 0.9) -> None:
    peak = max(1e-9, max(abs(s) for s in samples))
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(math.tanh(s / peak * 1.2) / math.tanh(1.2) * gain * 32767)) for s in samples))


def note(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def add(buf: list[float], start: float, voice: list[float], gain: float = 1.0) -> None:
    i0 = int(start * RATE)
    for i, s in enumerate(voice):
        if 0 <= i0 + i < len(buf):
            buf[i0 + i] += s * gain


def pluck(freq: float, length: float = 0.45) -> list[float]:
    n = int(length * RATE)
    return [
        (math.sin(2 * math.pi * freq * i / RATE) + 0.35 * math.sin(4 * math.pi * freq * i / RATE))
        * math.exp(-i / RATE * 9) * min(1, i / 60)
        for i in range(n)
    ]


def pad(freqs: list[float], length: float) -> list[float]:
    n = int(length * RATE)
    out = []
    for i in range(n):
        t = i / RATE
        env = min(1, t / 0.35) * min(1, (length - t) / 0.35)
        s = sum(math.sin(2 * math.pi * f * t) + 0.25 * math.sin(2 * math.pi * f * 2.003 * t) for f in freqs)
        out.append(s * env / len(freqs))
    return out


def kick() -> list[float]:
    n = int(0.28 * RATE)
    out, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        phase += 2 * math.pi * (50 + 90 * math.exp(-t * 30)) / RATE
        out.append(math.sin(phase) * math.exp(-t * 14))
    return out


def hat() -> list[float]:
    n = int(0.05 * RATE)
    prev, out = 0.0, []
    for i in range(n):
        x = rng.uniform(-1, 1)
        out.append((x - prev) * math.exp(-i / RATE * 90))
        prev = x
    return out


def music(seconds: float = 24.0, bpm: float = 112) -> list[float]:
    beat = 60 / bpm
    buf = [0.0] * int(seconds * RATE)
    # F – C – Dm – Bb, one bar each: bright and calm, nothing that fights a voice-over.
    chords = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]]
    arp = [0, 1, 2, 1, 2, 0, 1, 2]
    bar = 4 * beat
    for b in range(int(seconds / bar) + 1):
        chord = chords[b % 4]
        start = b * bar
        add(buf, start, pad([note(m) for m in chord], bar + 0.2), 0.22)
        add(buf, start, pluck(note(chord[0] - 12), 0.9), 0.30)
        for k, idx in enumerate(arp):
            add(buf, start + k * beat / 2, pluck(note(chord[idx] + 12)), 0.16)
        for k in range(4):
            if b > 0 or k >= 2:
                add(buf, start + k * beat, kick(), 0.45 if k % 2 == 0 else 0.25)
            add(buf, start + k * beat + beat / 2, hat(), 0.10)
    fade = int(1.0 * RATE)
    for i in range(fade):
        buf[-1 - i] *= i / fade
    return buf


def whoosh(length: float = 0.45) -> list[float]:
    n = int(length * RATE)
    out, lp = [], 0.0
    for i in range(n):
        t = i / n
        cutoff = 0.02 + 0.25 * math.sin(math.pi * t)
        lp += cutoff * (rng.uniform(-1, 1) - lp)
        out.append(lp * math.sin(math.pi * t) ** 2)
    return out


def typing(seconds: float = 2.5) -> list[float]:
    buf = [0.0] * int(seconds * RATE)
    t = 0.02
    while t < seconds - 0.05:
        n = int(0.018 * RATE)
        prev, tick = 0.0, []
        for i in range(n):
            x = rng.uniform(-1, 1)
            tick.append((x - prev) * math.exp(-i / RATE * 260))
            prev = x
        add(buf, t, tick, rng.uniform(0.6, 1.0))
        t += rng.uniform(0.08, 0.14)
    return buf


def bell(freq: float, length: float = 0.9) -> list[float]:
    n = int(length * RATE)
    return [
        (math.sin(2 * math.pi * freq * i / RATE) + 0.4 * math.sin(2 * math.pi * freq * 2.76 * i / RATE) * math.exp(-i / RATE * 6))
        * math.exp(-i / RATE * 4.5) * min(1, i / 40)
        for i in range(n)
    ]


def success() -> list[float]:
    buf = [0.0] * int(0.9 * RATE)
    add(buf, 0.0, bell(note(81), 0.8), 0.7)
    add(buf, 0.09, bell(note(88), 0.8), 0.8)
    return buf


def pop() -> list[float]:
    n = int(0.14 * RATE)
    out, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        phase += 2 * math.pi * (260 + 520 * math.exp(-t * 40)) / RATE
        out.append(math.sin(phase) * math.exp(-t * 28))
    return out


def chime() -> list[float]:
    buf = [0.0] * int(1.6 * RATE)
    for k, m in enumerate([77, 81, 84, 89]):
        add(buf, k * 0.07, bell(note(m), 1.4), 0.6)
    return buf


if __name__ == '__main__':
    write(PUBLIC / 'music' / 'bed.wav', music(), 0.8)
    write(PUBLIC / 'sfx' / 'whoosh.wav', whoosh())
    write(PUBLIC / 'sfx' / 'type.wav', typing())
    write(PUBLIC / 'sfx' / 'success.wav', success())
    write(PUBLIC / 'sfx' / 'pop.wav', pop())
    write(PUBLIC / 'sfx' / 'chime.wav', chime())
    shutil.copy(APP_CLICK, PUBLIC / 'sfx' / 'click.wav')
    print('ok')
