# SubLocal

SubLocal is a desktop app for generating subtitle files from local video files. Drop in a video or a folder, choose the source and target languages, and SubLocal creates `.srt` subtitles on your machine using local AI.

It is built for personal media, owned recordings, educational material, and any files you have the right to process. It does not upload videos, require an account, or use paid APIs.

[Buy me a coffee](https://www.buymeacoffee.com/ynonF) if this app saves you time.

## What It Does

- Transcribes speech from videos with Faster-Whisper.
- Translates subtitles locally with Argos Translate.
- Saves standard `.srt` files next to the source video or in a selected output folder.
- Can batch-process folders of videos.
- Supports optional burn-in subtitles with FFmpeg.
- Includes right-to-left handling for Hebrew and Arabic.

## Free Installers

Free unsigned installers are built by GitHub Actions:

| Platform | Output |
| --- | --- |
| Windows | NSIS `.exe` installer |
| macOS | unsigned `.dmg` installer |
| Linux | `.AppImage` and `.deb` packages |

To build them in GitHub, open **Actions -> Build Installers -> Run workflow**. The finished installers are uploaded as workflow artifacts.

To build locally on Windows:

```powershell
.\scripts\package-windows.ps1
```

To build locally on the current OS with PowerShell:

```powershell
.\scripts\package-platform.ps1
```

macOS builds must run on macOS. Linux builds should run on Linux. The GitHub Actions workflow handles this automatically.

## Development Setup

### Requirements

- Node.js 18 or newer
- Python 3.10 or newer
- FFmpeg in `PATH` for burn-in subtitle output

### Install

```bash
npm install
cd worker
pip install -r requirements.txt
```

### Run

```powershell
.\scripts\dev.ps1
```

Or run the desktop app directly:

```bash
npm run dev
```

## Python Worker

Run the worker directly for testing:

```bash
cd worker
python -m sublocal_worker.main --input "C:\Videos\episode.mkv" --target-lang he --source-lang auto --model small --device auto --compute-type auto
```

Install a translation package:

```bash
python -m sublocal_worker.main --install-translation-package en he
```

## Supported Languages

| Language | Code |
| --- | --- |
| Hebrew | `he` |
| English | `en` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Arabic | `ar` |
| Russian | `ru` |
| Portuguese | `pt` |
| Italian | `it` |
| Japanese | `ja` |
| Korean | `ko` |
| Chinese (Simplified) | `zh` |
| Turkish | `tr` |
| Ukrainian | `uk` |
| Polish | `pl` |

## Privacy

SubLocal is local by default:

- Video files are never uploaded by the app.
- Whisper models are downloaded once and cached locally.
- Argos Translate packages are downloaded once and cached locally.
- There is no telemetry, analytics, account, or API key.

## Legal

Use SubLocal only with personal media, owned content, educational material, or files you have the legal right to process. SubLocal does not bypass DRM or help rip streaming services.

## License

MIT. See [LICENSE](LICENSE).
