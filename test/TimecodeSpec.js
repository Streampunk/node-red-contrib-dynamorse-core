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

var Timecode = require('../model/Timecode.js');
var test = require('tape');

var exampleTCNonDrop = new Buffer([0x01, 0x07, 0x04, 0x00, 0x04, 0x09, 0x09, 0x03]);
var exampleTCDrop = new Buffer([0x01, 0x00, 0x05, 0x00, 0x04, 0x08, 0x0e, 0x04]);

test('Creating a timecode with a buffer', function (t) {
  var tcnd = new Timecode(exampleTCNonDrop);
  var tcd = new Timecode(exampleTCDrop);
  t.equal(tcnd.toString(), '17:40:49:13', 'matches non drop by string comparison.');
  t.equal(tcd.toString(), '10:50:48;24', 'matches drop by string comparison.');
  t.end();
});

test('Creating a timecode with a string', function (t) {
  var tcnd = new Timecode('17:40:49:13');
  var tcd = new Timecode('10:50:48;24');
  t.deepEqual(tcnd.buffer, exampleTCNonDrop, 'matches non drop by buffer comparison.');
  t.deepEqual(tcd.buffer, exampleTCDrop, 'matches drop by buffer comparison.');
  t.end();
});

test('Creating a timecode with arguments', function (t) {
  var tcnd = new Timecode(17, 40, 49, 13, false, true);
  var tcd = new Timecode(10, 50, 48, 24, true);
  t.equal(tcnd.toString(), '17:40:49:13', 'matches non drop by string comparison.');
  t.equal(tcd.toString(), '10:50:48;24', 'matches drop by string comparison.');
  t.deepEqual(tcnd.buffer, exampleTCNonDrop, 'matches non drop by buffer comparison.');
  t.deepEqual(tcd.buffer, exampleTCDrop, 'matches drop by buffer comparison.');
  t.end();  
});
