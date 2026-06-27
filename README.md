# node-red-contrib-bluesound

Node-RED Nodes zur Steuerung von Bluesound / BluOS Geräten über die HTTP API (Port 11000).

## Installation

```bash
cd ~/.node-red
npm install elvito/node-red-contrib-bluesound
```

Danach Node-RED neu starten.

**Hinweis:** Das Paket benötigt `xml2js`, das automatisch mitinstalliert wird.

## Enthaltene Nodes

### bluesound-device (Config)
Definiert ein Bluesound-Gerät mit IP-Adresse und Port (Standard: 11000).  
Die IP findest du in der BluOS Controller App: *Einstellungen → Diagnostics*.

---

### bluesound-command
Sendet einen Befehl an das Gerät und gibt die Antwort aus.

#### Eingabe
| Eigenschaft | Typ | Beschreibung |
|---|---|---|
| `msg.command` | string | Überschreibt den konfigurierten Befehl |
| `msg.params` | object | Zusätzliche Query-Parameter |
| `msg.payload` | object/number | Parameter-Objekt oder direkt Lautstärke (bei volume) |
| `msg.host` / `msg.port` | string/number | Überschreibt die Geräteadresse |

#### Ausgabe
`msg.payload` enthält die geparste XML-Antwort als Objekt.

#### Beispiele (msg.payload)

```js
// Play
{ command: "play" }

// Pause / Play-Pause Toggle
{ command: "pause" }
{ command: "togglepause" }

// Lautstärke auf 42%
{ command: "volume", level: 42 }
// oder einfach:
msg.payload = 42;  // bei command=volume im Node

// Nächster / Vorheriger Titel
{ command: "next" }
{ command: "prev" }

// Preset 1 aktivieren
{ command: "preset", id: 1 }

// Shuffle an
{ command: "shuffle", state: 1 }

// Repeat: 0=alles, 1=Titel, 2=aus
{ command: "repeat", state: 0 }

// Status abrufen
{ command: "status" }

// Stream-URL abspielen
{ command: "play", url: "http://meinradio.de/stream.mp3" }
```

---

### bluesound-status
Empfängt Status-Updates vom Gerät in Echtzeit via **BluOS Long-Polling**.

Der Node hält eine HTTP-Verbindung offen. Das Gerät antwortet erst wenn sich  
etwas ändert (Titelwechsel, Play/Pause, etc.) oder der Timeout abläuft.

#### Ausgabe (msg.payload)
```js
{
  state: "play",        // play | pause | stop
  title: "Song Name",
  artist: "Interpret",
  album: "Album",
  volume: "50",         // 0-100
  service: "Tidal",
  secs: "120",          // aktuelle Position in Sekunden
  totlen: "240",        // Gesamtlänge
  shuffle: "0",         // 0=aus, 1=an
  repeat: "2",          // 0=alles, 1=Titel, 2=aus
  // ... weitere Felder je nach Gerät
}
```

## BluOS API Endpunkte

Alle Endpunkte sind GET-Requests auf Port 11000:

| Endpunkt | Beschreibung |
|---|---|
| `/Status` | Aktueller Wiedergabestatus |
| `/SyncStatus` | Sync-Status (Lautstärke, Gruppen) |
| `/Play` | Wiedergabe starten (optional: `id`, `seek`, `url`) |
| `/Pause` | Pause (optional: `toggle=1`) |
| `/Stop` | Stopp |
| `/Skip` | Nächster Titel |
| `/Back` | Vorheriger Titel |
| `/Volume` | Lautstärke (`level=0-100`, `mute=0/1`) |
| `/Shuffle` | Zufallswiedergabe (`state=0/1`) |
| `/Repeat` | Wiederholen (`state=0/1/2`) |
| `/Presets` | Presets auflisten |
| `/Preset` | Preset aktivieren (`id=1-40`) |
| `/Playlist` | Aktuelle Wiedergabeliste |
| `/Clear` | Wiedergabeliste leeren |

## Lizenz

MIT
