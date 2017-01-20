/* Copyright 2016 Streampunk Media Ltd.

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
var valveNodeId = "634c3672.78be18";
var spoutNodeId = "f2186999.7e5f78";

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
  testFlow.nodes[0].delay = 4;
  testFlow.nodes[1].wires[0][0] = `${spoutNodeId}`;

  testFlow.nodes[2] = JSON.parse(TestUtil.testNodes.spoutTestNode);
  testFlow.nodes[2].id = `${spoutNodeId}`;
  testFlow.nodes[2].timeout = params.spoutTimeout;
  testFlow.nodes[2].numStreams = 2;
  return testFlow;
}, function onMsg(t, params, msgObj, onEnd) {
  //t.comment(`Message: ${JSON.stringify(msgObj)}`);
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
