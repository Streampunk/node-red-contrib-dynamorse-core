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

var Grain = require('../model/Grain.js');
var test = require('tape');

test('A newly created grain from mainly strings', t => {
  var g = new Grain([Buffer.alloc(10, 10), Buffer.alloc(5, 5)],
    '12345:67890', '98765:43210', '10:11:12:13',
    'CCA06626-AEB1-4014-8287-BBEF45E7DD51',
    '0313B546-1325-4983-B80B-1C3C312FC181',
    '25/1');
  t.ok(g, 'grain is not null.');
  t.ok(Grain.isGrain(g), 'grain reports that it is a grain.');
  var gj = g.toJSON(); // roundtrip via buffer means a lot of code is working!
  t.equal(gj.payloadCount, 2, 'payload is the expected length.');
  t.equal(gj.payloadSize, 15, 'total length of payload is as expected.');
  t.equal(gj.ptpSyncTimestamp, '12345:000067890', 'ptp sysc timestamp matches.');
  t.equal(gj.ptpOriginTimestamp, '98765:000043210', 'ptp origin timestamp matches.');
  t.equal(gj.timecode, '10:11:12:13', 'timecode value matches.');
  t.equal(gj.flow_id, 'cca06626-aeb1-4014-8287-bbef45e7dd51', 'flow id matches.');
  t.equal(gj.source_id, '0313b546-1325-4983-b80b-1c3c312fc181', 'source id matches.');
  t.equal(gj.duration, '25/1', 'duration matches.');
  t.ok(Buffer.alloc(10, 10).equals(g.buffers[0]), 'first buffer as expected.');
  t.ok(Buffer.alloc(5, 5).equals(g.buffers[1]), 'second buffer as expected.');
  t.end();
});

// TODO further tests of grain creation by buffer

test('Grain test does not identify non grains', t => {
  t.notOk(Grain.isGrain(null), 'null is not a grain.');
  t.notOk(Grain.isGrain(undefined), 'undefined is not a grain.');
  t.notOk(Grain.isGrain(1), 'number is not a grain.');
  t.notOk(Grain.isGrain('wibble'), 'string is not a grain.');
  t.notOk(Grain.isGrain(Buffer.allocUnsafe(42)), 'a buffer is not a grain.');
  t.notOk(Grain.isGrain({}), 'an empty object is not a grain.');
  t.end();
});
