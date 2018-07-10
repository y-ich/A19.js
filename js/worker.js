(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process){

var MACHINE_ID = Math.floor(Math.random() * 0xFFFFFF);
var index = ObjectID.index = parseInt(Math.random() * 0xFFFFFF, 10);
var pid = (typeof process === 'undefined' || typeof process.pid !== 'number' ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;

/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 */
var isBuffer = function (obj) {
  return !!(
  obj != null &&
  obj.constructor &&
  typeof obj.constructor.isBuffer === 'function' &&
  obj.constructor.isBuffer(obj)
  )
};

/**
 * Create a new immutable ObjectID instance
 *
 * @class Represents the BSON ObjectID type
 * @param {String|Number} arg Can be a 24 byte hex string, 12 byte binary string or a Number.
 * @return {Object} instance of ObjectID.
 */
function ObjectID(arg) {
  if(!(this instanceof ObjectID)) return new ObjectID(arg);
  if(arg && ((arg instanceof ObjectID) || arg._bsontype==="ObjectID"))
    return arg;

  var buf;

  if(isBuffer(arg) || (Array.isArray(arg) && arg.length===12)) {
    buf = Array.prototype.slice.call(arg);
  }
  else if(typeof arg === "string") {
    if(arg.length!==12 && !ObjectID.isValid(arg))
      throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");

    buf = buffer(arg);
  }
  else if(/number|undefined/.test(typeof arg)) {
    buf = buffer(generate(arg));
  }

  Object.defineProperty(this, "id", {
    enumerable: true,
    get: function() { return String.fromCharCode.apply(this, buf); }
  });
  Object.defineProperty(this, "str", {
    get: function() { return buf.map(hex.bind(this, 2)).join(''); }
  });
}
module.exports = ObjectID;
ObjectID.generate = generate;
ObjectID.default = ObjectID;

/**
 * Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
 *
 * @param {Number} time an integer number representing a number of seconds.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromTime = function(time){
  time = parseInt(time, 10) % 0xFFFFFFFF;
  return new ObjectID(hex(8,time)+"0000000000000000");
};

/**
 * Creates an ObjectID from a hex string representation of an ObjectID.
 *
 * @param {String} hexString create a ObjectID from a passed in 24 byte hexstring.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromHexString = function(hexString) {
  if(!ObjectID.isValid(hexString))
    throw new Error("Invalid ObjectID hex string");

  return new ObjectID(hexString);
};

/**
 * Checks if a value is a valid bson ObjectId
 *
 * @param {String} objectid Can be a 24 byte hex string or an instance of ObjectID.
 * @return {Boolean} return true if the value is a valid bson ObjectID, return false otherwise.
 * @api public
 *
 * THE NATIVE DOCUMENTATION ISN'T CLEAR ON THIS GUY!
 * http://mongodb.github.io/node-mongodb-native/api-bson-generated/objectid.html#objectid-isvalid
 */
ObjectID.isValid = function(objectid) {
  if(!objectid) return false;

  //call .toString() to get the hex if we're
  // working with an instance of ObjectID
  return /^[0-9A-F]{24}$/i.test(objectid.toString());
};

/**
 * set a custom machineID
 * 
 * @param {String|Number} machineid Can be a string, hex-string or a number
 * @return {void}
 * @api public
 */
ObjectID.setMachineID = function(arg) {
  var machineID;

  if(typeof arg === "string") {
    // hex string
    machineID = parseInt(arg, 16);
   
    // any string
    if(isNaN(machineID)) {
      arg = ('000000' + arg).substr(-7,6);

      machineID = "";
      for(var i = 0;i<6; i++) {
        machineID += (arg.charCodeAt(i));
      }
    }
  }
  else if(/number|undefined/.test(typeof arg)) {
    machineID = arg | 0;
  }

  MACHINE_ID = (machineID & 0xFFFFFF);
}

/**
 * get the machineID
 * 
 * @return {number}
 * @api public
 */
ObjectID.getMachineID = function() {
  return MACHINE_ID;
}

ObjectID.prototype = {
  _bsontype: 'ObjectID',
  constructor: ObjectID,

  /**
   * Return the ObjectID id as a 24 byte hex string representation
   *
   * @return {String} return the 24 byte hex string representation.
   * @api public
   */
  toHexString: function() {
    return this.str;
  },

  /**
   * Compares the equality of this ObjectID with `otherID`.
   *
   * @param {Object} other ObjectID instance to compare against.
   * @return {Boolean} the result of comparing two ObjectID's
   * @api public
   */
  equals: function (other){
    return !!other && this.str === other.toString();
  },

  /**
   * Returns the generation date (accurate up to the second) that this ID was generated.
   *
   * @return {Date} the generation date
   * @api public
   */
  getTimestamp: function(){
    return new Date(parseInt(this.str.substr(0,8), 16) * 1000);
  }
};

function next() {
  return index = (index+1) % 0xFFFFFF;
}

function generate(time) {
  if (typeof time !== 'number')
    time = Date.now()/1000;

  //keep it in the ring!
  time = parseInt(time, 10) % 0xFFFFFFFF;

  //FFFFFFFF FFFFFF FFFF FFFFFF
  return hex(8,time) + hex(6,MACHINE_ID) + hex(4,pid) + hex(6,next());
}

function hex(length, n) {
  n = n.toString(16);
  return (n.length===length)? n : "00000000".substring(n.length, length) + n;
}

function buffer(str) {
  var i=0,out=[];

  if(str.length===24)
    for(;i<24; out.push(parseInt(str[i]+str[i+1], 16)),i+=2);

  else if(str.length===12)
    for(;i<12; out.push(str.charCodeAt(i)),i++);

  return out;
}

/**
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @api private
 */
ObjectID.prototype.inspect = function() { return "ObjectID("+this+")" };
ObjectID.prototype.toJSON = ObjectID.prototype.toHexString;
ObjectID.prototype.toString = ObjectID.prototype.toHexString;

}).call(this,require('_process'))

},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
/* global exports */
/**
 * @fileoverview a tiny library for Web Worker Remote Method Invocation
 *
 */
const ObjectID = require('bson-objectid');

/**
 * @private returns a list of Transferable objects which {@code obj} includes
 * @param {object} obj any object
 * @param {Array} list for internal recursion only
 * @return {List} a list of Transferable objects
 */
function getTransferList(obj, list = []) {
    if (ArrayBuffer.isView(obj)) {
        list.push(obj.buffer);
        return list;
    }
    if (isTransferable(obj)) {
        list.push(obj);
        return list;
    }
    if (!(typeof obj === 'object')) {
        return list;
    }
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            getTransferList(obj[prop], list);
        }
    }
    return list;
}

/**
 * @private checks if {@code obj} is Transferable or not.
 * @param {object} obj any object
 * @return {boolean}
 */
function isTransferable(obj) {
    const transferable = [ArrayBuffer];
    if (typeof MessagePort !== 'undefined') {
        transferable.push(MessagePort);
    }
    if (typeof ImageBitmap !== 'undefined') {
        transferable.push(ImageBitmap);
    }
    return transferable.some(e => obj instanceof e);
}

/**
 * @class base class whose child classes use RMI
 */
class WorkerRMI {
    /**
     * @constructor
     * @param {object} remote an instance to call postMessage method
     * @param {Array} args arguments to be passed to server-side instance
     */
    constructor(remote, ...args) {
        this.remote = remote;
        this.id = ObjectID().toString();
        this.methodStates = {};
        this.remote.addEventListener('message', event => {
            const data = event.data;
            if (data.id === this.id) {
                this.returnHandler(data);
            }
        }, false);
        this.constructorPromise = this.invokeRM(this.constructor.name, args);
    }

    /**
     * invokes remote method
     * @param {string} methodName Method name
     * @param {Array} args arguments to be passed to server-side instance
     * @return {Promise}
     */
    invokeRM(methodName, args = []) {
        if (!this.methodStates[methodName]) {
            this.methodStates[methodName] = {
                num: 0,
                resolveRejects: {}
            };
        }
        return new Promise((resolve, reject) => {
            const methodState = this.methodStates[methodName];
            methodState.num += 1;
            methodState.resolveRejects[methodState.num] = { resolve, reject };
            this.remote.postMessage({
                id: this.id,
                methodName,
                num: methodState.num,
                args
            }, getTransferList(args));
        });
    }

    /**
     * @private handles correspondent 'message' event
     * @param {obj} data data property of 'message' event
     */
    returnHandler(data) {
        const resolveRejects = this.methodStates[data.methodName].resolveRejects;
        if (data.error) {
            resolveRejects[data.num].reject(data.error);
        } else {
            resolveRejects[data.num].resolve(data.result);
        }
        delete resolveRejects[data.num];
    }
}


/**
 * @private executes a method on server and post a result as message.
 * @param {obj} event 'message' event
 */
async function handleWorkerRMI(event) {
    const data = event.data;
    const message = {
        id: data.id,
        methodName: data.methodName,
        num: data.num,
    };
    let result;
    if (data.methodName === this.name) {
        this.workerRMI.instances[data.id] = new this(...data.args);
        message.result = null;
        this.workerRMI.target.postMessage(message, getTransferList(result));
    } else {
        const instance = this.workerRMI.instances[data.id];
        if (instance) {
            try {
                result = await instance[data.methodName].apply(instance, data.args)
                message.result = result;
                this.workerRMI.target.postMessage(message, getTransferList(result));
            } catch (e) {
                message.error = e.toString();
                this.workerRMI.target.postMessage(message);
            }
        }
    }
}

/**
 * registers a class as an executer of RMI on server
 * @param {obj} target an instance that receives 'message' events of RMI
 * @param {Class} klass a class to be registered
 */
function resigterWorkerRMI(target, klass) {
    klass.workerRMI = {
        target,
        instances: {},
        handler: handleWorkerRMI.bind(klass)
    }
    target.addEventListener('message', klass.workerRMI.handler);
}

/**
 * unresigters a class registered by registerWorkerRMI
 * @param {obj} target an instance that receives 'message' events of RMI
 * @param {Class} klass a class to be unregistered
 */
function unresigterWorkerRMI(target, klass) {
    target.removeEventListener('message', klass.workerRMI.handler)
    delete klass.workerRMI;
}

exports.WorkerRMI = WorkerRMI;
exports.resigterWorkerRMI = resigterWorkerRMI;
exports.unresigterWorkerRMI = unresigterWorkerRMI;

},{"bson-objectid":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Board = exports.Candidates = undefined;
exports.neighbors = neighbors;
exports.diagonals = diagonals;

var _utils = require('./utils.js');

var _constants = require('./constants.js');

var _intersection = require('./intersection.js');

var _stone_group = require('./stone_group.js');

var _coord_convert = require('./coord_convert.js');

function neighbors(v) {
    return [v + 1, v + _constants.EBSIZE, v - 1, v - _constants.EBSIZE];
}

function diagonals(v) {
    return [v + _constants.EBSIZE + 1, v + _constants.EBSIZE - 1, v - _constants.EBSIZE - 1, v - _constants.EBSIZE + 1];
}

class Candidates {
    constructor(hash, moveCnt, list) {
        this.hash = hash;
        this.moveCnt = moveCnt;
        this.list = list;
    }
}

exports.Candidates = Candidates;
class Board {
    constructor(komi = 7) {
        this.komi = komi;
        this.state = new Uint8Array(_constants.EBVCNT);
        this.state.fill(_intersection.EXTERIOR);
        this.id = new Uint16Array(_constants.EBVCNT);
        this.next = new Uint16Array(_constants.EBVCNT);
        this.sg = [];
        for (let i = 0; i < _constants.EBVCNT; i++) {
            this.sg.push(new _stone_group.StoneGroup());
        }
        this.prevState = [];
        this.ko = _constants.VNULL;
        this.turn = _intersection.BLACK;
        this.moveCnt = 0;
        this.prevMove = _constants.VNULL;
        this.removeCnt = 0;
        this.history = [];
        this.clear();
    }

    getMoveCnt() {
        return this.moveCnt;
    }

    getPrevMove() {
        return this.prevMove;
    }

    getHistory() {
        return this.history;
    }

    clear() {
        for (let x = 1; x <= _constants.BSIZE; x++) {
            for (let y = 1; y <= _constants.BSIZE; y++) {
                this.state[(0, _coord_convert.xy2ev)(x, y)] = _intersection.EMPTY;
            }
        }
        for (let i = 0; i < this.id.length; i++) {
            this.id[i] = i;
        }
        for (let i = 0; i < this.next.length; i++) {
            this.next[i] = i;
        }
        this.sg.forEach(e => {
            e.clear(false);
        });
        this.prevState = [];
        for (let i = 0; i < _constants.KEEP_PREV_CNT; i++) {
            this.prevState.push(this.state.slice());
        }
        this.ko = _constants.VNULL;
        this.turn = _intersection.BLACK;
        this.moveCnt = 0;
        this.prevMove = _constants.VNULL;
        this.removeCnt = 0;
        this.history = [];
    }

    copyTo(dest) {
        dest.state = this.state.slice();
        dest.id = this.id.slice();
        dest.next = this.next.slice();
        for (let i = 0; i < dest.sg.length; i++) {
            this.sg[i].copyTo(dest.sg[i]);
        }
        dest.prevState = [];
        for (let i = 0; i < _constants.KEEP_PREV_CNT; i++) {
            dest.prevState.push(this.prevState[i].slice());
        }
        dest.ko = this.ko;
        dest.turn = this.turn;
        dest.moveCnt = this.moveCnt;
        dest.removeCnt = this.removeCnt;
        dest.history = Array.from(this.history);
    }

    playSequence(sequence) {
        for (const v of sequence) {
            this.play(v, false);
        }
    }

    remove(v) {
        let vTmp = v;
        while (true) {
            this.removeCnt += 1;
            this.state[vTmp] = _intersection.EMPTY;
            this.id[vTmp] = vTmp;
            for (const nv of neighbors(vTmp)) {
                this.sg[this.id[nv]].add(vTmp);
            }
            const vNext = this.next[vTmp];
            this.next[vTmp] = vTmp;
            vTmp = vNext;
            if (vTmp === v) {
                break;
            }
        }
    }

    merge(v1, v2) {
        let idBase = this.id[v1];
        let idAdd = this.id[v2];
        if (this.sg[idBase].getSize() < this.sg[idAdd].getSize()) {
            let tmp = idBase;
            idBase = idAdd;
            idAdd = tmp;
        }

        this.sg[idBase].merge(this.sg[idAdd]);

        let vTmp = idAdd;
        while (true) {
            this.id[vTmp] = idBase;
            vTmp = this.next[vTmp];
            if (vTmp === idAdd) {
                break;
            }
        }
        const tmp = this.next[v1];
        this.next[v1] = this.next[v2];
        this.next[v2] = tmp;
    }

    placeStone(v) {
        const stoneColor = this.turn;
        this.state[v] = stoneColor;
        this.id[v] = v;
        this.sg[this.id[v]].clear(true);
        for (const nv of neighbors(v)) {
            if (this.state[nv] === _intersection.EMPTY) {
                this.sg[this.id[v]].add(nv);
            } else {
                this.sg[this.id[nv]].sub(v);
            }
        }
        for (const nv of neighbors(v)) {
            if (this.state[nv] === stoneColor && this.id[nv] !== this.id[v]) {
                this.merge(v, nv);
            }
        }
        this.removeCnt = 0;
        const opponentStone = (0, _intersection.opponentOf)(this.turn);
        for (const nv of neighbors(v)) {
            if (this.state[nv] === opponentStone && this.sg[this.id[nv]].getLibCnt() === 0) {
                this.remove(nv);
            }
        }
    }

    legal(v) {
        if (v === _constants.PASS) {
            return true;
        } else if (v === this.ko || this.state[v] !== _intersection.EMPTY) {
            return false;
        }

        const stoneCnt = [0, 0];
        const atrCnt = [0, 0];
        for (const nv of neighbors(v)) {
            const c = this.state[nv];
            switch (c) {
                case _intersection.EMPTY:
                    return true;
                case _intersection.BLACK:
                case _intersection.WHITE:
                    stoneCnt[c] += 1;
                    if (this.sg[this.id[nv]].getLibCnt() === 1) {
                        atrCnt[c] += 1;
                    }
            }
        }
        return atrCnt[(0, _intersection.opponentOf)(this.turn)] !== 0 || atrCnt[this.turn] < stoneCnt[this.turn];
    }

    eyeshape(v, pl) {
        if (v === _constants.PASS) {
            return false;
        }
        for (const nv of neighbors(v)) {
            const c = this.state[nv];
            if (c === _intersection.EMPTY || c === (0, _intersection.opponentOf)(pl)) {
                return false;
            }
        }
        const diagCnt = [0, 0, 0, 0];
        for (const nv of diagonals(v)) {
            diagCnt[this.state[nv]] += 1;
        }
        const wedgeCnt = diagCnt[(0, _intersection.opponentOf)(pl)] + (diagCnt[3] > 0 ? 1 : 0);
        if (wedgeCnt === 2) {
            for (const nv of diagonals(v)) {
                if (this.state[nv] === (0, _intersection.opponentOf)(pl) && this.sg[this.id[nv]].getLibCnt() === 1 && this.sg[this.id[nv]].getVAtr() !== this.ko) {
                    return true;
                }
            }
        }
        return wedgeCnt < 2;
    }

    play(v, notFillEye) {
        if (!this.legal(v)) {
            return false;
        }
        if (notFillEye && this.eyeshape(v, this.turn)) {
            return false;
        }
        for (let i = _constants.KEEP_PREV_CNT - 2; i >= 0; i--) {
            this.prevState[i + 1] = this.prevState[i];
        }
        this.prevState[0] = this.state.slice();
        if (v === _constants.PASS) {
            this.ko = _constants.VNULL;
        } else {
            this.placeStone(v);
            const id = this.id[v];
            this.ko = _constants.VNULL;
            if (this.removeCnt === 1 && this.sg[id].getLibCnt() === 1 && this.sg[id].getSize() === 1) {
                this.ko = this.sg[id].getVAtr();
            }
        }
        this.prevMove = v;
        this.history.push(v);
        this.turn = (0, _intersection.opponentOf)(this.turn);
        this.moveCnt += 1;
        return true;
    }

    randomPlay() {
        const emptyList = [];
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] === _intersection.EMPTY) {
                emptyList.push(i);
            }
        }
        (0, _utils.shuffle)(emptyList);
        for (const v of emptyList) {
            if (this.play(v, true)) {
                return v;
            }
        }
        this.play(_constants.PASS, true);
        return _constants.PASS;
    }

    score() {
        const stoneCnt = [0, 0];
        for (let _v = 0; _v < _constants.BVCNT; _v++) {
            const v = (0, _coord_convert.rv2ev)(_v);
            const s = this.state[v];
            if (s === _intersection.BLACK || s === _intersection.WHITE) {
                stoneCnt[s] += 1;
            } else {
                const nbrCnt = [0, 0, 0, 0];
                for (const nv of neighbors(v)) {
                    nbrCnt[this.state[nv]] += 1;
                }
                if (nbrCnt[_intersection.WHITE] > 0 && nbrCnt[_intersection.BLACK] === 0) {
                    stoneCnt[_intersection.WHITE] += 1;
                } else if (nbrCnt[_intersection.BLACK] > 0 && nbrCnt[_intersection.WHITE] === 0) {
                    stoneCnt[_intersection.BLACK] += 1;
                }
            }
        }
        return stoneCnt[1] - stoneCnt[0] - this.komi;
    }

    rollout(showBoard) {
        while (this.moveCnt < _constants.EBVCNT * 2) {
            const prevMove = this.prevMove;
            const move = this.randomPlay();
            if (showBoard && move !== _constants.PASS) {
                console.log('\nmove count=%d', this.moveCnt);
                this.showboard();
            }
            if (prevMove === _constants.PASS && move === _constants.PASS) {
                break;
            }
        }
    }

    showboard() {
        function printXlabel() {
            let lineStr = '  ';
            for (let x = 1; x <= _constants.BSIZE; x++) {
                lineStr += ` ${_coord_convert.X_LABELS[x]} `;
            }
            console.log(lineStr);
        }
        printXlabel();
        for (let y = _constants.BSIZE; y > 0; y--) {
            let lineStr = (' ' + y.toString()).slice(-2);
            for (let x = 1; x <= _constants.BSIZE; x++) {
                const v = (0, _coord_convert.xy2ev)(x, y);
                let xStr;
                switch (this.state[v]) {
                    case _intersection.BLACK:
                        xStr = v === this.prevMove ? '[X]' : ' X ';
                        break;
                    case _intersection.WHITE:
                        xStr = v === this.prevMove ? '[O]' : ' O ';
                        break;
                    case _intersection.EMPTY:
                        xStr = ' . ';
                        break;
                    default:
                        xStr = ' ? ';
                }
                lineStr += xStr;
            }
            lineStr += (' ' + y.toString()).slice(-2);
            console.log(lineStr);
        }
        printXlabel();
        console.log('');
    }

    feature() {
        const index = (p, f) => p * _constants.FEATURE_CNT + f;
        const array = new Float32Array(_constants.BVCNT * _constants.FEATURE_CNT);
        const my = this.turn;
        const opp = (0, _intersection.opponentOf)(this.turn);

        const N = _constants.KEEP_PREV_CNT + 1;
        for (let p = 0; p < _constants.BVCNT; p++) {
            array[index(p, 0)] = this.state[(0, _coord_convert.rv2ev)(p)] === my ? 1.0 : 0.0;
        }
        for (let p = 0; p < _constants.BVCNT; p++) {
            array[index(p, N)] = this.state[(0, _coord_convert.rv2ev)(p)] === opp ? 1.0 : 0.0;
        }
        for (let i = 0; i < _constants.KEEP_PREV_CNT; i++) {
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, i + 1)] = this.prevState[i][(0, _coord_convert.rv2ev)(p)] === my ? 1.0 : 0.0;
            }
            for (let p = 0; p < _constants.BVCNT; p++) {
                array[index(p, N + i + 1)] = this.prevState[i][(0, _coord_convert.rv2ev)(p)] === opp ? 1.0 : 0.0;
            }
        }
        let is_black_turn, is_white_turn;
        if (my === _intersection.BLACK) {
            is_black_turn = 1.0;
            is_white_turn = 0.0;
        } else {
            is_black_turn = 0.0;
            is_white_turn = 1.0;
        }
        for (let p = 0; p < _constants.BVCNT; p++) {
            array[index(p, _constants.FEATURE_CNT - 2)] = is_black_turn;
            array[index(p, _constants.FEATURE_CNT - 1)] = is_white_turn;
        }
        return array;
    }

    hash() {
        return (0, _utils.hash)((this.state.toString() + this.prevState[0].toString() + this.turn.toString()).replace(',', ''));
    }

    candidates() {
        const candList = [];
        for (let v = 0; v < this.state.length; v++) {
            if (this.state[v] === _intersection.EMPTY && this.legal(v) && !this.eyeshape(v, this.turn)) {
                candList.push((0, _coord_convert.ev2rv)(v));
            }
        }
        candList.push((0, _coord_convert.ev2rv)(_constants.PASS));
        return new Candidates(this.hash(), this.moveCnt, candList);
    }

    finalScore() {
        const ROLL_OUT_NUM = 256;
        const doubleScoreList = [];
        let bCpy = new Board(this.komi);
        for (let i = 0; i < ROLL_OUT_NUM; i++) {
            this.copyTo(bCpy);
            bCpy.rollout(false);
            doubleScoreList.push(bCpy.score());
        }
        return (0, _utils.mostCommon)(doubleScoreList);
    }
}
exports.Board = Board; /*
                       function testBoard() {
                           const b = new Board();
                           b.playSequence(['A1', 'A2', 'A9', 'B1'].map(str2ev));
                           b.showboard();
                       }
                       testBoard();
                       */
},{"./constants.js":5,"./coord_convert.js":6,"./intersection.js":7,"./stone_group.js":10,"./utils.js":11}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/// 碁盤のサイズです。
const BSIZE = exports.BSIZE = 19;

/// 外枠を持つ拡張碁盤のサイズです。
const EBSIZE = exports.EBSIZE = BSIZE + 2;

/// 碁盤の交点の数です。
const BVCNT = exports.BVCNT = BSIZE * BSIZE;

/// 拡張碁盤の交点の数です。
const EBVCNT = exports.EBVCNT = EBSIZE * EBSIZE;

/// パスを表す線形座標です。通常の着手は拡張碁盤の線形座標で表します。
// TODO - 着手のために列挙型を作ったほうが関数のシグニチャは読みやすい。
const PASS = exports.PASS = EBVCNT;

/// 線形座標のプレースホルダーの未使用を示す値です。
// TODO - 該当する場所にOption<usize>を使ったほうが関数のシグニチャは読みやすい。
const VNULL = exports.VNULL = EBVCNT + 1;

/// NNへの入力に関する履歴の深さです。
const KEEP_PREV_CNT = exports.KEEP_PREV_CNT = 7;

/// NNへの入力フィーチャーの数です。
const FEATURE_CNT = exports.FEATURE_CNT = KEEP_PREV_CNT * 2 + 4;
},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.X_LABELS = undefined;
exports.move2xy = move2xy;
exports.ev2xy = ev2xy;
exports.xy2ev = xy2ev;
exports.rv2ev = rv2ev;
exports.ev2rv = ev2rv;
exports.ev2str = ev2str;
exports.str2ev = str2ev;

var _constants = require('./constants.js');

const X_LABELS = exports.X_LABELS = '@ABCDEFGHJKLMNOPQRST';

function move2xy(s) {
    const OFFSET = 'a'.charCodeAt(0) - 1;
    return [s.charCodeAt(0) - OFFSET, _constants.BSIZE + 1 - (s.charCodeAt(1) - OFFSET)];
}

function ev2xy(ev) {
    return [ev % _constants.EBSIZE, Math.floor(ev / _constants.EBSIZE)];
}

function xy2ev(x, y) {
    return y * _constants.EBSIZE + x;
}

function rv2ev(rv) {
    return rv === _constants.BVCNT ? _constants.PASS : rv % _constants.BSIZE + 1 + Math.floor(rv / _constants.BSIZE + 1) * _constants.EBSIZE;
}

function ev2rv(ev) {
    return ev === _constants.PASS ? _constants.BVCNT : ev % _constants.EBSIZE - 1 + Math.floor(ev / _constants.EBSIZE - 1) * _constants.BSIZE;
}

function ev2str(ev) {
    if (ev >= _constants.PASS) {
        return 'pass';
    } else {
        const [x, y] = ev2xy(ev);
        return X_LABELS.charAt(x) + y.toString();
    }
}

function str2ev(v) {
    const vStr = v.toUpperCase();
    if (vStr === 'PASS' || vStr === 'RESIGN') {
        return _constants.PASS;
    } else {
        const x = X_LABELS.indexOf(vStr.charAt(0));
        const y = parseInt(vStr.slice(1));
        return xy2ev(x, y);
    }
}
},{"./constants.js":5}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.opponentOf = opponentOf;
const WHITE = exports.WHITE = 0;
const BLACK = exports.BLACK = 1;

function opponentOf(color) {
    switch (color) {
        case WHITE:
            return BLACK;
        case BLACK:
            return WHITE;
    }
}

const EMPTY = exports.EMPTY = 2;
const EXTERIOR = exports.EXTERIOR = 3;
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.NeuralNetwork = undefined;

var _workerRmi = require('worker-rmi');

var _utils = require('./utils.js');

/* global */
class NeuralNetwork extends _workerRmi.WorkerRMI {
    async evaluate(...inputs) {
        const result = await this.invokeRM('evaluate', inputs);
        result[0] = (0, _utils.softmax)(result[0]);
        return result;
    }
}
exports.NeuralNetwork = NeuralNetwork;
},{"./utils.js":11,"worker-rmi":3}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Tree = undefined;

var _utils = require('./utils.js');

var _constants = require('./constants.js');

var _coord_convert = require('./coord_convert.js');

var _board = require('./board.js');

var _intersection = require('./intersection.js');

const MAX_NODE_CNT = 16384;
const EXPAND_CNT = 8;

let TREE_CP = 2.0;

class Tree {
    constructor(nn) {
        this.mainTime = 0.0;
        this.byoyomi = 1.0;
        this.leftTime = 0.0;
        this.node = [];
        for (let i = 0; i < MAX_NODE_CNT; i++) {
            this.node.push(new Node());
        }
        this.nodeCnt = 0;
        this.rootId = 0;
        this.rootMoveCnt = 0;
        this.nodeHashs = new Map();
        this.evalCnt = 0;
        this.nn = nn;
    }

    setTime(mainTime, byoyomi) {
        this.mainTime = mainTime;
        this.leftTime = mainTime;
        this.byoyomi = byoyomi;
    }

    setLeftTime(leftTime) {
        this.leftTime = leftTime;
    }

    clear() {
        this.leftTime = this.mainTime;
        for (const nd of this.node) {
            nd.clear();
        }
        this.nodeCnt = 0;
        this.rootId = 0;
        this.rootMoveCnt = 0;
        this.nodeHashs.clear();
        this.evalCnt = 0;
    }

    deleteNode() {
        if (this.nodeCnt < MAX_NODE_CNT / 2) {
            return;
        }
        for (let i = 0; i < MAX_NODE_CNT; i++) {
            const mc = this.node[i].moveCnt;
            if (mc != null && mc < this.rootMoveCnt) {
                this.nodeHashs.delete(this.node[i].hash);
                this.node[i].clear();
            }
        }
    }

    createNode(b, prob) {
        const candidates = b.candidates();
        const hs = candidates.hash;
        if (this.nodeHashs.has(hs)) {
            const nodeId = this.nodeHashs.get(hs);
            if (this.node[nodeId].hash === hs && this.node[nodeId].moveCnt === candidates.moveCnt) {
                return nodeId;
            }
        }

        let nodeId = hs % MAX_NODE_CNT;

        while (this.node[nodeId].moveCnt != -1) {
            nodeId = nodeId + 1 < MAX_NODE_CNT ? nodeId + 1 : 0;
        }

        this.nodeHashs.set(hs, nodeId);
        this.nodeCnt += 1;

        const nd = this.node[nodeId];
        nd.clear();
        nd.moveCnt = candidates.moveCnt;
        nd.hash = hs;
        nd.initBranch();

        for (const rv of (0, _utils.argsort)(prob, true)) {
            if (candidates.list.includes(rv)) {
                nd.move[nd.branchCnt] = (0, _coord_convert.rv2ev)(rv);
                nd.prob[nd.branchCnt] = prob[rv];
                nd.branchCnt += 1;
            }
        }
        return nodeId;
    }

    bestByUCB(b, nodeId) {
        const nd = this.node[nodeId];
        const ndRate = nd.totalCnt === 0 ? 0.0 : nd.totalValue / nd.totalCnt;
        const cpsv = TREE_CP * Math.sqrt(nd.totalCnt);
        const actionValue = new Float32Array(_constants.BVCNT + 1);
        for (let i = 0; i < actionValue.length; i++) {
            actionValue[i] = nd.visitCnt[i] === 0 ? ndRate : nd.valueWin[i] / nd.visitCnt[i];
        }
        const ucb = new Float32Array(nd.branchCnt);
        for (let i = 0; i < ucb.length; i++) {
            ucb[i] = actionValue[i] + cpsv * nd.prob[i] / (nd.visitCnt[i] + 1);
        }
        const best = (0, _utils.argmax)(ucb);
        const nextId = nd.nextId[best];
        const nextMove = nd.move[best];
        const isHeadNode = !this.hasNext(nodeId, best, b.getMoveCnt() + 1) || nd.visitCnt[best] < EXPAND_CNT || b.getMoveCnt() > _constants.BVCNT * 2 || nextMove === _constants.PASS && b.getPrevMove() === _constants.PASS;
        return [best, nextId, nextMove, isHeadNode];
    }

    shouldSearch(best, second) {
        const nd = this.node[this.rootId];
        const winRate = this.branchRate(nd, best);

        return nd.totalCnt <= 5000 || nd.visitCnt[best] <= nd.visitCnt[second] * 100 && winRate >= 0.1 && winRate <= 0.9;
    }

    getSearchTime() {
        if (this.mainTime === 0.0 || this.leftTime < self.byoyomi * 2.0) {
            return Math.max(this.byoyomi, 1.0);
        } else {
            return this.leftTime / (55.0 + Math.max(50 - this.rootMoveCnt, 0));
        }
    }

    hasNext(nodeId, brId, moveCnt) {
        const nd = this.node[nodeId];
        const nextId = nd.nextId[brId];
        return nextId >= 0 && nd.nextHash[brId] === this.node[nextId].hash && this.node[nextId].moveCnt === moveCnt;
    }

    branchRate(nd, id) {
        return nd.valueWin[id] / Math.max(nd.visitCnt[id], 1) / 2.0 + 0.5;
    }

    bestSequence(nodeId, headMove) {
        let seqStr = ('   ' + (0, _coord_convert.ev2str)(headMove)).slice(-5);
        let nextMove = headMove;

        for (let i = 0; i < 7; i++) {
            const nd = this.node[nodeId];
            if (nextMove === _constants.PASS || nd.branchCnt < 1) {
                break;
            }

            const best = (0, _utils.argmax)(nd.visitCnt.slice(0, nd.branchCnt));
            if (nd.visitCnt[best] === 0) {
                break;
            }
            nextMove = nd.move[best];
            seqStr += '->' + ('   ' + (0, _coord_convert.ev2str)(nextMove)).slice(-5);

            if (!this.hasNext(nodeId, best, nd.moveCnt + 1)) {
                break;
            }
            nodeId = nd.nextId[best];
        }

        return seqStr;
    }

    printInfo(nodeId) {
        const nd = this.node[nodeId];
        const order = (0, _utils.argsort)(nd.visitCnt.slice(0, nd.branchCnt), true);
        console.log('|move|count  |rate |value|prob | best sequence');
        for (let i = 0; i < Math.min(order.length, 9); i++) {
            const m = order[i];
            const visitCnt = nd.visitCnt[m];
            if (visitCnt === 0) {
                break;
            }

            const rate = visitCnt === 0 ? 0.0 : this.branchRate(nd, m) * 100.0;
            const value = (nd.value[m] / 2.0 + 0.5) * 100.0;
            console.log('|%s|%s|%s|%s|%s| %s', ('   ' + (0, _coord_convert.ev2str)(nd.move[m])).slice(-4), (visitCnt + '      ').slice(0, 7), ('  ' + rate.toFixed(1)).slice(-5), ('  ' + value.toFixed(1)).slice(-5), ('  ' + (nd.prob[m] * 100.0).toFixed(1)).slice(-5), this.bestSequence(nd.nextId[m], nd.move[m]));
        }
    }

    async preSearch(b) {
        const [prob] = await this.nn.evaluate(b.feature());
        this.rootId = this.createNode(b, prob);
        this.rootMoveCnt = b.getMoveCnt();
        TREE_CP = this.rootMoveCnt < 8 ? 0.01 : 1.5;
    }

    async evaluateChildNode(b, nodeId, child) {
        let [prob, value] = await this.nn.evaluate(b.feature());
        this.evalCnt += 1;
        if (b.turn === _intersection.WHITE) {
            value[0] = -value[0]; //ELF OpenGo仕様をLeela Zero/Pyaq仕様に合わせる
        }
        value = -value[0];
        const nd = this.node[nodeId];
        nd.value[child] = value;
        nd.evaluated[child] = true;
        if (this.nodeCnt > 0.85 * MAX_NODE_CNT) {
            this.deleteNode();
        }
        const nextId = this.createNode(b, prob);
        nd.nextId[child] = nextId;
        nd.nextHash[child] = b.hash();
        nd.totalValue -= nd.valueWin[child];
        nd.totalCnt += nd.visitCnt[child];
        return value;
    }

    async searchBranch(b, nodeId, route) {
        const [best, nextId, nextMove, isHeadNode] = this.bestByUCB(b, nodeId);
        route.push([nodeId, best]);
        b.play(nextMove, false);
        const nd = this.node[nodeId];
        const value = isHeadNode ? nd.evaluated[best] ? nd.value[best] : await this.evaluateChildNode(b, nodeId, best) : -(await this.searchBranch(b, nextId, route));
        nd.totalValue += value;
        nd.totalCnt += 1;
        nd.valueWin[best] += value;
        nd.visitCnt[best] += 1;
        return value;
    }

    async keepPlayout(b, exitCondition) {
        this.evalCnt = 0;
        let bCpy = new _board.Board();
        while (true) {
            b.copyTo(bCpy);
            await this.searchBranch(bCpy, this.rootId, []);
            if (exitCondition()) {
                break;
            }
        }
    }

    async _search(b, ponder, clean, exitCondition) {
        let [best, second] = this.node[this.rootId].best2();
        if (ponder || this.shouldSearch(best, second)) {
            await this.keepPlayout(b, exitCondition);
            const best2 = this.node[this.rootId].best2();
            best = best2[0];
            second = best2[1];
        }

        const nd = this.node[this.rootId];
        let nextMove = nd.move[best];
        let winRate = this.branchRate(nd, best);

        if (clean && nextMove === _constants.PASS && nd.valueWin[best] * nd.valueWin[second] > 0.0) {
            nextMove = nd.move[second];
            winRate = this.branchRate(nd, second);
        }
        return [nextMove, winRate];
    }

    async search(b, time, ponder, clean) {
        const start = Date.now();
        await this.preSearch(b);

        if (this.node[this.rootId].branchCnt <= 1) {
            console.log('\nmove count=%d:', this.rootMoveCnt + 1);
            this.printInfo(this.rootId);
            return [_constants.PASS, 0.5];
        }

        this.deleteNode();

        const time_ = (time === 0.0 ? this.getSearchTime() : time) * 1000 - 500; // 0.5秒がマージン
        if (ponder) {
            self.PONDER_STOP = false;
        }
        const [nextMove, winRate] = await this._search(b, ponder, clean, ponder ? function () {
            return self.PONDER_STOP;
        } : function () {
            return Date.now() - start > time_;
        });

        if (!ponder) {
            console.log('\nmove count=%d: left time=%s[sec] evaluated=%d', this.rootMoveCnt + 1, Math.max(this.leftTime - time, 0.0).toFixed(1), this.evalCnt);
            this.printInfo(this.rootId);
            this.leftTime = this.leftTime - (Date.now() - start) / 1000;
        }

        return [nextMove, winRate];
    }
}

exports.Tree = Tree;
class Node {
    constructor() {
        this.move = new Uint16Array(_constants.BVCNT + 1);
        this.prob = new Float32Array(_constants.BVCNT + 1);
        this.value = new Float32Array(_constants.BVCNT + 1);
        this.valueWin = new Float32Array(_constants.BVCNT + 1);
        this.visitCnt = new Uint32Array(_constants.BVCNT + 1);
        this.nextId = new Int16Array(_constants.BVCNT + 1);
        this.nextHash = new Uint32Array(_constants.BVCNT + 1);
        this.evaluated = [];
        this.branchCnt = 0;
        this.totalValue = 0.0;
        this.totalCnt = 0;
        this.hash = 0;
        this.moveCnt = -1;
        this.initBranch();
        this.clear();
    }

    initBranch() {
        this.move.fill(_constants.VNULL);
        this.prob.fill(0.0);
        this.value.fill(0.0);
        this.valueWin.fill(0.0);
        this.visitCnt.fill(0);
        this.nextId.fill(-1);
        this.nextHash.fill(0);
        this.evaluated = [];
        for (let i = 0; i < _constants.BVCNT + 1; i++) {
            this.evaluated.push(false);
        }
    }

    clear() {
        this.branchCnt = 0;
        this.totalValue = 0.0;
        this.totalCnt = 0;
        this.hash = 0;
        this.moveCnt = -1;
    }

    best2() {
        const order = (0, _utils.argsort)(this.visitCnt.slice(0, this.branchCnt), true);
        return order.slice(0, 2);
    }
}
},{"./board.js":4,"./constants.js":5,"./coord_convert.js":6,"./intersection.js":7,"./utils.js":11}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.StoneGroup = undefined;

var _constants = require('./constants.js');

class StoneGroup {
    constructor() {
        this.libCnt = _constants.VNULL;
        this.size = _constants.VNULL;
        this.vAtr = _constants.VNULL;
        this.libs = new Set();
    }

    getSize() {
        return this.size;
    }

    getLibCnt() {
        return this.libCnt;
    }

    getVAtr() {
        return this.vAtr;
    }

    clear(stone) {
        this.libCnt = stone ? 0 : _constants.VNULL;
        this.size = stone ? 1 : _constants.VNULL;
        this.vAtr = _constants.VNULL;
        this.libs.clear();
    }

    add(v) {
        if (this.libs.has(v)) {
            return;
        }
        this.libs.add(v);
        this.libCnt += 1;
        this.vAtr = v;
    }

    sub(v) {
        if (!this.libs.has(v)) {
            return;
        }
        this.libs.delete(v);
        this.libCnt -= 1;
    }

    merge(other) {
        this.libs = new Set([...this.libs, ...other.libs]);
        this.libCnt = this.libs.size;
        this.size += other.size;
        if (this.libCnt === 1) {
            self.vAtr = this.libs[0];
        }
    }

    copyTo(dest) {
        dest.libCnt = this.libCnt;
        dest.size = this.size;
        dest.vAtr = this.vAtr;
        dest.libs = new Set(this.libs);
    }
}
exports.StoneGroup = StoneGroup;
},{"./constants.js":5}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.shuffle = shuffle;
exports.mostCommon = mostCommon;
exports.argsort = argsort;
exports.argmax = argmax;
exports.hash = hash;
exports.softmax = softmax;
exports.printProb = printProb;

var _constants = require('./constants.js');

function shuffle(array) {
    let n = array.length;
    let t;
    let i;

    while (n) {
        i = Math.floor(Math.random() * n--);
        t = array[n];
        array[n] = array[i];
        array[i] = t;
    }

    return array;
}

function mostCommon(array) {
    const map = new Map();
    for (let i = 0; i < array.length; i++) {
        const e = array[i];
        if (map.has(e)) {
            map.set(e, map.get(e) + 1);
        } else {
            map.set(e, 1);
        }
    }
    let maxKey;
    let maxValue = -1;
    for (const [key, value] of map.entries()) {
        if (value > maxValue) {
            maxKey = key;
            maxValue = value;
        }
    }
    return maxKey;
}

function argsort(array, reverse) {
    const en = Array.from(array).map((e, i) => [i, e]);
    en.sort((a, b) => reverse ? b[1] - a[1] : a[1] - b[1]);
    return en.map(e => e[0]);
}

function argmax(array) {
    let maxIndex;
    let maxValue = -Infinity;
    for (let i = 0; i < array.length; i++) {
        const v = array[i];
        if (v > maxValue) {
            maxIndex = i;
            maxValue = v;
        }
    }
    return maxIndex;
}

function hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) + hash + char; /* hash * 33 + c */
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function softmax(input, temperature = 1.0) {
    const output = new Float32Array(input.length);
    const alpha = Math.max.apply(null, input);
    let denom = 0.0;

    for (let i = 0; i < input.length; i++) {
        const val = Math.exp((input[i] - alpha) / temperature);
        denom += val;
        output[i] = val;
    }

    for (let i = 0; i < output.length; i++) {
        output[i] /= denom;
    }

    return output;
}

function printProb(prob) {
    for (let y = 0; y < _constants.BSIZE; y++) {
        let str = `${y + 1} `;
        for (let x = 0; x < _constants.BSIZE; x++) {
            str += ('  ' + prob[x + y * _constants.BSIZE].toFixed(1)).slice(-5);
        }
        console.log(str);
    }
    console.log('pass=%s', prob[prob.length - 1].toFixed(1));
}
},{"./constants.js":5}],12:[function(require,module,exports){
'use strict';

var _workerRmi = require('worker-rmi');

var _neural_network_client = require('./neural_network_client.js');

var _coord_convert = require('./coord_convert.js');

var _constants = require('./constants.js');

var _intersection = require('./intersection.js');

var _board = require('./board.js');

var _search = require('./search.js');

class A9Engine {
    constructor() {
        this.b = new _board.Board();
        this.nn = new _neural_network_client.NeuralNetwork(self);
        this.tree = new _search.Tree(this.nn);
    }

    async loadNN() {
        await this.nn.invokeRM('load');
    }

    clear() {
        this.b.clear();
        this.tree.clear();
    }

    timeSettings(mainTime, byoyomi) {
        this.tree.setTime(mainTime, byoyomi);
    }

    async genmove() {
        const [move, winRate] = await this.bestMove();
        if (winRate < 0.1) {
            return 'resign';
        } else if (move === _constants.PASS || this.b.state[move] === _intersection.EMPTY) {
            this.b.play(move, true);
            return (0, _coord_convert.ev2str)(move);
        } else {
            console.log('error');
            console.log('%d(%s) is not empty', move, (0, _coord_convert.ev2str)(move));
            this.b.showboard();
            console.log(this.b.candidates());
        }
    }

    play(ev) {
        this.b.play(ev, false);
    }

    async bestMove() {
        return await this.tree.search(this.b, 0.0, false, false);
    }

    finalScore() {
        return this.b.finalScore();
    }

    async ponder() {
        return await this.tree.search(this.b, Infinity, true, false);
    }

    stopPonder() {
        self.PONDER_STOP = true;
    }

    timeLeft() {
        return this.tree.leftTime;
    }
}

(0, _workerRmi.resigterWorkerRMI)(self, A9Engine);
},{"./board.js":4,"./constants.js":5,"./coord_convert.js":6,"./intersection.js":7,"./neural_network_client.js":8,"./search.js":9,"worker-rmi":3}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2JvYXJkLmpzIiwic3JjL2NvbnN0YW50cy5qcyIsInNyYy9jb29yZF9jb252ZXJ0LmpzIiwic3JjL2ludGVyc2VjdGlvbi5qcyIsInNyYy9uZXVyYWxfbmV0d29ya19jbGllbnQuanMiLCJzcmMvc2VhcmNoLmpzIiwic3JjL3N0b25lX2dyb3VwLmpzIiwic3JjL3V0aWxzLmpzIiwic3JjL3dvcmtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3phQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcbnZhciBNQUNISU5FX0lEID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYpO1xudmFyIGluZGV4ID0gT2JqZWN0SUQuaW5kZXggPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcbnZhciBwaWQgPSAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBwcm9jZXNzLnBpZCAhPT0gJ251bWJlcicgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpICUgMHhGRkZGO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgQnVmZmVyXG4gKlxuICogQXV0aG9yOiAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBMaWNlbnNlOiAgTUlUXG4gKlxuICovXG52YXIgaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiAhIShcbiAgb2JqICE9IG51bGwgJiZcbiAgb2JqLmNvbnN0cnVjdG9yICYmXG4gIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbiAgKVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW1tdXRhYmxlIE9iamVjdElEIGluc3RhbmNlXG4gKlxuICogQGNsYXNzIFJlcHJlc2VudHMgdGhlIEJTT04gT2JqZWN0SUQgdHlwZVxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBhcmcgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIE9iamVjdElELlxuICovXG5mdW5jdGlvbiBPYmplY3RJRChhcmcpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SUQpKSByZXR1cm4gbmV3IE9iamVjdElEKGFyZyk7XG4gIGlmKGFyZyAmJiAoKGFyZyBpbnN0YW5jZW9mIE9iamVjdElEKSB8fCBhcmcuX2Jzb250eXBlPT09XCJPYmplY3RJRFwiKSlcbiAgICByZXR1cm4gYXJnO1xuXG4gIHZhciBidWY7XG5cbiAgaWYoaXNCdWZmZXIoYXJnKSB8fCAoQXJyYXkuaXNBcnJheShhcmcpICYmIGFyZy5sZW5ndGg9PT0xMikpIHtcbiAgICBidWYgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmcpO1xuICB9XG4gIGVsc2UgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIGlmKGFyZy5sZW5ndGghPT0xMiAmJiAhT2JqZWN0SUQuaXNWYWxpZChhcmcpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuXG4gICAgYnVmID0gYnVmZmVyKGFyZyk7XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIGJ1ZiA9IGJ1ZmZlcihnZW5lcmF0ZShhcmcpKTtcbiAgfVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImlkXCIsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KHRoaXMsIGJ1Zik7IH1cbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0clwiLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGJ1Zi5tYXAoaGV4LmJpbmQodGhpcywgMikpLmpvaW4oJycpOyB9XG4gIH0pO1xufVxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJRDtcbk9iamVjdElELmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5PYmplY3RJRC5kZWZhdWx0ID0gT2JqZWN0SUQ7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SUQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uKHRpbWUpe1xuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXgoOCx0aW1lKStcIjAwMDAwMDAwMDAwMDAwMDBcIik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyBjcmVhdGUgYSBPYmplY3RJRCBmcm9tIGEgcGFzc2VkIGluIDI0IGJ5dGUgaGV4c3RyaW5nLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uKGhleFN0cmluZykge1xuICBpZighT2JqZWN0SUQuaXNWYWxpZChoZXhTdHJpbmcpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgT2JqZWN0SUQgaGV4IHN0cmluZ1wiKTtcblxuICByZXR1cm4gbmV3IE9iamVjdElEKGhleFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcgb3IgYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElELCByZXR1cm4gZmFsc2Ugb3RoZXJ3aXNlLlxuICogQGFwaSBwdWJsaWNcbiAqXG4gKiBUSEUgTkFUSVZFIERPQ1VNRU5UQVRJT04gSVNOJ1QgQ0xFQVIgT04gVEhJUyBHVVkhXG4gKiBodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvb2JqZWN0aWQuaHRtbCNvYmplY3RpZC1pc3ZhbGlkXG4gKi9cbk9iamVjdElELmlzVmFsaWQgPSBmdW5jdGlvbihvYmplY3RpZCkge1xuICBpZighb2JqZWN0aWQpIHJldHVybiBmYWxzZTtcblxuICAvL2NhbGwgLnRvU3RyaW5nKCkgdG8gZ2V0IHRoZSBoZXggaWYgd2UncmVcbiAgLy8gd29ya2luZyB3aXRoIGFuIGluc3RhbmNlIG9mIE9iamVjdElEXG4gIHJldHVybiAvXlswLTlBLUZdezI0fSQvaS50ZXN0KG9iamVjdGlkLnRvU3RyaW5nKCkpO1xufTtcblxuLyoqXG4gKiBzZXQgYSBjdXN0b20gbWFjaGluZUlEXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gbWFjaGluZWlkIENhbiBiZSBhIHN0cmluZywgaGV4LXN0cmluZyBvciBhIG51bWJlclxuICogQHJldHVybiB7dm9pZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELnNldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKGFyZykge1xuICB2YXIgbWFjaGluZUlEO1xuXG4gIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAvLyBoZXggc3RyaW5nXG4gICAgbWFjaGluZUlEID0gcGFyc2VJbnQoYXJnLCAxNik7XG4gICBcbiAgICAvLyBhbnkgc3RyaW5nXG4gICAgaWYoaXNOYU4obWFjaGluZUlEKSkge1xuICAgICAgYXJnID0gKCcwMDAwMDAnICsgYXJnKS5zdWJzdHIoLTcsNik7XG5cbiAgICAgIG1hY2hpbmVJRCA9IFwiXCI7XG4gICAgICBmb3IodmFyIGkgPSAwO2k8NjsgaSsrKSB7XG4gICAgICAgIG1hY2hpbmVJRCArPSAoYXJnLmNoYXJDb2RlQXQoaSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgbWFjaGluZUlEID0gYXJnIHwgMDtcbiAgfVxuXG4gIE1BQ0hJTkVfSUQgPSAobWFjaGluZUlEICYgMHhGRkZGRkYpO1xufVxuXG4vKipcbiAqIGdldCB0aGUgbWFjaGluZUlEXG4gKiBcbiAqIEByZXR1cm4ge251bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmdldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTUFDSElORV9JRDtcbn1cblxuT2JqZWN0SUQucHJvdG90eXBlID0ge1xuICBfYnNvbnR5cGU6ICdPYmplY3RJRCcsXG4gIGNvbnN0cnVjdG9yOiBPYmplY3RJRCxcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBPYmplY3RJRCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgKlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9IZXhTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SUQgd2l0aCBgb3RoZXJJRGAuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlciBPYmplY3RJRCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJRCdzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBlcXVhbHM6IGZ1bmN0aW9uIChvdGhlcil7XG4gICAgcmV0dXJuICEhb3RoZXIgJiYgdGhpcy5zdHIgPT09IG90aGVyLnRvU3RyaW5nKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gZGF0ZSAoYWNjdXJhdGUgdXAgdG8gdGhlIHNlY29uZCkgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge0RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGdldFRpbWVzdGFtcDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbmV3IERhdGUocGFyc2VJbnQodGhpcy5zdHIuc3Vic3RyKDAsOCksIDE2KSAqIDEwMDApO1xuICB9XG59O1xuXG5mdW5jdGlvbiBuZXh0KCkge1xuICByZXR1cm4gaW5kZXggPSAoaW5kZXgrMSkgJSAweEZGRkZGRjtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGUodGltZSkge1xuICBpZiAodHlwZW9mIHRpbWUgIT09ICdudW1iZXInKVxuICAgIHRpbWUgPSBEYXRlLm5vdygpLzEwMDA7XG5cbiAgLy9rZWVwIGl0IGluIHRoZSByaW5nIVxuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcblxuICAvL0ZGRkZGRkZGIEZGRkZGRiBGRkZGIEZGRkZGRlxuICByZXR1cm4gaGV4KDgsdGltZSkgKyBoZXgoNixNQUNISU5FX0lEKSArIGhleCg0LHBpZCkgKyBoZXgoNixuZXh0KCkpO1xufVxuXG5mdW5jdGlvbiBoZXgobGVuZ3RoLCBuKSB7XG4gIG4gPSBuLnRvU3RyaW5nKDE2KTtcbiAgcmV0dXJuIChuLmxlbmd0aD09PWxlbmd0aCk/IG4gOiBcIjAwMDAwMDAwXCIuc3Vic3RyaW5nKG4ubGVuZ3RoLCBsZW5ndGgpICsgbjtcbn1cblxuZnVuY3Rpb24gYnVmZmVyKHN0cikge1xuICB2YXIgaT0wLG91dD1bXTtcblxuICBpZihzdHIubGVuZ3RoPT09MjQpXG4gICAgZm9yKDtpPDI0OyBvdXQucHVzaChwYXJzZUludChzdHJbaV0rc3RyW2krMV0sIDE2KSksaSs9Mik7XG5cbiAgZWxzZSBpZihzdHIubGVuZ3RoPT09MTIpXG4gICAgZm9yKDtpPDEyOyBvdXQucHVzaChzdHIuY2hhckNvZGVBdChpKSksaSsrKTtcblxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgSWQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJRC5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJPYmplY3RJRChcIit0aGlzK1wiKVwiIH07XG5PYmplY3RJRC5wcm90b3R5cGUudG9KU09OID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuT2JqZWN0SUQucHJvdG90eXBlLnRvU3RyaW5nID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIGdsb2JhbCBleHBvcnRzICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgYSB0aW55IGxpYnJhcnkgZm9yIFdlYiBXb3JrZXIgUmVtb3RlIE1ldGhvZCBJbnZvY2F0aW9uXG4gKlxuICovXG5jb25zdCBPYmplY3RJRCA9IHJlcXVpcmUoJ2Jzb24tb2JqZWN0aWQnKTtcblxuLyoqXG4gKiBAcHJpdmF0ZSByZXR1cm5zIGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0cyB3aGljaCB7QGNvZGUgb2JqfSBpbmNsdWRlc1xuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcGFyYW0ge0FycmF5fSBsaXN0IGZvciBpbnRlcm5hbCByZWN1cnNpb24gb25seVxuICogQHJldHVybiB7TGlzdH0gYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zZmVyTGlzdChvYmosIGxpc3QgPSBbXSkge1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqLmJ1ZmZlcik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoaXNUcmFuc2ZlcmFibGUob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmICghKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSkge1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwcm9wIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBnZXRUcmFuc2Zlckxpc3Qob2JqW3Byb3BdLCBsaXN0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZSBjaGVja3MgaWYge0Bjb2RlIG9ian0gaXMgVHJhbnNmZXJhYmxlIG9yIG5vdC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNUcmFuc2ZlcmFibGUob2JqKSB7XG4gICAgY29uc3QgdHJhbnNmZXJhYmxlID0gW0FycmF5QnVmZmVyXTtcbiAgICBpZiAodHlwZW9mIE1lc3NhZ2VQb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChNZXNzYWdlUG9ydCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgSW1hZ2VCaXRtYXAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKEltYWdlQml0bWFwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zZmVyYWJsZS5zb21lKGUgPT4gb2JqIGluc3RhbmNlb2YgZSk7XG59XG5cbi8qKlxuICogQGNsYXNzIGJhc2UgY2xhc3Mgd2hvc2UgY2hpbGQgY2xhc3NlcyB1c2UgUk1JXG4gKi9cbmNsYXNzIFdvcmtlclJNSSB7XG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlbW90ZSBhbiBpbnN0YW5jZSB0byBjYWxsIHBvc3RNZXNzYWdlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJlbW90ZSwgLi4uYXJncykge1xuICAgICAgICB0aGlzLnJlbW90ZSA9IHJlbW90ZTtcbiAgICAgICAgdGhpcy5pZCA9IE9iamVjdElEKCkudG9TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yZW1vdGUuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgaWYgKGRhdGEuaWQgPT09IHRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybkhhbmRsZXIoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3RvclByb21pc2UgPSB0aGlzLmludm9rZVJNKHRoaXMuY29uc3RydWN0b3IubmFtZSwgYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW52b2tlcyByZW1vdGUgbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGludm9rZVJNKG1ldGhvZE5hbWUsIGFyZ3MgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBudW06IDAsXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXRob2RTdGF0ZSA9IHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUubnVtICs9IDE7XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5yZXNvbHZlUmVqZWN0c1ttZXRob2RTdGF0ZS5udW1dID0geyByZXNvbHZlLCByZWplY3QgfTtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBtZXRob2ROYW1lLFxuICAgICAgICAgICAgICAgIG51bTogbWV0aG9kU3RhdGUubnVtLFxuICAgICAgICAgICAgICAgIGFyZ3NcbiAgICAgICAgICAgIH0sIGdldFRyYW5zZmVyTGlzdChhcmdzKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlIGhhbmRsZXMgY29ycmVzcG9uZGVudCAnbWVzc2FnZScgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29ian0gZGF0YSBkYXRhIHByb3BlcnR5IG9mICdtZXNzYWdlJyBldmVudFxuICAgICAqL1xuICAgIHJldHVybkhhbmRsZXIoZGF0YSkge1xuICAgICAgICBjb25zdCByZXNvbHZlUmVqZWN0cyA9IHRoaXMubWV0aG9kU3RhdGVzW2RhdGEubWV0aG9kTmFtZV0ucmVzb2x2ZVJlamVjdHM7XG4gICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVqZWN0KGRhdGEuZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlc29sdmUoZGF0YS5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV07XG4gICAgfVxufVxuXG5cbi8qKlxuICogQHByaXZhdGUgZXhlY3V0ZXMgYSBtZXRob2Qgb24gc2VydmVyIGFuZCBwb3N0IGEgcmVzdWx0IGFzIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge29ian0gZXZlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVdvcmtlclJNSShldmVudCkge1xuICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICBtZXRob2ROYW1lOiBkYXRhLm1ldGhvZE5hbWUsXG4gICAgICAgIG51bTogZGF0YS5udW0sXG4gICAgfTtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChkYXRhLm1ldGhvZE5hbWUgPT09IHRoaXMubmFtZSkge1xuICAgICAgICB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF0gPSBuZXcgdGhpcyguLi5kYXRhLmFyZ3MpO1xuICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IG51bGw7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF07XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZVtkYXRhLm1ldGhvZE5hbWVdLmFwcGx5KGluc3RhbmNlLCBkYXRhLmFyZ3MpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmVycm9yID0gZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiByZWdpc3RlcnMgYSBjbGFzcyBhcyBhbiBleGVjdXRlciBvZiBSTUkgb24gc2VydmVyXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgcmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiByZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAga2xhc3Mud29ya2VyUk1JID0ge1xuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGluc3RhbmNlczoge30sXG4gICAgICAgIGhhbmRsZXI6IGhhbmRsZVdvcmtlclJNSS5iaW5kKGtsYXNzKVxuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKTtcbn1cblxuLyoqXG4gKiB1bnJlc2lndGVycyBhIGNsYXNzIHJlZ2lzdGVyZWQgYnkgcmVnaXN0ZXJXb3JrZXJSTUlcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSB1bnJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gdW5yZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAgdGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcilcbiAgICBkZWxldGUga2xhc3Mud29ya2VyUk1JO1xufVxuXG5leHBvcnRzLldvcmtlclJNSSA9IFdvcmtlclJNSTtcbmV4cG9ydHMucmVzaWd0ZXJXb3JrZXJSTUkgPSByZXNpZ3RlcldvcmtlclJNSTtcbmV4cG9ydHMudW5yZXNpZ3RlcldvcmtlclJNSSA9IHVucmVzaWd0ZXJXb3JrZXJSTUk7XG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuQm9hcmQgPSBleHBvcnRzLkNhbmRpZGF0ZXMgPSB1bmRlZmluZWQ7XG5leHBvcnRzLm5laWdoYm9ycyA9IG5laWdoYm9ycztcbmV4cG9ydHMuZGlhZ29uYWxzID0gZGlhZ29uYWxzO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfaW50ZXJzZWN0aW9uID0gcmVxdWlyZSgnLi9pbnRlcnNlY3Rpb24uanMnKTtcblxudmFyIF9zdG9uZV9ncm91cCA9IHJlcXVpcmUoJy4vc3RvbmVfZ3JvdXAuanMnKTtcblxudmFyIF9jb29yZF9jb252ZXJ0ID0gcmVxdWlyZSgnLi9jb29yZF9jb252ZXJ0LmpzJyk7XG5cbmZ1bmN0aW9uIG5laWdoYm9ycyh2KSB7XG4gICAgcmV0dXJuIFt2ICsgMSwgdiArIF9jb25zdGFudHMuRUJTSVpFLCB2IC0gMSwgdiAtIF9jb25zdGFudHMuRUJTSVpFXTtcbn1cblxuZnVuY3Rpb24gZGlhZ29uYWxzKHYpIHtcbiAgICByZXR1cm4gW3YgKyBfY29uc3RhbnRzLkVCU0laRSArIDEsIHYgKyBfY29uc3RhbnRzLkVCU0laRSAtIDEsIHYgLSBfY29uc3RhbnRzLkVCU0laRSAtIDEsIHYgLSBfY29uc3RhbnRzLkVCU0laRSArIDFdO1xufVxuXG5jbGFzcyBDYW5kaWRhdGVzIHtcbiAgICBjb25zdHJ1Y3RvcihoYXNoLCBtb3ZlQ250LCBsaXN0KSB7XG4gICAgICAgIHRoaXMuaGFzaCA9IGhhc2g7XG4gICAgICAgIHRoaXMubW92ZUNudCA9IG1vdmVDbnQ7XG4gICAgICAgIHRoaXMubGlzdCA9IGxpc3Q7XG4gICAgfVxufVxuXG5leHBvcnRzLkNhbmRpZGF0ZXMgPSBDYW5kaWRhdGVzO1xuY2xhc3MgQm9hcmQge1xuICAgIGNvbnN0cnVjdG9yKGtvbWkgPSA3KSB7XG4gICAgICAgIHRoaXMua29taSA9IGtvbWk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBuZXcgVWludDhBcnJheShfY29uc3RhbnRzLkVCVkNOVCk7XG4gICAgICAgIHRoaXMuc3RhdGUuZmlsbChfaW50ZXJzZWN0aW9uLkVYVEVSSU9SKTtcbiAgICAgICAgdGhpcy5pZCA9IG5ldyBVaW50MTZBcnJheShfY29uc3RhbnRzLkVCVkNOVCk7XG4gICAgICAgIHRoaXMubmV4dCA9IG5ldyBVaW50MTZBcnJheShfY29uc3RhbnRzLkVCVkNOVCk7XG4gICAgICAgIHRoaXMuc2cgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLkVCVkNOVDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNnLnB1c2gobmV3IF9zdG9uZV9ncm91cC5TdG9uZUdyb3VwKCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICB0aGlzLnR1cm4gPSBfaW50ZXJzZWN0aW9uLkJMQUNLO1xuICAgICAgICB0aGlzLm1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLnByZXZNb3ZlID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5yZW1vdmVDbnQgPSAwO1xuICAgICAgICB0aGlzLmhpc3RvcnkgPSBbXTtcbiAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIGdldE1vdmVDbnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdmVDbnQ7XG4gICAgfVxuXG4gICAgZ2V0UHJldk1vdmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZXZNb3ZlO1xuICAgIH1cblxuICAgIGdldEhpc3RvcnkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhpc3Rvcnk7XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgeSA9IDE7IHkgPD0gX2NvbnN0YW50cy5CU0laRTsgeSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQueHkyZXYpKHgsIHkpXSA9IF9pbnRlcnNlY3Rpb24uRU1QVFk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmlkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmlkW2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubmV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5uZXh0W2ldID0gaTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNnLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgICBlLmNsZWFyKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucHJldlN0YXRlID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlLnB1c2godGhpcy5zdGF0ZS5zbGljZSgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtvID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy50dXJuID0gX2ludGVyc2VjdGlvbi5CTEFDSztcbiAgICAgICAgdGhpcy5tb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5oaXN0b3J5ID0gW107XG4gICAgfVxuXG4gICAgY29weVRvKGRlc3QpIHtcbiAgICAgICAgZGVzdC5zdGF0ZSA9IHRoaXMuc3RhdGUuc2xpY2UoKTtcbiAgICAgICAgZGVzdC5pZCA9IHRoaXMuaWQuc2xpY2UoKTtcbiAgICAgICAgZGVzdC5uZXh0ID0gdGhpcy5uZXh0LnNsaWNlKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVzdC5zZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5zZ1tpXS5jb3B5VG8oZGVzdC5zZ1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVzdC5wcmV2U3RhdGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQ7IGkrKykge1xuICAgICAgICAgICAgZGVzdC5wcmV2U3RhdGUucHVzaCh0aGlzLnByZXZTdGF0ZVtpXS5zbGljZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBkZXN0LmtvID0gdGhpcy5rbztcbiAgICAgICAgZGVzdC50dXJuID0gdGhpcy50dXJuO1xuICAgICAgICBkZXN0Lm1vdmVDbnQgPSB0aGlzLm1vdmVDbnQ7XG4gICAgICAgIGRlc3QucmVtb3ZlQ250ID0gdGhpcy5yZW1vdmVDbnQ7XG4gICAgICAgIGRlc3QuaGlzdG9yeSA9IEFycmF5LmZyb20odGhpcy5oaXN0b3J5KTtcbiAgICB9XG5cbiAgICBwbGF5U2VxdWVuY2Uoc2VxdWVuY2UpIHtcbiAgICAgICAgZm9yIChjb25zdCB2IG9mIHNlcXVlbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkodiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVtb3ZlKHYpIHtcbiAgICAgICAgbGV0IHZUbXAgPSB2O1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbnQgKz0gMTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVbdlRtcF0gPSBfaW50ZXJzZWN0aW9uLkVNUFRZO1xuICAgICAgICAgICAgdGhpcy5pZFt2VG1wXSA9IHZUbXA7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2VG1wKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2dbdGhpcy5pZFtudl1dLmFkZCh2VG1wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHZOZXh0ID0gdGhpcy5uZXh0W3ZUbXBdO1xuICAgICAgICAgICAgdGhpcy5uZXh0W3ZUbXBdID0gdlRtcDtcbiAgICAgICAgICAgIHZUbXAgPSB2TmV4dDtcbiAgICAgICAgICAgIGlmICh2VG1wID09PSB2KSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtZXJnZSh2MSwgdjIpIHtcbiAgICAgICAgbGV0IGlkQmFzZSA9IHRoaXMuaWRbdjFdO1xuICAgICAgICBsZXQgaWRBZGQgPSB0aGlzLmlkW3YyXTtcbiAgICAgICAgaWYgKHRoaXMuc2dbaWRCYXNlXS5nZXRTaXplKCkgPCB0aGlzLnNnW2lkQWRkXS5nZXRTaXplKCkpIHtcbiAgICAgICAgICAgIGxldCB0bXAgPSBpZEJhc2U7XG4gICAgICAgICAgICBpZEJhc2UgPSBpZEFkZDtcbiAgICAgICAgICAgIGlkQWRkID0gdG1wO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZ1tpZEJhc2VdLm1lcmdlKHRoaXMuc2dbaWRBZGRdKTtcblxuICAgICAgICBsZXQgdlRtcCA9IGlkQWRkO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5pZFt2VG1wXSA9IGlkQmFzZTtcbiAgICAgICAgICAgIHZUbXAgPSB0aGlzLm5leHRbdlRtcF07XG4gICAgICAgICAgICBpZiAodlRtcCA9PT0gaWRBZGQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0bXAgPSB0aGlzLm5leHRbdjFdO1xuICAgICAgICB0aGlzLm5leHRbdjFdID0gdGhpcy5uZXh0W3YyXTtcbiAgICAgICAgdGhpcy5uZXh0W3YyXSA9IHRtcDtcbiAgICB9XG5cbiAgICBwbGFjZVN0b25lKHYpIHtcbiAgICAgICAgY29uc3Qgc3RvbmVDb2xvciA9IHRoaXMudHVybjtcbiAgICAgICAgdGhpcy5zdGF0ZVt2XSA9IHN0b25lQ29sb3I7XG4gICAgICAgIHRoaXMuaWRbdl0gPSB2O1xuICAgICAgICB0aGlzLnNnW3RoaXMuaWRbdl1dLmNsZWFyKHRydWUpO1xuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZ1t0aGlzLmlkW3ZdXS5hZGQobnYpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNnW3RoaXMuaWRbbnZdXS5zdWIodik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW252XSA9PT0gc3RvbmVDb2xvciAmJiB0aGlzLmlkW252XSAhPT0gdGhpcy5pZFt2XSkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVyZ2UodiwgbnYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQ250ID0gMDtcbiAgICAgICAgY29uc3Qgb3Bwb25lbnRTdG9uZSA9ICgwLCBfaW50ZXJzZWN0aW9uLm9wcG9uZW50T2YpKHRoaXMudHVybik7XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgbmVpZ2hib3JzKHYpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZVtudl0gPT09IG9wcG9uZW50U3RvbmUgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZShudik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBsZWdhbCh2KSB7XG4gICAgICAgIGlmICh2ID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHYgPT09IHRoaXMua28gfHwgdGhpcy5zdGF0ZVt2XSAhPT0gX2ludGVyc2VjdGlvbi5FTVBUWSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RvbmVDbnQgPSBbMCwgMF07XG4gICAgICAgIGNvbnN0IGF0ckNudCA9IFswLCAwXTtcbiAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgIGNvbnN0IGMgPSB0aGlzLnN0YXRlW252XTtcbiAgICAgICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5FTVBUWTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLkJMQUNLOlxuICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5XSElURTpcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbY10gKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2dbdGhpcy5pZFtudl1dLmdldExpYkNudCgpID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHJDbnRbY10gKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhdHJDbnRbKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikodGhpcy50dXJuKV0gIT09IDAgfHwgYXRyQ250W3RoaXMudHVybl0gPCBzdG9uZUNudFt0aGlzLnR1cm5dO1xuICAgIH1cblxuICAgIGV5ZXNoYXBlKHYsIHBsKSB7XG4gICAgICAgIGlmICh2ID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IG52IG9mIG5laWdoYm9ycyh2KSkge1xuICAgICAgICAgICAgY29uc3QgYyA9IHRoaXMuc3RhdGVbbnZdO1xuICAgICAgICAgICAgaWYgKGMgPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkgfHwgYyA9PT0gKDAsIF9pbnRlcnNlY3Rpb24ub3Bwb25lbnRPZikocGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpYWdDbnQgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgIGZvciAoY29uc3QgbnYgb2YgZGlhZ29uYWxzKHYpKSB7XG4gICAgICAgICAgICBkaWFnQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdlZGdlQ250ID0gZGlhZ0NudFsoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKShwbCldICsgKGRpYWdDbnRbM10gPiAwID8gMSA6IDApO1xuICAgICAgICBpZiAod2VkZ2VDbnQgPT09IDIpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgbnYgb2YgZGlhZ29uYWxzKHYpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbbnZdID09PSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKShwbCkgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0TGliQ250KCkgPT09IDEgJiYgdGhpcy5zZ1t0aGlzLmlkW252XV0uZ2V0VkF0cigpICE9PSB0aGlzLmtvKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2VkZ2VDbnQgPCAyO1xuICAgIH1cblxuICAgIHBsYXkodiwgbm90RmlsbEV5ZSkge1xuICAgICAgICBpZiAoIXRoaXMubGVnYWwodikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm90RmlsbEV5ZSAmJiB0aGlzLmV5ZXNoYXBlKHYsIHRoaXMudHVybikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gX2NvbnN0YW50cy5LRUVQX1BSRVZfQ05UIC0gMjsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIHRoaXMucHJldlN0YXRlW2kgKyAxXSA9IHRoaXMucHJldlN0YXRlW2ldO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJldlN0YXRlWzBdID0gdGhpcy5zdGF0ZS5zbGljZSgpO1xuICAgICAgICBpZiAodiA9PT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICB0aGlzLmtvID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGxhY2VTdG9uZSh2KTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy5pZFt2XTtcbiAgICAgICAgICAgIHRoaXMua28gPSBfY29uc3RhbnRzLlZOVUxMO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVtb3ZlQ250ID09PSAxICYmIHRoaXMuc2dbaWRdLmdldExpYkNudCgpID09PSAxICYmIHRoaXMuc2dbaWRdLmdldFNpemUoKSA9PT0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMua28gPSB0aGlzLnNnW2lkXS5nZXRWQXRyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcmV2TW92ZSA9IHY7XG4gICAgICAgIHRoaXMuaGlzdG9yeS5wdXNoKHYpO1xuICAgICAgICB0aGlzLnR1cm4gPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuICAgICAgICB0aGlzLm1vdmVDbnQgKz0gMTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmFuZG9tUGxheSgpIHtcbiAgICAgICAgY29uc3QgZW1wdHlMaXN0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zdGF0ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVbaV0gPT09IF9pbnRlcnNlY3Rpb24uRU1QVFkpIHtcbiAgICAgICAgICAgICAgICBlbXB0eUxpc3QucHVzaChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAoMCwgX3V0aWxzLnNodWZmbGUpKGVtcHR5TGlzdCk7XG4gICAgICAgIGZvciAoY29uc3QgdiBvZiBlbXB0eUxpc3QpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXkodiwgdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXkoX2NvbnN0YW50cy5QQVNTLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIF9jb25zdGFudHMuUEFTUztcbiAgICB9XG5cbiAgICBzY29yZSgpIHtcbiAgICAgICAgY29uc3Qgc3RvbmVDbnQgPSBbMCwgMF07XG4gICAgICAgIGZvciAobGV0IF92ID0gMDsgX3YgPCBfY29uc3RhbnRzLkJWQ05UOyBfdisrKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShfdik7XG4gICAgICAgICAgICBjb25zdCBzID0gdGhpcy5zdGF0ZVt2XTtcbiAgICAgICAgICAgIGlmIChzID09PSBfaW50ZXJzZWN0aW9uLkJMQUNLIHx8IHMgPT09IF9pbnRlcnNlY3Rpb24uV0hJVEUpIHtcbiAgICAgICAgICAgICAgICBzdG9uZUNudFtzXSArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYnJDbnQgPSBbMCwgMCwgMCwgMF07XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBudiBvZiBuZWlnaGJvcnModikpIHtcbiAgICAgICAgICAgICAgICAgICAgbmJyQ250W3RoaXMuc3RhdGVbbnZdXSArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmJyQ250W19pbnRlcnNlY3Rpb24uV0hJVEVdID4gMCAmJiBuYnJDbnRbX2ludGVyc2VjdGlvbi5CTEFDS10gPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvbmVDbnRbX2ludGVyc2VjdGlvbi5XSElURV0gKz0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5ickNudFtfaW50ZXJzZWN0aW9uLkJMQUNLXSA+IDAgJiYgbmJyQ250W19pbnRlcnNlY3Rpb24uV0hJVEVdID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b25lQ250W19pbnRlcnNlY3Rpb24uQkxBQ0tdICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdG9uZUNudFsxXSAtIHN0b25lQ250WzBdIC0gdGhpcy5rb21pO1xuICAgIH1cblxuICAgIHJvbGxvdXQoc2hvd0JvYXJkKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLm1vdmVDbnQgPCBfY29uc3RhbnRzLkVCVkNOVCAqIDIpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZNb3ZlID0gdGhpcy5wcmV2TW92ZTtcbiAgICAgICAgICAgIGNvbnN0IG1vdmUgPSB0aGlzLnJhbmRvbVBsYXkoKTtcbiAgICAgICAgICAgIGlmIChzaG93Qm9hcmQgJiYgbW92ZSAhPT0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1xcbm1vdmUgY291bnQ9JWQnLCB0aGlzLm1vdmVDbnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJldk1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBtb3ZlID09PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNob3dib2FyZCgpIHtcbiAgICAgICAgZnVuY3Rpb24gcHJpbnRYbGFiZWwoKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICcgICc7XG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gMTsgeCA8PSBfY29uc3RhbnRzLkJTSVpFOyB4KyspIHtcbiAgICAgICAgICAgICAgICBsaW5lU3RyICs9IGAgJHtfY29vcmRfY29udmVydC5YX0xBQkVMU1t4XX0gYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgICAgICB9XG4gICAgICAgIHByaW50WGxhYmVsKCk7XG4gICAgICAgIGZvciAobGV0IHkgPSBfY29uc3RhbnRzLkJTSVpFOyB5ID4gMDsgeS0tKSB7XG4gICAgICAgICAgICBsZXQgbGluZVN0ciA9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGZvciAobGV0IHggPSAxOyB4IDw9IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHYgPSAoMCwgX2Nvb3JkX2NvbnZlcnQueHkyZXYpKHgsIHkpO1xuICAgICAgICAgICAgICAgIGxldCB4U3RyO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZVt2XSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIF9pbnRlcnNlY3Rpb24uQkxBQ0s6XG4gICAgICAgICAgICAgICAgICAgICAgICB4U3RyID0gdiA9PT0gdGhpcy5wcmV2TW92ZSA/ICdbWF0nIDogJyBYICc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfaW50ZXJzZWN0aW9uLldISVRFOlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9IHYgPT09IHRoaXMucHJldk1vdmUgPyAnW09dJyA6ICcgTyAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2ludGVyc2VjdGlvbi5FTVBUWTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHhTdHIgPSAnIC4gJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgeFN0ciA9ICcgPyAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsaW5lU3RyICs9IHhTdHI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaW5lU3RyICs9ICgnICcgKyB5LnRvU3RyaW5nKCkpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGxpbmVTdHIpO1xuICAgICAgICB9XG4gICAgICAgIHByaW50WGxhYmVsKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9XG5cbiAgICBmZWF0dXJlKCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IChwLCBmKSA9PiBwICogX2NvbnN0YW50cy5GRUFUVVJFX0NOVCArIGY7XG4gICAgICAgIGNvbnN0IGFycmF5ID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICogX2NvbnN0YW50cy5GRUFUVVJFX0NOVCk7XG4gICAgICAgIGNvbnN0IG15ID0gdGhpcy50dXJuO1xuICAgICAgICBjb25zdCBvcHAgPSAoMCwgX2ludGVyc2VjdGlvbi5vcHBvbmVudE9mKSh0aGlzLnR1cm4pO1xuXG4gICAgICAgIGNvbnN0IE4gPSBfY29uc3RhbnRzLktFRVBfUFJFVl9DTlQgKyAxO1xuICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgYXJyYXlbaW5kZXgocCwgMCldID0gdGhpcy5zdGF0ZVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgcCA9IDA7IHAgPCBfY29uc3RhbnRzLkJWQ05UOyBwKyspIHtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIE4pXSA9IHRoaXMuc3RhdGVbKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jb25zdGFudHMuS0VFUF9QUkVWX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIGkgKyAxKV0gPSB0aGlzLnByZXZTdGF0ZVtpXVsoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHApXSA9PT0gbXkgPyAxLjAgOiAwLjA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBwID0gMDsgcCA8IF9jb25zdGFudHMuQlZDTlQ7IHArKykge1xuICAgICAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIE4gKyBpICsgMSldID0gdGhpcy5wcmV2U3RhdGVbaV1bKDAsIF9jb29yZF9jb252ZXJ0LnJ2MmV2KShwKV0gPT09IG9wcCA/IDEuMCA6IDAuMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgaXNfYmxhY2tfdHVybiwgaXNfd2hpdGVfdHVybjtcbiAgICAgICAgaWYgKG15ID09PSBfaW50ZXJzZWN0aW9uLkJMQUNLKSB7XG4gICAgICAgICAgICBpc19ibGFja190dXJuID0gMS4wO1xuICAgICAgICAgICAgaXNfd2hpdGVfdHVybiA9IDAuMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzX2JsYWNrX3R1cm4gPSAwLjA7XG4gICAgICAgICAgICBpc193aGl0ZV90dXJuID0gMS4wO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHAgPSAwOyBwIDwgX2NvbnN0YW50cy5CVkNOVDsgcCsrKSB7XG4gICAgICAgICAgICBhcnJheVtpbmRleChwLCBfY29uc3RhbnRzLkZFQVRVUkVfQ05UIC0gMildID0gaXNfYmxhY2tfdHVybjtcbiAgICAgICAgICAgIGFycmF5W2luZGV4KHAsIF9jb25zdGFudHMuRkVBVFVSRV9DTlQgLSAxKV0gPSBpc193aGl0ZV90dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhcnJheTtcbiAgICB9XG5cbiAgICBoYXNoKCkge1xuICAgICAgICByZXR1cm4gKDAsIF91dGlscy5oYXNoKSgodGhpcy5zdGF0ZS50b1N0cmluZygpICsgdGhpcy5wcmV2U3RhdGVbMF0udG9TdHJpbmcoKSArIHRoaXMudHVybi50b1N0cmluZygpKS5yZXBsYWNlKCcsJywgJycpKTtcbiAgICB9XG5cbiAgICBjYW5kaWRhdGVzKCkge1xuICAgICAgICBjb25zdCBjYW5kTGlzdCA9IFtdO1xuICAgICAgICBmb3IgKGxldCB2ID0gMDsgdiA8IHRoaXMuc3RhdGUubGVuZ3RoOyB2KyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlW3ZdID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZICYmIHRoaXMubGVnYWwodikgJiYgIXRoaXMuZXllc2hhcGUodiwgdGhpcy50dXJuKSkge1xuICAgICAgICAgICAgICAgIGNhbmRMaXN0LnB1c2goKDAsIF9jb29yZF9jb252ZXJ0LmV2MnJ2KSh2KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FuZExpc3QucHVzaCgoMCwgX2Nvb3JkX2NvbnZlcnQuZXYycnYpKF9jb25zdGFudHMuUEFTUykpO1xuICAgICAgICByZXR1cm4gbmV3IENhbmRpZGF0ZXModGhpcy5oYXNoKCksIHRoaXMubW92ZUNudCwgY2FuZExpc3QpO1xuICAgIH1cblxuICAgIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IFJPTExfT1VUX05VTSA9IDI1NjtcbiAgICAgICAgY29uc3QgZG91YmxlU2NvcmVMaXN0ID0gW107XG4gICAgICAgIGxldCBiQ3B5ID0gbmV3IEJvYXJkKHRoaXMua29taSk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgUk9MTF9PVVRfTlVNOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuY29weVRvKGJDcHkpO1xuICAgICAgICAgICAgYkNweS5yb2xsb3V0KGZhbHNlKTtcbiAgICAgICAgICAgIGRvdWJsZVNjb3JlTGlzdC5wdXNoKGJDcHkuc2NvcmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgwLCBfdXRpbHMubW9zdENvbW1vbikoZG91YmxlU2NvcmVMaXN0KTtcbiAgICB9XG59XG5leHBvcnRzLkJvYXJkID0gQm9hcmQ7IC8qXG4gICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHRlc3RCb2FyZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGIgPSBuZXcgQm9hcmQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGIucGxheVNlcXVlbmNlKFsnQTEnLCAnQTInLCAnQTknLCAnQjEnXS5tYXAoc3RyMmV2KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBiLnNob3dib2FyZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHRlc3RCb2FyZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAqLyIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuLy8vIOeigeebpOOBruOCteOCpOOCuuOBp+OBmeOAglxuY29uc3QgQlNJWkUgPSBleHBvcnRzLkJTSVpFID0gMTk7XG5cbi8vLyDlpJbmnqDjgpLmjIHjgaTmi6HlvLXnooHnm6Tjga7jgrXjgqTjgrrjgafjgZnjgIJcbmNvbnN0IEVCU0laRSA9IGV4cG9ydHMuRUJTSVpFID0gQlNJWkUgKyAyO1xuXG4vLy8g56KB55uk44Gu5Lqk54K544Gu5pWw44Gn44GZ44CCXG5jb25zdCBCVkNOVCA9IGV4cG9ydHMuQlZDTlQgPSBCU0laRSAqIEJTSVpFO1xuXG4vLy8g5ouh5by156KB55uk44Gu5Lqk54K544Gu5pWw44Gn44GZ44CCXG5jb25zdCBFQlZDTlQgPSBleHBvcnRzLkVCVkNOVCA9IEVCU0laRSAqIEVCU0laRTtcblxuLy8vIOODkeOCueOCkuihqOOBmee3muW9ouW6p+aomeOBp+OBmeOAgumAmuW4uOOBruedgOaJi+OBr+aLoeW8teeigeebpOOBrue3muW9ouW6p+aomeOBp+ihqOOBl+OBvuOBmeOAglxuLy8gVE9ETyAtIOedgOaJi+OBruOBn+OCgeOBq+WIl+aMmeWei+OCkuS9nOOBo+OBn+OBu+OBhuOBjOmWouaVsOOBruOCt+OCsOODi+ODgeODo+OBr+iqreOBv+OChOOBmeOBhOOAglxuY29uc3QgUEFTUyA9IGV4cG9ydHMuUEFTUyA9IEVCVkNOVDtcblxuLy8vIOe3muW9ouW6p+aomeOBruODl+ODrOODvOOCueODm+ODq+ODgOODvOOBruacquS9v+eUqOOCkuekuuOBmeWApOOBp+OBmeOAglxuLy8gVE9ETyAtIOipsuW9k+OBmeOCi+WgtOaJgOOBq09wdGlvbjx1c2l6ZT7jgpLkvb/jgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFZOVUxMID0gZXhwb3J0cy5WTlVMTCA9IEVCVkNOVCArIDE7XG5cbi8vLyBOTuOBuOOBruWFpeWKm+OBq+mWouOBmeOCi+WxpeattOOBrua3seOBleOBp+OBmeOAglxuY29uc3QgS0VFUF9QUkVWX0NOVCA9IGV4cG9ydHMuS0VFUF9QUkVWX0NOVCA9IDc7XG5cbi8vLyBOTuOBuOOBruWFpeWKm+ODleOCo+ODvOODgeODo+ODvOOBruaVsOOBp+OBmeOAglxuY29uc3QgRkVBVFVSRV9DTlQgPSBleHBvcnRzLkZFQVRVUkVfQ05UID0gS0VFUF9QUkVWX0NOVCAqIDIgKyA0OyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5YX0xBQkVMUyA9IHVuZGVmaW5lZDtcbmV4cG9ydHMubW92ZTJ4eSA9IG1vdmUyeHk7XG5leHBvcnRzLmV2Mnh5ID0gZXYyeHk7XG5leHBvcnRzLnh5MmV2ID0geHkyZXY7XG5leHBvcnRzLnJ2MmV2ID0gcnYyZXY7XG5leHBvcnRzLmV2MnJ2ID0gZXYycnY7XG5leHBvcnRzLmV2MnN0ciA9IGV2MnN0cjtcbmV4cG9ydHMuc3RyMmV2ID0gc3RyMmV2O1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbmNvbnN0IFhfTEFCRUxTID0gZXhwb3J0cy5YX0xBQkVMUyA9ICdAQUJDREVGR0hKS0xNTk9QUVJTVCc7XG5cbmZ1bmN0aW9uIG1vdmUyeHkocykge1xuICAgIGNvbnN0IE9GRlNFVCA9ICdhJy5jaGFyQ29kZUF0KDApIC0gMTtcbiAgICByZXR1cm4gW3MuY2hhckNvZGVBdCgwKSAtIE9GRlNFVCwgX2NvbnN0YW50cy5CU0laRSArIDEgLSAocy5jaGFyQ29kZUF0KDEpIC0gT0ZGU0VUKV07XG59XG5cbmZ1bmN0aW9uIGV2Mnh5KGV2KSB7XG4gICAgcmV0dXJuIFtldiAlIF9jb25zdGFudHMuRUJTSVpFLCBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUpXTtcbn1cblxuZnVuY3Rpb24geHkyZXYoeCwgeSkge1xuICAgIHJldHVybiB5ICogX2NvbnN0YW50cy5FQlNJWkUgKyB4O1xufVxuXG5mdW5jdGlvbiBydjJldihydikge1xuICAgIHJldHVybiBydiA9PT0gX2NvbnN0YW50cy5CVkNOVCA/IF9jb25zdGFudHMuUEFTUyA6IHJ2ICUgX2NvbnN0YW50cy5CU0laRSArIDEgKyBNYXRoLmZsb29yKHJ2IC8gX2NvbnN0YW50cy5CU0laRSArIDEpICogX2NvbnN0YW50cy5FQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnJ2KGV2KSB7XG4gICAgcmV0dXJuIGV2ID09PSBfY29uc3RhbnRzLlBBU1MgPyBfY29uc3RhbnRzLkJWQ05UIDogZXYgJSBfY29uc3RhbnRzLkVCU0laRSAtIDEgKyBNYXRoLmZsb29yKGV2IC8gX2NvbnN0YW50cy5FQlNJWkUgLSAxKSAqIF9jb25zdGFudHMuQlNJWkU7XG59XG5cbmZ1bmN0aW9uIGV2MnN0cihldikge1xuICAgIGlmIChldiA+PSBfY29uc3RhbnRzLlBBU1MpIHtcbiAgICAgICAgcmV0dXJuICdwYXNzJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBbeCwgeV0gPSBldjJ4eShldik7XG4gICAgICAgIHJldHVybiBYX0xBQkVMUy5jaGFyQXQoeCkgKyB5LnRvU3RyaW5nKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdHIyZXYodikge1xuICAgIGNvbnN0IHZTdHIgPSB2LnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKHZTdHIgPT09ICdQQVNTJyB8fCB2U3RyID09PSAnUkVTSUdOJykge1xuICAgICAgICByZXR1cm4gX2NvbnN0YW50cy5QQVNTO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHggPSBYX0xBQkVMUy5pbmRleE9mKHZTdHIuY2hhckF0KDApKTtcbiAgICAgICAgY29uc3QgeSA9IHBhcnNlSW50KHZTdHIuc2xpY2UoMSkpO1xuICAgICAgICByZXR1cm4geHkyZXYoeCwgeSk7XG4gICAgfVxufSIsIlwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLm9wcG9uZW50T2YgPSBvcHBvbmVudE9mO1xuY29uc3QgV0hJVEUgPSBleHBvcnRzLldISVRFID0gMDtcbmNvbnN0IEJMQUNLID0gZXhwb3J0cy5CTEFDSyA9IDE7XG5cbmZ1bmN0aW9uIG9wcG9uZW50T2YoY29sb3IpIHtcbiAgICBzd2l0Y2ggKGNvbG9yKSB7XG4gICAgICAgIGNhc2UgV0hJVEU6XG4gICAgICAgICAgICByZXR1cm4gQkxBQ0s7XG4gICAgICAgIGNhc2UgQkxBQ0s6XG4gICAgICAgICAgICByZXR1cm4gV0hJVEU7XG4gICAgfVxufVxuXG5jb25zdCBFTVBUWSA9IGV4cG9ydHMuRU1QVFkgPSAyO1xuY29uc3QgRVhURVJJT1IgPSBleHBvcnRzLkVYVEVSSU9SID0gMzsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IHVuZGVmaW5lZDtcblxudmFyIF93b3JrZXJSbWkgPSByZXF1aXJlKCd3b3JrZXItcm1pJyk7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qIGdsb2JhbCAqL1xuY2xhc3MgTmV1cmFsTmV0d29yayBleHRlbmRzIF93b3JrZXJSbWkuV29ya2VyUk1JIHtcbiAgICBhc3luYyBldmFsdWF0ZSguLi5pbnB1dHMpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5pbnZva2VSTSgnZXZhbHVhdGUnLCBpbnB1dHMpO1xuICAgICAgICByZXN1bHRbMF0gPSAoMCwgX3V0aWxzLnNvZnRtYXgpKHJlc3VsdFswXSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufVxuZXhwb3J0cy5OZXVyYWxOZXR3b3JrID0gTmV1cmFsTmV0d29yazsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuVHJlZSA9IHVuZGVmaW5lZDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxudmFyIF9ib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcblxudmFyIF9pbnRlcnNlY3Rpb24gPSByZXF1aXJlKCcuL2ludGVyc2VjdGlvbi5qcycpO1xuXG5jb25zdCBNQVhfTk9ERV9DTlQgPSAxNjM4NDtcbmNvbnN0IEVYUEFORF9DTlQgPSA4O1xuXG5sZXQgVFJFRV9DUCA9IDIuMDtcblxuY2xhc3MgVHJlZSB7XG4gICAgY29uc3RydWN0b3Iobm4pIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IDAuMDtcbiAgICAgICAgdGhpcy5ieW95b21pID0gMS4wO1xuICAgICAgICB0aGlzLmxlZnRUaW1lID0gMC4wO1xuICAgICAgICB0aGlzLm5vZGUgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNQVhfTk9ERV9DTlQ7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnB1c2gobmV3IE5vZGUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ub2RlQ250ID0gMDtcbiAgICAgICAgdGhpcy5yb290SWQgPSAwO1xuICAgICAgICB0aGlzLnJvb3RNb3ZlQ250ID0gMDtcbiAgICAgICAgdGhpcy5ub2RlSGFzaHMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuZXZhbENudCA9IDA7XG4gICAgICAgIHRoaXMubm4gPSBubjtcbiAgICB9XG5cbiAgICBzZXRUaW1lKG1haW5UaW1lLCBieW95b21pKSB7XG4gICAgICAgIHRoaXMubWFpblRpbWUgPSBtYWluVGltZTtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgIH1cblxuICAgIHNldExlZnRUaW1lKGxlZnRUaW1lKSB7XG4gICAgICAgIHRoaXMubGVmdFRpbWUgPSBsZWZ0VGltZTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5sZWZ0VGltZSA9IHRoaXMubWFpblRpbWU7XG4gICAgICAgIGZvciAoY29uc3QgbmQgb2YgdGhpcy5ub2RlKSB7XG4gICAgICAgICAgICBuZC5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubm9kZUNudCA9IDA7XG4gICAgICAgIHRoaXMucm9vdElkID0gMDtcbiAgICAgICAgdGhpcy5yb290TW92ZUNudCA9IDA7XG4gICAgICAgIHRoaXMubm9kZUhhc2hzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuZXZhbENudCA9IDA7XG4gICAgfVxuXG4gICAgZGVsZXRlTm9kZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubm9kZUNudCA8IE1BWF9OT0RFX0NOVCAvIDIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9OT0RFX0NOVDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBtYyA9IHRoaXMubm9kZVtpXS5tb3ZlQ250O1xuICAgICAgICAgICAgaWYgKG1jICE9IG51bGwgJiYgbWMgPCB0aGlzLnJvb3RNb3ZlQ250KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlSGFzaHMuZGVsZXRlKHRoaXMubm9kZVtpXS5oYXNoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm5vZGVbaV0uY2xlYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNyZWF0ZU5vZGUoYiwgcHJvYikge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gYi5jYW5kaWRhdGVzKCk7XG4gICAgICAgIGNvbnN0IGhzID0gY2FuZGlkYXRlcy5oYXNoO1xuICAgICAgICBpZiAodGhpcy5ub2RlSGFzaHMuaGFzKGhzKSkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZUlkID0gdGhpcy5ub2RlSGFzaHMuZ2V0KGhzKTtcbiAgICAgICAgICAgIGlmICh0aGlzLm5vZGVbbm9kZUlkXS5oYXNoID09PSBocyAmJiB0aGlzLm5vZGVbbm9kZUlkXS5tb3ZlQ250ID09PSBjYW5kaWRhdGVzLm1vdmVDbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZUlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5vZGVJZCA9IGhzICUgTUFYX05PREVfQ05UO1xuXG4gICAgICAgIHdoaWxlICh0aGlzLm5vZGVbbm9kZUlkXS5tb3ZlQ250ICE9IC0xKSB7XG4gICAgICAgICAgICBub2RlSWQgPSBub2RlSWQgKyAxIDwgTUFYX05PREVfQ05UID8gbm9kZUlkICsgMSA6IDA7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm5vZGVIYXNocy5zZXQoaHMsIG5vZGVJZCk7XG4gICAgICAgIHRoaXMubm9kZUNudCArPSAxO1xuXG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIG5kLmNsZWFyKCk7XG4gICAgICAgIG5kLm1vdmVDbnQgPSBjYW5kaWRhdGVzLm1vdmVDbnQ7XG4gICAgICAgIG5kLmhhc2ggPSBocztcbiAgICAgICAgbmQuaW5pdEJyYW5jaCgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgcnYgb2YgKDAsIF91dGlscy5hcmdzb3J0KShwcm9iLCB0cnVlKSkge1xuICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZXMubGlzdC5pbmNsdWRlcyhydikpIHtcbiAgICAgICAgICAgICAgICBuZC5tb3ZlW25kLmJyYW5jaENudF0gPSAoMCwgX2Nvb3JkX2NvbnZlcnQucnYyZXYpKHJ2KTtcbiAgICAgICAgICAgICAgICBuZC5wcm9iW25kLmJyYW5jaENudF0gPSBwcm9iW3J2XTtcbiAgICAgICAgICAgICAgICBuZC5icmFuY2hDbnQgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZUlkO1xuICAgIH1cblxuICAgIGJlc3RCeVVDQihiLCBub2RlSWQpIHtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgY29uc3QgbmRSYXRlID0gbmQudG90YWxDbnQgPT09IDAgPyAwLjAgOiBuZC50b3RhbFZhbHVlIC8gbmQudG90YWxDbnQ7XG4gICAgICAgIGNvbnN0IGNwc3YgPSBUUkVFX0NQICogTWF0aC5zcXJ0KG5kLnRvdGFsQ250KTtcbiAgICAgICAgY29uc3QgYWN0aW9uVmFsdWUgPSBuZXcgRmxvYXQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY3Rpb25WYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYWN0aW9uVmFsdWVbaV0gPSBuZC52aXNpdENudFtpXSA9PT0gMCA/IG5kUmF0ZSA6IG5kLnZhbHVlV2luW2ldIC8gbmQudmlzaXRDbnRbaV07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdWNiID0gbmV3IEZsb2F0MzJBcnJheShuZC5icmFuY2hDbnQpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVjYi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdWNiW2ldID0gYWN0aW9uVmFsdWVbaV0gKyBjcHN2ICogbmQucHJvYltpXSAvIChuZC52aXNpdENudFtpXSArIDEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGJlc3QgPSAoMCwgX3V0aWxzLmFyZ21heCkodWNiKTtcbiAgICAgICAgY29uc3QgbmV4dElkID0gbmQubmV4dElkW2Jlc3RdO1xuICAgICAgICBjb25zdCBuZXh0TW92ZSA9IG5kLm1vdmVbYmVzdF07XG4gICAgICAgIGNvbnN0IGlzSGVhZE5vZGUgPSAhdGhpcy5oYXNOZXh0KG5vZGVJZCwgYmVzdCwgYi5nZXRNb3ZlQ250KCkgKyAxKSB8fCBuZC52aXNpdENudFtiZXN0XSA8IEVYUEFORF9DTlQgfHwgYi5nZXRNb3ZlQ250KCkgPiBfY29uc3RhbnRzLkJWQ05UICogMiB8fCBuZXh0TW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTICYmIGIuZ2V0UHJldk1vdmUoKSA9PT0gX2NvbnN0YW50cy5QQVNTO1xuICAgICAgICByZXR1cm4gW2Jlc3QsIG5leHRJZCwgbmV4dE1vdmUsIGlzSGVhZE5vZGVdO1xuICAgIH1cblxuICAgIHNob3VsZFNlYXJjaChiZXN0LCBzZWNvbmQpIHtcbiAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbdGhpcy5yb290SWRdO1xuICAgICAgICBjb25zdCB3aW5SYXRlID0gdGhpcy5icmFuY2hSYXRlKG5kLCBiZXN0KTtcblxuICAgICAgICByZXR1cm4gbmQudG90YWxDbnQgPD0gNTAwMCB8fCBuZC52aXNpdENudFtiZXN0XSA8PSBuZC52aXNpdENudFtzZWNvbmRdICogMTAwICYmIHdpblJhdGUgPj0gMC4xICYmIHdpblJhdGUgPD0gMC45O1xuICAgIH1cblxuICAgIGdldFNlYXJjaFRpbWUoKSB7XG4gICAgICAgIGlmICh0aGlzLm1haW5UaW1lID09PSAwLjAgfHwgdGhpcy5sZWZ0VGltZSA8IHNlbGYuYnlveW9taSAqIDIuMCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgubWF4KHRoaXMuYnlveW9taSwgMS4wKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxlZnRUaW1lIC8gKDU1LjAgKyBNYXRoLm1heCg1MCAtIHRoaXMucm9vdE1vdmVDbnQsIDApKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhhc05leHQobm9kZUlkLCBicklkLCBtb3ZlQ250KSB7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIGNvbnN0IG5leHRJZCA9IG5kLm5leHRJZFticklkXTtcbiAgICAgICAgcmV0dXJuIG5leHRJZCA+PSAwICYmIG5kLm5leHRIYXNoW2JySWRdID09PSB0aGlzLm5vZGVbbmV4dElkXS5oYXNoICYmIHRoaXMubm9kZVtuZXh0SWRdLm1vdmVDbnQgPT09IG1vdmVDbnQ7XG4gICAgfVxuXG4gICAgYnJhbmNoUmF0ZShuZCwgaWQpIHtcbiAgICAgICAgcmV0dXJuIG5kLnZhbHVlV2luW2lkXSAvIE1hdGgubWF4KG5kLnZpc2l0Q250W2lkXSwgMSkgLyAyLjAgKyAwLjU7XG4gICAgfVxuXG4gICAgYmVzdFNlcXVlbmNlKG5vZGVJZCwgaGVhZE1vdmUpIHtcbiAgICAgICAgbGV0IHNlcVN0ciA9ICgnICAgJyArICgwLCBfY29vcmRfY29udmVydC5ldjJzdHIpKGhlYWRNb3ZlKSkuc2xpY2UoLTUpO1xuICAgICAgICBsZXQgbmV4dE1vdmUgPSBoZWFkTW92ZTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDc7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbmQgPSB0aGlzLm5vZGVbbm9kZUlkXTtcbiAgICAgICAgICAgIGlmIChuZXh0TW92ZSA9PT0gX2NvbnN0YW50cy5QQVNTIHx8IG5kLmJyYW5jaENudCA8IDEpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYmVzdCA9ICgwLCBfdXRpbHMuYXJnbWF4KShuZC52aXNpdENudC5zbGljZSgwLCBuZC5icmFuY2hDbnQpKTtcbiAgICAgICAgICAgIGlmIChuZC52aXNpdENudFtiZXN0XSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dE1vdmUgPSBuZC5tb3ZlW2Jlc3RdO1xuICAgICAgICAgICAgc2VxU3RyICs9ICctPicgKyAoJyAgICcgKyAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShuZXh0TW92ZSkpLnNsaWNlKC01KTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmhhc05leHQobm9kZUlkLCBiZXN0LCBuZC5tb3ZlQ250ICsgMSkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGVJZCA9IG5kLm5leHRJZFtiZXN0XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZXFTdHI7XG4gICAgfVxuXG4gICAgcHJpbnRJbmZvKG5vZGVJZCkge1xuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVtub2RlSWRdO1xuICAgICAgICBjb25zdCBvcmRlciA9ICgwLCBfdXRpbHMuYXJnc29ydCkobmQudmlzaXRDbnQuc2xpY2UoMCwgbmQuYnJhbmNoQ250KSwgdHJ1ZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCd8bW92ZXxjb3VudCAgfHJhdGUgfHZhbHVlfHByb2IgfCBiZXN0IHNlcXVlbmNlJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4ob3JkZXIubGVuZ3RoLCA5KTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBtID0gb3JkZXJbaV07XG4gICAgICAgICAgICBjb25zdCB2aXNpdENudCA9IG5kLnZpc2l0Q250W21dO1xuICAgICAgICAgICAgaWYgKHZpc2l0Q250ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhdGUgPSB2aXNpdENudCA9PT0gMCA/IDAuMCA6IHRoaXMuYnJhbmNoUmF0ZShuZCwgbSkgKiAxMDAuMDtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5kLnZhbHVlW21dIC8gMi4wICsgMC41KSAqIDEwMC4wO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3wlc3wlc3wlc3wlc3wlc3wgJXMnLCAoJyAgICcgKyAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShuZC5tb3ZlW21dKSkuc2xpY2UoLTQpLCAodmlzaXRDbnQgKyAnICAgICAgJykuc2xpY2UoMCwgNyksICgnICAnICsgcmF0ZS50b0ZpeGVkKDEpKS5zbGljZSgtNSksICgnICAnICsgdmFsdWUudG9GaXhlZCgxKSkuc2xpY2UoLTUpLCAoJyAgJyArIChuZC5wcm9iW21dICogMTAwLjApLnRvRml4ZWQoMSkpLnNsaWNlKC01KSwgdGhpcy5iZXN0U2VxdWVuY2UobmQubmV4dElkW21dLCBuZC5tb3ZlW21dKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwcmVTZWFyY2goYikge1xuICAgICAgICBjb25zdCBbcHJvYl0gPSBhd2FpdCB0aGlzLm5uLmV2YWx1YXRlKGIuZmVhdHVyZSgpKTtcbiAgICAgICAgdGhpcy5yb290SWQgPSB0aGlzLmNyZWF0ZU5vZGUoYiwgcHJvYik7XG4gICAgICAgIHRoaXMucm9vdE1vdmVDbnQgPSBiLmdldE1vdmVDbnQoKTtcbiAgICAgICAgVFJFRV9DUCA9IHRoaXMucm9vdE1vdmVDbnQgPCA4ID8gMC4wMSA6IDEuNTtcbiAgICB9XG5cbiAgICBhc3luYyBldmFsdWF0ZUNoaWxkTm9kZShiLCBub2RlSWQsIGNoaWxkKSB7XG4gICAgICAgIGxldCBbcHJvYiwgdmFsdWVdID0gYXdhaXQgdGhpcy5ubi5ldmFsdWF0ZShiLmZlYXR1cmUoKSk7XG4gICAgICAgIHRoaXMuZXZhbENudCArPSAxO1xuICAgICAgICBpZiAoYi50dXJuID09PSBfaW50ZXJzZWN0aW9uLldISVRFKSB7XG4gICAgICAgICAgICB2YWx1ZVswXSA9IC12YWx1ZVswXTsgLy9FTEYgT3Blbkdv5LuV5qeY44KSTGVlbGEgWmVyby9QeWFx5LuV5qeY44Gr5ZCI44KP44Gb44KLXG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSAtdmFsdWVbMF07XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIG5kLnZhbHVlW2NoaWxkXSA9IHZhbHVlO1xuICAgICAgICBuZC5ldmFsdWF0ZWRbY2hpbGRdID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMubm9kZUNudCA+IDAuODUgKiBNQVhfTk9ERV9DTlQpIHtcbiAgICAgICAgICAgIHRoaXMuZGVsZXRlTm9kZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5leHRJZCA9IHRoaXMuY3JlYXRlTm9kZShiLCBwcm9iKTtcbiAgICAgICAgbmQubmV4dElkW2NoaWxkXSA9IG5leHRJZDtcbiAgICAgICAgbmQubmV4dEhhc2hbY2hpbGRdID0gYi5oYXNoKCk7XG4gICAgICAgIG5kLnRvdGFsVmFsdWUgLT0gbmQudmFsdWVXaW5bY2hpbGRdO1xuICAgICAgICBuZC50b3RhbENudCArPSBuZC52aXNpdENudFtjaGlsZF07XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBhc3luYyBzZWFyY2hCcmFuY2goYiwgbm9kZUlkLCByb3V0ZSkge1xuICAgICAgICBjb25zdCBbYmVzdCwgbmV4dElkLCBuZXh0TW92ZSwgaXNIZWFkTm9kZV0gPSB0aGlzLmJlc3RCeVVDQihiLCBub2RlSWQpO1xuICAgICAgICByb3V0ZS5wdXNoKFtub2RlSWQsIGJlc3RdKTtcbiAgICAgICAgYi5wbGF5KG5leHRNb3ZlLCBmYWxzZSk7XG4gICAgICAgIGNvbnN0IG5kID0gdGhpcy5ub2RlW25vZGVJZF07XG4gICAgICAgIGNvbnN0IHZhbHVlID0gaXNIZWFkTm9kZSA/IG5kLmV2YWx1YXRlZFtiZXN0XSA/IG5kLnZhbHVlW2Jlc3RdIDogYXdhaXQgdGhpcy5ldmFsdWF0ZUNoaWxkTm9kZShiLCBub2RlSWQsIGJlc3QpIDogLShhd2FpdCB0aGlzLnNlYXJjaEJyYW5jaChiLCBuZXh0SWQsIHJvdXRlKSk7XG4gICAgICAgIG5kLnRvdGFsVmFsdWUgKz0gdmFsdWU7XG4gICAgICAgIG5kLnRvdGFsQ250ICs9IDE7XG4gICAgICAgIG5kLnZhbHVlV2luW2Jlc3RdICs9IHZhbHVlO1xuICAgICAgICBuZC52aXNpdENudFtiZXN0XSArPSAxO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgYXN5bmMga2VlcFBsYXlvdXQoYiwgZXhpdENvbmRpdGlvbikge1xuICAgICAgICB0aGlzLmV2YWxDbnQgPSAwO1xuICAgICAgICBsZXQgYkNweSA9IG5ldyBfYm9hcmQuQm9hcmQoKTtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIGIuY29weVRvKGJDcHkpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZWFyY2hCcmFuY2goYkNweSwgdGhpcy5yb290SWQsIFtdKTtcbiAgICAgICAgICAgIGlmIChleGl0Q29uZGl0aW9uKCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIF9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbiwgZXhpdENvbmRpdGlvbikge1xuICAgICAgICBsZXQgW2Jlc3QsIHNlY29uZF0gPSB0aGlzLm5vZGVbdGhpcy5yb290SWRdLmJlc3QyKCk7XG4gICAgICAgIGlmIChwb25kZXIgfHwgdGhpcy5zaG91bGRTZWFyY2goYmVzdCwgc2Vjb25kKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5rZWVwUGxheW91dChiLCBleGl0Q29uZGl0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGJlc3QyID0gdGhpcy5ub2RlW3RoaXMucm9vdElkXS5iZXN0MigpO1xuICAgICAgICAgICAgYmVzdCA9IGJlc3QyWzBdO1xuICAgICAgICAgICAgc2Vjb25kID0gYmVzdDJbMV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZCA9IHRoaXMubm9kZVt0aGlzLnJvb3RJZF07XG4gICAgICAgIGxldCBuZXh0TW92ZSA9IG5kLm1vdmVbYmVzdF07XG4gICAgICAgIGxldCB3aW5SYXRlID0gdGhpcy5icmFuY2hSYXRlKG5kLCBiZXN0KTtcblxuICAgICAgICBpZiAoY2xlYW4gJiYgbmV4dE1vdmUgPT09IF9jb25zdGFudHMuUEFTUyAmJiBuZC52YWx1ZVdpbltiZXN0XSAqIG5kLnZhbHVlV2luW3NlY29uZF0gPiAwLjApIHtcbiAgICAgICAgICAgIG5leHRNb3ZlID0gbmQubW92ZVtzZWNvbmRdO1xuICAgICAgICAgICAgd2luUmF0ZSA9IHRoaXMuYnJhbmNoUmF0ZShuZCwgc2Vjb25kKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW25leHRNb3ZlLCB3aW5SYXRlXTtcbiAgICB9XG5cbiAgICBhc3luYyBzZWFyY2goYiwgdGltZSwgcG9uZGVyLCBjbGVhbikge1xuICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgIGF3YWl0IHRoaXMucHJlU2VhcmNoKGIpO1xuXG4gICAgICAgIGlmICh0aGlzLm5vZGVbdGhpcy5yb290SWRdLmJyYW5jaENudCA8PSAxKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZDonLCB0aGlzLnJvb3RNb3ZlQ250ICsgMSk7XG4gICAgICAgICAgICB0aGlzLnByaW50SW5mbyh0aGlzLnJvb3RJZCk7XG4gICAgICAgICAgICByZXR1cm4gW19jb25zdGFudHMuUEFTUywgMC41XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGVsZXRlTm9kZSgpO1xuXG4gICAgICAgIGNvbnN0IHRpbWVfID0gKHRpbWUgPT09IDAuMCA/IHRoaXMuZ2V0U2VhcmNoVGltZSgpIDogdGltZSkgKiAxMDAwIC0gNTAwOyAvLyAwLjXnp5LjgYzjg57jg7zjgrjjg7NcbiAgICAgICAgaWYgKHBvbmRlcikge1xuICAgICAgICAgICAgc2VsZi5QT05ERVJfU1RPUCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IFtuZXh0TW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLl9zZWFyY2goYiwgcG9uZGVyLCBjbGVhbiwgcG9uZGVyID8gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuUE9OREVSX1NUT1A7XG4gICAgICAgIH0gOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHN0YXJ0ID4gdGltZV87XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcG9uZGVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnXFxubW92ZSBjb3VudD0lZDogbGVmdCB0aW1lPSVzW3NlY10gZXZhbHVhdGVkPSVkJywgdGhpcy5yb290TW92ZUNudCArIDEsIE1hdGgubWF4KHRoaXMubGVmdFRpbWUgLSB0aW1lLCAwLjApLnRvRml4ZWQoMSksIHRoaXMuZXZhbENudCk7XG4gICAgICAgICAgICB0aGlzLnByaW50SW5mbyh0aGlzLnJvb3RJZCk7XG4gICAgICAgICAgICB0aGlzLmxlZnRUaW1lID0gdGhpcy5sZWZ0VGltZSAtIChEYXRlLm5vdygpIC0gc3RhcnQpIC8gMTAwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbbmV4dE1vdmUsIHdpblJhdGVdO1xuICAgIH1cbn1cblxuZXhwb3J0cy5UcmVlID0gVHJlZTtcbmNsYXNzIE5vZGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm1vdmUgPSBuZXcgVWludDE2QXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLnByb2IgPSBuZXcgRmxvYXQzMkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy52YWx1ZSA9IG5ldyBGbG9hdDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLnZhbHVlV2luID0gbmV3IEZsb2F0MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMudmlzaXRDbnQgPSBuZXcgVWludDMyQXJyYXkoX2NvbnN0YW50cy5CVkNOVCArIDEpO1xuICAgICAgICB0aGlzLm5leHRJZCA9IG5ldyBJbnQxNkFycmF5KF9jb25zdGFudHMuQlZDTlQgKyAxKTtcbiAgICAgICAgdGhpcy5uZXh0SGFzaCA9IG5ldyBVaW50MzJBcnJheShfY29uc3RhbnRzLkJWQ05UICsgMSk7XG4gICAgICAgIHRoaXMuZXZhbHVhdGVkID0gW107XG4gICAgICAgIHRoaXMuYnJhbmNoQ250ID0gMDtcbiAgICAgICAgdGhpcy50b3RhbFZhbHVlID0gMC4wO1xuICAgICAgICB0aGlzLnRvdGFsQ250ID0gMDtcbiAgICAgICAgdGhpcy5oYXNoID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlQ250ID0gLTE7XG4gICAgICAgIHRoaXMuaW5pdEJyYW5jaCgpO1xuICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgaW5pdEJyYW5jaCgpIHtcbiAgICAgICAgdGhpcy5tb3ZlLmZpbGwoX2NvbnN0YW50cy5WTlVMTCk7XG4gICAgICAgIHRoaXMucHJvYi5maWxsKDAuMCk7XG4gICAgICAgIHRoaXMudmFsdWUuZmlsbCgwLjApO1xuICAgICAgICB0aGlzLnZhbHVlV2luLmZpbGwoMC4wKTtcbiAgICAgICAgdGhpcy52aXNpdENudC5maWxsKDApO1xuICAgICAgICB0aGlzLm5leHRJZC5maWxsKC0xKTtcbiAgICAgICAgdGhpcy5uZXh0SGFzaC5maWxsKDApO1xuICAgICAgICB0aGlzLmV2YWx1YXRlZCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jb25zdGFudHMuQlZDTlQgKyAxOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuZXZhbHVhdGVkLnB1c2goZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuYnJhbmNoQ250ID0gMDtcbiAgICAgICAgdGhpcy50b3RhbFZhbHVlID0gMC4wO1xuICAgICAgICB0aGlzLnRvdGFsQ250ID0gMDtcbiAgICAgICAgdGhpcy5oYXNoID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlQ250ID0gLTE7XG4gICAgfVxuXG4gICAgYmVzdDIoKSB7XG4gICAgICAgIGNvbnN0IG9yZGVyID0gKDAsIF91dGlscy5hcmdzb3J0KSh0aGlzLnZpc2l0Q250LnNsaWNlKDAsIHRoaXMuYnJhbmNoQ250KSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBvcmRlci5zbGljZSgwLCAyKTtcbiAgICB9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLlN0b25lR3JvdXAgPSB1bmRlZmluZWQ7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxuY2xhc3MgU3RvbmVHcm91cCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubGliQ250ID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5zaXplID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy52QXRyID0gX2NvbnN0YW50cy5WTlVMTDtcbiAgICAgICAgdGhpcy5saWJzID0gbmV3IFNldCgpO1xuICAgIH1cblxuICAgIGdldFNpemUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNpemU7XG4gICAgfVxuXG4gICAgZ2V0TGliQ250KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5saWJDbnQ7XG4gICAgfVxuXG4gICAgZ2V0VkF0cigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudkF0cjtcbiAgICB9XG5cbiAgICBjbGVhcihzdG9uZSkge1xuICAgICAgICB0aGlzLmxpYkNudCA9IHN0b25lID8gMCA6IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHN0b25lID8gMSA6IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMudkF0ciA9IF9jb25zdGFudHMuVk5VTEw7XG4gICAgICAgIHRoaXMubGlicy5jbGVhcigpO1xuICAgIH1cblxuICAgIGFkZCh2KSB7XG4gICAgICAgIGlmICh0aGlzLmxpYnMuaGFzKHYpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saWJzLmFkZCh2KTtcbiAgICAgICAgdGhpcy5saWJDbnQgKz0gMTtcbiAgICAgICAgdGhpcy52QXRyID0gdjtcbiAgICB9XG5cbiAgICBzdWIodikge1xuICAgICAgICBpZiAoIXRoaXMubGlicy5oYXModikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxpYnMuZGVsZXRlKHYpO1xuICAgICAgICB0aGlzLmxpYkNudCAtPSAxO1xuICAgIH1cblxuICAgIG1lcmdlKG90aGVyKSB7XG4gICAgICAgIHRoaXMubGlicyA9IG5ldyBTZXQoWy4uLnRoaXMubGlicywgLi4ub3RoZXIubGlic10pO1xuICAgICAgICB0aGlzLmxpYkNudCA9IHRoaXMubGlicy5zaXplO1xuICAgICAgICB0aGlzLnNpemUgKz0gb3RoZXIuc2l6ZTtcbiAgICAgICAgaWYgKHRoaXMubGliQ250ID09PSAxKSB7XG4gICAgICAgICAgICBzZWxmLnZBdHIgPSB0aGlzLmxpYnNbMF07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb3B5VG8oZGVzdCkge1xuICAgICAgICBkZXN0LmxpYkNudCA9IHRoaXMubGliQ250O1xuICAgICAgICBkZXN0LnNpemUgPSB0aGlzLnNpemU7XG4gICAgICAgIGRlc3QudkF0ciA9IHRoaXMudkF0cjtcbiAgICAgICAgZGVzdC5saWJzID0gbmV3IFNldCh0aGlzLmxpYnMpO1xuICAgIH1cbn1cbmV4cG9ydHMuU3RvbmVHcm91cCA9IFN0b25lR3JvdXA7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNodWZmbGUgPSBzaHVmZmxlO1xuZXhwb3J0cy5tb3N0Q29tbW9uID0gbW9zdENvbW1vbjtcbmV4cG9ydHMuYXJnc29ydCA9IGFyZ3NvcnQ7XG5leHBvcnRzLmFyZ21heCA9IGFyZ21heDtcbmV4cG9ydHMuaGFzaCA9IGhhc2g7XG5leHBvcnRzLnNvZnRtYXggPSBzb2Z0bWF4O1xuZXhwb3J0cy5wcmludFByb2IgPSBwcmludFByb2I7XG5cbnZhciBfY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMuanMnKTtcblxuZnVuY3Rpb24gc2h1ZmZsZShhcnJheSkge1xuICAgIGxldCBuID0gYXJyYXkubGVuZ3RoO1xuICAgIGxldCB0O1xuICAgIGxldCBpO1xuXG4gICAgd2hpbGUgKG4pIHtcbiAgICAgICAgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG4tLSk7XG4gICAgICAgIHQgPSBhcnJheVtuXTtcbiAgICAgICAgYXJyYXlbbl0gPSBhcnJheVtpXTtcbiAgICAgICAgYXJyYXlbaV0gPSB0O1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheTtcbn1cblxuZnVuY3Rpb24gbW9zdENvbW1vbihhcnJheSkge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGUgPSBhcnJheVtpXTtcbiAgICAgICAgaWYgKG1hcC5oYXMoZSkpIHtcbiAgICAgICAgICAgIG1hcC5zZXQoZSwgbWFwLmdldChlKSArIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFwLnNldChlLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsZXQgbWF4S2V5O1xuICAgIGxldCBtYXhWYWx1ZSA9IC0xO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIG1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKHZhbHVlID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEtleSA9IGtleTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1heEtleTtcbn1cblxuZnVuY3Rpb24gYXJnc29ydChhcnJheSwgcmV2ZXJzZSkge1xuICAgIGNvbnN0IGVuID0gQXJyYXkuZnJvbShhcnJheSkubWFwKChlLCBpKSA9PiBbaSwgZV0pO1xuICAgIGVuLnNvcnQoKGEsIGIpID0+IHJldmVyc2UgPyBiWzFdIC0gYVsxXSA6IGFbMV0gLSBiWzFdKTtcbiAgICByZXR1cm4gZW4ubWFwKGUgPT4gZVswXSk7XG59XG5cbmZ1bmN0aW9uIGFyZ21heChhcnJheSkge1xuICAgIGxldCBtYXhJbmRleDtcbiAgICBsZXQgbWF4VmFsdWUgPSAtSW5maW5pdHk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2ID0gYXJyYXlbaV07XG4gICAgICAgIGlmICh2ID4gbWF4VmFsdWUpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgIG1heFZhbHVlID0gdjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWF4SW5kZXg7XG59XG5cbmZ1bmN0aW9uIGhhc2goc3RyKSB7XG4gICAgbGV0IGhhc2ggPSA1MzgxO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGNoYXIgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICAgICAgaGFzaCA9IChoYXNoIDw8IDUpICsgaGFzaCArIGNoYXI7IC8qIGhhc2ggKiAzMyArIGMgKi9cbiAgICAgICAgaGFzaCA9IGhhc2ggJiBoYXNoOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcbiAgICB9XG4gICAgcmV0dXJuIE1hdGguYWJzKGhhc2gpO1xufVxuXG5mdW5jdGlvbiBzb2Z0bWF4KGlucHV0LCB0ZW1wZXJhdHVyZSA9IDEuMCkge1xuICAgIGNvbnN0IG91dHB1dCA9IG5ldyBGbG9hdDMyQXJyYXkoaW5wdXQubGVuZ3RoKTtcbiAgICBjb25zdCBhbHBoYSA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGlucHV0KTtcbiAgICBsZXQgZGVub20gPSAwLjA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IE1hdGguZXhwKChpbnB1dFtpXSAtIGFscGhhKSAvIHRlbXBlcmF0dXJlKTtcbiAgICAgICAgZGVub20gKz0gdmFsO1xuICAgICAgICBvdXRwdXRbaV0gPSB2YWw7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb3V0cHV0W2ldIC89IGRlbm9tO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50UHJvYihwcm9iKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBfY29uc3RhbnRzLkJTSVpFOyB5KyspIHtcbiAgICAgICAgbGV0IHN0ciA9IGAke3kgKyAxfSBgO1xuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IF9jb25zdGFudHMuQlNJWkU7IHgrKykge1xuICAgICAgICAgICAgc3RyICs9ICgnICAnICsgcHJvYlt4ICsgeSAqIF9jb25zdGFudHMuQlNJWkVdLnRvRml4ZWQoMSkpLnNsaWNlKC01KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZyhzdHIpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygncGFzcz0lcycsIHByb2JbcHJvYi5sZW5ndGggLSAxXS50b0ZpeGVkKDEpKTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrX2NsaWVudCA9IHJlcXVpcmUoJy4vbmV1cmFsX25ldHdvcmtfY2xpZW50LmpzJyk7XG5cbnZhciBfY29vcmRfY29udmVydCA9IHJlcXVpcmUoJy4vY29vcmRfY29udmVydC5qcycpO1xuXG52YXIgX2NvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzLmpzJyk7XG5cbnZhciBfaW50ZXJzZWN0aW9uID0gcmVxdWlyZSgnLi9pbnRlcnNlY3Rpb24uanMnKTtcblxudmFyIF9ib2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQuanMnKTtcblxudmFyIF9zZWFyY2ggPSByZXF1aXJlKCcuL3NlYXJjaC5qcycpO1xuXG5jbGFzcyBBOUVuZ2luZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuYiA9IG5ldyBfYm9hcmQuQm9hcmQoKTtcbiAgICAgICAgdGhpcy5ubiA9IG5ldyBfbmV1cmFsX25ldHdvcmtfY2xpZW50Lk5ldXJhbE5ldHdvcmsoc2VsZik7XG4gICAgICAgIHRoaXMudHJlZSA9IG5ldyBfc2VhcmNoLlRyZWUodGhpcy5ubik7XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZE5OKCkge1xuICAgICAgICBhd2FpdCB0aGlzLm5uLmludm9rZVJNKCdsb2FkJyk7XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuYi5jbGVhcigpO1xuICAgICAgICB0aGlzLnRyZWUuY2xlYXIoKTtcbiAgICB9XG5cbiAgICB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy50cmVlLnNldFRpbWUobWFpblRpbWUsIGJ5b3lvbWkpO1xuICAgIH1cblxuICAgIGFzeW5jIGdlbm1vdmUoKSB7XG4gICAgICAgIGNvbnN0IFttb3ZlLCB3aW5SYXRlXSA9IGF3YWl0IHRoaXMuYmVzdE1vdmUoKTtcbiAgICAgICAgaWYgKHdpblJhdGUgPCAwLjEpIHtcbiAgICAgICAgICAgIHJldHVybiAncmVzaWduJztcbiAgICAgICAgfSBlbHNlIGlmIChtb3ZlID09PSBfY29uc3RhbnRzLlBBU1MgfHwgdGhpcy5iLnN0YXRlW21vdmVdID09PSBfaW50ZXJzZWN0aW9uLkVNUFRZKSB7XG4gICAgICAgICAgICB0aGlzLmIucGxheShtb3ZlLCB0cnVlKTtcbiAgICAgICAgICAgIHJldHVybiAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShtb3ZlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlcnJvcicpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJyVkKCVzKSBpcyBub3QgZW1wdHknLCBtb3ZlLCAoMCwgX2Nvb3JkX2NvbnZlcnQuZXYyc3RyKShtb3ZlKSk7XG4gICAgICAgICAgICB0aGlzLmIuc2hvd2JvYXJkKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmIuY2FuZGlkYXRlcygpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBsYXkoZXYpIHtcbiAgICAgICAgdGhpcy5iLnBsYXkoZXYsIGZhbHNlKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudHJlZS5zZWFyY2godGhpcy5iLCAwLjAsIGZhbHNlLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYi5maW5hbFNjb3JlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgcG9uZGVyKCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy50cmVlLnNlYXJjaCh0aGlzLmIsIEluZmluaXR5LCB0cnVlLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgc2VsZi5QT05ERVJfU1RPUCA9IHRydWU7XG4gICAgfVxuXG4gICAgdGltZUxlZnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRyZWUubGVmdFRpbWU7XG4gICAgfVxufVxuXG4oMCwgX3dvcmtlclJtaS5yZXNpZ3RlcldvcmtlclJNSSkoc2VsZiwgQTlFbmdpbmUpOyJdfQ==
