"use strict";

const http = require("http");
const xml2js = require("xml2js");

// ─────────────────────────────────────────────
//  Helper: send HTTP GET to a BluOS device
// ─────────────────────────────────────────────
function bluosGet(host, port, path, timeout, callback) {
    const options = {
        hostname: host,
        port: port,
        path: path,
        method: "GET",
        timeout: (timeout || 10) * 1000
    };

    const req = http.request(options, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
            xml2js.parseString(data, { explicitArray: false, mergeAttrs: true }, (err, result) => {
                if (err) {
                    callback(new Error("XML parse error: " + err.message), null, data);
                } else {
                    callback(null, result, data);
                }
            });
        });
    });

    req.on("timeout", () => {
        req.destroy();
        callback(new Error("Request timed out"), null, null);
    });

    req.on("error", (err) => {
        callback(err, null, null);
    });

    req.end();
}

// ─────────────────────────────────────────────
//  Build query string from an object
// ─────────────────────────────────────────────
function buildQuery(params) {
    if (!params || Object.keys(params).length === 0) return "";
    return "?" + Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
        .join("&");
}

// ─────────────────────────────────────────────
//  Flatten parsed XML to a simple object
// ─────────────────────────────────────────────
function flattenXml(parsed) {
    if (!parsed) return {};
    // The root element varies (status, volume, preset, etc.)
    const keys = Object.keys(parsed);
    if (keys.length === 0) return {};
    return parsed[keys[0]] || {};
}

module.exports = function (RED) {

    // ══════════════════════════════════════════
    //  CONFIG NODE – bluesound-device
    // ══════════════════════════════════════════
    function BluesoundDeviceNode(config) {
        RED.nodes.createNode(this, config);
        this.host = config.host || "192.168.1.100";
        this.port = parseInt(config.port, 10) || 11000;
        this.name = config.name || this.host;
    }
    RED.nodes.registerType("bluesound-device", BluesoundDeviceNode);

    // ══════════════════════════════════════════
    //  COMMAND NODE – bluesound-command
    //
    //  Sends a command to a BluOS device.
    //  Reads command from node config OR from
    //  msg.command / msg.payload.command
    // ══════════════════════════════════════════
    function BluesoundCommandNode(config) {
        RED.nodes.createNode(this, config);

        this.device = RED.nodes.getNode(config.device);
        this.command = config.command || "status";
        this.params = config.params || {};

        const node = this;

        if (!node.device) {
            node.error("No Bluesound device configured");
            node.status({ fill: "red", shape: "ring", text: "no device" });
            return;
        }

        node.status({ fill: "grey", shape: "ring", text: "idle" });

        node.on("input", function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };
            done = done || function (e) { if (e) node.error(e, msg); };

            // Determine command: msg > payload > node config
            let command = msg.command
                || (msg.payload && typeof msg.payload === "object" && msg.payload.command)
                || node.command;
            command = (command || "status").toLowerCase().trim();

            // Merge params: node config ← msg.params ← msg.payload (if object)
            let extra = Object.assign({}, node.params);
            if (msg.params && typeof msg.params === "object") {
                Object.assign(extra, msg.params);
            }
            if (msg.payload && typeof msg.payload === "object") {
                const pl = Object.assign({}, msg.payload);
                delete pl.command;
                Object.assign(extra, pl);
            }
            // Allow simple scalar payload as "level" for volume command
            if (command === "volume" && typeof msg.payload === "number") {
                extra.level = msg.payload;
            }

            const host = msg.host || node.device.host;
            const port = msg.port || node.device.port;

            // Map command names to BluOS API endpoints + default params
            let endpoint = "/" + command;
            switch (command) {
                case "play":       endpoint = "/Play";    break;
                case "pause":      endpoint = "/Pause";   break;
                case "stop":       endpoint = "/Stop";    break;
                case "skip":
                case "next":       endpoint = "/Skip";    break;
                case "back":
                case "previous":
                case "prev":       endpoint = "/Back";    break;
                case "volume":     endpoint = "/Volume";  break;
                case "shuffle":    endpoint = "/Shuffle"; break;
                case "repeat":     endpoint = "/Repeat";  break;
                case "status":     endpoint = "/Status";  break;
                case "syncstatus": endpoint = "/SyncStatus"; break;
                case "presets":    endpoint = "/Presets"; break;
                case "preset":     endpoint = "/Preset";  break;
                case "playlist":   endpoint = "/Playlist"; break;
                case "clear":      endpoint = "/Clear";   break;
                case "mute":
                    endpoint = "/Volume";
                    extra.mute = extra.mute !== undefined ? extra.mute : 1;
                    break;
                case "unmute":
                    endpoint = "/Volume";
                    extra.mute = 0;
                    break;
                case "togglepause":
                    endpoint = "/Pause";
                    extra.toggle = 1;
                    break;
                default:
                    // Pass through unknown commands as-is (capitalise first letter)
                    endpoint = "/" + command.charAt(0).toUpperCase() + command.slice(1);
            }

            const path = endpoint + buildQuery(extra);

            node.status({ fill: "blue", shape: "dot", text: command });

            bluosGet(host, port, path, 10, (err, parsed, raw) => {
                if (err) {
                    node.status({ fill: "red", shape: "ring", text: "error" });
                    node.error(err.message, msg);
                    done(err);
                    return;
                }

                msg.payload = flattenXml(parsed);
                msg.bluosRaw = raw;
                msg.bluosCommand = command;
                msg.bluosEndpoint = endpoint;
                msg.bluosDevice = { host, port };

                node.status({ fill: "green", shape: "dot", text: "ok" });
                setTimeout(() => node.status({ fill: "grey", shape: "ring", text: "idle" }), 2000);

                send(msg);
                done();
            });
        });
    }
    RED.nodes.registerType("bluesound-command", BluesoundCommandNode);

    // ══════════════════════════════════════════
    //  STATUS NODE – bluesound-status
    //
    //  Polls /Status at a configurable interval
    //  and emits changes.
    // ══════════════════════════════════════════
    function BluesoundStatusNode(config) {
        RED.nodes.createNode(this, config);

        this.device = RED.nodes.getNode(config.device);
        this.interval = Math.max(1, parseInt(config.interval, 10) || 5);
        this.onlyOnChange = config.onlyOnChange !== false;

        const node = this;
        let timer = null;
        let lastEtag = null;
        let isPolling = false;

        if (!node.device) {
            node.error("No Bluesound device configured");
            node.status({ fill: "red", shape: "ring", text: "no device" });
            return;
        }

        node.status({ fill: "yellow", shape: "ring", text: "connecting…" });

        function poll() {
            if (isPolling) return;
            isPolling = true;

            const host = node.device.host;
            const port = node.device.port;

            // Use long-poll: timeout=node.interval, etag=lastEtag
            let qs = "?timeout=" + node.interval;
            if (lastEtag) qs += "&etag=" + lastEtag;

            bluosGet(host, port, "/Status" + qs, node.interval + 5, (err, parsed, raw) => {
                isPolling = false;

                if (err) {
                    node.status({ fill: "red", shape: "ring", text: err.message });
                    // Retry after interval
                    timer = setTimeout(poll, node.interval * 1000);
                    return;
                }

                const status = flattenXml(parsed);
                const newEtag = status.etag;

                const changed = newEtag !== lastEtag;
                lastEtag = newEtag || lastEtag;

                const state = status.state || "unknown";
                const artist = status.artist || "";
                const title = status.title || "";
                const label = state + (title ? ": " + (artist ? artist + " – " : "") + title : "");
                node.status({ fill: "green", shape: "dot", text: label.substring(0, 50) });

                if (!node.onlyOnChange || changed) {
                    node.send({
                        payload: status,
                        bluosRaw: raw,
                        bluosDevice: { host, port },
                        changed: changed
                    });
                }

                // Poll again immediately (BluOS long-poll will block until change or timeout)
                timer = setTimeout(poll, 100);
            });
        }

        poll();

        node.on("close", function (done) {
            if (timer) clearTimeout(timer);
            done();
        });
    }
    RED.nodes.registerType("bluesound-status", BluesoundStatusNode);
};
