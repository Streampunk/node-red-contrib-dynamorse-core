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

var properties = {
  redPort : 1880,
};

var dynamorseTabID = '4a9a086a.b565f8';
var dynamorseCommentID = '595004fa.a6affc';
var selfNodeID = 'd8044477.27fbb8';

function setupDynamorseTab() {
  var dynamorseTab = `[
    {
      "id": "${dynamorseTabID}",
      "type": "tab",
      "label": "Dynamorse"
    },
    {
      "id": "${dynamorseCommentID}",
      "type": "comment",
      "name": "Streampunk Media",
      "info": "Design and deploy professional media workflows with [_Dynamorse_](https://github.com/Streampunk/dynamorse/blob/master/README.md).\\n\\nFor support, development or further information, please e-mail [Streampunk Media Ltd](http://www.streampunk.media) on [furnace@streampunk.media](mailto: furnace@streampunk.media).\\n\\nDynamorse depends on [codecadon](https://github.com/Streampunk/codecadon) that incorprates binaries compiled from unmodified [LGPL v3 licensed code](https://github.com/Streampunk/codecadon/tree/master/licenses) from the FFMPEG project.",
      "x": 122,
      "y": 45,
      "z": "${dynamorseTabID}",
      "wires": []
    },
    {
      "id": "${selfNodeID}",
      "type": "self"
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
  }, res => {
    res.setEncoding('utf8');
    res.on('data', (/*chunk*/) => {
    });
    res.on('end', () => {
      console.log(' - restart Node-RED to complete dynamorse configuration');
    });
  }).on('error', e => {
    console.log(` - problem with dynamorse tab request: ${e.message}`);
    console.log('   - run dynamorse-setup.exe once Node-RED is started to configure dynamorse');
  });

  dynamorseTabReq.write(dynamorseTab);
  dynamorseTabReq.end();
}

console.log('Setting up Dynamorse Tab');
setupDynamorseTab();
