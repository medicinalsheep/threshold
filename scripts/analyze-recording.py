#!/usr/bin/env python3
"""RMS envelope + spectral hints for segment tagging."""
import subprocess
import struct
import sys
import json

FFMPEG = r"C:\Users\White\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\White\Downloads\Phone Link\New Recording.m4a"
SR = 22050
WIN = int(SR * 0.05)


def decode(filter_af=None):
    cmd = [FFMPEG, "-y", "-i", SRC, "-ac", "1", "-ar", str(SR)]
    if filter_af:
        cmd += ["-af", filter_af]
    cmd += ["-f", "s16le", "-"]
    proc = subprocess.run(cmd, capture_output=True, check=True)
    raw = proc.stdout
    return struct.unpack(f"<{len(raw)//2}h", raw)


def regions_from(samples, thresh_ratio=0.04, gap=0.3):
    nwin = len(samples) // WIN
    rms = []
    for i in range(nwin):
        chunk = samples[i * WIN : (i + 1) * WIN]
        s = sum(x * x for x in chunk) / len(chunk)
        rms.append((i * WIN / SR, (s ** 0.5) / 32768.0))
    peak = max(r for _, r in rms) or 1e-9
    thresh = max(peak * thresh_ratio, 0.004)
    active = [(t, r) for t, r in rms if r > thresh]
    out = []
    if not active:
        return out, peak, thresh
    start, last_t, max_r = active[0][0], active[0][0], active[0][1]
    for t, r in active[1:]:
        if t - last_t > gap:
            out.append({"start": round(start, 2), "end": round(last_t + 0.05, 2), "peak": round(max_r, 4)})
            start, max_r = t, r
        else:
            max_r = max(max_r, r)
        last_t = t
    out.append({"start": round(start, 2), "end": round(last_t + 0.05, 2), "peak": round(max_r, 4)})
    return out, peak, thresh


full = decode()
bird = decode("highpass=f=1500,lowpass=f=9000")
low = decode("lowpass=f=1200")

full_r, full_p, full_t = regions_from(full, 0.035, 0.25)
bird_r, bird_p, _ = regions_from(bird, 0.03, 0.2)
low_r, low_p, _ = regions_from(low, 0.04, 0.25)

print(json.dumps({
    "duration": round(len(full) / SR, 2),
    "full_peak": round(full_p, 4),
    "full_thresh": round(full_t, 4),
    "full_regions": full_r,
    "bird_band_regions": bird_r[:8],
    "low_band_regions": low_r[:12],
}, indent=2))