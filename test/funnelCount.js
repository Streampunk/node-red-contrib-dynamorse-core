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

var util = require('util');
var redioactive = require('../util/Redioactive.js');
var H = require('highland');

function inlet(config) {
  this.count = +config.start;

  return H((push, next) => {
    if (this.count <= +config.end) {
      push(null, this.count++);
      setTimeout(next, +config.delay);
    } else {
      if (config.repeat) {
        this.count = config.start;
        push(null, this.count++);
        setTimeout(next, +config.delay);
      } else {
        push(null, redioactive.end);
      }
    }
  });
}

module.exports = function (RED) {
  function FunnelCount (config) {
    RED.nodes.createNode(this,config);
    redioactive.Funnel.call(this, config);

    this.highland(new inlet(config));
    this.on('close', this.close);
  }

  util.inherits(FunnelCount, redioactive.Funnel);
  RED.nodes.registerType('funnelCount', FunnelCount);
};
