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

var SDP = require('../model/SDP.js');
var url = require('url');
var http = require('http');
var fs = require('fs');
var makeDynamorseTags = require('./LedgerDiscovery.js').makeDynamorseTags;

var sdpToTags = function(sdp, config) {
  if (typeof sdp === 'string') {
    sdp = new SDP(sdp);
  }
  this.setTag('format', sdp, sdp.getMedia, config);
  this.setTag('encodingName', sdp, sdp.getEncodingName, config);
  this.setTag('clockRate', sdp, sdp.getClockRate, config);
  if (this.tags.format[0].endsWith('video')) {
    this.setTag('height', sdp, sdp.getHeight, config);
    this.setTag('width', sdp, sdp.getWidth, config);
    this.setTag('sampling', sdp, sdp.getSampling, config);
    this.setTag('depth', sdp, sdp.getDepth, config);
    this.setTag('colorimetry', sdp, sdp.getColorimetry, config);
    this.setTag('interlace', sdp, sdp.getInterlace, config);
    this.tags.packing = [ 'pgroup' ]; // default
    this.setTag('packing', sdp, undefined, config);
  } else if (this.tags.format[0].endsWith('audio')) {
    this.setTag('channels', sdp, sdp.getEncodingParameters, config);
  }
  // console.log(this.tags);
  this.sdpToExt(sdp);
  this.sdp = sdp;
  return this.tags;
};

var setTag = function (name, sdp, valueFn, config) {
  if (!name) return;
  var value = (valueFn) ? valueFn.call(sdp, 0) : undefined;
  if (value === undefined) {
    value = config[name];
    if (value === undefined) {
      this.warn(`Did not set property ${name} as it is not defined by SDP or config.`);
      return;
    }
  }
  if (typeof value === 'number') {
    this.tags[name] = [ `${value}` ];
  } else if (typeof value === 'string') {
    this.tags[name] = [ value ];
  } else if (typeof value === 'boolean') {
    this.tags[name] = value ? [ '1' ] : [ '0' ];
  } else {
    this.warn(`Cannot set property ${name} because value is of unsupported type ${typeof value}.`);
  }
};

var sdpURLReader = function (config, cb) {
  var self = this;
  var sdpUrl = config.sdpURL;
  if (!sdpUrl || typeof sdpUrl !== 'string' || sdpUrl.length === 0)
    return cb(null, self.sdpToTags({}, config));
  var sdpDetails = url.parse(sdpUrl);
  if (sdpDetails.protocol.startsWith('file')) {
    return fs.readFile(sdpDetails.path, 'utf8', (err, data) => {
      if (err) return cb(err);
      else return cb(null, self.sdpToTags(data, config));
    });
  } else if (sdpDetails.protocol.startsWith('http:')) {
    http.get(sdpDetails.href, (res) => {
      var sdpData = '';
      if (res.statusCode !== 200) return cb(new Error(
        `SDP file request resulted in non-200 response code of ${res.status}.`));
      res.setEncoding('utf8');
      res.on('data', data => { sdpData += data; });
      res.on('end', () => {
        console.log('*** Aggregated SDP', sdpData);
        cb(null, self.sdpToTags(sdpData, config));
      });
    });
  } else {
    cb(new Error('Cannot read an SDP file with protocols other than http or file.'));
  }
};

var sdpToExt = function (sdp) {
  if (!SDP.isSDP(sdp)) return;
  var revExtMap = sdp.getExtMapReverse(0);
  this.exts = {}; // Don't overwrite defaults by accident
  this.exts.origin_timestamp_id = revExtMap['urn:x-nmos:rtp-hdrext:origin-timestamp'];
  this.exts.smpte_tc_id = revExtMap['urn:ietf:params:rtp-hdrext:smpte-tc'];
  this.exts.flow_id_id = revExtMap['urn:x-nmos:rtp-hdrext:flow-id'];
  this.exts.source_id_id = revExtMap['urn:x-nmos:rtp-hdrext:source-id'];
  this.exts.grain_flags_id = revExtMap['urn:x-nmos:rtp-hdrext:grain-flags'];
  this.exts.sync_timestamp_id = revExtMap['urn:x-nmos:rtp-hdrext:sync-timestamp'];
  this.exts.grain_duration_id = revExtMap['urn:x-nmos:rtp-hdrext:grain-duration'];
  this.exts.ts_refclk = sdp.getTimestampReferenceClock(0);
  this.exts.smpte_tc_param = sdp.getSMPTETimecodeParameters(0);
  return this.exts;
};

var sdpURLReaderDynamorse = function (config, cb) {
  sdpURLReader.call(this, config, (err, v) => {
    if (err) cb(err);
    else { 
      this.tags = makeDynamorseTags(v);
      cb(null, this.tags);
    }
  });
};

module.exports = {
  sdpToTags : sdpToTags,
  setTag : setTag,
  sdpURLReader : sdpURLReader,
  sdpURLReaderDynamorse : sdpURLReaderDynamorse,
  sdpToExt : sdpToExt,
  SDP: SDP
};
