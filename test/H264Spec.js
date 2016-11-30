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

var H264 = require('../util/H264.js');
var test = require('tape');
var fs = require('fs');
var Grain = require('../model/Grain.js');

var testBytes = fs.readFileSync(__dirname + '/data/frame_short.h264');

const FUA_START = 0;
const FUA_MIDDLE = 1;

test('Bytes are converted to RFC6184', function (t) {
  t.ok(testBytes, 'test bytes have loaded.');
  t.equal(testBytes.length, 39536, 'test bytes have expected length.');
  var g = new Grain([testBytes]);
  t.ok(Grain.isGrain(g), 'grain created successfully.');
  H264.compact(g, 1410);
  t.ok(Grain.isGrain(g), 'grain is still a grain after conversion.');
  t.equal(g.buffers.length, 31, 'resulting grain buffers are 11 long.');
  t.ok(g.buffers.every(function (b) { return Buffer.isBuffer(b); }),
    'every array entry is a buffer.');
  t.equal(g.buffers[0].readUInt8(0) & 0x1f, 24, 'first packet is STAP-A.');
  var state = FUA_START;
  for ( var x = 1; x < g.buffers.length ; x++ ) {
    switch (g.buffers[x].readUInt8(1)) {
      case 0x80 | 28:
        if (state === FUA_START) state = FUA_MIDDLE;
        else t.fail('FUA start detected when not in start state.');
        break;
      case 28:
        if (state !== FUA_MIDDLE)
          t.fail('FUA middle detected when not in middle state.');
        break;
      case 0x40 | 28:
        if (state !== FUA_MIDDLE)
          t.fail('FUA end dectected when not in middle state.');
        else state = FUA_START;
        break;
      default:
        if (g.buffers[x].readUInt8(0) & 0x80 !== 0)
          t.fail ('Forbidden zero bit is 1.');
        break;
    }
  }
  t.end();
});

test('Bytes roundtrip', function (t) {
  var g = new Grain([testBytes]);
  H264.compact(g, 1410);
  H264.backToAVC(g);
  t.ok(Grain.isGrain(g), 'roundtrip result is a grain.');
  t.equals(g.buffers.length, 31, 'result has some number of buffers.');
  t.ok(g.buffers.every(function (b) { return Buffer.isBuffer(b); }),
    'all grain payloads are buffers.');
  t.equal(g.buffers[0].indexOf(new Buffer([0, 0, 0, 1])), 0,
    'first packet converted to start 0 0 0 1.');
  for ( var x = 1 ; x < g.buffers.length ; x++ ) {
    t.ok(testBytes.indexOf(g.buffers[x].slice(1)) >= 0,
      `Original bytes for ${x} contains NAL unit.`);
  }
  t.end();
});

test('Three & four roundtrips', function (t) {
  var g = new Grain([testBytes]);
  H264.compact(g, 1410);
  var oneTime = Buffer.concat(g.buffers);
  H264.backToAVC(g);
  var twoTimes = Buffer.concat(g.buffers);
  H264.compact(g, 1410);
  var threeTimes = Buffer.concat(g.buffers);
  H264.backToAVC(g);
  var fourTimes = Buffer.concat(g.buffers);
  t.ok(oneTime.equals(threeTimes), 'buffers match 1st and 3rd.');
  t.ok(twoTimes.equals(fourTimes), 'buffers match 2nd and 4th.');
  t.end();
});

// test('Performance check', function (t) {
//   var total = 0;
//   for (var x = 0 ; x < 1000 ; x++ ) {
//     var g = new Grain([testBytes]);
//     var start = process.hrtime();
//     H264.compact(g, 1410);
//     total += process.hrtime(start)[1];
//   }
//   console.log(total / 1000);
//   t.end();
// });
