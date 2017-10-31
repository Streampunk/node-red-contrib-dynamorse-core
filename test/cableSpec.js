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
var funnel2NodeId = 'ba156ff1.45ea9';
var funnel3NodeId = '6e6a8581.91957c';
var valve1NodeId = '634c3672.78be18';
var valve2NodeId = '7c968c40.836974';
var spliceNodeId = '107c721c.8c951e';
const spoutNodeId = 'f2186999.7e5f78';

var spliceTestNode = JSON.stringify({
  'type': 'splice',
  'z': TestUtil.testFlowId,
  'name': 'splice-test',
  'x': 500.0,
  'y': 200.0,
  'wires': [[]]
});

TestUtil.nodeRedTest('Cables: a video funnel->spout flow is posted to Node-RED', {
  numPushes: 2,
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
    if (params.flowID) {
      t.equal(msgObj.receive.source_id, params.sourceID, 'received grain has the expected sourceID');
      t.equal(msgObj.receive.flow_id, params.flowID, 'received grain has the expected flowID');
    }
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

TestUtil.nodeRedTest('A video funnelx3->valve->splice->spout flow is posted to Node-RED', {
  numPushes: 1,
  funnelMaxBuffer: 4,
  valveMaxBuffer: 4,
  valveTimeout: 0,
  spliceMaxBuffer: 10,
  spoutTimeout: 0
}, params => {
  var testFlow = JSON.parse(TestUtil.testNodes.baseTestFlow);
  testFlow.nodes[0] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[0].id = `${funnel1NodeId}`;
  testFlow.nodes[0].numPushes = params.numPushes;
  testFlow.nodes[0].format = 'video';
  testFlow.nodes[0].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[0].delay = 10;
  testFlow.nodes[0].wires[0][0] = `${valve1NodeId}`;

  testFlow.nodes[1] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[1].id = `${funnel2NodeId}`;
  testFlow.nodes[1].numPushes = params.numPushes;
  testFlow.nodes[1].format = 'video';
  testFlow.nodes[1].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[1].delay = 10;
  testFlow.nodes[1].y = 200.0;
  testFlow.nodes[1].wires[0][0] = `${valve2NodeId}`;

  testFlow.nodes[2] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[2].id = `${funnel3NodeId}`;
  testFlow.nodes[2].numPushes = params.numPushes;
  testFlow.nodes[2].format = 'audio';
  testFlow.nodes[2].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[2].delay = 10;
  testFlow.nodes[2].y = 300;
  testFlow.nodes[2].wires[0][0] = `${spliceNodeId}`;

  testFlow.nodes[3] = JSON.parse(TestUtil.testNodes.valveTestNode);
  testFlow.nodes[3].id = `${valve1NodeId}`;
  testFlow.nodes[3].maxBuffer = params.valveMaxBuffer;
  testFlow.nodes[3].timeout = params.valveTimeout;
  testFlow.nodes[3].x = 300;
  testFlow.nodes[3].wires[0][0] = `${spliceNodeId}`;

  testFlow.nodes[4] = JSON.parse(TestUtil.testNodes.valveTestNode);
  testFlow.nodes[4].id = `${valve2NodeId}`;
  testFlow.nodes[4].maxBuffer = params.valveMaxBuffer;
  testFlow.nodes[4].timeout = params.valveTimeout;
  testFlow.nodes[4].x = 300;
  testFlow.nodes[4].y = 200;
  testFlow.nodes[4].wires[0][0] = `${spliceNodeId}`;

  testFlow.nodes[5] = JSON.parse(spliceTestNode);
  testFlow.nodes[5].id = `${spliceNodeId}`;
  testFlow.nodes[5].maxBuffer = params.spliceMaxBuffer;
  testFlow.nodes[5].x = 500;
  testFlow.nodes[5].y = 200;
  testFlow.nodes[5].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[6] = JSON.parse(TestUtil.testNodes.spoutTestNode);
  testFlow.nodes[6].id = `${spoutNodeId}`;
  testFlow.nodes[6].timeout = params.spoutTimeout;
  testFlow.nodes[6].x = 700;
  testFlow.nodes[6].y = 200;
  return testFlow;
}, (t, params, msgObj, onEnd) => {
  // t.comment(`Message: ${JSON.stringify(msgObj)}`);
  if (msgObj.hasOwnProperty('made') && (msgObj.src === 'splice-test')) {
    const flow = msgObj.made;
    console.log(JSON.stringify(flow, null, 2));
    t.ok(flow.hasOwnProperty('video'), 'splice cable contains a video flow type');
    t.ok(flow.hasOwnProperty('audio'), 'splice cable contains an audio flow type');
    t.equal(flow.video.length, 2, 'cable contains the expected quantity of video flow type');
    t.equal(flow.audio.length, 1, 'cable contains the expected quantity of audio flow type');
    t.equal(flow.video[0].name, 'video[0]', 'video flow has the expected name');
    t.equal(flow.audio[0].name, 'audio[0]', 'video flow has the expected name');
  }
  else if (msgObj.hasOwnProperty('receive')) {
    //t.equal(msgObj.receive, params.count, `received count ${params.count}`);
    TestUtil.checkGrain(t, msgObj.receive);
    params.count++;
  }
  else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout')) {
    t.equal(params.count, params.numPushes * 3, 'received end after expected number of pushes');
    onEnd();
  }
});
