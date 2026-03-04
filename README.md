# LoopStation Live (Electron)

Erweiterter Prototyp einer 5-Track-Loopstation mit Fokus auf **Live-Stabilität als erster Schritt** – als lokal laufende Electron-App.

## Enthaltene Funktionen
- 5 unabhängige Tracks
- Audio aktivieren (Mikrofon)
- Pro Track: Record, Overdub, Play, Stop, Mute, Undo, Clear
- BPM-Einstellung + Metronom
- Lautstärke pro Track + Master Volume
- Play All / Stop All
- **Vollständiger Session Recall in Electron**:
  - Projektdatei als JSON (z. B. `my-set.json`)
  - Persistente Audio-Dateien als WAV pro Track (`audio/track-1.wav` ...)
  - Laden stellt Loops + Mixer-Einstellungen wieder her
- Keyboard Shortcuts:
  - `1..5`: Track Play/Stop toggeln
  - `Leertaste`: Stop All

## Lokal als Electron-App starten
```bash
npm install
npm run start
```

## Projekt speichern/laden
- `Session speichern`: schreibt eine Projektdatei (`.json`) plus WAV-Dateien in einen `audio/` Unterordner.
- `Session laden`: lädt Projektdatei + WAV-Dateien vollständig zurück.

## Browser-Modus (Fallback)
```bash
python3 -m http.server 8080
```
Dann öffnen: `http://localhost:8080`

Im Browser ohne Electron werden aus Sicherheitsgründen weiterhin nur Settings über `localStorage` gespeichert (kein WAV-Dateizugriff).

## Roadmap Richtung RC-505 MK II
- Sample-genaue Quantisierung und globaler Transport
- Mehrstufiges Undo/Redo
- MIDI Learn + MIDI Clock In/Out
- Effektketten (Input FX, Track FX, Master FX)
- Installer/Build-Pipeline für Windows (`electron-builder`)
