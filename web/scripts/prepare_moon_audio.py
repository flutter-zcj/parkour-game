#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 3DMoonRunner 源码 Assets/Audio 提取 5 个原版音效并统一转 ogg；
程序化合成两段贴合月光夜景的无缝循环 BGM（menu 静谧 / run 推进）与夜风环境音。

用法：python3 scripts/prepare_moon_audio.py <3DMoonRunner/Assets/Audio 目录>
输出：web/src/static/game/parkour/moon/audio/
依赖：ffmpeg（libvorbis）、numpy
"""
import os
import sys
import subprocess
import wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
DST = os.path.join(WEB, 'src', 'static', 'game', 'parkour', 'moon', 'audio')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(WEB, '..', '3DMoonRunner', 'Assets', 'Audio')
os.makedirs(DST, exist_ok=True)

SR = 44100


def to_ogg(src, name, volume=1.0):
    """源码音效 → ogg vorbis（统一采样率，轻微响度归一）"""
    out = os.path.join(DST, name + '.ogg')
    cmd = [
        'ffmpeg', '-y', '-v', 'error', '-i', src,
        '-af', 'volume=%.2f,aresample=%d' % (volume, SR),
        '-c:a', 'libvorbis', '-qscale:a', '5', '-ar', str(SR), out
    ]
    subprocess.run(cmd, check=True)
    print('sfx ', name, os.path.getsize(out), 'bytes')


def write_wav(path, data):
    """float32 数组 → 16bit wav"""
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def wav_to_ogg(wav_path, name):
    out = os.path.join(DST, name + '.ogg')
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-i', wav_path,
        '-c:a', 'libvorbis', '-qscale:a', '4', out
    ], check=True)
    os.remove(wav_path)
    print('bgm ', name, os.path.getsize(out), 'bytes')


def env_ad(t, attack, decay, dur):
    """attack / decay 包络"""
    e = np.ones_like(t)
    if attack > 0:
        e = np.minimum(e, t / attack)
    if decay > 0:
        e = np.minimum(e, np.clip((dur - t) / decay, 0, 1))
    return np.clip(e, 0, 1)


def note(freq, dur, kind='pad', vol=1.0, detune=0.0):
    """生成一个音符波形（pad / pluck / bass / bell / hat / kick）"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1.0 + detune)
    if kind == 'pad':
        s = (np.sin(2 * np.pi * f * t) * 0.55
             + np.sin(2 * np.pi * f * 2 * t) * 0.16
             + np.sin(2 * np.pi * f * 0.5 * t) * 0.20
             + np.sin(2 * np.pi * (f * 1.006) * t) * 0.28)
        e = env_ad(t, 0.9, 1.1, dur) * 0.55
    elif kind == 'pluck':
        s = (np.sin(2 * np.pi * f * t)
             + 0.34 * np.sin(2 * np.pi * f * 2 * t)
             + 0.12 * np.sin(2 * np.pi * f * 3 * t))
        e = np.exp(-t * 4.2) * 0.7
    elif kind == 'bass':
        s = (np.sin(2 * np.pi * f * t)
             + 0.22 * np.sin(2 * np.pi * f * 2 * t))
        e = np.exp(-t * 3.0) * 0.8
    elif kind == 'bell':
        s = (np.sin(2 * np.pi * f * t)
             + 0.30 * np.sin(2 * np.pi * f * 2.01 * t)
             + 0.14 * np.sin(2 * np.pi * f * 3.98 * t))
        e = np.exp(-t * 3.4) * 0.5
    elif kind == 'hat':
        rng = np.random.default_rng(int(freq * 1000) % 99991)
        noise = rng.standard_normal(n)
        # 简易高通：一阶差分
        s = np.diff(noise, prepend=noise[0])
        s /= (np.abs(s).max() + 1e-6)
        e = np.exp(-t * 32) * 0.25
    elif kind == 'kick':
        sweep = 105 * np.exp(-t * 22) + 44
        s = np.sin(2 * np.pi * np.cumsum(sweep) / SR)
        e = np.exp(-t * 9) * 0.85
    else:
        s = np.sin(2 * np.pi * f * t)
        e = np.ones_like(t)
    return s * e * vol


def mix(buf, sig, start):
    i = int(start * SR)
    if i < 0 or i >= len(buf):
        return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n]


# Am - F - C - G，每和弦 4 秒，共 16 秒，120BPM（每拍 0.5s）
CHORDS = [
    (220.00, 261.63, 329.63),  # Am: A3 C4 E4
    (174.61, 220.00, 261.63),  # F:  F3 A3 C4
    (261.63, 329.63, 392.00),  # C:  C4 E4 G4
    (196.00, 246.94, 293.66),  # G:  G3 B3 D4
]
BASS = [110.00, 87.31, 130.81, 98.00]
DUR = 16.0
BEAT = 0.5


def build_bgm(name, running):
    buf = np.zeros(int(DUR * SR), dtype=np.float64)

    # 1) Pad 铺底：每和弦一个 4s 长音，三音叠加
    for ci, chord in enumerate(CHORDS):
        t0 = ci * 4.0
        for k, f in enumerate(chord):
            mix(buf, note(f, 4.6, 'pad', vol=0.30 if running else 0.34,
                          detune=(k - 1) * 0.0018), t0)

    # 2) 低音：每拍一个短 bass（run 更密，menu 每 2 拍）
    step = 1 if running else 2
    for ci in range(4):
        for b in range(0, 8, step):
            mix(buf, note(BASS[ci], 0.44, 'bass', vol=0.30 if running else 0.20),
                ci * 4.0 + b * BEAT)

    # 3) 琶音：稀疏高八度铃音
    for ci, chord in enumerate(CHORDS):
        seq = [chord[2] * 2, chord[1] * 2, chord[2] * 2, chord[0] * 4]
        for k, f in enumerate(seq):
            t0 = ci * 4.0 + (0.5 + k * 1.0 if not running else 0.25 + k * 0.75)
            mix(buf, note(f, 1.5, 'bell', vol=0.14 if running else 0.18), t0)

    # 4) 打击：仅 run 版加轻鼓
    if running:
        for i in range(32):
            t0 = i * BEAT
            if i % 4 == 0:
                mix(buf, note(60, 0.26, 'kick', vol=0.42), t0)
            if i % 2 == 1:
                mix(buf, note(8000 + (i % 3) * 700, 0.12, 'hat', vol=0.16), t0)
            if i % 8 == 4:
                mix(buf, note(220, 0.20, 'hat', vol=0.20), t0)  # 轻 snare 质感

    # 循环点处理：首尾各 0.25s 淡入淡出，避免爆音
    fade = int(0.25 * SR)
    w = np.linspace(0, 1, fade)
    buf[:fade] *= w
    buf[-fade:] *= w[::-1]

    # 轻微低通（削弱刺耳高频）+ 限幅
    kernel = np.ones(5) / 5.0
    buf = np.convolve(buf, kernel, mode='same')
    peak = np.abs(buf).max()
    if peak > 0:
        buf /= peak
    buf *= 0.78

    wav = '/tmp/%s.wav' % name
    write_wav(wav, buf)
    wav_to_ogg(wav, name)


def build_ambience():
    """夜风环境音：低频噪声缓慢起伏，8 秒循环"""
    dur = 8.0
    n = int(dur * SR)
    rng = np.random.default_rng(2026)
    noise = rng.standard_normal(n)
    # 一阶低通累积成柔和风声
    lp = np.zeros(n)
    acc = 0.0
    for i in range(n):
        acc = acc * 0.985 + noise[i] * 0.015
        lp[i] = acc
    lp /= (np.abs(lp).max() + 1e-6)
    t = np.arange(n) / SR
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / dur)
    buf = lp * swell * 0.5
    fade = int(0.4 * SR)
    w = np.linspace(0, 1, fade)
    buf[:fade] *= w
    buf[-fade:] *= w[::-1]
    wav = '/tmp/amb_night.wav'
    write_wav(wav, buf)
    wav_to_ogg(wav, 'amb_night')


if __name__ == '__main__':
    if not os.path.isdir(SRC):
        print('用法: python3 scripts/prepare_moon_audio.py <3DMoonRunner/Assets/Audio>')
        raise SystemExit(1)
    # 源码 5 个原版音效
    to_ogg(os.path.join(SRC, 'button.mp3'), 'button', 1.0)
    to_ogg(os.path.join(SRC, 'coin.mp3'), 'coin', 1.0)
    to_ogg(os.path.join(SRC, 'getitem.mp3'), 'getitem', 1.0)
    to_ogg(os.path.join(SRC, 'hit.mp3'), 'hit', 0.9)
    to_ogg(os.path.join(SRC, 'slide.ogg'), 'slide', 1.15)
    # 夜景 BGM 与环境音
    build_bgm('bgm_menu', False)
    build_bgm('bgm_run', True)
    build_ambience()
    print('\n输出清单:')
    for f in sorted(os.listdir(DST)):
        print(' ', f, os.path.getsize(os.path.join(DST, f)))
