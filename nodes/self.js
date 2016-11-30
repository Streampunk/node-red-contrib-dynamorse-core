/* Copyright 2016 Streampunk Media Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

var ledger = require('nmos-ledger');
var dgram = require('dgram');
var hostname = require('os').hostname();
var shortHostname = hostname.match(/([^\.]*)\.?.*/)[1];
var pid = process.pid;

module.exports = function(RED) {
  function Self (config) {
    RED.nodes.createNode(this, config);

    var globalContext = RED.settings.functionGlobalContext;
    if (!globalContext.get("ledger")) {
      var node = new ledger.Node(null, null, `Dynamorse ${shortHostname} ${pid}`,
        `http://dynamorse-${shortHostname}-${pid}.local:${config.ledgerPort}`,
        `${hostname}`);
      var store = new ledger.NodeRAMStore(node);
      var nodeAPI = new ledger.NodeAPI(+config.ledgerPort, store);
      nodeAPI.init().start();

      globalContext.set("updated", false);
      globalContext.set("ledger", ledger);
      globalContext.set("node", node);
      globalContext.set("store", store);
      globalContext.set("nodeAPI", nodeAPI);

      // Externally advertised ... sources etc are registered with discovered registration
      // services
      var device = new ledger.Device(null, null, `device-${shortHostname}-${pid}`,
        ledger.deviceTypes.generic, node.id, null, null);
      globalContext.set("genericID", device.id);

      // Internal only ... sources etc are not pushed to external registration services
      var pipelines = new ledger.Device(null, null, `pipelines-${shortHostname}-${pid}`,
        ledger.deviceTypes.pipeline, node.id, null, null);
      globalContext.set("pipelinesID", pipelines.id);

      //globalContext.set("rtp_ext_id", config.rtp_ext_id);

      nodeAPI.putResource(device).catch(RED.log.error);
      nodeAPI.putResource(pipelines).catch(RED.log.error);

      RED.settings.logging.console.level = config.logging;

      // Send process memory statistics to influxDB every couple of seconds
      var soc = dgram.createSocket('udp4');
      setInterval(function () {
        var usage = process.memoryUsage();
        var message = new Buffer(`remember,host=${hostname},pid=${pid},type=rss value=${usage.rss}\n` +
          `remember,host=${hostname},pid=${pid},type=heapTotal value=${usage.heapTotal}\n` +
          `remember,host=${hostname},pid=${pid},type=heapUsed value=${usage.heapUsed}`);
        soc.send(message, 0, message.length, 8765, '192.168.99.100');
      }, 2000);
    }
  }
  RED.nodes.registerType("self", Self);
}
