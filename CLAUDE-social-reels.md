# CLAUDE-social-reels.md

Companion to `CLAUDE.md`. Read this when James asks for a social media video, a reel, an ASMR clip, or anything for the Ingersoll Painting social pages. Written Sep 26 2026 from the session where the first reel was attempted. **Read section 4 before promising him anything:** that session hit three walls, and each one is listed there with its fix.

---

## 1. The goal

James has taken over social media for Ingersoll Painting and wants to **post weekly**. He wants Claude to make the videos regularly, and **as easy as possible for him**: he films on the job, drops the clips somewhere, says one sentence, and gets back a finished video to post.

Content style so far: short **ASMR job clips**, like sanding wood trim around a skylight and then brushing on polyurethane. The real sound is the point.

## 2. The weekly workflow (agreed)

1. James films clips on the job (Samsung Galaxy Z Fold 5, Samsung camera, `.mp4`).
2. On his phone: **Share → Drive → "Ingersoll Reels - Drop Clips Here"**.
   - Folder: https://drive.google.com/drive/folders/12aMi53_-8JDY6WGcorCD4Y4PSzG-WaGo
   - Folder ID: `12aMi53_-8JDY6WGcorCD4Y4PSzG-WaGo`
3. He says something like *"make this week's reel, sanding then poly, 30 seconds."*
4. Claude downloads the clips, cuts the reel, writes the caption and hashtags, and **sends the finished `.mp4` back in the chat** (`SendUserFile`). He saves it and posts it. If he wants a trending sound or an effect, he opens it in CapCut and adds that himself (about 30 seconds of work).

Offered but not set up yet: a weekly reminder (for example Monday morning: "Drop this week's clips in the Reels folder"). Ask before creating it.

## 3. House style for a reel

- **Vertical 9:16, 1080x1920, 30fps.** Length is whatever he asks for (the first one was **30 seconds**).
- **ASMR = the real sound only.** No music and no voiceover. Turn the clip audio up (about 200%), normalize it, and add light noise reduction only if there is wind or a hum.
- Clips play **in the order he gives** (process order: prep → finish). Split the time evenly unless told otherwise (30s = ~15s + ~15s).
- Pick the **best section** of each clip: sand the grit sound loudest, brush strokes slow and even, hands and work in frame, no shaky walking shots. Choose it from sampled frames plus the audio loudness (for example the ffmpeg `ebur128` / `astats` filters). Say plainly that the pick was made that way.
- **0.5s dissolve** between clips (`xfade` + `acrossfade`).
- Optional small text at the start: "Skylight trim 🔊 sound on". **Ingersoll Painting logo** for the last ~1s (the base64 logo is embedded in `PaintPro-ZFold.html`; `icon-512.png` is a fallback).
- Caption pattern: *"Sand. Brush. Satisfying. 🔊 Skylight trim refresh, Central New York. #ASMR #woodworking #polyurethane #painting #satisfying"*
- **Privacy, same rule as the in-app Reel Kit (CLAUDE.md 7.12): never a client name or street address** in the video or the caption. Town at most, else "Central New York".

## 4. What blocked the first attempt (Sep 26 2026) and the fixes

The first reel (clips from Sep 25, see section 6) **was not made**. Three separate problems:

| Problem | Detail | Fix |
|---|---|---|
| **Drive connector can't download videos** | `mcp__Google_Drive__download_file_content` refuses anything over **10 MB**. Phone videos are 50-100 MB. | Download over plain HTTPS instead (below). |
| **Network policy blocked Google Drive** | The cloud environment's egress proxy returned 403 for `drive.usercontent.google.com` and `drive.google.com` (`www.googleapis.com` was reachable). James changed the setting, but the **running session still got 403**. The setting most likely applies only to **newly started sessions**. | James sets the environment's **Network access → Full** (https://claude.ai/code → environment name at top of the conversation → Edit). Then work in a **new** session. Check with `curl -sS "$HTTPS_PROXY/__agentproxy/status"`. |
| **Claude can't turn on link sharing** | `mcp__Google_Drive__share_file` only shares with an **email address**, not "anyone with the link". | **James does it once on the folder:** Share → General access → Anyone with the link → Viewer. Files dropped in the folder inherit it. |

Once all three are sorted, a public file downloads with:
```
curl -L -o clip.mp4 "https://drive.usercontent.google.com/download?id=FILE_ID&export=download&confirm=t"
```
Use `mcp__Google_Drive__search_files` with `parentId = '12aMi53_-8JDY6WGcorCD4Y4PSzG-WaGo'` to list the folder and get the file IDs.

**Getting the finished video back:** send it with `SendUserFile`. Uploading back to Drive through `create_file` means base64 in a tool call, which is impractical at video size.

**Tools:** ffmpeg is not installed in the container. `pip install imageio-ffmpeg` provides a static ffmpeg 7 binary at `python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"` (PyPI is always reachable).

## 5. Things James asked and the answers he got (don't re-explain from scratch)

- **"Why can't you just bring it into CapCut?"** CapCut has no API and no connector, and it runs on his phone while Claude runs in a cloud container. Claude makes the finished video; CapCut is optional for extras. (Also see CLAUDE.md 7.12: the app's Reel Kit hands tagged job *photos* to CapCut via the share sheet. Writing CapCut project files was ruled out.)
- **"Will yours be as good as CapCut?"** For simple ASMR and process clips, about the same, and every week comes out consistent. CapCut is better for trending sounds and templates, flashy effects, auto-captions on talking videos, and picking the *perfect* moment (Claude judges from frames and audio, not by watching). Suggested split: Claude does the cut, sound, logo and caption; James adds a trending sound in CapCut when he wants one.
- **He found the network setting confusing.** He didn't know where "Network access" was. Give the exact path with a full `https://` link, and remember he is usually on his phone.

## 6. Files from the first reel (Sep 25 2026, skylight job)

Copied into the Reels folder and renamed:
| Order | File | Drive ID | Size |
|---|---|---|---|
| 1 | `1 - sanding skylight.mp4` | `1w-0za5v9cFeXyROcfuUD13qyJ3EkaKqh` | 75 MB |
| 2 | `2 - poly skylight.mp4` | `1t1_kbWr-yzT_JYuN6L0qf1Pm8DwMxMhu` | 95 MB |

Originals: `20260925_104554_94a117dd.mp4` and `20260925_130934_8cb585b0.mp4`, in the Drive folder `1LzforNfTBxx58lZnL350ntTDzFD4kDiw` along with four other clips from the same morning.

**Status:** waiting on James to (a) share the folder by link and (b) start a new session with Network access set to Full. The prompt he was given for that new session:

> Make a 30-second vertical ASMR reel for Ingersoll Painting from the two clips in my Drive folder "Ingersoll Reels - Drop Clips Here" (1 - sanding skylight, then 2 - poly skylight). Real sound only, turned up, dissolve between them, logo at the end, plus a caption and hashtags. Send me the video.

If it works, James will decide whether to keep doing it this way every week.
