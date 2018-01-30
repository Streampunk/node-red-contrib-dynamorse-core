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

var util = require('util');
var redioactive = require('../util/Redioactive.js');
const Grain = require('../model/Grain.js');

module.exports = function (RED) {
  function TestSpout (config) {
    RED.nodes.createNode(this, config);
    redioactive.Spout.call(this, config);
    var cableChecked = false;
    // let count = 0;
    this.each((x, next) => {
      this.log(`Received ${util.inspect(x)}.`);
      if (!Grain.isGrain(x)) {
        this.log('TestSpout received non-Grain payload.');
        if (config.timeout === 0) setImmediate(next);
        else setTimeout(next, config.timeout);
        return;
      }

      var nextJob = cableChecked ?
        Promise.resolve(x) :
        this.findCable(x)
          .then(c => {
            this.log(`Details of input cable(s) is/are:\n${JSON.stringify(c, null, 2)}`);
          }, e => { this.warn(e); });
      cableChecked = true;

      nextJob.then(() => {
        // console.log('>>> Look what spout HTTP GOT', count++,
        //   Grain.prototype.formatTimestamp(x.ptpOrigin));
        if (config.timeout === 0) setImmediate(next);
        else setTimeout(next, config.timeout);
      });
    });
    this.errors((e, next) => {
      this.warn(`Received unhandled error: ${e.message}.`);
      if (config.timeout === 0) setImmediate(next);
      else setTimeout(next, config.timeout);
    });
    this.done(() => {
      this.log('Thank goodness that is over!');
    });

    this.on('close', this.close);
  }
  util.inherits(TestSpout, redioactive.Spout);
  RED.nodes.registerType('spoutTest', TestSpout);
};
