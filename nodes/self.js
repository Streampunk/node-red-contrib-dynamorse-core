/* Copyright 2018 Streampunk Media Ltd.

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

var http = require('http');
var ledger = require('nmos-ledger');
var hostname = require('os').hostname();
var shortHostname = hostname.match(/([^.]*)\.?.*/)[1];
var pid = process.pid;

var properties = {};
var defaultProps = {
  redPort : 1880,
  ledgerPort : 3101,
  logHostname : '127.0.0.1',
  logPort : 0
};

// Fixed identifiers for global config nodes
var selfNodeID = 'd8044477.27fbb8';
var deviceNodeID = 'f089bf72.0f764';
var pipelinesNodeID = 'da7405b8.258bf8';
var extDefNodeID = '30fb5980.cf04a6';

// Read nodes and find out whether any devices have been registered
function checkConfigNodes(cb) {
  http.get({host: 'localhost', port: properties.redPort, path: '/flow/global'}, res => {
    var statusCode = res.statusCode;
    var contentType = res.headers['content-type'];

    var error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
                        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.log(error.message);
      // consume response data to free up memory
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    var rawData = '';
    res.on('data', chunk => {
      rawData += chunk;
    });
    res.on('end', () => {
      var configNodes = JSON.parse(rawData);
      if ((1 === configNodes.configs.length) && ('self' === configNodes.configs[0].type)) {
        // the self node is registered but the global flow needs to be created
        cb();
      }
    });
  }).on('error', e => {
    console.log(`get global flow error: ${e.message}`);
  });
}

function setupGlobalFlow() {
  console.log('Creating dynamorse global flow');
  http.get({host: 'localhost', port: properties.ledgerPort, path: '/x-nmos/node/v1.0/self'}, res => {
    res.setEncoding('utf8');
    var selfData = '';
    res.on('data', chunk => {
      selfData += chunk;
    });
    res.on('end', () => {
      var self = JSON.parse(selfData);
      http.get({host: 'localhost', port: properties.ledgerPort, path: '/x-nmos/node/v1.0/devices'}, res => {
        res.setEncoding('utf8');
        var devicesData = '';
        res.on('data', chunk => {
          devicesData += chunk;
        });
        res.on('end', () => {
          var devices = JSON.parse(devicesData);
          var globalFlow = `{
            "id": "global",
            "configs": [
            {
              "id": "${selfNodeID}",
              "type": "self",
              "nmos_id": "${self.id}",
              "version": "${self.version}",
              "nmos_label": "${self.label}",
              "href": "${self.href}",
              "hostname": "${self.hostname}",
              "logHostname": "${properties.logHostname}",
              "logPort": ${properties.logPort},
              "ledgerPort": "${properties.ledgerPort}"
            },
            {
              "id": "${deviceNodeID}",
              "type": "device",
              "nmos_id": "${devices[0].id}",
              "version": "${devices[0].version}",
              "nmos_type": "${devices[0].type}",
              "nmos_label": "${devices[0].label}",
              "node_id": "${devices[0].node_id}",
              "node_ref": "${selfNodeID}",
              "senders": [],
              "receivers": []
            },
            {
              "id": "${pipelinesNodeID}",
              "type": "device",
              "nmos_id": "${devices[1].id}",
              "version": "${devices[1].version}",
              "nmos_type": "${devices[1].type}",
              "nmos_label": "${devices[1].label}",
              "node_id": "${devices[1].node_id}",
              "node_ref": "${selfNodeID}",
              "senders": [],
              "receivers": []
            },
            {
              "id": "${extDefNodeID}",
              "type": "rtp-ext",
              "name": "rtp-extensions-default",
              "origin_timestamp_id": 1,
              "smpte_tc_id": 2,
              "smpte_tc_param": "3600@90000/25",
              "flow_id_id": 3,
              "source_id_id": 4,
              "grain_flags_id": 5,
              "sync_timestamp_id": 7,
              "grain_duration_id": 9,
              "ts_refclk": "ptp=IEEE1588-2008:dd-a9-3e-5d-c7-28-28-dc"
            }],
            "subflows": [ ]
          }`;

          var globalFlowReq = http.request({
            host: 'localhost',
            port : properties.redPort,
            path : '/flow/global',
            method : 'PUT',
            headers : {
              'Content-Type' : 'application/json',
              'Content-Length' : globalFlow.length
            }
          }, res => {
            res.setEncoding('utf8');
            res.on('data', (/*chunk*/) => {
              //console.log(`Response: ${chunk}`);
            });
            res.on('end', () => {
              //console.log(`Response complete`);
            });
            res.on('error', e => {
              console.log(`problem with global flow request: ${e.message}`);
            });
          });
          try {
            globalFlowReq.write(globalFlow);
            globalFlowReq.end();
          }
          catch(e) {
            console.log('global flow request error: ' + e);
          }
        });
      }).on('error', e => {
        console.log(`ledger get devices error: ${e.message}`);
      });
    });
  }).on('error', e => {
    console.log(`ledger get self error: ${e.message}`);
  });
}

function httpReq(method, host, port, path, payload) {
  return new Promise((resolve, reject) => {
    var req = http.request({
      host: host,
      port : port,
      path : path,
      method : method,
      headers : {
        'Content-Type' : 'application/json',
        'Content-Length' : payload.length
      }
    }, (res) => {
      var statusCode = res.statusCode;
      // var contentType = res.headers['content-type'];

      if (!((200 === statusCode) || (204 == statusCode)))
        reject(`http '${method}' request to path '${host}${path}' failed with status ${statusCode}`);

      res.setEncoding('utf8');
      var rawData = '';
      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => {
        resolve(rawData);
      });
    }).on('error', (e) => {
      reject(`problem with '${method}' request to path '${host}${path}': ${e.message}`);
    });

    req.write(payload);
    req.end();
  });
}

function Logger(hostname, port) {
  this.hostname = hostname;
  this.port = port;
  this.active = true;
  console.log(`Created logger: hostname '${this.hostname}', port ${this.port}`);

  this.close = function() { 
    this.active = false; 
  };
  
  this.send = function(msgObj) {
    if (this.active && this.port) {
      httpReq('PUT', this.hostname, this.port, '/redioactive', JSON.stringify(msgObj))
        .catch(err => {
          console.error(err);
        });
    }
  };
}

module.exports = function(RED) {
  var logger = null;
  var logTimer = null;
  function Self (config) {
    RED.nodes.createNode(this, config);

    properties.redPort = process.env.RED_PORT || defaultProps.redPort;
    properties.ledgerPort = process.env.LEDGER_PORT || defaultProps.ledgerPort;
    properties.logHostname = process.env.LOG_HOSTNAME || defaultProps.logHostname;
    properties.logPort = process.env.LOG_PORT || defaultProps.logPort;

    var globalContext = RED.settings.functionGlobalContext;
    var startLedger = !globalContext.get('ledger');
    if (startLedger) {
      var label = config.label || `Dynamorse ${shortHostname} ${pid}`;
      var href = config.href || `http://dynamorse-${shortHostname}-${pid}.local:${properties.ledgerPort}`;
      var host = config.hostname || `${hostname}`;

      var node = new ledger.Node(null, null, label, href, host);
      var store = new ledger.NodeRAMStore(node);
      var nodeAPI = new ledger.NodeAPI(+properties.ledgerPort, store);
      nodeAPI.init().start();

      globalContext.set('updated', false);
      globalContext.set('ledger', ledger);
      globalContext.set('node', node);
      globalContext.set('store', store);
      globalContext.set('nodeAPI', nodeAPI);

      // Externally advertised ... sources etc are registered with discovered registration
      // services
      var device = new ledger.Device(null, null, `device-${shortHostname}-${pid}`,
        ledger.deviceTypes.generic, node.id, null, null);
      globalContext.set('genericID', device.id);

      // Internal only ... sources etc are not pushed to external registration services
      var pipelines = new ledger.Device(null, null, `pipelines-${shortHostname}-${pid}`,
        ledger.deviceTypes.pipeline, node.id, null, null);
      globalContext.set('pipelinesID', pipelines.id);

      nodeAPI.putResource(device).catch(RED.log.error);
      nodeAPI.putResource(pipelines).catch(RED.log.error);
    }

    var isInit = !config.nmos_id;
    if (startLedger || isInit) {
      var ws = null;
      globalContext.set('ws', ws);

      properties.redPort = RED.settings.uiPort; // !!! TODO: Need to update settings.js to alter this !!!
      checkConfigNodes(setupGlobalFlow);
    
      clearInterval(logTimer);
      logTimer = setInterval(() => {
        var usage = process.memoryUsage();
        var msgObj = {
          nodeJS: {
            host: hostname,
            pid: pid,
            rss: usage.rss,
            heapTotal: usage.heapTotal,
            heapUsed: usage.heapUsed
          }
        };
        if (logger)
          logger.send(msgObj);
      }, 2000);
    }

    if (!logger) {
      logger = new Logger(properties.logHostname, +properties.logPort);
      globalContext.set('logger', logger);
    }
    this.on('close', () => {});
  }
  RED.nodes.registerType('self', Self);
};
