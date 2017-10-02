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

var TestUtil = require('dynamorse-test').TestUtil;

var funnel1NodeId = "24fde3d7.b7544c";
var funnel2NodeId = "7c968c40.836974";
var funnel3NodeId = "6e6a8581.91957c";
var funnel4NodeId = "333f72f.fccc08e";
var funnel5NodeId = "b5383380.4ac7d";
var funnel6NodeId = "70208d26.8fdf74";
var valveNodeId = "634c3672.78be18";
var spoutNodeId = "f2186999.7e5f78";

TestUtil.nodeRedTest('A video funnel->valve->spout flow is posted to Node-RED', {
  numPushes: 10,
  funnelMaxBuffer: 4,
  valveMaxBuffer: 4,
  valveTimeout: 0,
  spoutTimeout: 0
}, function getFlow(params) {
  var testFlow = JSON.parse(TestUtil.testNodes.baseTestFlow);
  testFlow.nodes[0] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[0].id = `${funnel1NodeId}`;
  testFlow.nodes[0].numPushes = params.numPushes;
  testFlow.nodes[0].format = "video";
  testFlow.nodes[0].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[0].wires[0][0] = `${valveNodeId}`;

  testFlow.nodes[1] = JSON.parse(TestUtil.testNodes.valveTestNode);
  testFlow.nodes[1].id = `${valveNodeId}`;
  testFlow.nodes[1].maxBuffer = params.valveMaxBuffer;
  testFlow.nodes[1].timeout = params.valveTimeout;
  testFlow.nodes[1].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[2] = JSON.parse(TestUtil.testNodes.spoutTestNode);
  testFlow.nodes[2].id = `${spoutNodeId}`;
  testFlow.nodes[2].timeout = params.spoutTimeout;
  return testFlow;
}, function onMsg(t, params, msgObj, onEnd) {
  //t.comment(`Message: ${JSON.stringify(msgObj)}`);
  if (msgObj.hasOwnProperty('receive')) {
    //t.equal(msgObj.receive, params.count, `received count ${params.count}`);
    TestUtil.checkGrain(t, msgObj.receive);
    params.count++;
  }
  else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout')) {
    t.equal(params.count, params.numPushes, `received end after expected number of pushes`);
    onEnd();
  }
});

TestUtil.nodeRedTest('A funnelx2->spout flow is posted to Node-RED', {
  numPushes: 10,
  funnelMaxBuffer: 10,
  spoutTimeout: 0
}, function getFlow(params) {
  params.funCurCount = [];
  params.funCurCount[0] = 0;
  params.funCurCount[1] = 0;
  params.funCount = [];
  for (var i=0; i<params.numPushes; ++i)
    params.funCount[i] = 0;
  var testFlow = JSON.parse(TestUtil.testNodes.baseTestFlow);
  testFlow.nodes[0] = JSON.parse(TestUtil.testNodes.funnelCountNode);
  testFlow.nodes[0].name = 'funnel1';
  testFlow.nodes[0].id = `${funnel1NodeId}`;
  testFlow.nodes[0].end = params.numPushes-1;
  testFlow.nodes[0].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[0].delay = 0;
  testFlow.nodes[0].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[1] = JSON.parse(TestUtil.testNodes.funnelCountNode);
  testFlow.nodes[1].name = 'funnel2';
  testFlow.nodes[1].y = 200;
  testFlow.nodes[1].id = `${funnel2NodeId}`;
  testFlow.nodes[1].end = params.numPushes-1;
  testFlow.nodes[1].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[1].delay = 4;
  testFlow.nodes[1].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[2] = JSON.parse(TestUtil.testNodes.spoutTestNode);
  testFlow.nodes[2].id = `${spoutNodeId}`;
  testFlow.nodes[2].timeout = params.spoutTimeout;
  testFlow.nodes[2].numStreams = 2;
  return testFlow;
}, function onMsg(t, params, msgObj, onEnd) {
  // t.comment(`Message: ${JSON.stringify(msgObj)}`);
  if (msgObj.hasOwnProperty('push') && (msgObj.src === 'funnel1')) {
    t.equal(msgObj.push, params.funCurCount[0], `received count ${params.funCurCount[0]}`);
    params.funCurCount[0]++;
    params.funCount[msgObj.push]++;
    if (2===params.funCount[msgObj.push])
      params.count++;
  } else if (msgObj.hasOwnProperty('push') && (msgObj.src === 'funnel2')) {
    t.equal(msgObj.push, params.funCurCount[1], `received count ${params.funCurCount[1]}`);
    params.funCurCount[1]++;
    params.funCount[msgObj.push]++;
    if (2===params.funCount[msgObj.push])
      params.count++;
  } else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout') &&
             (params.funCurCount[0] == params.numPushes) && (params.funCurCount[1] == params.numPushes)) {
    t.equal(params.count, params.numPushes, `received end after expected number of pushes`);
    onEnd();
  }
});

TestUtil.nodeRedTest('An audio funnel->spout flow is posted to Node-RED', {
  numPushes: 10,
  funnelMaxBuffer: 10,
  spoutTimeout: 0
}, function getFlow(params) {
  var testFlow = JSON.parse(TestUtil.testNodes.baseTestFlow);
  testFlow.nodes[0] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[0].id = `${funnel1NodeId}`;
  testFlow.nodes[0].numPushes = params.numPushes;
  testFlow.nodes[0].format = "audio";
  testFlow.nodes[0].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[0].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[1] = JSON.parse(TestUtil.testNodes.spoutTestNode);
  testFlow.nodes[1].id = `${spoutNodeId}`;
  testFlow.nodes[1].timeout = params.spoutTimeout;
  return testFlow;
}, function onMsg(t, params, msgObj, onEnd) {
  // t.comment(`Message: ${JSON.stringify(msgObj)}`);
  if (msgObj.hasOwnProperty('receive')) {
    //t.equal(msgObj.receive, params.count, `received count ${params.count}`);
    TestUtil.checkGrain(t, msgObj.receive);
    params.count++;
  }
  else if (msgObj.hasOwnProperty('made') && msgObj.src === 'funnel') {
    t.ok(Array.isArray(msgObj.made.audio) && msgObj.made.audio.length === 1,
      'logical cable made with audio array of length 1.');
    t.deepEqual(msgObj.made.audio[0].tags, {
        format: "audio", channels: 2, clockRate: 48000, encodingName: "L16",
        blockAlign: 2, grainDuration: [1, 25]},
      'logical cable made with tags as expected.');
    t.ok(msgObj.made.audio[0].flowID,
      'logical cable made with a flow ID.');
    t.ok(msgObj.made.audio[0].sourceID,
      'logical cable made with a source ID.');
    t.equal(msgObj.made.backPressure, 'audio[0]',
      'logical cable made with back pressure specified.');
  }
  else if (msgObj.hasOwnProperty('found') && msgObj.src === 'spout') {
    console.log(msgObj.found);
    t.ok(Array.isArray(msgObj.found) && msgObj.found.length === 1,
      'logical cable found is itself and array of length 1.');
    t.ok(Array.isArray(msgObj.found[0].audio) &&
                            msgObj.found[0].audio.length === 1,
      'logical cable found with audio array of length 1.');
    t.deepEqual(msgObj.found[0].audio[0].tags, {
        format: "audio", channels: 2, clockRate: 48000, encodingName: "L16",
        blockAlign: 2, grainDuration: [1, 25]},
      'logical cable found with tags as expected.');
    t.ok(msgObj.found[0].audio[0].flowID,
      'logical cable found with a flow ID.');
    t.ok(msgObj.found[0].audio[0].sourceID,
      'logical cable found with a source ID.');
    t.equal(msgObj.found[0].backPressure, 'audio[0]',
      'logical cable found with back pressure specified.');
  }
  else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout')) {
    t.equal(params.count, params.numPushes, `received end after expected number of pushes`);
    onEnd();
  }
});

TestUtil.nodeRedTest('An audio funnelx6->spout flow is posted to Node-RED', {
  numPushes: 2,
  numFunnels: 6,
  funnelMaxBuffer: 10,
  spoutTimeout: 0
}, function getFlow(params) {
  var testFlow = JSON.parse(TestUtil.testNodes.baseTestFlow);
  
  testFlow.nodes[0] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[0].id = `${funnel1NodeId}`;
  testFlow.nodes[0].name = 'funnel1',
  testFlow.nodes[0].numPushes = params.numPushes;
  testFlow.nodes[0].format = "audio";
  testFlow.nodes[0].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[0].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[1] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[1].id = `${funnel2NodeId}`;
  testFlow.nodes[1].name = 'funnel2',
  testFlow.nodes[1].numPushes = params.numPushes;
  testFlow.nodes[1].format = "audio";
  testFlow.nodes[1].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[1].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[2] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[2].id = `${funnel3NodeId}`;
  testFlow.nodes[2].name = 'funnel3',
  testFlow.nodes[2].numPushes = params.numPushes;
  testFlow.nodes[2].format = "audio";
  testFlow.nodes[2].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[2].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[3] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[3].id = `${funnel4NodeId}`;
  testFlow.nodes[3].name = 'funnel4',
  testFlow.nodes[3].numPushes = params.numPushes;
  testFlow.nodes[3].format = "audio";
  testFlow.nodes[3].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[3].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[4] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[4].id = `${funnel5NodeId}`;
  testFlow.nodes[4].name = 'funnel5',
  testFlow.nodes[4].numPushes = params.numPushes;
  testFlow.nodes[4].format = "audio";
  testFlow.nodes[4].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[4].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[5] = JSON.parse(TestUtil.testNodes.funnelGrainNode);
  testFlow.nodes[5].id = `${funnel6NodeId}`;
  testFlow.nodes[5].name = 'funnel6',
  testFlow.nodes[5].numPushes = params.numPushes;
  testFlow.nodes[5].format = "audio";
  testFlow.nodes[5].maxBuffer = params.funnelMaxBuffer;
  testFlow.nodes[5].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[6] = JSON.parse(TestUtil.testNodes.spoutTestNode);
  testFlow.nodes[6].id = `${spoutNodeId}`;
  testFlow.nodes[6].timeout = params.spoutTimeout;
  return testFlow;
}, function onMsg(t, params, msgObj, onEnd) {
  // t.comment(`Message: ${JSON.stringify(msgObj)}`);
  if (msgObj.hasOwnProperty('receive')) {
    //t.equal(msgObj.receive, params.count, `received count ${params.count}`);
    TestUtil.checkGrain(t, msgObj.receive);
    params.count++;
  }
  else if (msgObj.hasOwnProperty('flowID') && (msgObj.src.substring(0,6) === 'funnel')) {
    t.equal(msgObj.flowID, 'flowID OK', 'flowID was registered in NMOS before first push');
  }
  else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout')) {
    t.equal(params.count, params.numPushes * params.numFunnels, `received end after expected number of pushes`);
    onEnd();
  }
});
