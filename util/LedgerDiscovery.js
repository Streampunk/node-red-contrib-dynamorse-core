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

function ledgerReg(node, c) {
  var nodeAPI = node.context().global.get('nodeAPI');
  var ledger = node.context().global.get('ledger');
  var localName = node.config.name || `${node.config.type}-${node.config.id}`;
  var localDescription = node.config.description || `${node.config.type}-${node.config.id}`;
  var pipelinesID = // node.config.device ? TODO: simplifying for now. Really whether a node is an edge node or not
    //RED.nodes.getNode(node.config.device).nmos_id :
    node.context().global.get('pipelinesID');

  cableTypes.filter(t => c[t] && c[t].length > 0).forEach(t => {
    for ( var x = 0 ; x < c[t].length ; x++ ) {
      var f = c[t][x];
      var name = (f.name) ? `${localName}-${f.name}` : `${localName}-${t}[${x}]`;
      var source = new ledger.Source(f.sourceID, null, name,
         `${localDescription}-${t}`,
         `urn:x-nmos:format:${f.tags.format}`, null, null, pipelinesID, null);
      var flow = new ledger.Flow(f.flowID, null, name, `${localDescription}-${t}`,
        `urn:x-nmos:format:${f.tags.format}`, null, f.sourceID, null); // TODO covert tags
      console.log('source', source, 'flow', flow);
      nodeAPI.putResource(source) // TODO source may already exist
        .then(() => nodeAPI.putResource(flow))
        .then(() => { node.log(`Registered NMOS resources source ${source.id} and flow ${flow.id}.`)},
              err => { if (err) return node.warn(`Unable to register source and/or flow: ${err}`); });
    };
  });
}

module.exports = ledgerReg;
