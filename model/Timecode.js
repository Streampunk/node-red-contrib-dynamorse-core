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

var immutable = require('seamless-immutable');

function Timecode (bufferHourString, mins, secs, frames, drop, color) {
  if (Buffer.isBuffer(bufferHourString)) {
    if (bufferHourString.length < 8) {
      this.buffer = Buffer.concat([new Buffer(8-t.length).fill(0), bufferHourString], 8);
    } else {
      this.buffer = bufferHourString.slice(-8);
    }
    // return immutable(this, { prototype : Timecode.prototype });
    return this;
  }
  var hours = (typeof bufferHourString === 'number') ? bufferHourString|0 : 0|0;
  if (typeof bufferHourString === 'string') {
    // Not processing .0 or .1 here, but accepting it as a string
    var m = bufferHourString.match(/^([0-9]{2}):([0-9]{2}):([0-9]{2})([:;])([0-9]{2})(\.[01])?$/);
    if (m === null) {
      hours = 0; mins = 0; secs = 0; frames = 0; drop = false;
    } else {
      hours = +m[1]; mins = +m[2]; secs = +m[3]; frames = +m[5];
      drop = (m[4] === ';');
    }
  }
  hours = (typeof hours !== 'number' || hours < 0) ? 0 : ((hours > 23) ? 23 : hours|0 );
  mins = (typeof mins !== 'number' || mins < 0) ? 0 : ((mins > 59) ? 59 : mins|0 );
  secs = (typeof secs !== 'number' || secs < 0) ? 0 : ((secs > 59) ? 59 : secs|0 );
  frames = (typeof frames !== 'number' || frames < 0) ? 0 : ((frames > 99) ? 99 : frames|0 );
  drop = (typeof drop !== 'boolean') ? false : drop;
  color = (typeof color !== 'boolean') ? true : color;

  this.buffer = new Buffer([
    (hours / 10|0) & 0x03, // tens of hours
    (hours % 10|0) & 0x0f, // units of hours
    (mins / 10|0) & 0x07, // tens of mins
    (mins % 10|0) & 0x0f, // units of mins
    (secs / 10|0) & 0x07, // tens of secs
    (secs % 10|0) & 0x0f, // units of secs
    ((frames / 10|0) & 0x03) | (drop ? 0x04 : 0x00) | (color ? 0x08 : 0x00), // tens of frames plus drop
    (frames % 10|0) & 0x0f]); // units of frames
  return this;
}

Timecode.prototype.toString = function () {
  function padInt (i) { return (i < 10) ? '0' + i : i; }
  var frames = (this.buffer[7] & 0x0f) + (this.buffer[6] & 0x03) * 10|0;
  var secs = (this.buffer[5] & 0x0f) + (this.buffer[4] & 0x07) * 10|0;
  var mins = (this.buffer[3] & 0x0f) + (this.buffer[2] & 0x07) * 10|0;
  var hours = (this.buffer[1] & 0x0f) + (this.buffer[0] & 0x03) * 10|0;
  var drop = (this.buffer[6] & 0x04) !== 0;
  return padInt(hours) + ':' + padInt(mins) + ':' + padInt(secs) +
    (drop ? ';' : ':') + padInt(frames);
}

module.exports = Timecode;
