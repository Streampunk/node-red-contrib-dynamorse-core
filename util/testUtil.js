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

var WebSocket = require('ws');
var test = require('tape');
var http = require('http');

var properties = {
  redPort: 1880,
  wsPort: 1888
};

function adminApiReq(t, method, path, payload, response, onError, cb) {
  var req = http.request({
    host: 'localhost',
    port : properties.redPort,
    path : path,
    method : method,
    headers : {
      'Content-Type' : 'application/json',
      'Content-Length' : payload.length
    }
  }, function (res) {
    var statusCode = res.statusCode;
    var contentType = res.headers['content-type'];

    t.equal(statusCode, response, "status code is Success")
    if (!((200 === statusCode) || (204 == statusCode))) {
      onError();
      return;
    }
    if (200 === statusCode)
      t.ok(/^application\/json/.test(contentType), "content type is application/json")

    res.setEncoding('utf8');
    var rawData = "";
    res.on('data', function (chunk) {
      rawData += chunk;
    });
    res.on('end', function () {
      cb((204 === statusCode)?null:JSON.parse(rawData));
    });
  }).on("error", function(e) {
    t.fail(`problem with admin API '${method}' request to path '${path}': ${e.message}`);
    onError();
  });

  req.write(payload);
  req.end();
}

function deleteFlow(t, flowId, cb) {
  t.comment('Delete test flow');
  var testFlowDel = `{"id" : "${flowId}"}`;
  adminApiReq(t, 'DELETE', `/flow/${flowId}`, testFlowDel, 204, cb, function(res) {
    cb();
  });
}

function postFlow(t, params, getFlow, wss, onMsg, done) {
  adminApiReq(t, 'POST', '/flow', JSON.stringify(getFlow(params)), 200, done, function(res) {
    t.ok(res.id, 'response has flow id');

    params.count = 0;
    var lastCount = -1;
    var endReceived = false;
    var doneClosedown = false;

    function checkCompleted(t, flowId, onComplete) {
      if (doneClosedown) {
        onComplete();
      } else if (params.count === lastCount) {
        t.comment('Check for correct closedown');
        t.ok(endReceived, 'end message has been received');
        t.ok(doneClosedown, 'closedown has been completed');
        deleteFlow(t, flowId, function() {
          onComplete();
        });
      }
      lastCount = params.count;
    }

    wss.on('connection', function(ws) {
      t.equal(ws.readyState, WebSocket.OPEN, 'websocket connection is open');
      t.comment('Check for expected data from flow');
      ws.on('message', function(msg) {
        //t.comment(`Message: ${msg}`);
        var msgObj = JSON.parse(msg);
        onMsg(t, params, msgObj, function() {
          endReceived = true;
          deleteFlow(t, res.id, function() {
            doneClosedown = true;
          });
        });
        if (msgObj.hasOwnProperty('close'))
          ws.close();
      });
    });

    var id = setInterval(checkCompleted, 100, t, res.id, function() {
      clearInterval(id);
      done();
    });
  });
}

function nodeRedTest(description, params, getFlow, onMsg) {
  test(description, function (t) {
    var server = http.createServer(function(req, res){});
    server.listen(properties.wsPort, 'localhost', function() {
      t.pass(`server is listening on port ${properties.wsPort}`);

      wss = new WebSocket.Server({ server: server });
      wss.on('error', function (error) {
        t.fail(`websocket server error: '${error}'`);
      });

      postFlow(t, params, getFlow, wss, onMsg, function() {
        wss.close(function(err) {
          t.notOk(err, err?err:"websocket server closed OK");
          server.close(function(err) {
            t.notOk(err, err?err:"http server closed OK");
            t.end();
          });
        });
      });
    });
  });
}

var testFlowId = "91ad451.f6e52b8";

var testNodes = {
  baseTestFlow: JSON.stringify({
    "id": `${testFlowId}`,
    "label": "Test Flow",
    "nodes": []
  }),
  funnelTestNode: JSON.stringify({
    "type": "funnelGen",
    "z": `${testFlowId}`,
    "name": "funnel",
    "delay": 0,
    "start": 0,
    "end": 1,
    "repeat": false,
    "maxBuffer": 10,
    "wsPort": `${properties.wsPort}`,
    "x": 100.0,
    "y": 100.0,
    "wires": [[]]
  }),
  valveTestNode: JSON.stringify({
    "type": "valveTest",
    "z": `${testFlowId}`,
    "name": "valve",
    "maxBuffer": 10,
    "multiplier": 1,
    "x": 300.0,
    "y": 100.0,
    "wires": [[]]
  }),
  spoutTestNode: JSON.stringify({
    "type": "spoutTest",
    "z": `${testFlowId}`,
    "name": "spout",
    "timeout":0,
    "x":500.0,
    "y":100.0,
    "wires":[[]]
  })
}

module.exports = {
  nodeRedTest: nodeRedTest,
  testNodes: testNodes
};