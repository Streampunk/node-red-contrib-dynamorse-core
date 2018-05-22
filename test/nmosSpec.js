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

var test = require('tape');
var LedgerDisc = require('../util/LedgerDiscovery.js');

var ntags = {
  format : [ 'video' ],
  encodingName : [ 'raw' ],
  width : [ '1920' ],
  height : [ '1080' ],
  depth : [ '10' ],
  packing : [ 'v210' ],
  sampling : [ 'YCbCr-4:2:2' ],
  clockRate : [ '90000' ],
  interlace : [ '1' ],
  colorimetry : [ 'BT709-2' ],
  grainDuration : [ '1/25' ]
};

var dtags = {
  format : 'video',
  encodingName : 'raw',
  width : 1920,
  height : 1080,
  depth : 10,
  packing : 'v210',
  sampling : 'YCbCr-4:2:2',
  clockRate : 90000,
  interlace : true,
  colorimetry : 'BT709-2',
  grainDuration : [1, 25]
};

test('Converting dynamorse tags to NMOS tags', t => {
  var n = LedgerDisc.makeNMOSTags(dtags);
  t.ok(n && typeof n === 'object', 'creates a valid object.');
  t.equal(Object.keys(n).length, Object.keys(dtags).length, 'results in the same number of properties.');
  Object.keys(n).forEach(k => {
    t.ok(Array.isArray(n[k]), `property ${k} is an array.`);
    t.ok(Array.isArray(n[k]) && n[k].length === 1, `array for ${k} is length 1.`);
    t.ok(Array.isArray(n[k]) && n[k].length === 1 && typeof n[k][0] === 'string',
      `Value of ${k} is of type string.`);
  });
  t.end();
});

test('Converting NMOS tags to dynamorse tags', t => {
  var d = LedgerDisc.makeDynamorseTags(ntags);
  t.ok(d && typeof d === 'object', 'create a valid object.');
  t.equal(Object.keys(d).length, Object.keys(ntags).length, 'results in the same number of properties.');
  Object.keys(d).forEach(k => {
    t.ok(!Array.isArray(d[k]) ||
        (d[k].length === 2 && typeof d[k][0] === 'number' && typeof d[k][1] === 'number'),
    `property ${k} is unwrapped from an array.`);
  });
  t.end();
});

test('Dynamorse tags convert to NMOS tags', t => {
  var n = LedgerDisc.makeNMOSTags(dtags);
  t.deepEqual(ntags, n, 'and match.');
  t.end();
});

test('NMOS tags convert to dynamorse tags', t => {
  var d = LedgerDisc.makeDynamorseTags(ntags);
  t.deepEqual(dtags, d, 'and match.');
  t.end();
});

test('Roundtrip tag conversion', t => {
  var r = LedgerDisc.makeDynamorseTags(LedgerDisc.makeNMOSTags(dtags));
  t.deepEqual(dtags, r, 'match to/from dynamorse tags.');
  r = LedgerDisc.makeNMOSTags(LedgerDisc.makeDynamorseTags(ntags));
  t.deepEqual(ntags, r, 'match to/from NMOS tags.');
  t.end();
});
