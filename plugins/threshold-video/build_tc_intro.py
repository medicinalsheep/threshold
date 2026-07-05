#!/usr/bin/env python3
"""Build TC intro cutscene — R7. Output: video/tc_intro.webm (+ mp4 fallback)"""
from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone

import imageio.v3 as iio
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "video")
PUB_DIR = os.path.join(ROOT, "public", "bundle", "video")
MAN_PATH = os.path.join(OUT_DIR, "threshold_video_manifest.json")

W, H = 640, 352
FPS = 30
DURATION = 3.6
ACCENT = (57, 255, 20)
BG = (10, 10, 18)
SUB = (160, 168, 190)


def frame_at(t: float) -> np.ndarray:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    pulse = 0.5 + 0.5 * math.sin(t * 4.2)
    bar_w = int(W * min(1.0, t / 0.7))
    draw.rectangle([0, H // 2 - 3, bar_w, H // 2 + 3], fill=ACCENT)

    grid_a = int(28 * pulse)
    for x in range(0, W, 48):
        draw.line([(x, 0), (x, H)], fill=(grid_a, grid_a + 8, grid_a + 16), width=1)
    for y in range(0, H, 40):
        draw.line([(0, y), (W, y)], fill=(grid_a, grid_a + 8, grid_a + 16), width=1)

    fade_in = min(1.0, max(0.0, (t - 0.35) / 0.55))
    fade_out = min(1.0, max(0.0, (DURATION - 0.55 - t) / 0.45))
    alpha = fade_in * fade_out

    if alpha > 0.02:
        title_c = tuple(int(BG[i] + (ACCENT[i] - BG[i]) * alpha) for i in range(3))
        sub_c = tuple(int(BG[i] + (SUB[i] - BG[i]) * alpha) for i in range(3))
        draw.text((36, H // 2 - 58), "TC SHOWCASE", fill=title_c)
        draw.text((36, H // 2 - 28), "Original assets · veh · chr · sfx", fill=sub_c)
        draw.text((36, H // 2 - 4), "Lobby TC → · EXPORT walkthrough", fill=sub_c)
        badge = int(40 + 180 * alpha)
        draw.rectangle([W - 130, 28, W - 28, 58], outline=(badge, 255, badge // 2), width=2)
        draw.text((W - 118, 34), "R7 INTRO", fill=(badge, 255, badge // 2))

    return np.asarray(img)


def write_manifest(webm_name: str, mp4_name: str | None) -> None:
    videos = [
        {
            "id": "tc_intro",
            "label": "TC Intro",
            "file": webm_name,
            "path": f"video/{webm_name}",
            "format": "webm",
            "tcEd": "tc-show",
            "license": "Original — TC",
            "realism": "r7",
            "durationSec": DURATION,
            "resolution": [W, H],
            "trigger": "lobby-tc",
            "api": "World.playCutscene('video/tc_intro.webm', { skippable: true })",
        }
    ]
    if mp4_name:
        videos.append({
            "id": "tc_intro_mp4",
            "label": "TC Intro (MP4 fallback)",
            "file": mp4_name,
            "path": f"video/{mp4_name}",
            "format": "mp4",
            "tcEd": "tc-show",
            "license": "Original — TC",
            "realism": "r7",
        })

    man = {
        "format": "threshold-video-manifest",
        "formatVersion": 1,
        "engineVersion": "5.11.0",
        "tcRealism": "r7",
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "exportDir": "video",
        "videos": videos,
    }
    if os.path.isfile(MAN_PATH):
        try:
            with open(MAN_PATH, "r", encoding="utf-8") as handle:
                old = json.load(handle)
            for v in old.get("videos", []):
                if v.get("id") not in {x["id"] for x in videos}:
                    videos.append(v)
            man["videos"] = videos
        except Exception:
            pass
    with open(MAN_PATH, "w", encoding="utf-8") as handle:
        json.dump(man, handle, indent=2)
        handle.write("\n")


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(PUB_DIR, exist_ok=True)

    n = int(FPS * DURATION)
    frames = [frame_at(i / FPS) for i in range(n)]

    webm_path = os.path.join(OUT_DIR, "tc_intro.webm")
    mp4_path = os.path.join(OUT_DIR, "tc_intro.mp4")

    iio.imwrite(webm_path, frames, fps=FPS, codec="libvpx-vp9", quality=7)
    try:
        iio.imwrite(mp4_path, frames, fps=FPS, codec="libx264", quality=7)
        mp4_name = "tc_intro.mp4"
    except Exception:
        mp4_path = None
        mp4_name = None

    for src in [webm_path] + ([mp4_path] if mp4_path and os.path.isfile(mp4_path) else []):
        dst = os.path.join(PUB_DIR, os.path.basename(src))
        with open(src, "rb") as inf, open(dst, "wb") as outf:
            outf.write(inf.read())

    write_manifest("tc_intro.webm", mp4_name)
    print(f"[tc-intro] {webm_path} ({os.path.getsize(webm_path) // 1024} KB, {n} frames)")
    if mp4_name:
        print(f"[tc-intro] {mp4_path}")
    print(f"[tc-intro] manifest → {MAN_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())