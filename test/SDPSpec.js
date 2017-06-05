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
var test = require('tape');

var audioSDP = `v=0
o=- 1443080730 1443080730 IN IP4 172.29.80.68
s=IP Studio Stream
t=0 0
m=audio 5000 RTP/AVP 96
c=IN IP4 232.226.253.166/32
a=source-filter:incl IN IP4 232.226.253.166 172.29.80.68
a=rtpmap:96 L24/48000/2
a=control:trackID=1
a=mediaclk:direct=1970351840 rate=48000
a=extmap:1 urn:x-nmos:rtp-hdrext:origin-timestamp
a=extmap:2 urn:ietf:params:rtp-hdrext:smpte-tc 1920@48000/25
a=extmap:3 urn:x-nmos:rtp-hdrext:flow-id
a=extmap:4 urn:x-nmos:rtp-hdrext:source-id
a=extmap:5 urn:x-nmos:rtp-hdrext:grain-flags
a=extmap:7 urn:x-nmos:rtp-hdrext:sync-timestamp
a=extmap:9 urn:x-nmos:rtp-hdrext:grain-duration
a=ts-refclk:ptp=IEEE1588-2008:ec-46-70-ff-fe-00-42-c4`;

test('An audio SDP file is parsed', function (t) {
  var sdp = new SDP(audioSDP);
  // console.log(JSON.stringify(sdp, null, 2));
  t.deepEqual(sdp.getMediaHeaders(), [ 'audio 5000 RTP/AVP 96'] );
  t.equal(sdp.getExtMapReverse(0)['urn:ietf:params:rtp-hdrext:smpte-tc'], 2,
    'and does a correct reverse lookup on extmap.');
  t.equal(sdp.toString().trim(), audioSDP, 'and roundtrips.');
  t.equal(sdp.getEncodingName(0), 'L24', 'retrieves correct encoding name.');
  t.end();
});

var videoSDP = `v=0
o=- 1443716955 1443716955 IN IP4 172.29.82.50
s=IP Studio Stream
t=0 0
m=video 5000 RTP/AVP 96
c=IN IP4 232.121.83.127/32
a=source-filter:incl IN IP4 232.121.83.127 172.29.82.50
a=rtpmap:96 raw/90000
a=fmtp:96 sampling=YCbCr-4:2:2; width=1920; height=1080; depth=10; colorimetry=BT709-2; interlace=1
a=mediaclk:direct=1119082333 rate=90000
a=extmap:1 urn:x-nmos:rtp-hdrext:origin-timestamp
a=extmap:2 urn:ietf:params:rtp-hdrext:smpte-tc 3600@90000/25
a=extmap:3 urn:x-nmos:rtp-hdrext:flow-id
a=extmap:4 urn:x-nmos:rtp-hdrext:source-id
a=extmap:5 urn:x-nmos:rtp-hdrext:grain-flags
a=extmap:7 urn:x-nmos:rtp-hdrext:sync-timestamp
a=extmap:9 urn:x-nmos:rtp-hdrext:grain-duration
a=ts-refclk:ptp=IEEE1588-2008:ec-46-70-ff-fe-00-42-c4`;

test('A video SDP file is parsed', function(t) {
  var sdp = new SDP(videoSDP);
  // console.log(JSON.stringify(sdp, null, 2));
  t.deepEqual(sdp.getMediaHeaders(), [ 'video 5000 RTP/AVP 96' ],
    'has correct media headers');
  t.equal(sdp.getExtMapReverse(0)['urn:x-nmos:rtp-hdrext:sync-timestamp'],
    7, 'does a correct reverse lookup on ext map.');
  t.equal(sdp.toString().trim(), videoSDP, 'and roundtrips.');
  t.equal(sdp.getEncodingName(0), 'raw', 'retrieves correct encoding name.');
  t.end();
});

var mixedSDP = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=IP Studio AVCI RTP Test Stream
c=IN IP4 239.255.1.1
t=0 0
a=tool:sbrtp_send
m=video 5004 RTP/AVP 98
a=rtpmap:98 H264/90000
a=fmtp:98 profile-level-id=7a1029;packetization-mode=1
a=ts-refclk:ptp=IEEE1588-2008:39-A7-94-FF-FE-07-CB-D0
a=mediaclk:direct=1909987554
a=extmap:2 urn:ietf:params:rtp-hdrext:smpte-tc 3600@90000/25
a=extmap:7 urn:x-nmos:rtp-hdrext:sync-timestamp
a=extmap:8 urn:x-nmos:rtp-hdrext:origin-timestamp
a=extmap:9 urn:x-nmos:rtp-hdrext:flow-id
a=extmap:10 urn:x-nmos:rtp-hdrext:source-id
a=extmap:11 urn:x-nmos:rtp-hdrext:grain-flags
a=extmap:12 urn:x-nmos:rtp-hdrext:grain-duration
m=audio 5006 RTP/AVP 99
i=Channels 1-2
a=rtpmap:99 L16/48000/2
a=ts-refclk:ptp=IEEE1588-2008:39-A7-94-FF-FE-07-CB-D0
a=mediaclk:direct=1985293029
a=extmap:2 urn:ietf:params:rtp-hdrext:smpte-tc 1920@48000/25
a=extmap:7 urn:x-nmos:rtp-hdrext:sync-timestamp
a=extmap:8 urn:x-nmos:rtp-hdrext:origin-timestamp
a=extmap:9 urn:x-nmos:rtp-hdrext:flow-id
a=extmap:10 urn:x-nmos:rtp-hdrext:source-id
a=extmap:11 urn:x-nmos:rtp-hdrext:grain-flags
a=extmap:12 urn:x-nmos:rtp-hdrext:grain-duration`;

test('A mixed SDP file is parsed', function (t) {
  var sdp = new SDP(mixedSDP);
  t.deepEqual(sdp.getMediaHeaders(),
    [ 'video 5004 RTP/AVP 98', 'audio 5006 RTP/AVP 99' ],
    'has expected media headers.');
  t.equal(sdp.getExtMapReverse(1)['urn:x-nmos:rtp-hdrext:grain-flags'],
    11, 'does a correct reverse lookup on ext map.');
  t.equal(sdp.toString().trim(), mixedSDP, 'and roundtrips.');
  t.equal(sdp.getEncodingName(0), 'H264', 'has expected encoding name for video.');
  t.equal(sdp.getEncodingName(1), 'L16', 'has expected encoding name for audio.');
  t.end();
});

var exts = {
  origin_timestamp_id: 1,
  smpte_tc_id: 2,
  smpte_tc_param: '3600@90000/25',
  flow_id_id: 3,
  source_id_id: 4,
  grain_flags_id: 5,
  sync_timestamp_id: 7,
  grain_duration_id: 9,
  ts_refclk: 'ptp=IEEE1588-2008:dd-a9-3e-5d-c7-28-28-dc' };
var video_tags = {
  encodingName: [ 'raw' ],
  clockRate: [ '90000' ],
  sampling: [ 'YCbCr-4:2:2' ],
  width: [ '1920' ],
  height: [ '1080' ],
  depth: [ '10' ],
  colorimetry: [ 'BT709-2' ],
  interlace: [ '1' ],
  packing: [ 'pgroup' ],
  format: [ 'video' ] };
var connection = { address: '225.6.7.8', port: 5001, ttl: 127, payloadType: 96 };
var tsOffset = (Math.random() * 0xffffffff) >>> 0;

test('Creating a video SDP file', function (t) {
  var sdp = SDP.makeSDP(connection, video_tags, exts, tsOffset);
  t.ok(SDP.isSDP(sdp), 'is an SDP object.');
  t.ok(/-\s[0-9]+\s[0-9]+\sIN\sIP4\s([0-2]?[0-9]?[0-9]\.){3}([0-2]?[0-9]?[0-9])/.test(sdp.o),
    'has a matching origin line.');
  t.equal(sdp.s, 'Dynamorse NMOS Stream', 'has expected session name.');
  t.equal(sdp.t, '0 0', 'has expectd timing line.');
  t.equal(sdp.getMediaHeaders().length, 1, 'has one media record.');
  t.equal(sdp.getEncodingName(0), 'raw', 'has expected encoding name.');
  t.equal(sdp.getMedia(0), 'video', 'has expected media type.');
  t.equal(sdp.getClockRate(0), 90000, 'has expected clock rate.');
  t.equal(sdp.getEncodingParameters(0), undefined, 'has no encoding paramters, as expected.');
  t.equal(sdp.getPort(0), 5001, 'has the expected port.');
  t.equal(sdp.getPayloadType(0), 96, 'has the expected payload type.');
  t.equal(sdp.getConnectionAddress(0), '225.6.7.8', 'has the expected connection address.');
  t.equal(sdp.getConnectionTTL(0), 127, 'has the expected multicast TTL.');
  t.ok(/([0-2]?[0-9]?[0-9]\.){3}([0-2]?[0-9]?[0-9])/.test(sdp.getOriginUnicastAddress(0)),
    'has a reasonable origin unicast address.');
  t.equal(sdp.getClockOffset(0), tsOffset, 'has the expected clock offset.');
  t.equal(sdp.getTimestampReferenceClock(0), 'ptp=IEEE1588-2008:dd-a9-3e-5d-c7-28-28-dc',
    'has the expected timestamp reference clock.');
  t.equal(sdp.getSMPTETimecodeParameters(0), '3600@90000/25', 'has the expected timecode parameters.');
  var extMap = sdp.getExtMapReverse(0);
  Object.keys(exts).forEach(function (k) {
    if (k.endsWith('_id')) {
      var j = k.slice(0, -3).replace(/_/, '-');
      t.ok(Object.keys(extMap).some(x => x.indexOf(j) >= 0),
        `extension map contains a key including ${j}.`);
      t.equal(extMap[Object.keys(extMap).find(x => x.indexOf(j) >= 0)],
        exts[k], `extension map has expected value for ${j}.`);
    };
  });
  t.equal(sdp.getWidth(0), 1920, 'has the expected width.');
  t.equal(sdp.getHeight(0), 1080, 'has the expected height.');
  t.equal(sdp.getInterlace(0), 1, 'has the expected interlace value.');
  t.equal(sdp.getColorimetry(0), 'BT709-2', 'has the expected colorimetry.');
  t.equal(sdp.getSampling(0), 'YCbCr-4:2:2', 'has the expected sampling.');
  t.equal(sdp.getDepth(0), 10, 'has the expected depth.');
  t.end();
});

var audio_tags = {
  encodingName: [ "L24" ],
  clockRate: [ "48000" ],
  channels: [ "2" ],
  format: [ "audio" ]
};

test('Creating an audio SDP file', function (t) {
  connection = { address: '225.6.7.8', port: 5001, ttl: 127, payloadType: 96,
    netif: '192.192.192.192' };
  var sdp = SDP.makeSDP(connection, audio_tags, exts, tsOffset);
  t.ok(SDP.isSDP(sdp), 'is an SDP object.');
  t.ok(/-\s[0-9]+\s[0-9]+\sIN\sIP4\s([0-2]?[0-9]?[0-9]\.){3}([0-2]?[0-9]?[0-9])/.test(sdp.o),
    'has a matching origin line.');
  t.equal(sdp.s, 'Dynamorse NMOS Stream', 'has expected session name.');
  t.equal(sdp.t, '0 0', 'has expectd timing line.');
  t.equal(sdp.getMediaHeaders().length, 1, 'has one media record.');
  t.equal(sdp.getEncodingName(0), 'L24', 'has expected encoding name.');
  t.equal(sdp.getMedia(0), 'audio', 'has expected media type.');
  t.equal(sdp.getClockRate(0), 48000, 'has expected clock rate.');
  t.equal(sdp.getEncodingParameters(0), '2', 'has channels as encoding paramters.');
  t.equal(sdp.getPort(0), 5001, 'has the expected port.');
  t.equal(sdp.getPayloadType(0), 96, 'has the expected payload type.');
  t.equal(sdp.getConnectionAddress(0), '225.6.7.8', 'has the expected connection address.');
  t.equal(sdp.getConnectionTTL(0), 127, 'has the expected multicast TTL.');
  t.equal(sdp.getOriginUnicastAddress(0), '192.192.192.192',
    'has the expected origin unicast address.');
  t.equal(sdp.getClockOffset(0), tsOffset, 'has the expected clock offset.');
  t.equal(sdp.getTimestampReferenceClock(0), 'ptp=IEEE1588-2008:dd-a9-3e-5d-c7-28-28-dc',
    'has the expected timestamp reference clock.');
  t.equal(sdp.getSMPTETimecodeParameters(0), '3600@90000/25', 'has the expected timecode parameters.');
  var extMap = sdp.getExtMapReverse(0);
  Object.keys(exts).forEach(function (k) {
    if (k.endsWith('_id')) {
      var j = k.slice(0, -3).replace(/_/, '-');
      t.ok(Object.keys(extMap).some(x => x.indexOf(j) >= 0),
        `extension map contains a key including ${j}.`);
      t.equal(extMap[Object.keys(extMap).find(x => x.indexOf(j) >= 0)],
        exts[k], `extension map has expected value for ${j}.`);
    };
  });
  t.equal(sdp.getWidth(0), undefined, 'has undefined width.');
  t.equal(sdp.getHeight(0), undefined, 'has undefined height.');
  t.equal(sdp.getInterlace(0), undefined, 'has undefined interlace value.');
  t.equal(sdp.getColorimetry(0), undefined, 'has undefined colorimetry.');
  t.equal(sdp.getSampling(0), undefined, 'has undefined sampling.');
  t.equal(sdp.getDepth(0), undefined, 'has undefined depth.');
  t.end();
});

test('Create SDP with unicast address', function (t) {
  var uniConn = { address: '10.11.12.13', port: 5001, ttl : 7, payloadType: 96,
    netif: '192.192.192.192' };
  var sdp = SDP.makeSDP(uniConn, audio_tags, exts, tsOffset);
  t.ok(SDP.isSDP(sdp), 'is an SDP object.');
  t.equal(sdp.getConnectionAddress(0), '10.11.12.13', 'has the expected connection address.');
  t.equal(sdp.getConnectionTTL(0), undefined, 'has undefined multicast TTL.');
  t.end();
});
