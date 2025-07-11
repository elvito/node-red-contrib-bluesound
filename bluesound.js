const axios = require('axios');
const xml2js = require('xml2js');

module.exports = function(RED) {
  function BluesoundNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const host = config.host;

    node.on('input', async function(msg) {
      const command = msg.payload?.command || 'Status'; // Default
      const url = `http://${host}:11000/${command}`;
      try {
        const response = await axios.get(url);
        const result = await xml2js.parseStringPromise(response.data);
        msg.payload = result;
        node.send(msg);
      } catch (err) {
        node.error("Error communicating with Bluesound", err);
      }
    });
  }

  RED.nodes.registerType("bluesound", BluesoundNode);
};
