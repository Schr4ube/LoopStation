# LoopStation Live (Prototype+)

Erweiterter Prototyp einer 5-Track-Loopstation mit Fokus auf **Live-Stabilität als erster Schritt**.

## Enthaltene Funktionen
- 5 unabhängige Tracks
- Audio aktivieren (Mikrofon)
- Pro Track: Record, Overdub, Play, Stop, Mute, Undo, Clear
- BPM-Einstellung + Metronom
- Lautstärke pro Track + Master Volume
- Play All / Stop All
- Session Save/Load (Settings + Track-Status in `localStorage`)
- Keyboard Shortcuts:
  - `1..5`: Track Play/Stop toggeln
  - `Leertaste`: Stop All

## Start
```bash
python3 -m http.server 8080
```
Dann öffnen: `http://localhost:8080`

## Wichtiger Hinweis
Session Save/Load speichert aktuell nur **Einstellungen und Status**, nicht die Audio-PCM-Daten der Loops. Für vollständiges Session-Recall wäre ein persistentes Audioformat (z. B. WAV/OPUS + Projektdatei) der nächste Schritt.

## Roadmap Richtung RC-505 MK II
- Sample-genaue Quantisierung und globaler Transport
- Mehrstufiges Undo/Redo
- Persistente Audio-Sessions (Import/Export)
- MIDI Learn + MIDI Clock In/Out
- Effektketten (Input FX, Track FX, Master FX)
- Windows Standalone Packaging über Tauri/Electron
