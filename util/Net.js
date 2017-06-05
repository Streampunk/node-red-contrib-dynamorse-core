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

var getFirstRealIP4Interface = function() {
  var ifaces = require('os').networkInterfaces();
  var bumpy =  Object.keys(ifaces).map(function (iname) {
    var iface = ifaces[iname]; return iface.map(function (x) {
      x.ifname = iname; return x;
    });
  });
  var flatter = Array.prototype.concat.apply([], bumpy);
  return flatter.find(function (x) { return x.family === 'IPv4' && !x.internal; });
}

var isMulticast = function (addr) {
  var check = addr.match(/([0-2]?[0-9]?[0-9])\./);
  if (check) {
    return +check[1] >= 224 && +check[1] <= 239;
  }
  return false;
}

module.exports = {
  getFirstRealIP4Interface : getFirstRealIP4Interface,
  isMulticast : isMulticast
};
