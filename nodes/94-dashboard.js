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

const redioactive = require('../util/Redioactive.js');
const Grain = require('../model/Grain.js');
const util = require('util');
const uuid = require('uuid');

module.exports = function (RED) {
  function Dashboard (config) {
    RED.nodes.createNode(this, config);
    redioactive.Spout.call(this, config);

    let flowIDs = [];
    let count = {};
    let startTime = {};
    let loopMs = {};
    let cableChecked = false;

    this.each((x, next) => {
      if (!Grain.isGrain(x)) {
        this.log('Dashboard received non-Grain payload.');
        return next();
      }
      var nextJob = cableChecked ?
        Promise.resolve(x) :
        this.findCable(x)
          .then(cable => {
            cableChecked = true;
            cable.forEach(c => {
              const cableTypes = Object.keys(c);
              cableTypes.forEach(t => {
                if (c[t] && Array.isArray(c[t]))
                  c[t].forEach(f => flowIDs.push({ name: f.name, flowID: f.flowID, sourceID: f.sourceID }));
              });
            });
            return x;
          });

      nextJob.then(x => {
        const grainFlowID = uuid.unparse(x.flow_id);
        const grainSourceID = uuid.unparse(x.source_id);
        if (!count.hasOwnProperty(grainFlowID)) {
          count[grainFlowID] = 0;
          startTime[grainFlowID] = process.hrtime();
          loopMs[grainFlowID] = [];
        }
        const elapsed = process.hrtime(startTime[grainFlowID]);
        startTime[grainFlowID] = process.hrtime();
        loopMs[grainFlowID].push((elapsed[0] * 1000000000 + elapsed[1]) / 1000000);

        if (++count[grainFlowID] % config.showEvery === 0) {
          const avgMs = loopMs[grainFlowID].reduce((prev, curr) => prev + curr, 0) / config.showEvery;
          loopMs[grainFlowID] = [];

          let name = 'flow';
          flowIDs.find(id => {
            if ((grainFlowID === id.flowID) && (grainSourceID === id.sourceID)) {
              name = id.name;
              return true;
            } else 
              return false;
          });

          let flows = '';
          flowIDs.forEach(id => flows = flows.concat(`${id.name}: flowID ${id.flowID}, sourceID ${id.sourceID}\n`));
          
          this.send({
            topic: name,
            payload: 1000.0 / avgMs,
            flows: flows,
            error: null
          });
        }
        next();
      }).catch(err => {
        this.warn(err);
        next();
      });
    });

    this.done(() => {
      this.log('Dashboard Done!');
    });

    this.on('close', this.close);

    // this.consume((err, x, push, next) => {
    //   if (err) {
    //     push (err);
    //     next();
    //   } else if (redioactive.isEnd(x)) {
    //     push (null, x);
    //   } else if (Grain.isGrain(x)) {
    //     const nextJob = (cableChecked) ?
    //       Promise.resolve(x) :
    //       this.findCable(x)
    //         .then(c => {
    //           cableChecked = true;
    //           const cable = c[0];
    //           const cableTypes = Object.keys(cable);
    //           cableTypes.forEach(t => {
    //             if (cable[t] && Array.isArray(cable[t])) {
    //               cable[t].forEach(f => flowIDs.push({ name: f.name, flowID: f.flowID, sourceID: f.sourceID }));
    //             }
    //           });          
    //           this.makeCable(cable);
    //           return x;
    //         });

    //     nextJob.then(x => {
    //       const grainFlowID = uuid.unparse(x.flow_id);
    //       const grainSourceID = uuid.unparse(x.source_id);
    //       if (!count.hasOwnProperty(grainFlowID)) {
    //         count[grainFlowID] = 0;
    //         startTime[grainFlowID] = process.hrtime();
    //         loopMs[grainFlowID] = [];
    //       }
    //       const elapsed = process.hrtime(startTime[grainFlowID]);
    //       startTime[grainFlowID] = process.hrtime();
    //       loopMs[grainFlowID].push((elapsed[0] * 1000000000 + elapsed[1]) / 1000000);

    //       if (++count[grainFlowID] % config.showEvery === 0) {
    //         const avgMs = loopMs[grainFlowID].reduce((prev, curr) => prev + curr, 0) / config.showEvery;
    //         loopMs[grainFlowID] = [];

    //         let name = 'flow';
    //         flowIDs.find(id => {
    //           if ((grainFlowID === id.flowID) && (grainSourceID === id.sourceID)) {
    //             name = id.name;
    //             return true;
    //           } else 
    //             return false;
    //         });

    //         let flows = '';
    //         flowIDs.forEach(id => flows = flows.concat(`${id.name}: flowID ${id.flowID}, sourceID ${id.sourceID}\n`));
            
    //         this.send([null, {
    //           topic: name,
    //           payload: 1000.0 / avgMs,
    //           flows: flows,
    //           error: null
    //         }]);
    //       }
    //       push(null, x);
    //       next();
    //     }).catch(err => {
    //       push(err);
    //       next();
    //     });
    //   } else {
    //     push(null, x);
    //     next();
    //   }
    // });
  }
  util.inherits(Dashboard, redioactive.Spout);
  RED.nodes.registerType('dashboard', Dashboard);
};
