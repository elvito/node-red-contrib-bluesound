// bluesound.js - Node-RED Node für Bluesound/BluOS Geräte

const http = require('http');
const xml2js = require('xml2js');

module.exports = function(RED) {
    
    // Konfigurationsnode für Bluesound Geräte
    function BluesoundConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.host = config.host;
        this.port = config.port || 11000;
        this.timeout = config.timeout || 5000;
    }
    RED.nodes.registerType("bluesound-config", BluesoundConfigNode);

    // Hauptnode für Bluesound Steuerung
    function BluesoundNode(config) {
        RED.nodes.createNode(this, config);
        
        const node = this;
        const configNode = RED.nodes.getNode(config.device);
        
        if (!configNode) {
            node.error("Kein Bluesound-Gerät konfiguriert");
            return;
        }
        
        node.host = configNode.host;
        node.port = configNode.port;
        node.timeout = configNode.timeout;
        
        // Parser für XML-Antworten
        const parser = new xml2js.Parser({ explicitArray: false });
        
        // HTTP-Request an BluOS API
        function makeBluesoundRequest(path, callback) {
            const options = {
                hostname: node.host,
                port: node.port,
                path: path,
                method: 'GET',
                timeout: node.timeout
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        parser.parseString(data, (err, result) => {
                            if (err) {
                                callback(err, null);
                            } else {
                                callback(null, result);
                            }
                        });
                    } else {
                        callback(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`), null);
                    }
                });
            });
            
            req.on('error', (err) => {
                callback(err, null);
            });
            
            req.on('timeout', () => {
                req.destroy();
                callback(new Error('Request timeout'), null);
            });
            
            req.end();
        }
        
        // Verarbeitung eingehender Nachrichten
        node.on('input', function(msg) {
            const action = msg.payload.action || config.action || 'status';
            const value = msg.payload.value || msg.payload.volume || msg.payload.url || msg.payload.preset || '';
            
            let apiPath = '';
            
            // Debug-Ausgabe für Preset-Debugging
            if (action === 'preset') {
                node.log(`Preset-Aktion: value=${value}, msg.payload=${JSON.stringify(msg.payload)}`);
            }
            
            // API-Pfad basierend auf Aktion bestimmen
            switch(action) {
                case 'status':
                    apiPath = '/Status';
                    break;
                case 'play':
                    apiPath = '/Play';
                    break;
                case 'pause':
                    apiPath = '/Pause';
                    break;
                case 'stop':
                    apiPath = '/Stop';
                    break;
                case 'next':
                    apiPath = '/Skip';
                    break;
                case 'previous':
                    apiPath = '/Back';
                    break;
                case 'volume':
                    if (value !== '') {
                        apiPath = `/Volume?level=${encodeURIComponent(value)}`;
                    } else {
                        apiPath = '/Volume';
                    }
                    break;
                case 'mute':
                    apiPath = value ? '/Volume?mute=1' : '/Volume?mute=0';
                    break;
                case 'playurl':
                    if (value) {
                        apiPath = `/Play?url=${encodeURIComponent(value)}`;
                    } else {
                        node.error("URL für playurl Aktion erforderlich");
                        return;
                    }
                    break;
                case 'syncstatus':
                    apiPath = '/SyncStatus';
                    break;
                case 'services':
                    apiPath = '/Services';
                    break;
                case 'presets':
                    apiPath = '/Presets';
                    break;
                case 'preset':
                    if (value !== undefined && value !== '') {
                        // Preset ID als String behandeln, auch wenn es eine Zahl ist
                        const presetId = String(value);
                        apiPath = `/Preset?id=${presetId}`;
                        node.status({fill: "blue", shape: "dot", text: `Preset ${presetId} wird geladen...`});
                    } else {
                        node.error("Preset ID erforderlich (msg.payload.value oder msg.payload.preset)");
                        return;
                    }
                    break;
                case 'shuffle':
                    apiPath = value ? '/Shuffle?state=1' : '/Shuffle?state=0';
                    break;
                case 'repeat':
                    // 0=off, 1=all, 2=one
                    apiPath = `/Repeat?state=${encodeURIComponent(value || 0)}`;
                    break;
                default:
                    node.error(`Unbekannte Aktion: ${action}`);
                    return;
            }
            
            // Status-Update
            node.status({fill: "blue", shape: "dot", text: `Ausführung: ${action}`});
            
            // API-Request ausführen
            makeBluesoundRequest(apiPath, (err, result) => {
                if (err) {
                    node.error(`Bluesound API Fehler: ${err.message}`);
                    node.status({fill: "red", shape: "ring", text: "Fehler"});
                    msg.error = err.message;
                    node.send(msg);
                } else {
                    node.status({fill: "green", shape: "dot", text: "Erfolgreich"});
                    
                    // Ergebnis verarbeiten und weiterleiten
                    msg.payload = {
                        action: action,
                        result: result,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Spezielle Verarbeitung für verschiedene Aktionen
                    if (action === 'status' && result.status) {
                        msg.payload.parsed = {
                            state: result.status.state,
                            volume: result.status.volume,
                            mute: result.status.mute === '1',
                            song: result.status.song,
                            artist: result.status.artist,
                            album: result.status.album,
                            image: result.status.image,
                            shuffle: result.status.shuffle === '1',
                            repeat: result.status.repeat
                        };
                    } else if (action === 'preset' && result.preset) {
                        msg.payload.parsed = {
                            id: result.preset.id,
                            name: result.preset.name,
                            service: result.preset.service,
                            entries: result.preset.entries
                        };
                        node.log(`Preset geladen: ID=${result.preset.id}, Name=${result.preset.name}`);
                    } else if (action === 'presets' && result.presets && result.presets.preset) {
                        // Presets können als Array oder einzelnes Objekt kommen
                        const presets = Array.isArray(result.presets.preset) ? result.presets.preset : [result.presets.preset];
                        msg.payload.parsed = {
                            presets: presets.map(preset => ({
                                id: preset.id,
                                name: preset.name,
                                service: preset.service || 'unknown'
                            }))
                        };
                    }
                    
                    node.send(msg);
                }
            });
        });
        
        // Cleanup bei Node-Entfernung
        node.on('close', function() {
            node.status({});
        });
    }
    
    RED.nodes.registerType("bluesound", BluesoundNode);
};
