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

const TestUtil = require('dynamorse-test').TestUtil;

const funnel1NodeId = '24fde3d7.b7544c';
const spoutNodeId = 'f2186999.7e5f78';

TestUtil.nodeRedTest('Cables: a video funnel->spout flow is posted to Node-RED', {
  numPushes: 1,
  funnelMaxBuffer: 4,
  spoutTimeout: 0,
  sourceID: null,
  flowID: null
}, params => {
  const testFlow = JSON.parse(TestUtil.testNodes.baseTestFlow);
  testFlow.nodes[0] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[0].id = `${funnel1NodeId}`;
  testFlow.nodes[0].numPushes = params.numPushes;
  testFlow.nodes[0].format = 'video';
  testFlow.nodes[0].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[0].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[1] = JSON.parse(TestUtil.testNodes.spoutTestNode);
  testFlow.nodes[1].id = `${spoutNodeId}`;
  testFlow.nodes[1].timeout = params.spoutTimeout;
  return testFlow;
}, (t, params, msgObj, onEnd) => {
  // t.comment(`Message: ${JSON.stringify(msgObj)}`);
  if (msgObj.hasOwnProperty('made')) {
    const flow = msgObj.made;
    t.ok(flow.hasOwnProperty('video'), 'cable contains the expected flow type');
    t.equal(flow.video.length, 1, 'cable contains the expected quantity of flow type');
    t.equal(flow.video[0].name, 'video[0]', 'flow has the expected name');
    t.ok(typeof flow.video[0].tags === 'object', 'flow has a valid tags object');
    t.ok(typeof flow.video[0].sourceID === 'string', 'flow has a valid sourceID');
    t.ok(typeof flow.video[0].flowID === 'string', 'flow has a valid flowID');
    t.equal(flow.backPressure, 'video[0]', 'cable has the expected back pressure flow');
    params.sourceID = flow.video[0].sourceID;
    params.flowID = flow.video[0].flowID;
  }
  else if (msgObj.hasOwnProperty('receive')) {
    params.count++;
    t.equal(msgObj.receive.source_id, params.sourceID, 'received grain has the expected sourceID');
    t.equal(msgObj.receive.flow_id, params.flowID, 'received grain has the expected flowID');
  }
  else if (msgObj.hasOwnProperty('found')) {
    const flows = msgObj.found;
    t.equal(flows.length, 1, 'found cable has the expected number of input wires');
    t.equal(flows[0].video.length, 1, 'found cable has the expected flow type');
  }
  else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout')) {
    t.equal(params.count, params.numPushes, 'received end after expected number of pushes');
    onEnd();
  }
});
