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

// Reactive streams library for Node-RED nodes.

var Queue = require('fastqueue');
var dgram = require('dgram');
var util = require('util');
var H = require('highland');
var webSock = require('./webSock.js').webSock;

var hostname = require('os').hostname();
var pid = process.pid;
var influx = '192.168.99.100';

function End() { }

End.prototype.toString = function () { return 'End'; };
var isEnd = function (x) {
  return x !== null &&
    typeof x === 'object' &&
    x.constructor === End.prototype.constructor;
}
var theEnd = new End;

var setStatus = function (fill, shape, text) {
  // console.log('***', arguments);
  if (this.nodeStatus !== text && this.nodeStatus !== 'done') {
    this.status({ fill : fill, shape : shape, text: text});
    this.nodeStatus = text;
  }
}

var nodeCount = 0;

function webSockMsg(node, ws, src) {
  this.node = node;
  this.src = src;
  this.ws = ws;
}
webSockMsg.prototype.send = function(obj) {
  //console.log(`Send: ${this.src}, ${JSON.stringify(obj)}`);
  obj.src = this.src;
  if (this.ws)
    this.ws.send(this.node, obj);
}

function safeStatString (s) {
  // console.log('+++', s);
  return s.replace(/\W/g, '_');
}

function Funnel (config) {
  var queue = new Queue;
  var wireCount = config.wires[0].length;
  var pending = config.wires[0];
  var node = this;
  this.nodeStatus = "";
  this.setStatus = setStatus.bind(this);
  var workTimes = [];
  var paused = false;
  var logger = this.context().global.get('logger');
  var ws = this.context().global.get('ws');

  // console.log('***', util.inspect(this.setStatus, { showHidden: true }));
  node.setStatus('grey', 'ring', 'initialising');
  var maxBuffer = 10;
  if (config.maxBuffer && typeof config.maxBuffer === 'string')
    config.maxBuffer = +config.maxBuffer;
  if (config.maxBuffer && typeof config.maxBuffer === 'number' && config.maxBuffer > 0)
    maxBuffer = config.maxBuffer|0;

  if (!ws) {
    var wsPort = 0;
    if (config.wsPort && typeof config.wsPort === 'string')
      config.wsPort = +config.wsPort;
    if (config.wsPort && typeof config.wsPort === 'number' && config.wsPort > 0)
      wsPort = config.wsPort|0;
    ws = new webSock(node, wsPort);
    this.context().global.set('ws', ws);
  }
  this.wsMsg = new webSockMsg(node, ws, config.name||"funnel");

  var pull = id => {
    node.log(`Pull received with id ${id}, queue length ${queue.length}, pending ${JSON.stringify(pending)}`);
    if (pending.indexOf(id) < 0) pending.push(id);
    if ((queue.length > 0) && (pending.length === wireCount)) {
      pending = [];
      var payload = queue.shift();
      if (!isEnd(payload))
        node.wsMsg.send({"pull": payload});
      var message = Buffer.from(`punkd value=${payload}`)
      logger.send(message);
      if (isEnd(payload)) {
        work = () => { }
        next = () => {
          node.setStatus('grey', 'ring', 'done');
        };
        node.setStatus('grey', 'ring', 'done');
      };
      node.send({
        payload : payload,
        error : null,
        pull : pull
      });
    }
    if (paused && queue.length < 0.5 * maxBuffer) {
      node.wsMsg.send({"resume": queue.length});
      node.log("Resuming.");
      paused = false;
      next();
    };
  };
  var push = (err, val) => {
    if (err) {
      node.log(`Push received with error '${err}', queue length ${queue.length}, pending ${JSON.stringify(pending)}`);
      node.setStatus('red', 'dot', 'error');
      node.wsMsg.send({"error": err});
      node.send({
        payload : null,
        error : err,
        pull : pull
      });
    } else {
      node.log(`Push received with value ${val}, queue length ${queue.length}, pending ${JSON.stringify(pending)}`);
      if (queue.length <= maxBuffer) {
        // node.log(queue);
        if (!isEnd(val))
          node.wsMsg.send({"push": val});
        queue.push(val);
      } else {
        node.wsMsg.send({"drop": val});
        node.warn(`Dropping value ${val} from buffer as maximum length of ${maxBuffer} exceeded.`);
      }

      if (pending.length === wireCount) {
        var payload = queue.shift();
        node.log(`Sending ${payload} with pending ${JSON.stringify(pending)}.`);
        if (isEnd(val))
          node.wsMsg.send({"end": 0});
        else
          node.wsMsg.send({"send": payload});
        pending = [];
        var message = Buffer.from(`punkd value=${payload}`)
        logger.send(message);
        if (isEnd(payload)) {
          work = () => { }
          next = () => {
            node.setStatus('grey', 'ring', 'done');
          };
          node.setStatus('grey', 'ring', 'done');
        };
        node.send({
          payload : payload,
          error : null,
          pull : pull
        });
      };
      if (queue.length >= maxBuffer) {
        node.setStatus('red', 'dot', 'overflow');
      } else if (queue.length >= 0.75 * maxBuffer) {
        node.setStatus('yellow', 'dot', '75% full');
      } else {
        node.setStatus('green', 'dot', 'generating');
      }
    } // });
  };
  this.eventMuncher = (emitter, event, map) => {
    emitter.on(event, value => {
      if (map) value = map(value);
      push(null, value);
      next();
    });
  };
  var workStart = null;
  var next = () => {
    if (workStart) { workTimes.push(process.hrtime(workStart)); }
    setImmediate(() => {
      if (queue.length < 0.8 * maxBuffer) {
        workStart = process.hrtime();
        node.wsMsg.send({"work": queue.length});
        work(push, next);
      } else {
        node.wsMsg.send({"pause": queue.length});
        paused = true;
        node.log("Pausing.");
      }
    });
  };
  var work = () => { };
  this.generator = cb => {
    work = cb;
    node.setStatus('green', 'dot', 'generating');
    ws.open(() => { next(); });
  }
  var highlandStream = null;
  this.highland = stream => {
    ws.open(() => {
      highlandStream = stream.consume((err, x, hpush, hnext) => {
        if (err) {
          push(err);
          hnext();
        } else if (x === H.nil) {
          hpush (null, H.nil);
        } else {
          if (workStart) { workTimes.push(process.hrtime(workStart)); }
          push(null, x);
          workStart = process.hrtime();
          if (queue.length > 0.8 * maxBuffer) {
            node.wsMsg.send({"pause": queue.length});
            paused = true;
            next = () => { node.log('Resuming highland.'); hnext(); };
            node.log('Pausing highland.')
          } else {
            hnext();
          }
        }
      })
      .done(() => { push(null, theEnd); });
    });
    node.setStatus('green', 'dot', 'generating');
  }
  this.preFlightError = (e) => {
    node.error(`Preflight error: ${e.message}.`);
    push(e);
    node.setStatus('red', 'ring', 'preflight fail');
    next = () => {
      node.setStatus('red', 'ring', 'preflight fail');
    };
  }
  var configName = safeStatString(node.type + (nodeCount++));
  var nodeType = safeStatString(node.type);
  // Send stats every second
  var metrics = setInterval(() => {
    var measuredTimes = workTimes;
    workTimes = [];
    var sum = measuredTimes.reduce((prev, curr) =>
        prev + curr[0] * 1000000000 + curr[1], 0);
    var average = (measuredTimes.length === 0) ? 0 : sum / measuredTimes.length|0;
    var message = Buffer.from(
      `grainFlow,host=${hostname},pid=${pid},redioType=funnel,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${measuredTimes.length}\n` +
      `nodeWorkAvg,host=${hostname},pid=${pid},redioType=funnel,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${average}\n` +
      `bufferLength,host=${hostname},pid=${pid},redioType=funnel,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${queue.length}`);
    // console.log('Sending stats', message.toString());
    logger.send(message);
    // this.context().global.get('logger').send(message);
  }, 1000);
  this.close = done => { // done is undefined :-(
    node.setStatus('yellow', 'ring', 'closing');
    next = () => {
      node.setStatus('grey', 'ring', 'closed');
    }
    setTimeout(() => { clearInterval(metrics); }, 2000);
  }
}

function Valve (config) {
  var queue = new Queue;
  var wireCount = config.wires[0].length;
  var pending = config.wires[0];
  var node = this;
  var logger = this.context().global.get('logger');
  var ws = this.context().global.get('ws');
  if (!ws) {
    var wsPort = 0;
    if (config.wsPort && typeof config.wsPort === 'string')
      config.wsPort = +config.wsPort;
    if (config.wsPort && typeof config.wsPort === 'number' && config.wsPort > 0)
      wsPort = config.wsPort|0;
    ws = new webSock(node, wsPort);
    this.context().global.set('ws', ws);
  }
  this.wsMsg = new webSockMsg(node, ws, config.name||"valve");

  this.nodeStatus = "";
  this.setStatus = setStatus.bind(this);
  var workTimes = [];
  var paused = [];
  node.setStatus('grey', 'ring', 'initialising');
  var maxBuffer = 10;
  if (config.maxBuffer && typeof config.maxBuffer === 'string')
    config.maxBuffer = +config.maxBuffer;
  if (config.maxBuffer && typeof config.maxBuffer === 'number' && config.maxBuffer > 0)
    maxBuffer = config.maxBuffer|0;

  var pull = id => {
    node.log(`Pull received with id ${id}, queue length ${queue.length}, pending ${JSON.stringify(pending)}`);
    if (pending.indexOf(id) < 0) pending.push(id);
    if ((queue.length > 0) && (pending.length === wireCount)) {
      pending = [];
      var payload = queue.shift();
      if (isEnd(payload)) {
        work = () => { };
        next = () => {
          node.setStatus('grey', 'ring', 'done');
        };
        node.setStatus('grey', 'ring', 'done');
      } else
        node.wsMsg.send({"pull": payload});
      node.send({
        payload : payload,
        error : null,
        pull : pull
      });
    }
    if (paused.length > 0 && queue.length < 0.5 * maxBuffer) {
      node.wsMsg.send({"resume": queue.length});
      node.log("Resuming.");
      var resumePull = paused;
      paused = [];
      resumePull.forEach(p => {
        setImmediate(() => { p(node.id); }); });
    };
  };
  var push = (err, val) => {
    node.log(`Push received with value ${val}, queue length ${queue.length}, pending ${JSON.stringify(pending)}`);
    if (err) {
      node.setStatus('red', 'dot', 'error');
      node.wsMsg.send({"error": err});
      node.send({
        payload : null,
        error : err,
        pull : pull
      });
    } else {
      if (queue.length <= maxBuffer) {
      //  node.log(queue);
        if (isEnd(val))
          node.wsMsg.send({"end": 0});
        else
          node.wsMsg.send({"push": val});
        queue.push(val);
      } else {
        node.wsMsg.send({"drop": val});
        node.warn(`Dropping value ${val} from buffer as maximum length of ${maxBuffer} exceeded.`);
      }

      if (pending.length === wireCount) {
        var payload = queue.shift();
        node.log(`Sending ${payload} with pending ${JSON.stringify(pending)}.`);
        pending = [];
        if (isEnd(payload)) {
          work = () => { };
          next = () => {
            node.setStatus('grey', 'ring', 'done');
          };
          node.setStatus('grey', 'ring', 'done');
        };
        node.send({
          payload : payload,
          error : null,
          pull : pull
        });
      };

      if (queue.length > maxBuffer) {
        node.setStatus('red', 'dot', 'overflow');
        node.warn(`Queue length ${queue.length}`);
      } else if (queue.length >= 0.75 * maxBuffer) {
        node.setStatus('yellow', 'dot', '75% full');
      } else {
        node.setStatus('green', 'dot', 'running');
      }
    }
  };
  var next = function (msg) {
    var startTime = process.hrtime();
    if (isEnd(msg.payload))
      return () => { };
    return () => {
      workTimes.push(process.hrtime(startTime));
      if (queue.length > 0.8 * maxBuffer) {
        paused.push(msg.pull);
        node.wsMsg.send({"pause": queue.length});
        node.log("Pausing.");
      } else {
        setImmediate(() => { msg.pull(node.id) });
      };
    };
  };
  this.on('input', msg => {
    if (msg.error) {
      node.wsMsg.send({"error": msg.error});
      work(msg.error, null, push, next(msg));
    } else {
      work(null, msg.payload, push, next(msg));
    }
  });
  var work = () => {
    node.warn('Empty work function called.');
  };
  this.consume = cb => {
    work = cb;
    node.setStatus('green', 'dot', 'running');
  }
  this.getNMOSFlow = (grain, cb) => {
    var nodeAPI = node.context().global.get('nodeAPI');
    var flow_id = require('uuid').unparse(grain.flow_id);
    nodeAPI.getResource(flow_id, 'flow', cb);
  }
  var configName = safeStatString(node.type + (nodeCount++));
  var nodeType = safeStatString(node.type);
  // Send stats every second
  var metrics = setInterval(() => {
    var measuredTimes = workTimes;
    workTimes = [];
    var sum = measuredTimes.reduce((prev, curr) =>
      prev + curr[0] * 1000000000 + curr[1], 0);
    var average = (measuredTimes.length === 0) ? 0 : sum / measuredTimes.length|0;
    var message = Buffer.from(
      `grainFlow,host=${hostname},pid=${pid},redioType=valve,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${measuredTimes.length}\n` +
      `nodeWorkAvg,host=${hostname},pid=${pid},redioType=valve,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${average}\n` +
      `bufferLength,host=${hostname},pid=${pid},redioType=valve,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${queue.length}\n`);
      // console.log('Sending stats', message.toString());
    logger.send(message);
  }, 1000);
  this.close = done => { // done is undefined :-(
    node.setStatus('yellow', 'ring', 'closing');
    next = () => {
      node.setStatus('grey', 'ring', 'closed');
    }
    setTimeout(() => { clearInterval(metrics); }, 2000);
  }
}

function Spout (config) {
  var node = this;
  var logger = this.context().global.get('logger');
  var ws = this.context().global.get('ws');
  if (!ws) {
    var wsPort = 0;
    if (config.wsPort && typeof config.wsPort === 'string')
      config.wsPort = +config.wsPort;
    if (config.wsPort && typeof config.wsPort === 'number' && config.wsPort > 0)
      wsPort = config.wsPort|0;
    ws = new webSock(node, wsPort);
    this.context().global.set('ws', ws);
  }
  this.wsMsg = new webSockMsg(node, ws, config.name||"spout");
  var numStreams = config.numStreams||1;
  var numEnds = 0;

  var eachFn = null;
  var doneFn = () => { };
  var errorFn = (err, n) => { // Default error handler shuts the pipeline
    node.wsMsg.send({"error": err});
    node.error(`Unhandled error ${err.toString()}.`);
    doneFn = () => { };
    eachFn = null;
  }
  this.nodeStatus = "";
  this.setStatus = setStatus.bind(this);
  node.setStatus('grey', 'ring', 'initialising');
  var workTimes = [];
  this.each = f => {
    eachFn = f;
    node.setStatus('green', 'dot', 'consuming');
  };
  this.errors = ef => {
    errorFn = ef;
  }
  this.done = f => {
    doneFn = f;
  };
  var next = msg => {
    var startTime = process.hrtime();
    return () => {
      workTimes.push(process.hrtime(startTime));
      setImmediate(() => {
        node.wsMsg.send({"pull": node.id});
        msg.pull(node.id);
      });
    };
  };
  this.on('input', msg => {
    if (msg.error) {
      node.setStatus('red', 'dot', 'error');
      errorFn(msg.error, next(msg));
    } else if (isEnd(msg.payload)) {
      numEnds++;
      if (numEnds === numStreams) {
        node.wsMsg.send({"end": 0});
        node.setStatus('grey', 'ring', 'done');
        var execDone = doneFn;
        doneFn = () => { };
        eachFn = null;
        execDone();
      }
    } else {
      if (eachFn) {
        node.wsMsg.send({"receive": msg.payload});
        eachFn(msg.payload, next(msg));
      }
    }
  });
  this.getNMOSFlow = (grain, cb) => {
    var nodeAPI = node.context().global.get('nodeAPI');
    var flow_id = require('uuid').unparse(grain.flow_id);
    nodeAPI.getResource(flow_id, 'flow', cb);
  }

  var configName = safeStatString(node.type + (nodeCount++));
  var nodeType = safeStatString(node.type);
  // Send stats every second
  var metrics = setInterval(() => {
    var measuredTimes = workTimes;
    workTimes = [];
    var sum = measuredTimes.reduce((prev, curr) =>
        prev + curr[0] * 1000000000 + curr[1], 0);
    var average = (measuredTimes.length === 0) ? 0 : sum / measuredTimes.length|0;
    var message = Buffer.from(
      `grainFlow,host=${hostname},pid=${pid},redioType=spout,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${measuredTimes.length}\n` +
      `nodeWorkAvg,host=${hostname},pid=${pid},redioType=spout,nodeType=${nodeType},nodeName=${configName},nodeID=${node.id} value=${average}`);
      // console.log('Sending stats', message.toString());
    logger.send(message);
  }, 1000);
  this.close = done => {
    node.wsMsg.send({"close": 0});
    if (ws) ws.close();
    ws = null;
    this.context().global.set('ws', null);
    setTimeout(() => { clearInterval(metrics) }, 2000);
  };
  this.preFlightError = e => {
    node.error(`Preflight error: ${e.message}.`);
    node.setStatus('red', 'ring', 'preflight fail');
    next = () => {
      node.setStatus('red', 'ring', 'preflight fail');
    }
  }
}

module.exports = {
  Funnel : Funnel,
  Valve : Valve,
  Spout : Spout,
  end : theEnd,
  isEnd : isEnd
};
