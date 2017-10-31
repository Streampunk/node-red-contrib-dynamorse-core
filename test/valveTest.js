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

module.exports = function (RED) {
  function ValveTest (config) {
    RED.nodes.createNode(this, config);
    redioactive.Valve.call(this, config);

    let cableChecked = false;
    
    this.consume((err, x, push, next) => {
      if (err) {
        push(err);
        next();
      } else if (x === redioactive.end) {
        push(null, redioactive.end);
        next();
      } else {
        const nextJob = (cableChecked) ?
          Promise.resolve(x) :
          this.findCable(x)
            .then(cable => {
              cableChecked = true;
              let outCableSpec = {};
              const cableTypes = Object.keys(cable[0]);
              cableTypes.forEach(t => {
                if (cable[0][t] && Array.isArray(cable[0][t]))
                  outCableSpec[t] = cable[0][t];
              });

              outCableSpec.backPressure = cable[0].backPressure;
              this.makeCable(outCableSpec);
              return x;
            });

        nextJob.then(x => {
          push(null, x);

          if (config.timeout === 0) setImmediate(next);
          else setTimeout(next, config.timeout);
        }).catch(err => {
          push(err);
          next();
        });
      }
    });
  
    this.on('close', this.close);
  }

  util.inherits(ValveTest, redioactive.Valve);
  RED.nodes.registerType('valveTest', ValveTest);
};
