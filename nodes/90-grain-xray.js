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

var redioactive = require('../util/Redioactive.js');
var util = require('util');

module.exports = function (RED) {
  function GrainDebug (config) {
    RED.nodes.createNode(this, config);
    redioactive.Valve.call(this, config);
    this.count = 0;
    var node = this;
    this.findCable().then(c => {
      console.log('Found a cable', c);
      this.makeCable(c[0]); // Assume one-to-one, not splicing
      if (config.showCable === true) {
        var formattedCable = JSON.stringify(c, null, 2);
        RED.comms.publish('debug', {
          format: 'Cable',
          msg: formattedCable
        }, true);
        if (config.toConsole === true)
          node.log(formattedCable);
      };
    });
    this.consume((err, x, push, next) => {
      if (err) {
        push (err);
        next();
      } else if (redioactive.isEnd(x)) {
        push (null, x);
      } else {
        if (this.count % config.showEvery === 0) {
          var formattedGrain = JSON.stringify(x, null, 2);
          RED.comms.publish('debug', {
            format : `Grain ${this.count}`,
            msg: formattedGrain
          }, true);
          if (config.toConsole) {
            this.log(formattedGrain);
          }
        }
        push(null, x);
        next();
        this.count++;
      }
    });
  }
  util.inherits(GrainDebug, redioactive.Valve);
  RED.nodes.registerType("grain-xray", GrainDebug);
}
