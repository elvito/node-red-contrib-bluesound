# node-red-contrib-bluesound

Node-RED Node zur Steuerung von **Bluesound / BluOS** Lautsprechern über die HTTP-API (Port 11000).  
Liefert Wiedergabe-Status via Long-Polling und ermöglicht vollständige Steuerung (Play, Pause, Lautstärke, Presets uvm.).

> ⚠️ **Hinweis:** Dieser Node wurde mit KI-Unterstützung (Claude / Anthropic) erstellt.  
> Er funktioniert, wird aber ohne Garantie auf Dauerhaftigkeit oder Vollständigkeit bereitgestellt.

> ℹ️ **Aktueller Status:** Der Node befindet sich nicht in aktiver Entwicklung, ich werde daran nur etwas ändern, wenn es für mich persönlich nicht mehr funktioniert. Bei dringenden Problemen/Featurewünschen etc. bitte das Repo forken und selbst beheben.

---

## Enthaltene Nodes

### `bluesound-device` (Config-Node)
Speichert IP-Adresse und Port eines Bluesound-Geräts. Kann von mehreren Nodes gleichzeitig genutzt werden.

### `bluesound-status`
Empfängt Status-Updates vom Gerät via **BluOS Long-Polling** — das Gerät antwortet erst wenn sich etwas ändert. Titelwechsel, Play/Pause und Lautstärkeänderungen werden so nahezu in Echtzeit gemeldet, ohne unnötigen Netzwerktraffic.

### `bluesound-command`
Sendet Steuerbefehle an das Gerät (Play, Pause, Lautstärke, Presets, ...).

---

## Passende Nodes

Der `bluesound-status` Node gibt Wiedergabedaten direkt im Format aus, das [`node-red-contrib-scrobbler`](https://github.com/elvito/node-red-contrib-scrobbler) erwartet — kein Mapping nötig.

```
[bluesound-status] ──→ [scrobbler]
```

Mit dem Scrobbler werden Titel automatisch an **Last.fm** und/oder **ListenBrainz** gemeldet.

---

## Installation

```bash
cd ~/.node-red
npm install elvito/node-red-contrib-bluesound
node-red-restart
```

## Update

```bash
cd ~/.node-red
npm install elvito/node-red-contrib-bluesound
node-red-restart
```

Da das Paket direkt von GitHub installiert wird, zieht `npm install` immer den aktuellen Stand aus dem `main`-Branch.

---

## Einrichtung

### 1. IP-Adresse des Geräts herausfinden

Die IP-Adresse findest du in der **BluOS Controller App**:  
Einstellungen → Gerät auswählen → Geräteinformationen → Diagnostics

### 2. Config-Node anlegen

Einen `bluesound-device` Config-Node anlegen und IP-Adresse sowie Port (Standard: `11000`) eintragen.

### 3. Status-Node platzieren

Den `bluesound-status` Node in den Flow ziehen, Config-Node auswählen. Der Node startet automatisch und sendet bei jeder Statusänderung eine Nachricht.

---

## `bluesound-status` — Ausgabe

`msg.payload` enthält den aktuellen Gerätestatus als Objekt:

```json
{
  "state":   "play",
  "title":   "Creep",
  "artist":  "Radiohead",
  "album":   "Pablo Honey",
  "volume":  "42",
  "secs":    "87",
  "totlen":  "238",
  "service": "Tidal",
  "shuffle": "0",
  "repeat":  "2"
}
```

| Feld      | Beschreibung                                      |
|-----------|---------------------------------------------------|
| `state`   | `play` / `pause` / `stop`                         |
| `title`   | Aktueller Titelname                               |
| `artist`  | Interpret                                         |
| `album`   | Album                                             |
| `volume`  | Lautstärke in Prozent                             |
| `secs`    | Aktuelle Position in Sekunden                     |
| `totlen`  | Gesamtlänge in Sekunden                           |
| `service` | Aktive Quelle (z.B. `Tidal`, `LocalMusic`, `TuneIn`) |
| `shuffle` | `0` = aus, `1` = an                               |
| `repeat`  | `0` = alles, `1` = Titel, `2` = aus               |

---

## `bluesound-command` — Verfügbare Befehle

Der Befehl wird im Node konfiguriert oder per `msg.command` zur Laufzeit überschrieben. Parameter können im Node eingetragen oder per `msg.params` (Objekt) übergeben werden.

| Befehl        | Beschreibung                                      | Parameter           |
|---------------|---------------------------------------------------|---------------------|
| `status`      | Aktuellen Status abrufen                          | —                   |
| `play`        | Wiedergabe starten                                | `id`, `seek`, `url` |
| `pause`       | Pause                                             | —                   |
| `togglepause` | Play/Pause umschalten                             | —                   |
| `stop`        | Stop                                              | —                   |
| `next`        | Nächster Titel                                    | —                   |
| `prev`        | Vorheriger Titel                                  | —                   |
| `volume`      | Lautstärke setzen                                 | `level=0-100`       |
| `mute`        | Stummschalten                                     | —                   |
| `unmute`      | Stummschaltung aufheben                           | —                   |
| `shuffle`     | Zufallswiedergabe                                 | `state=0/1`         |
| `repeat`      | Wiederholen                                       | `state=0/1/2`       |
| `preset`      | Preset aktivieren                                 | `id=1-40`           |
| `presets`     | Liste aller Presets abrufen                       | —                   |
| `playlist`    | Aktuelle Wiedergabeliste                          | —                   |
| `clear`       | Wiedergabeliste leeren                            | —                   |
| `syncstatus`  | Sync-Status abrufen (Gruppe, Lautstärke)          | —                   |

### Lautstärke per `msg.payload` setzen

```js
msg.command = "volume";
msg.payload = 50;  // direkt als Zahl
```

### Befehl zur Laufzeit überschreiben

```js
msg.command = "next";
msg.params  = {};
```

---

## Lizenz

MIT
