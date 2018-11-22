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

function make4175Buf(width, height) {
  var pitchBytes = width * 5 / 2;
  var buf = Buffer.alloc(pitchBytes * height);  
  var yOff = 0;
  for (var y=0; y<height; ++y) {
    var xOff = 0;
    for (var x=0; x<width; ++x) {
      // uyvy, big-endian 10 bits each in 5 bytes
      buf[yOff + xOff++] = 0x80;       
      buf[yOff + xOff++] = 0x04;       
      buf[yOff + xOff++] = 0x08;       
      buf[yOff + xOff++] = 0x00;       
      buf[yOff + xOff++] = 0x40;       
    }
    yOff += pitchBytes;
  }   
  return buf;
}

function makeYUV422P10Buf(width, height) {
  var lumaPitchBytes = width * 2;
  var chromaPitchBytes = lumaPitchBytes / 2;
  var buf = Buffer.alloc(lumaPitchBytes * height * 2);  
  var lOff = 0;
  var uOff = lumaPitchBytes * height;
  var vOff = uOff + chromaPitchBytes * height;

  for (var y=0; y<height; ++y) {
    var xlOff = 0;
    var xcOff = 0;
    for (var x=0; x<width; x+=2) {
      buf.writeUInt16LE(0x0040, lOff + xlOff);
      buf.writeUInt16LE(0x0040, lOff + xlOff + 2);
      xlOff += 4;
    
      buf.writeUInt16LE(0x0200, uOff + xcOff);
      buf.writeUInt16LE(0x0200, vOff + xcOff);
      xcOff += 2;
    }
    lOff += lumaPitchBytes;
    uOff += chromaPitchBytes;
    vOff += chromaPitchBytes;
  }
  return buf;
}

function makeV210Buf(width, height) {
  var pitchBytes = (width + (47 - (width - 1) % 48)) * 8 / 3;
  var buf = Buffer.alloc(pitchBytes * height);
  buf.fill(0);
  var yOff = 0;
  for (var y=0; y<height; ++y) {
    var xOff = 0;
    for (var x=0; x<(width-width%6)/6; ++x) {
      buf.writeUInt32LE((0x200<<20) | (0x040<<10) | 0x200, yOff + xOff);
      buf.writeUInt32LE((0x040<<20) | (0x200<<10) | 0x040, yOff + xOff + 4);
      buf.writeUInt32LE((0x200<<20) | (0x040<<10) | 0x200, yOff + xOff + 8);
      buf.writeUInt32LE((0x040<<20) | (0x200<<10) | 0x040, yOff + xOff + 12);
      xOff += 16;
    }

    var remain = width%6;
    if (remain) {
      buf.writeUInt32LE((0x200<<20) | (0x040<<10) | 0x200, yOff + xOff);
      if (2 === remain) {
        buf.writeUInt32LE(0x040, yOff + xOff + 4);
      } else if (4 === remain) {      
        buf.writeUInt32LE((0x040<<20) | (0x200<<10) | 0x040, yOff + xOff + 4);
        buf.writeUInt32LE((0x040<<10) | 0x200, yOff + xOff + 8);
      }
    }
    yOff += pitchBytes;
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
    depth: ('420P'===packing) ? 8 : 10,
    sampling: ('420P'===packing) ? 'YCbCr-4:2:0' : 'YCbCr-4:2:2',
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
    var makeBuf;
    switch (config.packing) {
    case 'pgroup': makeBuf = make4175Buf; break;
    case 'YUV422P10': makeBuf = makeYUV422P10Buf; break;
    case 'v210': makeBuf = makeV210Buf; break;
    default : makeBuf = make420PBuf;
    }
    var srcBuf = (config.format==='video') ?
      makeBuf(+config.width, +config.height) :
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
    var packing = config.packing || '420P';
    var encodingName = ('h264'===packing)?'h264':'raw';
    var tags = (config.format === 'video') ?
      makeVideoTags(+config.width, +config.height, packing, encodingName, 0) :
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
    this.on('close', () => {});
  }

  util.inherits(FunnelGrain, redioactive.Funnel);
  RED.nodes.registerType('funnelGrain', FunnelGrain);
};
