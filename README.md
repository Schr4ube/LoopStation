# LoopStation Live (Electron)

Erweiterter Prototyp einer 5-Track-Loopstation mit Fokus auf **Live-Stabilität** – als lokal laufende Electron-App.

## Enthaltene Funktionen
- 5 unabhängige Tracks
- Audio aktivieren (Mikrofon)
- Pro Track: Record, Overdub, Play, Stop, Mute, Undo, Clear
- BPM-Einstellung + Metronom
- Lautstärke pro Track + Master Volume
- **Effektketten**:
  - Pro Track: Filter + Delay-Mix
  - Master: Filter, Delay-Mix, Delay-Time, Feedback
- Play All / Stop All
- Vollständiger Session Recall in Electron:
  - Projektdatei als JSON
  - Persistente WAV-Dateien pro Track (`audio/track-1.wav` ...)
  - Laden stellt Loops + Mixer- und FX-Einstellungen wieder her
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

Im Browser ohne Electron werden nur Settings inkl. FX in `localStorage` gespeichert (kein WAV-Dateizugriff).
