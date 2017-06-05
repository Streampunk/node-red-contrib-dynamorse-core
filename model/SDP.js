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

// TODO: Does not parse the t and r groups correctly

var Net = require('../util/Net.js');

var moreThanOne = {
  v: false, o: false, s : false, i: false, u: false, e: false,
  p: false, c: false, b: true, t: false, r: true, z: false,
  a: false
};

/**
 * Represents an SDP file defined according to RFC4566.
 * @constructor
 * @param [(string|Buffer)] sdp SDP data.
 */
function SDP(sdp) {
  if (sdp == null || sdp == undefined) return {};
  if (Buffer.isBuffer(sdp)) {
    sdp = sdp.toString();
  }
  if (typeof sdp !== 'string') return {};
  return this.parse(sdp, this);
}

/**
 * Parse SDP data and merge it into this SDP object.
 * @param [string] s String representation of the SDP file.
 */
SDP.prototype.parse = function (s) {
  if (this === undefined || this === null || typeof this !== 'object') {
    sdp = {};
  } else {
    sdp = this;
  }
  var media = sdp;
  var sdpLines = s.split(/\r?\n/);
  sdpLines.forEach(l => {
    var m = l.trim().match(/^([a-z])=(.*)$/)
    if (m !== null) {
      if (m[1] === 'm') {
        media = {};
        if (sdp.m === undefined) sdp.m = [];
        sdp.m.push(media);
      }
      if (media[m[1]] === undefined) {
        if (m[1] === 'a') {
          var n = m[2].match(/^([^\r\n:]+):?([^\r\n]+)$/);
          if (n !== null) {
            media.a = {};
            media.a[n[1]] = (n[2] === undefined) ? null : [ n[2] ];
          }
        } else {
          if (moreThanOne[m[1]]) {
            media[m[1]] = [ m[2] ];
          } else {
            media[m[1]] = m[2];
          }
        }
      } else {
        if (m[1] === 'a') {
          var n = m[2].match(/^([^\r\n:]+):?([^\r\n]+)$/);
          if (n !== null) {
            if (media.a[n[1]] === null || media.a[n[1]] === undefined) {
              media.a[n[1]] = [ n[2] ];
            } else {
              media.a[n[1]].push(n[2]);
            }
          }
        } else {
          if (moreThanOne[m[1]]) media[m[1]].push(m[2]);
        }
      }
    }
  });
  return sdp;
}

/**
 * Array of media names available in the SDP file. The index of each
 * item can be used to reference media-item specifics.
 * @return [Array.<string>] List of available media names.
 */
SDP.prototype.getMediaHeaders = function () {
  return this.m.map(x => x.m);
}

/**
 * If present, an object as hashmap to allow extension header
 * identifiers to be looked up.
 * @param [number] i Index into the media items to look for ExtMap.
 * @return [Object.<string, number>] Reverse lookup for extmap tables.
 */
SDP.prototype.getExtMapReverse = function (i) {
  console.log(this.m[i]);
  var extMap = this.m[i].a.extmap;
  if (!Array.isArray(extMap)) return {};
  var revMap = {};
  extMap.forEach(x => {
    var w = x.match(/([0-9][0-9]?)\s([^\s]+)\.*/);
    if (w !== null) {
      revMap[w[2]] = +w[1];
    }
  });
  return revMap;
}

var sessionOrder =
  [ 'v', 'o', 's', 'i', 'u', 'e', 'p', 'c', 'b', 't', 'r', 'z', 'k', 'a' ];

var mediaOrder = [ 'm', 'i', 'c', 'b', 'k', 'a' ];

SDP.prototype.toString = function () {
  var sdp = '';
  sessionOrder.forEach(x => {
    if (x === 'a' && this.a !== undefined) {
      for ( var z in this.a ) {
        this.a[z].forEach(w => {
          sdp += 'a=' + z + ((w.length > 0) ? ':' : '') + w + '\n';
        });
      }
    } else {
      if (this[x] !== undefined) {
        if (moreThanOne[x]) {
          this[x].forEach(y => { sdp += x + '=' + y + '\n'; });
        } else {
          sdp += x + '=' + this[x] + '\n';
        }
      }
    }
  });
  this.m.forEach(x => {
    mediaOrder.forEach(y => {
      if (y === 'a' && x[y] !== undefined) {
        for ( var z in x.a) {
          x.a[z].forEach(w => {
            sdp += 'a=' + z + ((w.length > 0) ? ':' : '') + w + '\n';
          });
        }
      } else {
        if (x[y] !== undefined) {
          if (moreThanOne[y]) {
            x[y].forEach(z => {
              sdp += y + '=' + z + '\n';
            });
          } else {
            sdp += y + '=' + x[y] + '\n';
          }
        }
      }
    });
  });
  return sdp;
}

SDP.prototype.getEncodingName = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.rtpmap)) {
    var m = this.m[i].a.rtpmap[0].match(/[0-9]+\s(\w+)\/.*/);
    if (m === null) {
      return undefined;
    } else {
      return m[1];
    }
  }
  return undefined;
}

SDP.prototype.getMedia = function (i) {
  if (i >= this.m.length) return undefined;
  var m = this.m[i].m.match(/(\w+)\s.*/)
  if (m !== null) return m[1];
  else return undefined;
}

SDP.prototype.getClockRate = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.rtpmap)) {
    var m = this.m[i].a.rtpmap[0].match(/[0-9]+\s\w+\/([0-9]+).*/);
    if (m === null) {
      return undefined;
    } else {
      return +m[1];
    }
  }
  return undefined;
}

// Returns number of audio channels for audio - needs converting to a number
SDP.prototype.getEncodingParameters = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.rtpmap)) {
    var m = this.m[i].a.rtpmap[0].match(/[0-9]+\s\w+\/[0-9]+\/(.*)/);
    if (m === null) {
      return undefined;
    } else {
      return m[1];
    }
  }
  return undefined;

}

SDP.prototype.getPort = function (i) {
  if (i >= this.m.length) return undefined;
  var pm = this.m[i].m.match(/\w+\s([0-9]+)\s.*/);
  if (pm !== null) return +pm[1];
  else return undefined;
}

SDP.prototype.getPayloadType = function (i) {
  if (i >= this.m.length) return undefined;
  var pm = this.m[i].m.match(/\w+\s[0-9]+\s[^\s]+\s([0-9]+)/);
  if (pm !== null) return +pm[1];
  else return undefined;
}

SDP.prototype.getConnectionAddress = function (i) {
  if (i >= this.m.length) return undefined;
  var c = (this.m[i].c !== undefined) ? this.m[i].c : this.c;
  if (c !== undefined) {
    var cm = this.m[i].c.match(/\w+\s\w+\s([0-9\.]+).*/);
    if (cm !== null) return cm[1];
    else return undefined;
  }
  return undefined;
}

SDP.prototype.getConnectionTTL = function (i) {
  if (i >= this.m.length) return undefined;
  var c = (this.m[i].c !== undefined) ? this.m[i].c : this.c;
  if (c !== undefined) {
    var cm = this.m[i].c.match(/\w+\s\w+\s[0-9\.]+\/([0-9]+).*/);
    if (cm !== null) return +cm[1];
    else return undefined;
  }
  return undefined;
}

SDP.prototype.getOriginUnicastAddress = function (i) {
  if (i >= this.m.length) return undefined;
  var m = this.o.match(/[^\s]+[0-9]+\s[0-9]+\s\w+\s\w+\s([0-9\.]+).*/);
  if (m !== null) return m[1];
  else return undefined;
}

SDP.prototype.getClockOffset = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.mediaclk)) {
    var om = this.m[i].a.mediaclk[0].match(/direct=([0-9]*).*/)
    if (om !== null) return +om[1];
  }
  return undefined;
}

SDP.prototype.getTimestampReferenceClock = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a['ts-refclk'])) {
    return this.m[i].a['ts-refclk'][0];
  }
  return undefined;
}

SDP.prototype.getSMPTETimecodeParameters = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.extmap)) {
    var tcLine = this.m[i].a.extmap
    .map(x => x.match(/[0-9][0-9]?\s+urn:ietf:params:rtp-hdrext:smpte-tc\s(\S+).*/))
    .find(x => x !== null);
    if (tcLine) {
      return tcLine[1];
    }
  }
  return undefined;
}

/**
 * Calculates the number of bytes in an atomic unit of a grain to ensure that
 * it fits within the sub-structure of the RTP packet. For audio, this is the
 * per sample byte count for all samples, e.g. 6 bytes for 24-bit 2 channel
 * audio. For video, this is the number of bytes per pixel, which may be a
 * decimal value.
 * @param  {Number} i Index of the media item.
 * @return {Number}   Stride bytes for the media.
 */
SDP.prototype.getStride = function (i) {
  if (i >= this.m.length) return 1;
  var media = this.m[i];
  if (media.a.rtpmap[0].indexOf('raw') >= 0 && Array.isArray(media.a.fmtp)) {
    // a=fmtp:96 sampling=YCbCr-4:2:2; width=1920; height=1080; depth=10; colorimetry=BT709-2
    var fmtp = media.a.fmtp[0];
    var wm = fmtp.match(/.*width=([0-9]+).*/)
    var width = (wm) ? +wm[1] : 1920;
    var dm = fmtp.match(/.*depth=([0-9]+).*/)
    var depth = (dm) ? +dm[1] : 8;
    var spp = (fmtp.indexOf('4:4:4') >= 0) ? 3 :
      ((fmtp.indexOf('4:2:2') >= 0) ? 2 : 1.5);
    return Math.ceil(spp * (depth / 8));
  } else if (media.m.indexOf('audio')) {
    var sm = media.a.rtpmap[0].match(/[0-9]+\sL([0-9]+)\/[0-9]+\/([0-9]+).*/);
    return (+sm[1] / 8) * +sm[2];
  } else {
    return 1;
  }
}

SDP.prototype.getWidth = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.fmtp)) {
    var wm = this.m[i].a.fmtp[0].match(/.*width=([0-9]+).*/);
    if (wm) return +wm[1];
  }
  return undefined;
}

SDP.prototype.getHeight = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.fmtp)) {
    var hm = this.m[i].a.fmtp[0].match(/.*height=([0-9]+).*/);
    if (hm) return +hm[1];
  }
  return undefined;
}

SDP.prototype.getSampling = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.fmtp)) {
    var hm = this.m[i].a.fmtp[0].match(/.*sampling=([\w-:]+).*/);
    if (hm) return hm[1];
  }
  return undefined;
}

SDP.prototype.getColorimetry = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.fmtp)) {
    var hm = this.m[i].a.fmtp[0].match(/.*colorimetry=([\w-]+).*/);
    if (hm) return hm[1];
  }
  return undefined;
}

SDP.prototype.getDepth = function(i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.fmtp)) {
    var hm = this.m[i].a.fmtp[0].match(/.*depth=([0-9]+).*/);
    if (hm) return +hm[1];
  }
  return undefined;
}

SDP.prototype.getInterlace = function (i) {
  if (i >= this.m.length) return undefined;
  if (this.m[i].a !== undefined && Array.isArray(this.m[i].a.fmtp)) {
    var hm = this.m[i].a.fmtp[0].match(/.*interlace=([01]).*/);
    if (hm) return +hm[1];
  }
  return undefined;
}

SDP.isSDP = function (x) {
  return x !== null &&
    typeof x === 'object' &&
    x.constructor === SDP.prototype.constructor;
}

/**
 * Create an SDP file from connection, media type and extension schemd details.
 * @param  {Object} connection Object with properties describing the stream
 *                             connection, including address, port, ttl, netif
 *                             (the network interface the multicast address is
 *                             bound to) and payloadType.
 * @param  {Object} mediaType  Object with properties that describe the media type
 *                             of the stream. Must include clockRate, encodingName
 *                             and format.
 * @param  {Object} exts       Object defining the schema for RTP header extensions,
 *                             with timecode rate and reference clock identifier.
 *                             Properties include: origin_timestamp_id, smpte_tc_id,
 *                             smpte_tc_param, flow_id_id, source_id_id,
 *                             grain_flags_id, sync_timestamp_id, grain_duration_id,
 *                             ts_refclk.
 * @param  {Number=} tsOffset  Media clock direct parameter that described the
 *                             RTP timestamp offset for the stream.
 * @return {SDP}               [description]
 */
SDP.makeSDP = function (connection, mediaType, exts, tsOffset) {
  function getParam(name) {
    return (mediaType[name]) ? `${name}=${mediaType[name][0]}; ` : '';
  }
  if (!connection && !mediaType && !exts)
    return new Error('Connection details, media type details and extension schema ' +
      'must be provided to make an SDP file.');
  var dateNow = Date.now();
  var netif = connection.netif ? connection.netif : Net.getFirstRealIP4Interface();
  netif = typeof netif !== 'string' ?
    (typeof netif === 'object' ? netif.address : '127.0.0.1') : netif;
  tsOffset = typeof tsOffset === 'number' ? tsOffset >>> 0 : 0;
  var fmtp = (mediaType.format[0] === 'video') ?
    `a=fmtp:${connection.payloadType} ${getParam('sampling')}${getParam('width')}` +
    `${getParam('height')}${getParam('depth')}${getParam('colorimetry')}` +
    `${getParam('interlace')}`.slice(0, -2) + '\n' : '';
  var channels = (mediaType.format[0] === 'audio') ? `/${mediaType.channels[0]}` : '';
  var ttl = Net.isMulticast(connection.address) ? `/${connection.ttl}` : '';
  var sdp = `v=0
  o=- ${dateNow} ${dateNow} IN IP4 ${netif}
  s=Dynamorse NMOS Stream
  t=0 0
  m=${mediaType.format[0]} ${connection.port} RTP/AVP ${connection.payloadType}
  c=IN IP4 ${connection.address}${ttl}
  a=source-filter:incl IN IP4 ${connection.address} ${netif}
  a=rtpmap:${connection.payloadType} ${mediaType.encodingName}/${mediaType.clockRate}${channels}
  ${fmtp}a=mediaclk:direct=${tsOffset} rate=${mediaType.clockRate}
  a=extmap:${exts.origin_timestamp_id} urn:x-nmos:rtp-hdrext:origin-timestamp
  a=extmap:${exts.smpte_tc_id} urn:ietf:params:rtp-hdrext:smpte-tc ${exts.smpte_tc_param}
  a=extmap:${exts.flow_id_id} urn:x-nmos:rtp-hdrext:flow-id
  a=extmap:${exts.source_id_id} urn:x-nmos:rtp-hdrext:source-id
  a=extmap:${exts.grain_flags_id} urn:x-nmos:rtp-hdrext:grain-flags
  a=extmap:${exts.sync_timestamp_id} urn:x-nmos:rtp-hdrext:sync-timestamp
  a=extmap:${exts.grain_duration_id} urn:x-nmos:rtp-hdrext:grain-duration
  a=ts-refclk:${exts.ts_refclk}`
  return new SDP(sdp);
}

module.exports = SDP;
