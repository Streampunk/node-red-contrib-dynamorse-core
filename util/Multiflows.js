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

const uuid = require('uuid');
const Queue = require('fastqueue');

function flowQueue(flowID, sourceID, tags) {
  this.flowID = flowID;
  this.sourceID = sourceID;
  this.tags = tags;
  this.queue = new Queue;
}
flowQueue.prototype.matchID = function(fid, sid) { return (fid === this.flowID) && (sid === this.sourceID); };
flowQueue.prototype.addGrain = function(grain, next) { this.queue.push({grain:grain, next:next}); };
flowQueue.prototype.grainAvailable = function() { return this.queue.length > 0; };
flowQueue.prototype.pop = function() { return this.queue.shift(); };
flowQueue.prototype.flowType = function() { return this.tags.format; };

function multiFlows(srcCable) {
  this.flowQueues = [];
  srcCable.forEach((c, i) => {
    this.flowQueues.push([]);
    const cableTypes = Object.keys(c);
    cableTypes.forEach(t => {
      if (c[t] && Array.isArray(c[t]))
        c[t].forEach(f =>
          this.flowQueues[i].push(new flowQueue(f.flowID, f.sourceID, f.tags)));
    });
  });
}

multiFlows.prototype.checkID = function(grain) {
  const flowID = uuid.unparse(grain.flow_id);
  const sourceID = uuid.unparse(grain.source_id);
  let queue = null;
  this.flowQueues.find(fqs => {
    queue = fqs.find(fq => fq.matchID(flowID, sourceID));
    return queue;
  });  
  return queue;
};

multiFlows.prototype.checkSet = function() {
  let setAvailable = true;
  this.flowQueues.forEach(fqs => 
    setAvailable = fqs.reduce((set, fq) => set && fq && fq.grainAvailable(), setAvailable)
  );

  let grainSet = {};
  if (setAvailable) {
    this.flowQueues.forEach(fqs => {
      fqs.forEach(fq => {
        const flowType = fq.flowType();
        if (!Array.isArray(grainSet[flowType]))
          grainSet[flowType] = [ fq.pop() ];
        else
          grainSet[flowType].push(fq.pop());
      });
    });
  }
  return grainSet;
};

multiFlows.prototype.getTags = function() {
  const tags = [];
  this.flowQueues.forEach(fqs =>
    fqs.forEach(fq => tags.push(fq.tags)));
  return tags;
};

multiFlows.prototype.addGrain = function(grain, flowQueue, next) {
  // find the flowQueues for the wire associated with this grain
  const wqs = this.flowQueues.find(fqs => fqs.find(fq => fq === flowQueue));

  // find the number of grains that will be available in each flow queue after this add
  let numGrains = [];
  wqs.forEach(fq => {
    const len = fq.queue.length;
    numGrains.push((fq === flowQueue)? len + 1 : len);
  });

  // defer the next() call for this wire if this grain will mean the queues are balanced
  const deferNext = numGrains.every(g => numGrains[0] === g);

  if (deferNext) {
    flowQueue.addGrain(grain, next);
  }
  else {
    flowQueue.addGrain(grain, () => {});
    next();
  }
  return this.checkSet();
};

module.exports = multiFlows;
