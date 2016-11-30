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

var uuid = require('uuid');
var immutable = require('seamless-immutable');
var Timecode = require('./Timecode.js');

function Grain(buffers, ptpSync, ptpOrigin, timecode, flow_id,
    source_id, duration) {

  this.buffers = this.checkBuffers(buffers);
  this.ptpSync = this.checkTimestamp(ptpSync);
  this.ptpOrigin = this.checkTimestamp(ptpOrigin);
  this.timecode = this.checkTimecode(timecode);
  this.flow_id = this.uuidToBuffer(flow_id);
  this.source_id = this.uuidToBuffer(source_id);
  this.duration = this.checkDuration(duration);
  return this;
  //return immutable(this, { prototype : Grain.prototype });
}

Grain.prototype.checkBuffers = function (b) {
  if (b === null || b === undefined) return [];
  if (Buffer.isBuffer(b))
    return [b];
  if (Array.isArray(b)) {
    b = b.filter(function (x) { return Buffer.isBuffer(x); });
    return b;
  }
  return undefined;
}

Grain.prototype.uuidToBuffer = function (id) {
  try {
    if (id === undefined || id === null) {
      return undefined;
    }
    if (typeof id === 'string') {
      var b = new Buffer(16);
      uuid.parse(id, b);
      return b;
    }
    if (Buffer.isBuffer(id)) {
      return id.slice(0, 16);
    }
  }
  catch (e) {
    console.log(e);
    return undefined;
  }
  console.log("Could not parse value '" + id + "' to a UUID.");
  return undefined;
}

Grain.prototype.checkTimestamp = function (t) {
  if (t === null || t === undefined) {
    return undefined;
  }
  if (Buffer.isBuffer(t)) {
    if (t.length < 10) {
      t = Buffer.concat([new Buffer(10-t.length).fill(0), t], 10);
    }
    return t.slice(-10);
  }
  if (typeof t === 'string') {
    var m = t.match(/^([0-9]+):([0-9]+)$/)
    if (m === null) {
      console.log("Could not pattern match timestamp '" + t + "'.");
      return undefined;
    }
    var b = new Buffer(10);
    b.writeUIntBE(+m[1], 0, 6);
    b.writeUInt32BE(+m[2], 6);
    return b;
  }
  return undefined;
}

const nineZeros = '000000000';

Grain.prototype.formatTimestamp = function (t) {
  if (t === null || t === undefined) return undefined;
  var nanos = t.readUInt32BE(6).toString();
  return t.readUIntBE(0, 6) + ':' + nineZeros.slice(nanos.length) + nanos;
}

Grain.prototype.originAtRate = function (rate) {
  var nanos = this.ptpOrigin.readUInt32BE(6);
  var secs = this.ptpOrigin.readUIntBE(0, 6);
  return Math.floor((secs * rate) + (nanos / (1000000000 / rate)));
}

Grain.prototype.checkTimecode = function (t) {
  if (t === null || t === undefined) {
    return undefined;
  }
  if (Buffer.isBuffer(t)) {
    if (t.length < 8) {
      t = Buffer.concat([new Buffer(8-t.length).fill(0), t], 8);
    }
    return t.slice(-8);
  }
  if (typeof t === 'object' && t.constructor === Timecode.prototype.constructor) {
    return t.buffer;
  }
  if (typeof t === 'string') {
    return new Timecode(t).buffer;
  }
  return undefined;
}

Grain.prototype.formatTimecode = function (t) {
  if (t === null || t === undefined) return undefined;
  return new Timecode(t).toString();
}

Grain.prototype.checkDuration = function (d) {
  if (d === null || d === undefined) return undefined;
  if (Buffer.isBuffer(d)) {
    if (d.length < 8) {
      d = Buffer.concat([new Buffer(8-t.length).fill(0), d], 8);
    }
    d = d.slice(-8);
    if (d.readUInt32BE(0) === 0) d[3] = 0x01;
    return d;
  }
  if (Array.isArray(d)) {
    var b = new Buffer(8);
    b.writeUInt32BE(d[0]|0, 0);
    b.writeUInt32BE(d[1]|0, 4);
    return b;
  }
  if (typeof d === 'string') {
    var m = d.match(/^([0-9]+)\/([1-9][0-9]*)$/);
    if (m === null) return undefined;
    var b = new Buffer(8);
    b.writeUInt32BE(+m[1], 0);
    b.writeUInt32BE(+m[2], 4);
    return b;
  }
  return undefined;
}

Grain.prototype.formatDuration = function (d) {
  if (d === undefined || d === null) return undefined;
  return d.readUInt32BE(0) + '/' + d.readUInt32BE(4);
}

Grain.prototype.getDuration = function () {
  if (this.duration) {
    return [ this.duration.readUInt32BE(0), this.duration.readUInt32BE(4) ];
  } else {
    return [ NaN, NaN ];
  }
}

Grain.prototype.getPayloadSize = function () {
  if (Array.isArray(this.buffers)) {
    if (this.buffers.length === 1) return this.buffers[0].length;
    return this.buffers.reduce(function (l, r) { return l + r.length; }, 0);
  }
  return Buffer.isBuffer(this.buffers) ? this.buffers.length : 0;
}

Grain.prototype.getOriginTimestamp = function () {
  return [ this.ptpOrigin.readUIntBE(0, 6), this.ptpOrigin.readUInt32BE(6) ];
}

Grain.isGrain = function (x) {
  return x !== null &&
    typeof x === 'object' &&
    x.constructor === Grain.prototype.constructor;
}

Grain.prototype.toJSON = function () {
  return {
    payloadCount : Array.isArray(this.buffers) ? this.buffers.length : 0,
    payloadSize : Array.isArray(this.buffers) ?
      this.buffers.reduce(function (l, r) { return l + r.length; }, 0) : 0,
    ptpSyncTimestamp : this.formatTimestamp(this.ptpSync),
    ptpOriginTimestamp : this.formatTimestamp(this.ptpOrigin),
    timecode : this.formatTimecode(this.timecode),
    flow_id : uuid.unparse(this.flow_id),
    source_id : uuid.unparse(this.source_id),
    duration : this.formatDuration(this.duration)
  };
}

module.exports = Grain;
