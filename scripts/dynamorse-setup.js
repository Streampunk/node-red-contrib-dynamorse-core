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

var http = require('http');

var properties = {
  redPort : 1880,
  ledgerPort : 3101,
  logging : 'trace'
};

// Fixed identifiers for global config nodes
var selfNodeID = 'd8044477.27fbb8';
var deviceNodeID = 'f089bf72.0f764';
var pipelinesNodeID = 'da7405b8.258bf8';
var extDefNodeID = '30fb5980.cf04a6';

function setupDynamorseTab() {
  var dynamorseTab = `[
    {
      "id": "4a9a086a.b565f8",
      "type": "tab",
      "label": "Dynamorse"
    },
    {
      "id": "595004fa.a6affc",
      "type": "comment",
      "name": "Streampunk Media",
      "info": "Design and deploy professional media workflows with [_Dynamorse_](https://github.com/Streampunk/dynamorse/blob/master/README.md).\\n\\nFor support, development or further information, please e-mail [Streampunk Media Ltd](http://www.streampunk.media) on [furnace@streampunk.media](mailto: furnace@streampunk.media).\\n\\nDynamorse depends on [codecadon](https://github.com/Streampunk/codecadon) that incorprates binaries compiled from unmodified [LGPL v3 licensed code](https://github.com/Streampunk/codecadon/tree/master/licenses) from the FFMPEG project.",
      "x": 122,
      "y": 45,
      "z": "4a9a086a.b565f8",
      "wires": []
    },
    {
      "id": "${selfNodeID}",
      "type": "self",
      "ledgerPort": "${properties.ledgerPort}",
      "logging": "${properties.logging}"
    }
  ]`;

  var dynamorseTabReq = http.request({
    host: 'localhost',
    port : properties.redPort,
    path : '/flows',
    method : 'POST',
    headers : {
      'Content-Type' : 'application/json',
      'Content-Length' : dynamorseTab.length
    }
  }, function (res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      //console.log(`Response: ${chunk}`);
    });
    res.on('end', function () {
      //console.log(`Response complete`);
    });
    res.on('error', function (e) {
      console.log(`problem with dynamorse tab request: ${e.message}`);
    });
  });

  try {
    dynamorseTabReq.write(dynamorseTab);
    dynamorseTabReq.end();
  }
  catch(e) {
    console.log("dynamorse tab request error: " + e);
  }
}

function setupGlobalFlow() {
  var self;
  var devices;
  http.get({ port : properties.ledgerPort, path : '/x-nmos/node/v1.0/self'}, function (res) {
    res.on("data", function (chunk) {
      self = JSON.parse(chunk.toString());
      http.get({ port : properties.ledgerPort, path : '/x-nmos/node/v1.0/devices'}, function (res) {
        res.on("data", function (chunk) {
          devices = JSON.parse(chunk.toString());
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
              "ledgerPort": "${properties.ledgerPort}",
              "logging": "${properties.logging}"
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
          }, function (res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
              //console.log(`Response: ${chunk}`);
            });
            res.on('end', function () {
              //console.log(`Response complete`);
            });
            res.on('error', function (e) {
              console.log(`problem with global flow request: ${e.message}`);
            });
          });
          try {
            globalFlowReq.write(globalFlow);
            globalFlowReq.end();
          }
          catch(e) {
            console.log("global flow request error: " + e);
          }
        });
      });
    });
  });
}

console.log("Setting up Dynamorse Tab");
//setupDynamorseTab();

console.log("Setting up Global Flow");
//setupGlobalFlow();

console.log("Setup complete");
