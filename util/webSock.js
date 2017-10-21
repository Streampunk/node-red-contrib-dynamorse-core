/* Copyright 2017 Streampunk Media Ltd.

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

var WebSocket = require('ws');

function webSock(node, port) {
  if (port > 0) {
    this.socket = new WebSocket(`ws://localhost:${port}`);
    this.socket.on('error', error => {
      node.warn(`WebSocket error: ${error}`);
    });
  }
}

webSock.prototype.open = function(cb) {
  if (this.socket && (this.socket.readyState !== WebSocket.OPEN)) {
    this.socket.on('open', cb);
  } else {
    cb();
  }
};

webSock.prototype.send = function(node, obj) {
  if (this.socket) {
    if (this.socket.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(obj, null, 2));
    else
      node.warn(`web socket not open when sending '${JSON.stringify(obj, null, 2)}'`);
  }
};

webSock.prototype.close = function() {
  if (this.socket && (this.socket.readyState === WebSocket.OPEN))
    this.socket.close();
};

module.exports = {
  webSock: webSock
};
