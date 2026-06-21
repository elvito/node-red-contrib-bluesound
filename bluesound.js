module.exports = function(RED) {
    const axios = require('axios');
    const xml2js = require('xml2js');
    // Parser für xml2js@0.6.2 (kein parseStringPromise verfügbar)
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

    // Config Node für Bluesound-Geräte
    function BluesoundConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.host = config.host;
        this.port = config.port || 11000;
        this.timeout = config.timeout || 5000;
    }
    RED.nodes.registerType("bluesound-config", BluesoundConfigNode, {
        credentials: {
            host: { type: "text" },
            port: { type: "number" }
        }
    });

    // Hauptnode für Bluesound-Steuerung
    function BluesoundNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const configNode = RED.nodes.getNode(config.device);

        if (!configNode) {
            node.error("No Bluesound device configured");
            node.status({ fill: "red", shape: "ring", text: "Missing config" });
            return;
        }

        node.host = configNode.host;
        node.port = configNode.port;
        node.timeout = configNode.timeout;
        const baseUrl = `http://${node.host}:${node.port}`;

        // Helper: API-Anfrage an BluOS (angepasst für xml2js@0.6.2)
        async function makeBluesoundRequest(path) {
            try {
                const url = `${baseUrl}${path}`;
                const response = await axios.get(url, { timeout: node.timeout });
                if (response.status === 200) {
                    // Manuell als Promise umsetzen, da xml2js@0.6.2 kein parseStringPromise hat
                    return await new Promise((resolve, reject) => {
                        parser.parseString(response.data, (err, result) => {
                            if (err) {
                                reject(new Error(`XML parsing failed: ${err.message}`));
                            } else {
                                resolve(result);
                            }
                        });
                    });
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (err) {
                node.error(`Bluesound API error: ${err.message}`);
                throw err;
            }
        }

        // Eingabe verarbeiten
        node.on('input', async function(msg) {
            const action = msg.payload?.action || config.action || 'status';
            const value = msg.payload?.value || msg.payload?.volume || msg.payload?.url || msg.payload?.preset || '';

            let apiPath = '';
            node.status({ fill: "blue", shape: "dot", text: `Executing: ${action}` });

            // Debug-Log für Presets
            if (action === 'preset') {
                node.log(`Preset action: value=${value}, payload=${JSON.stringify(msg.payload)}`);
            }

            // API-Pfad bestimmen
            switch(action) {
                case 'status': apiPath = '/Status'; break;
                case 'play': apiPath = '/Play'; break;
                case 'pause': apiPath = '/Pause'; break;
                case 'stop': apiPath = '/Stop'; break;
                case 'next': apiPath = '/Skip'; break;
                case 'previous': apiPath = '/Back'; break;
                case 'volume':
                    apiPath = value !== '' ? `/Volume?level=${encodeURIComponent(value)}` : '/Volume';
                    break;
                case 'mute':
                    apiPath = value ? '/Volume?mute=1' : '/Volume?mute=0';
                    break;
                case 'playurl':
                    if (!value) {
                        node.error("URL required for playurl action");
                        node.status({ fill: "red", shape: "ring", text: "Error: URL missing" });
                        return;
                    }
                    apiPath = `/Play?url=${encodeURIComponent(value)}`;
                    break;
                case 'syncstatus': apiPath = '/SyncStatus'; break;
                case 'services': apiPath = '/Services'; break;
                case 'presets': apiPath = '/Presets'; break;
                case 'preset':
                    if (value === undefined || value === '') {
                        node.error("Preset ID required (msg.payload.value or msg.payload.preset)");
                        node.status({ fill: "red", shape: "ring", text: "Error: Preset ID missing" });
                        return;
                    }
                    apiPath = `/Preset?id=${String(value)}`;
                    node.status({ fill: "blue", shape: "dot", text: `Loading preset ${value}...` });
                    break;
                case 'shuffle':
                    apiPath = value ? '/Shuffle?state=1' : '/Shuffle?state=0';
                    break;
                case 'repeat':
                    apiPath = `/Repeat?state=${encodeURIComponent(value || 0)}`;
                    break;
                default:
                    node.error(`Unknown action: ${action}`);
                    node.status({ fill: "red", shape: "ring", text: "Error: Unknown action" });
                    return;
            }

            // API-Anfrage ausführen
            try {
                const result = await makeBluesoundRequest(apiPath);
                node.status({ fill: "green", shape: "dot", text: "Success" });

                msg.payload = {
                    action: action,
                    result: result,
                    timestamp: new Date().toISOString()
                };

                // Spezifische Antworten parsen
                if (action === 'status' && result.status) {
                    msg.payload.parsed = {
                        state: result.status.state,
                        volume: parseInt(result.status.volume, 10) || 0,
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
                    node.log(`Preset loaded: ID=${result.preset.id}, Name=${result.preset.name}`);
                } else if (action === 'presets' && result.presets?.preset) {
                    const presets = Array.isArray(result.presets.preset)
                        ? result.presets.preset
                        : [result.presets.preset];
                    msg.payload.parsed = {
                        presets: presets.map(p => ({
                            id: p.id,
                            name: p.name,
                            service: p.service || 'unknown'
                        }))
                    };
                }

                node.send(msg);
            } catch (err) {
                node.error(`Request failed: ${err.message}`);
                node.status({ fill: "red", shape: "ring", text: "Request failed" });
                msg.error = err.message;
                node.send(msg);
            }
        });

        // Cleanup
        node.on('close', function() {
            node.status({});
        });
    }
    RED.nodes.registerType("bluesound", BluesoundNode);
};
