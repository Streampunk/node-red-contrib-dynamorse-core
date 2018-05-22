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

const TestUtil = require('dynamorse-test');

const funnel1NodeId = '24fde3d7.b7544c';
const funnel2NodeId = '7c968c40.836974';
const valveNodeId = '634c3672.78be18';
const spoutNodeId = 'f2186999.7e5f78';

TestUtil.nodeRedTest('A video funnel->valve->spout flow is posted to Node-RED', {
  numPushes: 10,
  funnelMaxBuffer: 4,
  valveMaxBuffer: 4,
  valveTimeout: 0,
  spoutTimeout: 0
}, params => {
  var testFlow = TestUtil.testNodes.baseTestFlow();
  testFlow.nodes.push(Object.assign(TestUtil.testNodes.funnelGrainNode(), {
    id: funnel1NodeId,
    numPushes: params.numPushes,
    format: 'video',
    maxBuffer: params.funnelMaxBuffer,
    wires: [ [ valveNodeId ] ]
  }));

  testFlow.nodes.push(Object.assign(TestUtil.testNodes.valveTestNode(), {
    id: valveNodeId,
    maxBuffer: params.valveMaxBuffer,
    timeout: params.valveTimeout,
    wires: [ [ spoutNodeId ] ]
  }));

  testFlow.nodes.push(Object.assign(TestUtil.testNodes.spoutTestNode(), {
    id: spoutNodeId,
    timeout: params.spoutTimeout
  }));
  return testFlow;
}, (t, params, msgObj, onEnd) => {
  //t.comment(`Message: ${JSON.stringify(msgObj)}`);
  if (msgObj.hasOwnProperty('receive')) {
    //t.equal(msgObj.receive, params.count, `received count ${params.count}`);
    TestUtil.checkGrain(t, msgObj.receive);
    params.count++;
  }
  else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout')) {
    t.equal(params.count, params.numPushes, 'received end after expected number of pushes');
    onEnd();
  }
});

TestUtil.nodeRedTest('A funnelx2->spout flow is posted to Node-RED', {
  numPushes: 10,
  funnelMaxBuffer: 10,
  spoutTimeout: 0
}, params => {
  params.funCurCount = [];
  params.funCurCount[0] = 0;
  params.funCurCount[1] = 0;
  params.funCount = [];
  for (var i=0; i<params.numPushes; ++i)
    params.funCount[i] = 0;
  var testFlow = TestUtil.testNodes.baseTestFlow();
  testFlow.nodes.push(Object.assign(TestUtil.testNodes.funnelCountNode(), {
    name: 'funnel1',
    id: funnel1NodeId,
    end: params.numPushes-1,
    maxBuffer: params.funnelMaxBuffer,
    delay: 0,
    wires: [ [spoutNodeId ] ]
  }));

  testFlow.nodes.push(Object.assign(TestUtil.testNodes.funnelCountNode(), {
    name: 'funnel2',
    id: funnel2NodeId,
    y: 200,
    end: params.numPushes-1,
    maxBuffer: params.funnelMaxBuffer,
    delay: 4,
    wires: [ [ spoutNodeId ] ]
  }));

  testFlow.nodes.push(Object.assign(TestUtil.testNodes.spoutTestNode(), {
    id: spoutNodeId,
    timeout: params.spoutTimeout,
    numStreams: 2
  }));
  return testFlow;
}, (t, params, msgObj, onEnd) => {
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
    t.equal(params.count, params.numPushes, 'received end after expected number of pushes');
    onEnd();
  }
});

TestUtil.nodeRedTest('An audio funnel->spout flow is posted to Node-RED', {
  numPushes: 10,
  funnelMaxBuffer: 10,
  spoutTimeout: 0
}, params => {
  var testFlow = TestUtil.testNodes.baseTestFlow();
  testFlow.nodes.push(Object.assign(TestUtil.testNodes.funnelGrainNode(), {
    id: funnel1NodeId,
    numPushes: params.numPushes,
    format: 'audio',
    maxBuffer: params.funnelMaxBuffer,
    wires: [ [ spoutNodeId ] ]
  }));

  testFlow.nodes.push(Object.assign(TestUtil.testNodes.spoutTestNode(), {
    id: spoutNodeId,
    timeout: params.spoutTimeout
  }));
  return testFlow;
}, (t, params, msgObj, onEnd) => {
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
      format: 'audio', channels: 2, clockRate: 48000, encodingName: 'L16',
      blockAlign: 4, grainDuration: [1, 25]},
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
      format: 'audio', channels: 2, clockRate: 48000, encodingName: 'L16',
      blockAlign: 4, grainDuration: [1, 25]},
    'logical cable found with tags as expected.');
    t.ok(msgObj.found[0].audio[0].flowID,
      'logical cable found with a flow ID.');
    t.ok(msgObj.found[0].audio[0].sourceID,
      'logical cable found with a source ID.');
    t.equal(msgObj.found[0].backPressure, 'audio[0]',
      'logical cable found with back pressure specified.');
  }
  else if (msgObj.hasOwnProperty('end') && (msgObj.src === 'spout')) {
    t.equal(params.count, params.numPushes, 'received end after expected number of pushes');
    onEnd();
  }
});
