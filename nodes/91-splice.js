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

const util = require('util');
const redioactive = require('../util/Redioactive.js');
const Grain = require('../model/Grain.js');
const multiFlows = require('../util/Multiflows.js');

module.exports = function (RED) {
  function Splice (config) {
    RED.nodes.createNode(this, config);
    redioactive.Valve.call(this, config);

    let cableChecked = false;
    let setupError = null;
    let srcFlows = null;

    this.consume((err, x, push, next) => {
      if (err) {
        push(err);
        next();
      } else if (redioactive.isEnd(x)) {
        push(null, x);
      } else if (Grain.isGrain(x)) {
        const nextJob = (cableChecked) ?
          Promise.resolve(x) :
          this.findCable(x)
            .then(cable => {
              if (cableChecked)
                return x;

              cableChecked = true;
              let outCableSpec = {};
              cable.forEach(c => {
                const cableTypes = Object.keys(c);
                cableTypes.forEach(t => {
                  if (c[t] && Array.isArray(c[t])) {
                    c[t].forEach(f => {
                      if (outCableSpec[t])
                        outCableSpec[t].push(f);
                      else
                        outCableSpec[t] = [ f ];
                    });
                  }
                });
              });

              // naive for now - use the backpressure from the first cable
              outCableSpec.backPressure = cable[0].backPressure;
              
              const outCable = this.makeCable(outCableSpec);
              const formattedCable = JSON.stringify(outCable, null, 2);
              RED.comms.publish('debug', {
                format: `${config.type} output cable:`,
                msg: formattedCable
              }, true);

              srcFlows = new multiFlows(cable);
              return x;
            });

        nextJob.then(x => {
          if (setupError) {
            push(setupError);
            return next(redioactive.noTiming);
          }
          else {
            const queue = srcFlows.checkID(x);
            if (queue) {
              const grainSet = srcFlows.addGrain(x, queue, next);
              if (grainSet) {
                const grainTypes = Object.keys(grainSet);
                grainTypes.forEach(t => {
                  grainSet[t].forEach(g => {
                    push(null, g.grain);
                    g.next();
                  });
                });
              }
            } else {
              this.log(`${config.type} dropping grain with flowID ${x.flow_id}`);
              return next(redioactive.noTiming);
            }
          }
        }).catch(err => {
          if (!setupError) {
            setupError = err;
            console.log(setupError);
          }
          push(setupError);
          return next(redioactive.noTiming);
        });
      } else {
        push(null, x);
        next(redioactive.noTiming);
      }
    });
    this.on('close', this.close);
  }
  util.inherits(Splice, redioactive.Valve);
  RED.nodes.registerType('splice', Splice);
};
