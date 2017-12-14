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

var util = require('util');
var redioactive = require('../util/Redioactive.js');
var Grain = require('../model/Grain.js');

function make420PBuf(width, height) {
  var lumaPitchBytes = width;
  var chromaPitchBytes = lumaPitchBytes / 2;
  var buf = Buffer.alloc(lumaPitchBytes * height * 3 / 2);
  var lOff = 0;
  var uOff = lumaPitchBytes * height;
  var vOff = uOff + chromaPitchBytes * height / 2;

  for (var y=0; y<height; ++y) {
    var xlOff = 0;
    var xcOff = 0;
    var evenLine = (y & 1) == 0;
    for (var x=0; x<width; x+=2) {
      buf[lOff + xlOff++] = 0x10;
      buf[lOff + xlOff++] = 0x10;

      if (evenLine) {
        buf[uOff + xcOff] = 0x80;
        buf[vOff + xcOff] = 0x80;
        xcOff++;
      }
    }
    lOff += lumaPitchBytes;
    if (!evenLine) {
      uOff += chromaPitchBytes;
      vOff += chromaPitchBytes;
    }
  }
  return buf;
}

function makeVideoTags(width, height, packing, encodingName, interlace) {
  var tags = {
    format : 'video',
    width: width,
    height: height,
    packing: packing,
    encodingName: encodingName,
    colorimetry: 'BT709-2',
    depth: 8,
    sampling: 'YCbCr-4:2:0',
    interlace: interlace === 1,
    clockRate: 90000,
    grainDuration: [1, 25]
  };
  return tags;
}

function makeAudioBuf(channels, bitsPerSample, duration) {
  var bytesPerSample = (((bitsPerSample+7)/8)>>>0);
  var samplesPerGrain = 48000 * duration[0] / duration[1];
  var buf = Buffer.alloc(samplesPerGrain * channels * bytesPerSample);
  for (var i=0; i<samplesPerGrain; ++i)
    for (var c=0; c<channels; ++c)
      buf.writeUIntLE(i, (i*channels + c)*bytesPerSample, bytesPerSample);
  return buf;
}

function makeAudioTags(channels, bitsPerSample) {
  var tags = {
    format: 'audio',
    channels: channels,
    clockRate: 48000,
    encodingName: `L${bitsPerSample}`,
    blockAlign: ((bitsPerSample * channels+7)/8)>>>0,
    grainDuration: [1, 25]
  };
  return tags;
}

module.exports = function (RED) {
  function FunnelGrain (config) {
    RED.nodes.createNode(this, config);
    redioactive.Funnel.call(this, config);

    var srcDuration = [ 1, 25 ];
    var srcBuf = (config.format==='video') ?
      make420PBuf(+config.width, +config.height) :
      makeAudioBuf(+config.channels, +config.bitsPerSample, srcDuration);

    function makeGrain(b, baseTime, flowId, sourceId) {
      var grainTime = Buffer.alloc(10);
      grainTime.writeUIntBE(baseTime[0], 0, 6);
      grainTime.writeUInt32BE(baseTime[1], 6);
      var grainDuration = srcDuration;
      baseTime[1] = (baseTime[1] +
        (grainDuration[0] * 1000000000 / grainDuration[1]|0))>>>0;
      baseTime[0] = (baseTime[0] + (baseTime[1] / 1000000000|0))>>>0;
      baseTime[1] = baseTime[1] % 1000000000;
      return new Grain([b], grainTime, grainTime, null,
        flowId, sourceId, grainDuration);
    }

    this.count = 0;
    var flowID = null;
    var sourceID = null;
    var tags = (config.format === 'video') ?
      makeVideoTags(+config.width, +config.height, '420P', 'raw', 0) :
      makeAudioTags(+config.channels, +config.bitsPerSample);
    this.baseTime = [ Date.now() / 1000|0, (Date.now() % 1000) * 1000000 ];

    this.generator((push, next) => {
      if (0 === this.count) {
        this.makeCable((config.format === 'video') ?
          { video: [ { tags: tags } ], backPressure: 'video[0]' } :
          { audio: [ { tags: tags } ], backPressure: 'audio[0]' });
        flowID = this.flowID();
        sourceID = this.sourceID();
      }

      if (this.count < +config.numPushes) {
        push(null, makeGrain(srcBuf, this.baseTime, flowID, sourceID));
        this.count++;
        setTimeout(next, +config.delay);
      } else {
        push(null, redioactive.end);
      }
    });
    this.on('close', this.close);
  }

  util.inherits(FunnelGrain, redioactive.Funnel);
  RED.nodes.registerType('funnelGrain', FunnelGrain);
};
