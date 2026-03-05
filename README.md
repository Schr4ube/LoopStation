# Live LoopStation (Electron)

Prototyp for a 5-Track-Loopstation with a fokus on **Live-Stability** – as a lokal running Electron-App.

![Current_Image](/images/ls_current.png)

## Inculded
- 5 idepended tracks
- activate audio (mikrofon)
- Per Track: Record, Overdub, Play, Stop, Mute, Undo, Clear
- BPM-Settings + Metronom
- Volume per track + major volume
- **Effects**:
  - Per Track: Filter + Delay-Mix
  - Master: Filter, Delay-Mix, Delay-Time, Feedback
- Play All / Stop All
- Full Session Recall in Electron:
  - Projektfile as JSON
  - Persistente WAV-Files per Track (`audio/track-1.wav` ...)
  - Loading recreates Loops + Mixer- and FX-Settings as saved
- Keyboard Shortcuts:
  - `1..5`: Track Play/Stop toggel
  - `Space`: Stop All

## Development
```bash
npm install
npm run start
```

## Windows Installer / Build-Pipeline (`electron-builder`)
Build-Pipeline is configured via `electron-builder.yml`.

## Available build commands
```bash
npm run pack        # unpacked build directory
npm run dist        # generates distributables for the current platform
npm run dist:win    # generates Windows NSIS Installer + Portable (x64)
```

### Build output
- Artifacts are stored in `dist/`
- Planned targets for Windows:
  - NSIS installer (`.exe`)
  - Portable (`.exe`)

## Save/load project
- `Save session`: writes a project file (`.json`) plus WAV files to an `audio/` subfolder.
- `Load session`: loads the project file + WAV files back in their entirety.

## Browser-Modus (Fallback)
```bash
python3 -m http.server 8080
```
Then open: `http://localhost:8080`

In browsers without Electron, only settings including FX are stored in `localStorage` (no WAV file access).
