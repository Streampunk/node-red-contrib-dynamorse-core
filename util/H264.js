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

const START = 1;
const START_ZERO = 12;
const START_ZERO_ZERO = 13;
const START_ZERO_ZERO_ONE = 14;
const ZERO = 2;
const ZERO_ZERO = 3;
const ZERO_ZERO_ONE = 4;
const DATA = 5;

function compact6184 (g, payloadSize) {
  var state = START;
  var rangePointer = 0;
  var endPointer = 0;
  var nals = { slices : [] , seis : [], max_ref_idc : 0 };
  if (g.buffers.length > 1) {
    g.buffers = [ Buffer.concat(g.buffers) ];
  }
  function testMaxRefIDC(value) {
    if (value & 0x60 > nals.max_ref_idc)
     nals.max_ref_idc = value & 0x60;
    return value & 0x1f;
  }
  function nextNAL(nal) {
    switch (testMaxRefIDC(nal[0])) {
      case 9:
        nals.aud = nal;
        nals.max_ref_idc = (nal[0])
        break;
      case 7:
        nals.sps = nal;
        break;
      case 8:
        nals.pps = nal;
        break;
      case 6:
        nals.seis.push(nal);
        break;
      case 5:
        nals.slices.push(nal);
        break;
      default:
        console.log('Unexpected NAL unit type.');
        break;
    }
  }
  var b = g.buffers[0];
  for ( var x = 0 ; x < b.length ; x++ ) {
    switch (state) {
      case START:
        if (b[x] === 0) state = START_ZERO;
        break;
      case START_ZERO:
        if (b[x] === 0) state = START_ZERO_ZERO;
        else state = START;
        break;
      case START_ZERO_ZERO:
        switch (b[x]) {
          case 0: break;
          case 1: state = START_ZERO_ZERO_ONE; break;
          default: state = START; break;
        }
        break;
      case START_ZERO_ZERO_ONE:
        rangePointer = x;
        state = DATA;
        break;
      case DATA:
        if (b[x] === 0) state = ZERO;
        break;
      case ZERO:
        endPointer = x - 1;
        if (b[x] === 0) state = ZERO_ZERO;
        else state = DATA;
        break;
      case ZERO_ZERO:
        switch (b[x]) {
          case 0: break;
          case 1: state = ZERO_ZERO_ONE; break;
          default: state = DATA; break;
        }
        break;
      case ZERO_ZERO_ONE:
        nextNAL(b.slice(rangePointer, endPointer));
        rangePointer = x;
        state = DATA;
        break;
      default:
        console.error('H264 compaction - unknown state.');
        break;
    }
  }
  if (state === DATA) endPointer = b.length;
  if (endPointer > rangePointer) nextNAL(b.slice(rangePointer, endPointer));

  var stapA = new Buffer(
    ((nals.aud) ? nals.aud.length + 2 : 0) +
    ((nals.sps) ? nals.sps.length + 2 : 0) +
    ((nals.pps) ? nals.pps.length + 2 : 0) + 1);

  var pos = 1;
  stapA.writeUInt8(nals.max_ref_idc | 24, 0);
  if (nals.aud) {
    stapA.writeUInt16BE(nals.aud.length, pos);
    pos += 2;
    pos += nals.aud.copy(stapA, pos);
  }
  if (nals.sps) {
    stapA.writeUInt16BE(nals.sps.length, pos);
    pos += 2;
    pos += nals.sps.copy(stapA, pos);
  }
  if (nals.pps) {
    stapA.writeUInt16BE(nals.pps.length, pos);
    pos += 2;
    nals.pps.copy(stapA, pos);
  }
  g.buffers = [ stapA ];

  function splitNal (nal) {
    if (nal.length < payloadSize) return [ nal ];
    var payloads = [];
    var nalType = nal[0] & 0x1f;
    nal = nal.slice(1);
    while (nal.length > 0) {
      var p = new Buffer(payloadSize);
      p.writeUInt8(nals.max_ref_idc | 28, 0);
      p.writeUInt8(nalType, 1);
      var written = nal.copy(p, 2);
      payloads.push(p.slice(0, nal.length + 2));
      nal = nal.slice(written);
    }
    payloads[0].writeUInt8(0x80 | nalType, 1);
    payloads[payloads.length - 1].writeUInt8(0x40 | nalType, 1);
    return payloads;
  }

  nals.seis.forEach(function (sei) {
    splitNal(sei).forEach(function (y) { g.buffers.push(y); });
  });

  nals.slices.forEach(function (slice) {
    splitNal(slice).forEach(function (y) { g.buffers.push(y); });
  });

  return g;
}

const zzzOne = new Buffer([0, 0, 0, 1]);

function backToAVC (g) {
  g.buffers = g.buffers.map(function (b) {
    if (b.length === 0) return 0;
    if (b.readUInt8(0) & 0x80 !== 0) {
      console.error('Forbidden zero bit in an H.264 stream is one!');
      return b;
    }
    switch (b.readUInt8(0) & 0x1f) {
      case 12:
        return new Buffer(0);
      case 24:
        var pos = 1;
        var bufs = [];
        var total = 0;
        while(pos < b.length - 2 &&
            (pos + b.readUInt16BE(pos) + 2) <= b.length) {
          var length = b.readUInt16BE(pos);
          bufs.push(zzzOne);
          bufs.push(b.slice(pos + 2, pos + 2 + length));
          pos += 2 + length;
          total += 4 + length;
        }
        return Buffer.concat(bufs, total);
      case 28:
        switch (b.readUInt8(1) & 0xc0) {
          case 0x80: // Start
            return Buffer.concat([
              zzzOne,
              new Buffer([(b.readUInt8(0) & 0x60) | (b.readUInt8(1) & 0x1f)]),
              b.slice(2)], b.length + 3);
          case 0x40: // end
            return b.slice(2);
          default: // middle
            return b.slice(2);
        }
      default:
        return Buffer.concat([zzzOne, b], b.length + 4);
    }
  });
};

module.exports = {
  compact : compact6184,
  backToAVC : backToAVC
};
