# LoopStation Live (Prototype)

Ein schneller Prototyp einer 5-Track-Loopstation mit Fokus auf **Live-Stabilität als erster Schritt**.

## Enthaltene Funktionen
- 5 unabhängige Tracks
- Audio aktivieren (Mikrofon)
- Pro Track: Record, Play, Stop, Clear
- BPM-Einstellung
- Einfaches Metronom
- Lautstärke pro Track
- Modernes, performantes Frontend (HTML/CSS/JS)

## Start
```bash
python3 -m http.server 8080
```
Dann öffnen: `http://localhost:8080`

## Hinweis zum Ziel "Windows Standalone"
Dieser Prototyp ist bewusst als schnelle Basis umgesetzt. Für ein echtes Standalone auf Windows mit Installer sind die nächsten sinnvollen Schritte:
1. UI in Tauri/Electron einbetten
2. Audio-Engine in Rust/C++ auslagern (sample-genaues Scheduling)
3. Latenz-/Stress-Tests für <10ms Ziel

## Nächste technische Schritte
- Quantisierung sample-genau statt auf Record-Länge
- Echte Overdub-Engine (Additiv statt Replace)
- Undo/Redo Buffer-Historie
- MIDI-Mapping + Clock In/Out
- Session Save/Load
