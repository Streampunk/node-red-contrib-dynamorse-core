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

const cableTypes = [ 'video', 'audio', 'anc', 'other' ];

function makeNMOSTags (t) {
  var n = {};
  Object.keys(t).forEach(k => {
    switch (typeof t[k]) {
      case 'string': n[k] = [ t[k] ]; break;
      case 'number': n[k] = [ `${t[k]}` ]; break;
      case 'object':
        if (Array.isArray(t[k]) && t[k].length === 2 &&
            typeof t[k][0] === 'number' && typeof t[k][1] === 'number') {
          n[k] = [ `${t[k][0]}/${t[k][1]}` ];
        } else {
          n[k] = (t[k]) ? [ t[k].toString() ] : [];
        }
        break;
      case 'boolean':
        n[k] = (t[k] === true) ? [ '1' ] : [ '0' ];
        break;
      case 'undefined':
      case 'null':
        break;
      default:
        n[k] = [ t[k].toString() ]; break;
    };
  });
  return n;
}

function makeDynamorseTags (t) {
  var d = {};
  Object.keys(t)
  .filter(k => Array.isArray(t[k]) && t[k].length > 0)
  .forEach(k => {
    if (k === 'interlace') { d[k] = (t[k][0] === '1'); return; }
    d[k] = +t[k][0];
    if (isNaN(d[k])) {
      var r = t[k][0].match(/(\d+)\/(\d+)/);
      if (r) {
        d[k] = [+r[1], +r[2]];
      } else {
        d[k] = t[k][0];
      };
    };
  });
  return d;
}

const concat = (a, b) => a.concat(b);

function ledgerReg(node, c) {
  var nodeAPI = node.context().global.get('nodeAPI');
  var ledger = node.context().global.get('ledger');
  var localName = node.config.name || `${node.config.type}-${node.config.id}`;
  var localDescription = node.config.description || `${node.config.type}-${node.config.id}`;
  var pipelinesID = // node.config.device ? TODO: simplifying for now. Really whether a node is an edge node or not
    //RED.nodes.getNode(node.config.device).nmos_id :
    node.context().global.get('pipelinesID');

  var q = cableTypes.filter(t => c[t] && c[t].length > 0).map(t => {
    var p = [];
    for ( var x = 0 ; x < c[t].length ; x++ ) {
      var f = c[t][x];
      var name = (f.name) ? `${localName}-${f.name}` : `${localName}-${t}[${x}]`;
      var source = new ledger.Source(f.sourceID, null, name,
         `${localDescription} ${t} streams`,
         `urn:x-nmos:format:${f.tags.format}`, null, null, pipelinesID, null);
      var flow = new ledger.Flow(f.flowID, null, name, `${localDescription} ${t} stream ${x}`,
        `urn:x-nmos:format:${f.tags.format}`, makeNMOSTags(f.tags), f.sourceID, null);
      p.push(
        nodeAPI.putResource(source) // TODO source may already exist
        .then(() => nodeAPI.putResource(flow))
        .then(() => { node.log(`Registered NMOS resources source ${source.id} and flow ${flow.id}.`)},
            err => { if (err) return node.warn(`Unable to register source and/or flow: ${err}`); })
      );
    };
    return p;
  });
  return Promise.all(q.reduce(concat));
}

module.exports = {
  register: ledgerReg,
  makeNMOSTags: makeNMOSTags,
  makeDynamorseTags: makeDynamorseTags
};
