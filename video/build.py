#!/usr/bin/env python3
"""Builds video/out/overturn_demo.mp4 from narration.json, the slides and the captured footage.

    TTS=/path/to/edge-tts python3 video/build.py [--skip-capture]

Steps: synthesize narration per segment → render slides → capture before/after (unless skipped)
→ per-segment clips (video held to the narration length) → concat.
"""
import json, os, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
WORK = OUT / "work"
TTS = os.environ.get("TTS", "edge-tts")
SKIP_CAPTURE = "--skip-capture" in sys.argv
OUT.mkdir(exist_ok=True); WORK.mkdir(exist_ok=True)

def run(cmd, **kw):
    print("$", " ".join(str(c) for c in cmd)[:220])
    subprocess.run([str(c) for c in cmd], check=True, **kw)

def duration(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())

spec = json.loads((HERE / "narration.json").read_text())
voice, rate = spec["voice"], spec.get("rate", "+0%")

# 1. narration
for seg in spec["segments"]:
    mp3 = WORK / f"{seg['id']}.mp3"
    if not mp3.exists():
        run([TTS, "--voice", voice, "--rate", rate, "--text", seg["text"], "--write-media", mp3])
    seg["audio"] = mp3
    seg["adur"] = duration(mp3)
    print(f"  {seg['id']}: narration {seg['adur']:.1f}s")

# 2. slides
slides_dir = WORK / "slides"
if not (slides_dir / "slide_title.png").exists():
    run(["node", HERE / "capture.mjs", "slides", slides_dir])

# 3. captures
for name in ("retrofit", "before", "after"):
    d = WORK / name
    if SKIP_CAPTURE and (d / "list.txt").exists() and name not in os.environ.get("RECAPTURE", "").split(","):
        continue
    if d.exists(): shutil.rmtree(d)
    run(["node", HERE / "capture.mjs", name, d])

# 4. per-segment clips
clips = []
for seg in spec["segments"]:
    clip = WORK / f"{seg['id']}.mp4"
    lead = float(seg.get("lead", 0.5))  # seconds of silence before the narration starts
    a = seg["adur"] + lead + 0.2  # lead-in + tail
    if seg["kind"] == "slide":
        D = a
        png = slides_dir / seg["slide"].replace(".html", ".png")
        run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", png, "-i", seg["audio"],
             "-filter_complex", f"[0:v]scale=1280:800,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st={D-0.5:.2f}:d=0.5[v];[1:a]adelay={int(lead*1000)}|{int(lead*1000)},apad[a]",
             "-map", "[v]", "-map", "[a]", "-t", f"{D:.2f}", "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", clip])
    else:
        d = WORK / seg["capture"]
        raw = WORK / f"{seg['id']}_raw.mp4"
        speed = float(seg.get("speed", 1.0))
        run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", d / "list.txt",
             "-vf", f"setpts=PTS/{speed},scale=1280:800,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "20", "-preset", "medium", raw])
        V = duration(raw)
        D = max(V, a)
        pad = max(0.0, D - V)
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-i", seg["audio"],
             "-filter_complex", f"[0:v]tpad=stop_mode=clone:stop_duration={pad:.2f},fade=t=in:st=0:d=0.4,fade=t=out:st={D-0.4:.2f}:d=0.4[v];[1:a]adelay={int(lead*1000)}|{int(lead*1000)},apad[a]",
             "-map", "[v]", "-map", "[a]", "-t", f"{D:.2f}", "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", clip])
        print(f"  {seg['id']}: footage {V:.1f}s, narration {seg['adur']:.1f}s → clip {D:.1f}s")
    clips.append(clip)

# 5. concat
lst = WORK / "concat.txt"
lst.write_text("".join(f"file '{c}'\n" for c in clips))
final = OUT / "overturn_demo.mp4"
run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", final])
total = duration(final)
print(f"\n{final}  {total:.1f}s ({int(total//60)}:{int(total%60):02d})  {final.stat().st_size/1e6:.1f} MB")
if total > 180: print("WARNING: over 3:00 — trim narration")
