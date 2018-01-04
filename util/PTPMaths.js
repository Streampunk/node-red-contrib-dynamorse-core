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

const Grain = require('../model/Grain.js');

function msOriginTs (b) {
  if (Grain.isGrain(b)) { b = b.ptpOrigin; }
  return (b.readUIntBE(0, 6) * 1000) +
    (b.readUInt32BE(6) / 1000000|0);
}

function extractVersions(v) {
  if (Grain.isGrain(v)) { v = v.ptpOrigin; }
  var m = v.match(/^([0-9]+):([0-9]+)$/);
  if (m === null) { return [Number.MAX_SAFE_INTEGER, 0]; }
  return [+m[1], +m[2]];
}

function compareVersions(l, r) {
  var lm = extractVersions(l);
  var rm = extractVersions(r);
  if (lm[0] < rm[0]) return -1;
  if (lm[0] > rm[0]) return 1;
  if (lm[1] < rm[1]) return -1;
  if (lm[1] > rm[1]) return 1;
  return 0;
}

function versionToMs (v) {
  var e = extractVersions(v);
  if (e[0] === Number.MAX_SAFE_INTEGER) return e[0];
  return (e[0] * 1000) + (e[1] / 1000000|0);
}

function versionDiffMs (smaller, bigger) {
  var smMs = versionToMs(smaller);
  var bgMs = versionToMs(bigger);
  if (smMs === Number.MAX_SAFE_INTEGER || bgMs === Number.MAX_SAFE_INTEGER) return 0;
  return bgMs - smMs;
}


module.exports = {
  msOriginTs,
  extractVersions,
  compareVersions,
  versionToMs,
  versionDiffMs
};
