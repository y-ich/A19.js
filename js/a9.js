(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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
            result = await instance[data.methodName].apply(instance, data.args)
            message.result = result;
            this.workerRMI.target.postMessage(message, getTransferList(result));
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
},{}],5:[function(require,module,exports){
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
},{"./constants.js":4}],6:[function(require,module,exports){
'use strict';

var _workerRmi = require('worker-rmi');

var _neural_network = require('./neural_network.js');

var _coord_convert = require('./coord_convert.js');

var _constants = require('./constants.js');

var _speech = require('./speech.js');

const FIRST_TIME = 7 * 60; /* global $ JGO BoardController i18n */

const FISHER_SEC = 3;

function i18nSpeak(message) {
    return (0, _speech.speak)(message, i18n.lang, 'female');
}

class A9Engine extends _workerRmi.WorkerRMI {
    async loadNN() {
        await this.invokeRM('loadNN');
    }

    async clear() {
        await this.stopPonder();
        await this.invokeRM('clear');
    }

    async timeSettings(mainTime, byoyomi) {
        this.mainTime = mainTime;
        this.byoyomi = byoyomi;
        await this.invokeRM('timeSettings', [mainTime, byoyomi]);
    }

    async genmove() {
        const [move, winRate] = await this.bestMove();
        if (winRate < 0.1) {
            return 'resign';
        } else {
            await this.play(move);
            return (0, _coord_convert.ev2str)(move);
        }
    }

    async play(ev) {
        await this.invokeRM('play', [ev]);
    }

    async bestMove() {
        return await this.invokeRM('bestMove');
    }

    async finalScore() {
        return await this.invokeRM('finalScore');
    }

    startPonder() {
        this.ponderPromise = this.invokeRM('ponder');
    }

    async stopPonder() {
        if (this.ponderPromise) {
            await this.invokeRM('stopPonder');
            await this.ponderPromise;
            this.ponderPromise = null;
        }
    }
}

class PlayController {
    constructor(engine, board, igoQuest = false) {
        this.engine = engine;
        this.board = board;
        this.isSelfPlay = false;
        this.igoQuest = igoQuest;
        if (igoQuest) {
            this.timeLeft = [0, // dumy
            FIRST_TIME * 1000, // black
            FIRST_TIME * 1000];
            this.start = Date.now();
            this.timer = setInterval(() => {
                const start = Date.now();
                this.timeLeft[this.board.turn] -= start - this.start;
                this.start = start;
                $('#your-time').text(Math.ceil(this.timeLeft[this.board.ownColor] / 1000));
                $('#ai-time').text(Math.ceil(this.timeLeft[this.board.ownColor % 2 + 1] / 1000));
                if (this.timeLeft[this.board.turn] < 0) {
                    clearInterval(this.timer);
                    this.timer = null;
                    alert(i18n.timeout);
                }
            }, 100);
        } else {
            this.timeLeft = [0, // dumy
            this.board.ownColor === JGO.BLACK ? Infinity : this.engine.byoyomi * 1000, // black
            this.board.ownColor === JGO.BLACK ? this.engine.byoyomi * 1000 : Infinity];
            this.start = Date.now();
            this.timer = setInterval(() => {
                const start = Date.now();
                this.timeLeft[this.board.turn] -= start - this.start;
                this.start = start;
                if (this.board.turn == this.board.ownColor) {
                    $('#your-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                } else {
                    $('#ai-time').text(Math.ceil(this.timeLeft[this.board.turn] / 1000));
                }
            }, 100);
        }
        $('#your-time').text(Math.ceil(this.timeLeft[this.board.ownColor] / 1000));
        $('#ai-time').text(Math.ceil(this.timeLeft[this.board.ownColor % 2 + 1] / 1000));
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    setIsSelfPlay(isSelfPlay) {
        this.isSelfPlay = isSelfPlay;
    }
    async update(coord) {
        if (coord === 'end') {
            this.clearTimer();
            i18nSpeak(i18n.scoring);
            try {
                const score = await this.finalScore();
                let message;
                if (score === 0) {
                    message = i18n.jigo;
                } else {
                    message = i18n[score > 0 ? 'black' : 'white'];
                    switch (i18n.lang) {
                        case 'en':
                            message += ` won by ${score} points`;
                            break;
                        case 'ja':
                            {
                                const absScore = Math.abs(score);
                                message += absScore < 1 ? '半目勝ち' : Math.floor(absScore) + '目半勝ち';
                            }
                            break;
                    }
                }
                switch (i18n.lang) {
                    case 'en':
                        message += '?';
                        break;
                    case 'ja':
                        message += 'ですか？';
                        break;
                }
                i18nSpeak(message.replace('半', 'はん'));
                setTimeout(function () {
                    alert(message);
                    $(document.body).addClass('end');
                }, 3000);
            } catch (e) {
                console.log(e);
                i18nSpeak(i18n.failScoring);
            }
            return;
        }

        if (this.igoQuest) {
            this.timeLeft[this.board.turn % 2 + 1] += FISHER_SEC * 1000;
        } else if (this.board.turn === this.board.ownColor) {
            this.timeLeft[this.board.ownColor % 2 + 1] = this.engine.byoyomi * 1000;
            $('#ai-time').text(Math.ceil(this.timeLeft[this.board.ownColor % 2 + 1] / 1000));
        }

        if (!this.isSelfPlay && typeof coord === 'object') {
            await this.engine.stopPonder();
            await this.engine.play((0, _coord_convert.xy2ev)(coord.i + 1, _constants.BSIZE - coord.j));
        }
        if (this.isSelfPlay || this.board.turn !== this.board.ownColor) {
            setTimeout(async () => {
                const move = await this.engine.genmove();
                switch (move) {
                    case 'resign':
                        this.clearTimer();
                        i18nSpeak(i18n.resign);
                        $(document.body).addClass('end');
                        break;
                    case 'pass':
                        this.board.play(null);
                        i18nSpeak(i18n.pass);
                        break;
                    default:
                        {
                            const ev = (0, _coord_convert.str2ev)(move);
                            const xy = (0, _coord_convert.ev2xy)(ev);
                            this.board.play(new JGO.Coordinate(xy[0] - 1, _constants.BSIZE - xy[1]), true);
                        }
                }
            }, 0);
        } else {
            this.engine.startPonder();
        }
    }

    async pass() {
        if (this.board.ownColor === this.board.turn) {
            await this.engine.stopPonder();
            this.engine.play(_constants.PASS);
            this.board.play(null);
        }
    }

    async finalScore() {
        const result = await $.post({
            url: 'https://mimiaka-python.herokuapp.com/gnugo', // httpでは通信できなかった。 'http://35.203.161.100/gnugo',
            data: {
                sgf: this.board.jrecord.toSgf(),
                move: 'est',
                method: 'aftermath',
                rule: this.board.jrecord.getRootNode().info.komi === '6.5' ? 'japanese' : 'chinese'
            }
        });
        if (/Jigo/.test(result)) {
            return 0;
        }
        const match = result.match(/(Black|White) wins by ([0-9.]+) points/);
        if (match) {
            let score = parseFloat(match[2]);
            if (match[1] === 'Black') {
                return score;
            } else {
                return -score;
            }
        } else {
            return null;
        }
    }

}

async function main() {
    const board = await new Promise(function (res, rej) {
        new BoardController(_constants.BSIZE, 0, 7.5, res);
    });
    // JGOのレンダリングを完了させるためにsetTimeoutでイベントループを進める
    const $startModal = $('#start-modal');
    $startModal.modal('show');
    setTimeout(async function () {
        try {
            await engine.loadNN();
            $('#loading-message').text(i18n.finishDownload);
            $('#start-game').prop('disabled', false);
        } catch (e) {
            if (e.message === 'No backend is available') {
                if (/(Mac OS X 10_13|(iPad|iPhone|iPod); CPU OS 11).*Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
                    i18nSpeak(i18n.notSupport + i18n.safariWithoutWebgpu);
                } else if (!i18nSpeak(i18n.notSupport)) {
                    alert(i18n.notSupport);
                }
            } else {
                console.error(e);
            }
            return;
        }
        const condition = await new Promise(function (res, rej) {
            $startModal.one('hidden.bs.modal', function (e) {
                const $conditionForm = $('#condition-form');
                res({
                    color: $conditionForm[0]['color'].value,
                    timeRule: $conditionForm[0]['time'].value,
                    time: parseInt($conditionForm[0]['ai-byoyomi'].value)
                });
            });
        });
        switch (condition.timeRule) {
            case 'ai-time':
                await engine.timeSettings(0, condition.time);
                break;
            case 'igo-quest':
                await engine.timeSettings(FIRST_TIME + 125 * FISHER_SEC, FISHER_SEC); // 19路盤は平均手数を250手と仮定して、125手分のフィッシャー秒を追加
                break;
        }
        if (condition.color === 'W') {
            board.setOwnColor(JGO.WHITE);
        } else if (condition.color === 'B') {
            board.setOwnColor(JGO.BLACK);
        }
        const controller = new PlayController(engine, board, condition.timeRule === 'igo-quest');
        const isSelfPlay = condition.color === 'self-play';
        if (!isSelfPlay) {
            i18nSpeak(i18n.startGreet);
        }
        controller.setIsSelfPlay(isSelfPlay);
        board.addObserver(controller);
        $('#pass').on('click', function (event) {
            controller.pass();
        });
        $('#resign').on('click', async function (event) {
            controller.clearTimer();
            await engine.stopPonder();
            i18nSpeak(i18n.endGreet);
            $(document.body).addClass('end');
        });
        $('#retry').one('click', async function (event) {
            $('#pass').off('click');
            $('#resign').off('click');
            board.destroy();
            engine.clear();
            $(document.body).removeClass('end');
            setTimeout(main, 0);
        });
    }, 0);
}

const worker = new Worker('js/worker.js');
(0, _workerRmi.resigterWorkerRMI)(worker, _neural_network.NeuralNetwork);
const engine = new A9Engine(worker);
main();
},{"./constants.js":4,"./coord_convert.js":5,"./neural_network.js":7,"./speech.js":8,"worker-rmi":3}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/* global WebDNN $ */

if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function (start, end) {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++) resultArray[i] = that[i + start];
        return result;
    };
}

function setLoadingBar(percentage) {
    const $loadingBar = $('#loading-bar');
    $loadingBar.attr('aria-valuenow', percentage);
    $loadingBar.css('width', percentage.toString() + '%');
}

class NeuralNetwork {
    constructor() {
        this.nn = null;
    }

    async load() {
        if (this.nn) {
            return;
        }
        const options = {
            backendOrder: ['webgpu', 'webgl'],
            progressCallback: function (loaded, total) {
                setLoadingBar(loaded / total * 100);
            }
        };
        setLoadingBar(0);
        this.nn = await WebDNN.load('https://storage.googleapis.com/mimiaka-storage/ELF_OpenGo', options);
    }

    async evaluate(...inputs) {
        const views = this.nn.getInputViews();
        for (let i = 0; i < inputs.length; i++) {
            views[i].set(inputs[i]);
        }
        await this.nn.run();
        return this.nn.getOutputViews().map(e => e.toActual().slice(0)); // to.Actualそのものではworker側でdetachができない模様
    }
}
exports.NeuralNetwork = NeuralNetwork;
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.speak = speak;
function speak(text, lang, gender) {
    if (!SpeechSynthesisUtterance) return false;

    switch (lang) {
        case 'en':
            lang = 'en-us';
            break;
        case 'ja':
            lang = 'ja-jp';
            break;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (/(iPhone|iPad|iPod)(?=.*OS [7-8])/.test(navigator.userAgent)) utterance.rate = 0.2;
    const voices = speechSynthesis.getVoices().filter(e => e.lang.toLowerCase() === lang);
    let voice = null;
    if (voices.length > 1) {
        let names = null;
        switch (lang) {
            case 'ja-jp':
                switch (gender) {
                    case 'male':
                        names = ['Otoya', 'Hattori', 'Ichiro'];
                        break;
                    case 'female':
                        names = ['O-ren（拡張）', 'O-ren', 'Kyoko', 'Haruka']; // Windows 10のAyumiの声は今ひとつ
                        break;
                }
                break;
            case 'en-us':
                switch (gender) {
                    case 'male':
                        names = ['Alex', 'Fred'];
                        break;
                    case 'female':
                        names = ['Samantha', 'Victoria'];
                        break;
                }
                break;
        }
        if (names) {
            voice = voices.filter(v => names.some(n => v.name.indexOf(n) >= 0))[0];
        }
        if (!voice) {
            voice = voices.filter(v => v.gender && v.gender.toLowerCase() === gender)[0];
        }
    }
    utterance.voice = voice || voices[0];
    // iOS 10 Safari has a bug that utterance.voice is no effect.
    utterance.volume = parseFloat(localStorage.getItem('volume') || '1.0');
    speechSynthesis.speak(utterance);
    return true;
}

function unlock() {
    window.removeEventListener('click', unlock);
    speechSynthesis.speak(new SpeechSynthesisUtterance(''));
}

window.addEventListener('load', function (event) {
    if (speechSynthesis) {
        speechSynthesis.getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function () {
                console.log('onvoiceschanged');
            };
        }
        window.addEventListener('click', unlock, false); // for iOS
    }
});
},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2NvbnN0YW50cy5qcyIsInNyYy9jb29yZF9jb252ZXJ0LmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiLCJzcmMvc3BlZWNoLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiXG52YXIgTUFDSElORV9JRCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGKTtcbnZhciBpbmRleCA9IE9iamVjdElELmluZGV4ID0gcGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDB4RkZGRkZGLCAxMCk7XG52YXIgcGlkID0gKHR5cGVvZiBwcm9jZXNzID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgcHJvY2Vzcy5waWQgIT09ICdudW1iZXInID8gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwKSA6IHByb2Nlc3MucGlkKSAlIDB4RkZGRjtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIEJ1ZmZlclxuICpcbiAqIEF1dGhvcjogICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogTGljZW5zZTogIE1JVFxuICpcbiAqL1xudmFyIGlzQnVmZmVyID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gISEoXG4gIG9iaiAhPSBudWxsICYmXG4gIG9iai5jb25zdHJ1Y3RvciAmJlxuICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG4gIClcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGltbXV0YWJsZSBPYmplY3RJRCBpbnN0YW5jZVxuICpcbiAqIEBjbGFzcyBSZXByZXNlbnRzIHRoZSBCU09OIE9iamVjdElEIHR5cGVcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gYXJnIENhbiBiZSBhIDI0IGJ5dGUgaGV4IHN0cmluZywgMTIgYnl0ZSBiaW5hcnkgc3RyaW5nIG9yIGEgTnVtYmVyLlxuICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSBvZiBPYmplY3RJRC5cbiAqL1xuZnVuY3Rpb24gT2JqZWN0SUQoYXJnKSB7XG4gIGlmKCEodGhpcyBpbnN0YW5jZW9mIE9iamVjdElEKSkgcmV0dXJuIG5ldyBPYmplY3RJRChhcmcpO1xuICBpZihhcmcgJiYgKChhcmcgaW5zdGFuY2VvZiBPYmplY3RJRCkgfHwgYXJnLl9ic29udHlwZT09PVwiT2JqZWN0SURcIikpXG4gICAgcmV0dXJuIGFyZztcblxuICB2YXIgYnVmO1xuXG4gIGlmKGlzQnVmZmVyKGFyZykgfHwgKEFycmF5LmlzQXJyYXkoYXJnKSAmJiBhcmcubGVuZ3RoPT09MTIpKSB7XG4gICAgYnVmID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJnKTtcbiAgfVxuICBlbHNlIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICBpZihhcmcubGVuZ3RoIT09MTIgJiYgIU9iamVjdElELmlzVmFsaWQoYXJnKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHBhc3NlZCBpbiBtdXN0IGJlIGEgc2luZ2xlIFN0cmluZyBvZiAxMiBieXRlcyBvciBhIHN0cmluZyBvZiAyNCBoZXggY2hhcmFjdGVyc1wiKTtcblxuICAgIGJ1ZiA9IGJ1ZmZlcihhcmcpO1xuICB9XG4gIGVsc2UgaWYoL251bWJlcnx1bmRlZmluZWQvLnRlc3QodHlwZW9mIGFyZykpIHtcbiAgICBidWYgPSBidWZmZXIoZ2VuZXJhdGUoYXJnKSk7XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJpZFwiLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseSh0aGlzLCBidWYpOyB9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJzdHJcIiwge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBidWYubWFwKGhleC5iaW5kKHRoaXMsIDIpKS5qb2luKCcnKTsgfVxuICB9KTtcbn1cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0SUQ7XG5PYmplY3RJRC5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuT2JqZWN0SUQuZGVmYXVsdCA9IE9iamVjdElEO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIHNlY29uZCBiYXNlZCBudW1iZXIsIHdpdGggdGhlIHJlc3Qgb2YgdGhlIE9iamVjdElEIHplcm9lZCBvdXQuIFVzZWQgZm9yIGNvbXBhcmlzb25zIG9yIHNvcnRpbmcgdGhlIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGFuIGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyBhIG51bWJlciBvZiBzZWNvbmRzLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbVRpbWUgPSBmdW5jdGlvbih0aW1lKXtcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG4gIHJldHVybiBuZXcgT2JqZWN0SUQoaGV4KDgsdGltZSkrXCIwMDAwMDAwMDAwMDAwMDAwXCIpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIE9iamVjdElEIGZyb20gYSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIE9iamVjdElELlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZXhTdHJpbmcgY3JlYXRlIGEgT2JqZWN0SUQgZnJvbSBhIHBhc3NlZCBpbiAyNCBieXRlIGhleHN0cmluZy5cbiAqIEByZXR1cm4ge09iamVjdElEfSByZXR1cm4gdGhlIGNyZWF0ZWQgT2JqZWN0SURcbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmNyZWF0ZUZyb21IZXhTdHJpbmcgPSBmdW5jdGlvbihoZXhTdHJpbmcpIHtcbiAgaWYoIU9iamVjdElELmlzVmFsaWQoaGV4U3RyaW5nKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIE9iamVjdElEIGhleCBzdHJpbmdcIik7XG5cbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXhTdHJpbmcpO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIHZhbGlkIGJzb24gT2JqZWN0SWRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqZWN0aWQgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nIG9yIGFuIGluc3RhbmNlIG9mIE9iamVjdElELlxuICogQHJldHVybiB7Qm9vbGVhbn0gcmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJRCwgcmV0dXJuIGZhbHNlIG90aGVyd2lzZS5cbiAqIEBhcGkgcHVibGljXG4gKlxuICogVEhFIE5BVElWRSBET0NVTUVOVEFUSU9OIElTTidUIENMRUFSIE9OIFRISVMgR1VZIVxuICogaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvYXBpLWJzb24tZ2VuZXJhdGVkL29iamVjdGlkLmh0bWwjb2JqZWN0aWQtaXN2YWxpZFxuICovXG5PYmplY3RJRC5pc1ZhbGlkID0gZnVuY3Rpb24ob2JqZWN0aWQpIHtcbiAgaWYoIW9iamVjdGlkKSByZXR1cm4gZmFsc2U7XG5cbiAgLy9jYWxsIC50b1N0cmluZygpIHRvIGdldCB0aGUgaGV4IGlmIHdlJ3JlXG4gIC8vIHdvcmtpbmcgd2l0aCBhbiBpbnN0YW5jZSBvZiBPYmplY3RJRFxuICByZXR1cm4gL15bMC05QS1GXXsyNH0kL2kudGVzdChvYmplY3RpZC50b1N0cmluZygpKTtcbn07XG5cbi8qKlxuICogc2V0IGEgY3VzdG9tIG1hY2hpbmVJRFxuICogXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IG1hY2hpbmVpZCBDYW4gYmUgYSBzdHJpbmcsIGhleC1zdHJpbmcgb3IgYSBudW1iZXJcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5zZXRNYWNoaW5lSUQgPSBmdW5jdGlvbihhcmcpIHtcbiAgdmFyIG1hY2hpbmVJRDtcblxuICBpZih0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgLy8gaGV4IHN0cmluZ1xuICAgIG1hY2hpbmVJRCA9IHBhcnNlSW50KGFyZywgMTYpO1xuICAgXG4gICAgLy8gYW55IHN0cmluZ1xuICAgIGlmKGlzTmFOKG1hY2hpbmVJRCkpIHtcbiAgICAgIGFyZyA9ICgnMDAwMDAwJyArIGFyZykuc3Vic3RyKC03LDYpO1xuXG4gICAgICBtYWNoaW5lSUQgPSBcIlwiO1xuICAgICAgZm9yKHZhciBpID0gMDtpPDY7IGkrKykge1xuICAgICAgICBtYWNoaW5lSUQgKz0gKGFyZy5jaGFyQ29kZUF0KGkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIG1hY2hpbmVJRCA9IGFyZyB8IDA7XG4gIH1cblxuICBNQUNISU5FX0lEID0gKG1hY2hpbmVJRCAmIDB4RkZGRkZGKTtcbn1cblxuLyoqXG4gKiBnZXQgdGhlIG1hY2hpbmVJRFxuICogXG4gKiBAcmV0dXJuIHtudW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5nZXRNYWNoaW5lSUQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1BQ0hJTkVfSUQ7XG59XG5cbk9iamVjdElELnByb3RvdHlwZSA9IHtcbiAgX2Jzb250eXBlOiAnT2JqZWN0SUQnLFxuICBjb25zdHJ1Y3RvcjogT2JqZWN0SUQsXG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgT2JqZWN0SUQgaWQgYXMgYSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICpcbiAgICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHRvSGV4U3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5zdHI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXBhcmVzIHRoZSBlcXVhbGl0eSBvZiB0aGlzIE9iamVjdElEIHdpdGggYG90aGVySURgLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3RoZXIgT2JqZWN0SUQgaW5zdGFuY2UgdG8gY29tcGFyZSBhZ2FpbnN0LlxuICAgKiBAcmV0dXJuIHtCb29sZWFufSB0aGUgcmVzdWx0IG9mIGNvbXBhcmluZyB0d28gT2JqZWN0SUQnc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpe1xuICAgIHJldHVybiAhIW90aGVyICYmIHRoaXMuc3RyID09PSBvdGhlci50b1N0cmluZygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBnZW5lcmF0aW9uIGRhdGUgKGFjY3VyYXRlIHVwIHRvIHRoZSBzZWNvbmQpIHRoYXQgdGhpcyBJRCB3YXMgZ2VuZXJhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtEYXRlfSB0aGUgZ2VuZXJhdGlvbiBkYXRlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBnZXRUaW1lc3RhbXA6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHBhcnNlSW50KHRoaXMuc3RyLnN1YnN0cigwLDgpLCAxNikgKiAxMDAwKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gbmV4dCgpIHtcbiAgcmV0dXJuIGluZGV4ID0gKGluZGV4KzEpICUgMHhGRkZGRkY7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlKHRpbWUpIHtcbiAgaWYgKHR5cGVvZiB0aW1lICE9PSAnbnVtYmVyJylcbiAgICB0aW1lID0gRGF0ZS5ub3coKS8xMDAwO1xuXG4gIC8va2VlcCBpdCBpbiB0aGUgcmluZyFcbiAgdGltZSA9IHBhcnNlSW50KHRpbWUsIDEwKSAlIDB4RkZGRkZGRkY7XG5cbiAgLy9GRkZGRkZGRiBGRkZGRkYgRkZGRiBGRkZGRkZcbiAgcmV0dXJuIGhleCg4LHRpbWUpICsgaGV4KDYsTUFDSElORV9JRCkgKyBoZXgoNCxwaWQpICsgaGV4KDYsbmV4dCgpKTtcbn1cblxuZnVuY3Rpb24gaGV4KGxlbmd0aCwgbikge1xuICBuID0gbi50b1N0cmluZygxNik7XG4gIHJldHVybiAobi5sZW5ndGg9PT1sZW5ndGgpPyBuIDogXCIwMDAwMDAwMFwiLnN1YnN0cmluZyhuLmxlbmd0aCwgbGVuZ3RoKSArIG47XG59XG5cbmZ1bmN0aW9uIGJ1ZmZlcihzdHIpIHtcbiAgdmFyIGk9MCxvdXQ9W107XG5cbiAgaWYoc3RyLmxlbmd0aD09PTI0KVxuICAgIGZvcig7aTwyNDsgb3V0LnB1c2gocGFyc2VJbnQoc3RyW2ldK3N0cltpKzFdLCAxNikpLGkrPTIpO1xuXG4gIGVsc2UgaWYoc3RyLmxlbmd0aD09PTEyKVxuICAgIGZvcig7aTwxMjsgb3V0LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpLGkrKyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyB0byBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIElkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJuIHRoZSAyNCBieXRlIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24uXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuT2JqZWN0SUQucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFwiT2JqZWN0SUQoXCIrdGhpcytcIilcIiB9O1xuT2JqZWN0SUQucHJvdG90eXBlLnRvSlNPTiA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbk9iamVjdElELnByb3RvdHlwZS50b1N0cmluZyA9IE9iamVjdElELnByb3RvdHlwZS50b0hleFN0cmluZztcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKiBnbG9iYWwgZXhwb3J0cyAqL1xuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IGEgdGlueSBsaWJyYXJ5IGZvciBXZWIgV29ya2VyIFJlbW90ZSBNZXRob2QgSW52b2NhdGlvblxuICpcbiAqL1xuY29uc3QgT2JqZWN0SUQgPSByZXF1aXJlKCdic29uLW9iamVjdGlkJyk7XG5cbi8qKlxuICogQHByaXZhdGUgcmV0dXJucyBhIGxpc3Qgb2YgVHJhbnNmZXJhYmxlIG9iamVjdHMgd2hpY2gge0Bjb2RlIG9ian0gaW5jbHVkZXNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHBhcmFtIHtBcnJheX0gbGlzdCBmb3IgaW50ZXJuYWwgcmVjdXJzaW9uIG9ubHlcbiAqIEByZXR1cm4ge0xpc3R9IGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0c1xuICovXG5mdW5jdGlvbiBnZXRUcmFuc2Zlckxpc3Qob2JqLCBsaXN0ID0gW10pIHtcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iai5idWZmZXIpO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgaWYgKGlzVHJhbnNmZXJhYmxlKG9iaikpIHtcbiAgICAgICAgbGlzdC5wdXNoKG9iaik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoISh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JykpIHtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgZ2V0VHJhbnNmZXJMaXN0KG9ialtwcm9wXSwgbGlzdCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGxpc3Q7XG59XG5cbi8qKlxuICogQHByaXZhdGUgY2hlY2tzIGlmIHtAY29kZSBvYmp9IGlzIFRyYW5zZmVyYWJsZSBvciBub3QuXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIGFueSBvYmplY3RcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVHJhbnNmZXJhYmxlKG9iaikge1xuICAgIGNvbnN0IHRyYW5zZmVyYWJsZSA9IFtBcnJheUJ1ZmZlcl07XG4gICAgaWYgKHR5cGVvZiBNZXNzYWdlUG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdHJhbnNmZXJhYmxlLnB1c2goTWVzc2FnZVBvcnQpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIEltYWdlQml0bWFwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChJbWFnZUJpdG1hcCk7XG4gICAgfVxuICAgIHJldHVybiB0cmFuc2ZlcmFibGUuc29tZShlID0+IG9iaiBpbnN0YW5jZW9mIGUpO1xufVxuXG4vKipcbiAqIEBjbGFzcyBiYXNlIGNsYXNzIHdob3NlIGNoaWxkIGNsYXNzZXMgdXNlIFJNSVxuICovXG5jbGFzcyBXb3JrZXJSTUkge1xuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZW1vdGUgYW4gaW5zdGFuY2UgdG8gY2FsbCBwb3N0TWVzc2FnZSBtZXRob2RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihyZW1vdGUsIC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5yZW1vdGUgPSByZW1vdGU7XG4gICAgICAgIHRoaXMuaWQgPSBPYmplY3RJRCgpLnRvU3RyaW5nKCk7XG4gICAgICAgIHRoaXMubWV0aG9kU3RhdGVzID0ge307XG4gICAgICAgIHRoaXMucmVtb3RlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBldmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIGlmIChkYXRhLmlkID09PSB0aGlzLmlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5IYW5kbGVyKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3JQcm9taXNlID0gdGhpcy5pbnZva2VSTSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIGFyZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGludm9rZXMgcmVtb3RlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lIE1ldGhvZCBuYW1lXG4gICAgICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIHNlcnZlci1zaWRlIGluc3RhbmNlXG4gICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBpbnZva2VSTShtZXRob2ROYW1lLCBhcmdzID0gW10pIHtcbiAgICAgICAgaWYgKCF0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSkge1xuICAgICAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXNbbWV0aG9kTmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgbnVtOiAwLFxuICAgICAgICAgICAgICAgIHJlc29sdmVSZWplY3RzOiB7fVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kU3RhdGUgPSB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXTtcbiAgICAgICAgICAgIG1ldGhvZFN0YXRlLm51bSArPSAxO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUucmVzb2x2ZVJlamVjdHNbbWV0aG9kU3RhdGUubnVtXSA9IHsgcmVzb2x2ZSwgcmVqZWN0IH07XG4gICAgICAgICAgICB0aGlzLnJlbW90ZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgICAgICAgICAgbWV0aG9kTmFtZSxcbiAgICAgICAgICAgICAgICBudW06IG1ldGhvZFN0YXRlLm51bSxcbiAgICAgICAgICAgICAgICBhcmdzXG4gICAgICAgICAgICB9LCBnZXRUcmFuc2Zlckxpc3QoYXJncykpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZSBoYW5kbGVzIGNvcnJlc3BvbmRlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gICAgICogQHBhcmFtIHtvYmp9IGRhdGEgZGF0YSBwcm9wZXJ0eSBvZiAnbWVzc2FnZScgZXZlbnRcbiAgICAgKi9cbiAgICByZXR1cm5IYW5kbGVyKGRhdGEpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZVJlamVjdHMgPSB0aGlzLm1ldGhvZFN0YXRlc1tkYXRhLm1ldGhvZE5hbWVdLnJlc29sdmVSZWplY3RzO1xuICAgICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlamVjdChkYXRhLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc29sdmVSZWplY3RzW2RhdGEubnVtXS5yZXNvbHZlKGRhdGEucmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEBwcml2YXRlIGV4ZWN1dGVzIGEgbWV0aG9kIG9uIHNlcnZlciBhbmQgcG9zdCBhIHJlc3VsdCBhcyBtZXNzYWdlLlxuICogQHBhcmFtIHtvYmp9IGV2ZW50ICdtZXNzYWdlJyBldmVudFxuICovXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVXb3JrZXJSTUkoZXZlbnQpIHtcbiAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICBjb25zdCBtZXNzYWdlID0ge1xuICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgbWV0aG9kTmFtZTogZGF0YS5tZXRob2ROYW1lLFxuICAgICAgICBudW06IGRhdGEubnVtLFxuICAgIH07XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAoZGF0YS5tZXRob2ROYW1lID09PSB0aGlzLm5hbWUpIHtcbiAgICAgICAgdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdID0gbmV3IHRoaXMoLi4uZGF0YS5hcmdzKTtcbiAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSBudWxsO1xuICAgICAgICB0aGlzLndvcmtlclJNSS50YXJnZXQucG9zdE1lc3NhZ2UobWVzc2FnZSwgZ2V0VHJhbnNmZXJMaXN0KHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy53b3JrZXJSTUkuaW5zdGFuY2VzW2RhdGEuaWRdO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGluc3RhbmNlW2RhdGEubWV0aG9kTmFtZV0uYXBwbHkoaW5zdGFuY2UsIGRhdGEuYXJncylcbiAgICAgICAgICAgIG1lc3NhZ2UucmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiByZWdpc3RlcnMgYSBjbGFzcyBhcyBhbiBleGVjdXRlciBvZiBSTUkgb24gc2VydmVyXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgcmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiByZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAga2xhc3Mud29ya2VyUk1JID0ge1xuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGluc3RhbmNlczoge30sXG4gICAgICAgIGhhbmRsZXI6IGhhbmRsZVdvcmtlclJNSS5iaW5kKGtsYXNzKVxuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKTtcbn1cblxuLyoqXG4gKiB1bnJlc2lndGVycyBhIGNsYXNzIHJlZ2lzdGVyZWQgYnkgcmVnaXN0ZXJXb3JrZXJSTUlcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSB1bnJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gdW5yZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAgdGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcilcbiAgICBkZWxldGUga2xhc3Mud29ya2VyUk1JO1xufVxuXG5leHBvcnRzLldvcmtlclJNSSA9IFdvcmtlclJNSTtcbmV4cG9ydHMucmVzaWd0ZXJXb3JrZXJSTUkgPSByZXNpZ3RlcldvcmtlclJNSTtcbmV4cG9ydHMudW5yZXNpZ3RlcldvcmtlclJNSSA9IHVucmVzaWd0ZXJXb3JrZXJSTUk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbi8vLyDnooHnm6Tjga7jgrXjgqTjgrrjgafjgZnjgIJcbmNvbnN0IEJTSVpFID0gZXhwb3J0cy5CU0laRSA9IDE5O1xuXG4vLy8g5aSW5p6g44KS5oyB44Gk5ouh5by156KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBFQlNJWkUgPSBleHBvcnRzLkVCU0laRSA9IEJTSVpFICsgMjtcblxuLy8vIOeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgQlZDTlQgPSBleHBvcnRzLkJWQ05UID0gQlNJWkUgKiBCU0laRTtcblxuLy8vIOaLoeW8teeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgRUJWQ05UID0gZXhwb3J0cy5FQlZDTlQgPSBFQlNJWkUgKiBFQlNJWkU7XG5cbi8vLyDjg5HjgrnjgpLooajjgZnnt5rlvaLluqfmqJnjgafjgZnjgILpgJrluLjjga7nnYDmiYvjga/mi6HlvLXnooHnm6Tjga7nt5rlvaLluqfmqJnjgafooajjgZfjgb7jgZnjgIJcbi8vIFRPRE8gLSDnnYDmiYvjga7jgZ/jgoHjgavliJfmjJnlnovjgpLkvZzjgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFBBU1MgPSBleHBvcnRzLlBBU1MgPSBFQlZDTlQ7XG5cbi8vLyDnt5rlvaLluqfmqJnjga7jg5fjg6zjg7zjgrnjg5vjg6vjg4Djg7zjga7mnKrkvb/nlKjjgpLnpLrjgZnlgKTjgafjgZnjgIJcbi8vIFRPRE8gLSDoqbLlvZPjgZnjgovloLTmiYDjgatPcHRpb248dXNpemU+44KS5L2/44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBWTlVMTCA9IGV4cG9ydHMuVk5VTEwgPSBFQlZDTlQgKyAxO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjgavplqLjgZnjgovlsaXmrbTjga7mt7HjgZXjgafjgZnjgIJcbmNvbnN0IEtFRVBfUFJFVl9DTlQgPSBleHBvcnRzLktFRVBfUFJFVl9DTlQgPSA3O1xuXG4vLy8gTk7jgbjjga7lhaXlipvjg5XjgqPjg7zjg4Hjg6Pjg7zjga7mlbDjgafjgZnjgIJcbmNvbnN0IEZFQVRVUkVfQ05UID0gZXhwb3J0cy5GRUFUVVJFX0NOVCA9IEtFRVBfUFJFVl9DTlQgKiAyICsgNDsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuWF9MQUJFTFMgPSB1bmRlZmluZWQ7XG5leHBvcnRzLm1vdmUyeHkgPSBtb3ZlMnh5O1xuZXhwb3J0cy5ldjJ4eSA9IGV2Mnh5O1xuZXhwb3J0cy54eTJldiA9IHh5MmV2O1xuZXhwb3J0cy5ydjJldiA9IHJ2MmV2O1xuZXhwb3J0cy5ldjJydiA9IGV2MnJ2O1xuZXhwb3J0cy5ldjJzdHIgPSBldjJzdHI7XG5leHBvcnRzLnN0cjJldiA9IHN0cjJldjtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5jb25zdCBYX0xBQkVMUyA9IGV4cG9ydHMuWF9MQUJFTFMgPSAnQEFCQ0RFRkdISktMTU5PUFFSU1QnO1xuXG5mdW5jdGlvbiBtb3ZlMnh5KHMpIHtcbiAgICBjb25zdCBPRkZTRVQgPSAnYScuY2hhckNvZGVBdCgwKSAtIDE7XG4gICAgcmV0dXJuIFtzLmNoYXJDb2RlQXQoMCkgLSBPRkZTRVQsIF9jb25zdGFudHMuQlNJWkUgKyAxIC0gKHMuY2hhckNvZGVBdCgxKSAtIE9GRlNFVCldO1xufVxuXG5mdW5jdGlvbiBldjJ4eShldikge1xuICAgIHJldHVybiBbZXYgJSBfY29uc3RhbnRzLkVCU0laRSwgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFKV07XG59XG5cbmZ1bmN0aW9uIHh5MmV2KHgsIHkpIHtcbiAgICByZXR1cm4geSAqIF9jb25zdGFudHMuRUJTSVpFICsgeDtcbn1cblxuZnVuY3Rpb24gcnYyZXYocnYpIHtcbiAgICByZXR1cm4gcnYgPT09IF9jb25zdGFudHMuQlZDTlQgPyBfY29uc3RhbnRzLlBBU1MgOiBydiAlIF9jb25zdGFudHMuQlNJWkUgKyAxICsgTWF0aC5mbG9vcihydiAvIF9jb25zdGFudHMuQlNJWkUgKyAxKSAqIF9jb25zdGFudHMuRUJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJydihldikge1xuICAgIHJldHVybiBldiA9PT0gX2NvbnN0YW50cy5QQVNTID8gX2NvbnN0YW50cy5CVkNOVCA6IGV2ICUgX2NvbnN0YW50cy5FQlNJWkUgLSAxICsgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFIC0gMSkgKiBfY29uc3RhbnRzLkJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJzdHIoZXYpIHtcbiAgICBpZiAoZXYgPj0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgIHJldHVybiAncGFzcyc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgW3gsIHldID0gZXYyeHkoZXYpO1xuICAgICAgICByZXR1cm4gWF9MQUJFTFMuY2hhckF0KHgpICsgeS50b1N0cmluZygpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RyMmV2KHYpIHtcbiAgICBjb25zdCB2U3RyID0gdi50b1VwcGVyQ2FzZSgpO1xuICAgIGlmICh2U3RyID09PSAnUEFTUycgfHwgdlN0ciA9PT0gJ1JFU0lHTicpIHtcbiAgICAgICAgcmV0dXJuIF9jb25zdGFudHMuUEFTUztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB4ID0gWF9MQUJFTFMuaW5kZXhPZih2U3RyLmNoYXJBdCgwKSk7XG4gICAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh2U3RyLnNsaWNlKDEpKTtcbiAgICAgICAgcmV0dXJuIHh5MmV2KHgsIHkpO1xuICAgIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrID0gcmVxdWlyZSgnLi9uZXVyYWxfbmV0d29yay5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX3NwZWVjaCA9IHJlcXVpcmUoJy4vc3BlZWNoLmpzJyk7XG5cbmNvbnN0IEZJUlNUX1RJTUUgPSA3ICogNjA7IC8qIGdsb2JhbCAkIEpHTyBCb2FyZENvbnRyb2xsZXIgaTE4biAqL1xuXG5jb25zdCBGSVNIRVJfU0VDID0gMztcblxuZnVuY3Rpb24gaTE4blNwZWFrKG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gKDAsIF9zcGVlY2guc3BlYWspKG1lc3NhZ2UsIGkxOG4ubGFuZywgJ2ZlbWFsZScpO1xufVxuXG5jbGFzcyBBOUVuZ2luZSBleHRlbmRzIF93b3JrZXJSbWkuV29ya2VyUk1JIHtcbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2xvYWROTicpO1xuICAgIH1cblxuICAgIGFzeW5jIGNsZWFyKCkge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3BQb25kZXIoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnY2xlYXInKTtcbiAgICB9XG5cbiAgICBhc3luYyB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCd0aW1lU2V0dGluZ3MnLCBbbWFpblRpbWUsIGJ5b3lvbWldKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGlmICh3aW5SYXRlIDwgMC4xKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsYXkobW92ZSk7XG4gICAgICAgICAgICByZXR1cm4gKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwbGF5KGV2KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3BsYXknLCBbZXZdKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2Jlc3RNb3ZlJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2ZpbmFsU2NvcmUnKTtcbiAgICB9XG5cbiAgICBzdGFydFBvbmRlcigpIHtcbiAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gdGhpcy5pbnZva2VSTSgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZGVyUHJvbWlzZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnc3RvcFBvbmRlcicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wb25kZXJQcm9taXNlO1xuICAgICAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgUGxheUNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKGVuZ2luZSwgYm9hcmQsIGlnb1F1ZXN0ID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmU7XG4gICAgICAgIHRoaXMuYm9hcmQgPSBib2FyZDtcbiAgICAgICAgdGhpcy5pc1NlbGZQbGF5ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaWdvUXVlc3QgPSBpZ29RdWVzdDtcbiAgICAgICAgaWYgKGlnb1F1ZXN0KSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0ID0gWzAsIC8vIGR1bXlcbiAgICAgICAgICAgIEZJUlNUX1RJTUUgKiAxMDAwLCAvLyBibGFja1xuICAgICAgICAgICAgRklSU1RfVElNRSAqIDEwMDBdO1xuICAgICAgICAgICAgdGhpcy5zdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybl0gLT0gc3RhcnQgLSB0aGlzLnN0YXJ0O1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgICAgICAgICAkKCcjeW91ci10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLm93bkNvbG9yXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICAkKCcjYWktdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvciAlIDIgKyAxXSAvIDEwMDApKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoaTE4bi50aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50aW1lTGVmdCA9IFswLCAvLyBkdW15XG4gICAgICAgICAgICB0aGlzLmJvYXJkLm93bkNvbG9yID09PSBKR08uQkxBQ0sgPyBJbmZpbml0eSA6IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwLCAvLyBibGFja1xuICAgICAgICAgICAgdGhpcy5ib2FyZC5vd25Db2xvciA9PT0gSkdPLkJMQUNLID8gdGhpcy5lbmdpbmUuYnlveW9taSAqIDEwMDAgOiBJbmZpbml0eV07XG4gICAgICAgICAgICB0aGlzLnN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSAtPSBzdGFydCAtIHRoaXMuc3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJvYXJkLnR1cm4gPT0gdGhpcy5ib2FyZC5vd25Db2xvcikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjeW91ci10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNhaS10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3lvdXItdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvcl0gLyAxMDAwKSk7XG4gICAgICAgICQoJyNhaS10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLm93bkNvbG9yICUgMiArIDFdIC8gMTAwMCkpO1xuICAgIH1cblxuICAgIGNsZWFyVGltZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2V0SXNTZWxmUGxheShpc1NlbGZQbGF5KSB7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGlzU2VsZlBsYXk7XG4gICAgfVxuICAgIGFzeW5jIHVwZGF0ZShjb29yZCkge1xuICAgICAgICBpZiAoY29vcmQgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLnNjb3JpbmcpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY29yZSA9IGF3YWl0IHRoaXMuZmluYWxTY29yZSgpO1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIGlmIChzY29yZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gaTE4bi5qaWdvO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBpMThuW3Njb3JlID4gMCA/ICdibGFjaycgOiAnd2hpdGUnXTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChpMThuLmxhbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IGAgd29uIGJ5ICR7c2NvcmV9IHBvaW50c2A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhYnNTY29yZSA9IE1hdGguYWJzKHNjb3JlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSBhYnNTY29yZSA8IDEgPyAn5Y2K55uu5Yud44GhJyA6IE1hdGguZmxvb3IoYWJzU2NvcmUpICsgJ+ebruWNiuWLneOBoSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaTE4bi5sYW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJz8nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJ+OBp+OBmeOBi++8nyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaTE4blNwZWFrKG1lc3NhZ2UucmVwbGFjZSgn5Y2KJywgJ+OBr+OCkycpKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLmZhaWxTY29yaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlnb1F1ZXN0KSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybiAlIDIgKyAxXSArPSBGSVNIRVJfU0VDICogMTAwMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJvYXJkLnR1cm4gPT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvciAlIDIgKyAxXSA9IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwO1xuICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3IgJSAyICsgMV0gLyAxMDAwKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KCgwLCBfY29vcmRfY29udmVydC54eTJldikoY29vcmQuaSArIDEsIF9jb25zdGFudHMuQlNJWkUgLSBjb29yZC5qKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmJvYXJkLnR1cm4gIT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdmUgPSBhd2FpdCB0aGlzLmVuZ2luZS5nZW5tb3ZlKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChtb3ZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2lnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLnJlc2lnbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKCdlbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdwYXNzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLnBhc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXYgPSAoMCwgX2Nvb3JkX2NvbnZlcnQuc3RyMmV2KShtb3ZlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB4eSA9ICgwLCBfY29vcmRfY29udmVydC5ldjJ4eSkoZXYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShuZXcgSkdPLkNvb3JkaW5hdGUoeHlbMF0gLSAxLCBfY29uc3RhbnRzLkJTSVpFIC0geHlbMV0pLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZW5naW5lLnN0YXJ0UG9uZGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwYXNzKCkge1xuICAgICAgICBpZiAodGhpcy5ib2FyZC5vd25Db2xvciA9PT0gdGhpcy5ib2FyZC50dXJuKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICB0aGlzLmVuZ2luZS5wbGF5KF9jb25zdGFudHMuUEFTUyk7XG4gICAgICAgICAgICB0aGlzLmJvYXJkLnBsYXkobnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBmaW5hbFNjb3JlKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAkLnBvc3Qoe1xuICAgICAgICAgICAgdXJsOiAnaHR0cHM6Ly9taW1pYWthLXB5dGhvbi5oZXJva3VhcHAuY29tL2dudWdvJywgLy8gaHR0cOOBp+OBr+mAmuS/oeOBp+OBjeOBquOBi+OBo+OBn+OAgiAnaHR0cDovLzM1LjIwMy4xNjEuMTAwL2dudWdvJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBzZ2Y6IHRoaXMuYm9hcmQuanJlY29yZC50b1NnZigpLFxuICAgICAgICAgICAgICAgIG1vdmU6ICdlc3QnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2FmdGVybWF0aCcsXG4gICAgICAgICAgICAgICAgcnVsZTogdGhpcy5ib2FyZC5qcmVjb3JkLmdldFJvb3ROb2RlKCkuaW5mby5rb21pID09PSAnNi41JyA/ICdqYXBhbmVzZScgOiAnY2hpbmVzZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgvSmlnby8udGVzdChyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaCA9IHJlc3VsdC5tYXRjaCgvKEJsYWNrfFdoaXRlKSB3aW5zIGJ5IChbMC05Ll0rKSBwb2ludHMvKTtcbiAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICBsZXQgc2NvcmUgPSBwYXJzZUZsb2F0KG1hdGNoWzJdKTtcbiAgICAgICAgICAgIGlmIChtYXRjaFsxXSA9PT0gJ0JsYWNrJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC1zY29yZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgY29uc3QgYm9hcmQgPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgbmV3IEJvYXJkQ29udHJvbGxlcihfY29uc3RhbnRzLkJTSVpFLCAwLCA3LjUsIHJlcyk7XG4gICAgfSk7XG4gICAgLy8gSkdP44Gu44Os44Oz44OA44Oq44Oz44Kw44KS5a6M5LqG44GV44Gb44KL44Gf44KB44Grc2V0VGltZW91dOOBp+OCpOODmeODs+ODiOODq+ODvOODl+OCkumAsuOCgeOCi1xuICAgIGNvbnN0ICRzdGFydE1vZGFsID0gJCgnI3N0YXJ0LW1vZGFsJyk7XG4gICAgJHN0YXJ0TW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICBzZXRUaW1lb3V0KGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGVuZ2luZS5sb2FkTk4oKTtcbiAgICAgICAgICAgICQoJyNsb2FkaW5nLW1lc3NhZ2UnKS50ZXh0KGkxOG4uZmluaXNoRG93bmxvYWQpO1xuICAgICAgICAgICAgJCgnI3N0YXJ0LWdhbWUnKS5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUubWVzc2FnZSA9PT0gJ05vIGJhY2tlbmQgaXMgYXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgIGlmICgvKE1hYyBPUyBYIDEwXzEzfChpUGFkfGlQaG9uZXxpUG9kKTsgQ1BVIE9TIDExKS4qU2FmYXJpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpICYmICEvQ2hyb21lLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLm5vdFN1cHBvcnQgKyBpMThuLnNhZmFyaVdpdGhvdXRXZWJncHUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWkxOG5TcGVhayhpMThuLm5vdFN1cHBvcnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KGkxOG4ubm90U3VwcG9ydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICAgICAgJHN0YXJ0TW9kYWwub25lKCdoaWRkZW4uYnMubW9kYWwnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjb25kaXRpb25Gb3JtID0gJCgnI2NvbmRpdGlvbi1mb3JtJyk7XG4gICAgICAgICAgICAgICAgcmVzKHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6ICRjb25kaXRpb25Gb3JtWzBdWydjb2xvciddLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0aW1lUnVsZTogJGNvbmRpdGlvbkZvcm1bMF1bJ3RpbWUnXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZTogcGFyc2VJbnQoJGNvbmRpdGlvbkZvcm1bMF1bJ2FpLWJ5b3lvbWknXS52YWx1ZSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgc3dpdGNoIChjb25kaXRpb24udGltZVJ1bGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2FpLXRpbWUnOlxuICAgICAgICAgICAgICAgIGF3YWl0IGVuZ2luZS50aW1lU2V0dGluZ3MoMCwgY29uZGl0aW9uLnRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaWdvLXF1ZXN0JzpcbiAgICAgICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKEZJUlNUX1RJTUUgKyAxMjUgKiBGSVNIRVJfU0VDLCBGSVNIRVJfU0VDKTsgLy8gMTnot6/nm6Tjga/lubPlnYfmiYvmlbDjgpIyNTDmiYvjgajku67lrprjgZfjgabjgIExMjXmiYvliIbjga7jg5XjgqPjg4Pjgrfjg6Pjg7znp5LjgpLov73liqBcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnVycpIHtcbiAgICAgICAgICAgIGJvYXJkLnNldE93bkNvbG9yKEpHTy5XSElURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnQicpIHtcbiAgICAgICAgICAgIGJvYXJkLnNldE93bkNvbG9yKEpHTy5CTEFDSyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBQbGF5Q29udHJvbGxlcihlbmdpbmUsIGJvYXJkLCBjb25kaXRpb24udGltZVJ1bGUgPT09ICdpZ28tcXVlc3QnKTtcbiAgICAgICAgY29uc3QgaXNTZWxmUGxheSA9IGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheSc7XG4gICAgICAgIGlmICghaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4uc3RhcnRHcmVldCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udHJvbGxlci5zZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpO1xuICAgICAgICBib2FyZC5hZGRPYnNlcnZlcihjb250cm9sbGVyKTtcbiAgICAgICAgJCgnI3Bhc3MnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGFzcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI3Jlc2lnbicpLm9uKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgY29udHJvbGxlci5jbGVhclRpbWVyKCk7XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUuc3RvcFBvbmRlcigpO1xuICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4uZW5kR3JlZXQpO1xuICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjcmV0cnknKS5vbmUoJ2NsaWNrJywgYXN5bmMgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAkKCcjcGFzcycpLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChtYWluLCAwKTtcbiAgICAgICAgfSk7XG4gICAgfSwgMCk7XG59XG5cbmNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoJ2pzL3dvcmtlci5qcycpO1xuKDAsIF93b3JrZXJSbWkucmVzaWd0ZXJXb3JrZXJSTUkpKHdvcmtlciwgX25ldXJhbF9uZXR3b3JrLk5ldXJhbE5ldHdvcmspO1xuY29uc3QgZW5naW5lID0gbmV3IEE5RW5naW5lKHdvcmtlcik7XG5tYWluKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKiBnbG9iYWwgV2ViRE5OICQgKi9cblxuaWYgKCFBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UpIHtcbiAgICBBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgICAgICB2YXIgdGhhdCA9IG5ldyBVaW50OEFycmF5KHRoaXMpO1xuICAgICAgICBpZiAoZW5kID09IHVuZGVmaW5lZCkgZW5kID0gdGhhdC5sZW5ndGg7XG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZW5kIC0gc3RhcnQpO1xuICAgICAgICB2YXIgcmVzdWx0QXJyYXkgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdEFycmF5Lmxlbmd0aDsgaSsrKSByZXN1bHRBcnJheVtpXSA9IHRoYXRbaSArIHN0YXJ0XTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBzZXRMb2FkaW5nQmFyKHBlcmNlbnRhZ2UpIHtcbiAgICBjb25zdCAkbG9hZGluZ0JhciA9ICQoJyNsb2FkaW5nLWJhcicpO1xuICAgICRsb2FkaW5nQmFyLmF0dHIoJ2FyaWEtdmFsdWVub3cnLCBwZXJjZW50YWdlKTtcbiAgICAkbG9hZGluZ0Jhci5jc3MoJ3dpZHRoJywgcGVyY2VudGFnZS50b1N0cmluZygpICsgJyUnKTtcbn1cblxuY2xhc3MgTmV1cmFsTmV0d29yayB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubm4gPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWQoKSB7XG4gICAgICAgIGlmICh0aGlzLm5uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGJhY2tlbmRPcmRlcjogWyd3ZWJncHUnLCAnd2ViZ2wnXSxcbiAgICAgICAgICAgIHByb2dyZXNzQ2FsbGJhY2s6IGZ1bmN0aW9uIChsb2FkZWQsIHRvdGFsKSB7XG4gICAgICAgICAgICAgICAgc2V0TG9hZGluZ0Jhcihsb2FkZWQgLyB0b3RhbCAqIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHNldExvYWRpbmdCYXIoMCk7XG4gICAgICAgIHRoaXMubm4gPSBhd2FpdCBXZWJETk4ubG9hZCgnaHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL21pbWlha2Etc3RvcmFnZS9FTEZfT3BlbkdvJywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGUoLi4uaW5wdXRzKSB7XG4gICAgICAgIGNvbnN0IHZpZXdzID0gdGhpcy5ubi5nZXRJbnB1dFZpZXdzKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2aWV3c1tpXS5zZXQoaW5wdXRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLm5uLnJ1bigpO1xuICAgICAgICByZXR1cm4gdGhpcy5ubi5nZXRPdXRwdXRWaWV3cygpLm1hcChlID0+IGUudG9BY3R1YWwoKS5zbGljZSgwKSk7IC8vIHRvLkFjdHVhbOOBneOBruOCguOBruOBp+OBr3dvcmtlcuWBtOOBp2RldGFjaOOBjOOBp+OBjeOBquOBhOaooeanmFxuICAgIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNwZWFrID0gc3BlYWs7XG5mdW5jdGlvbiBzcGVhayh0ZXh0LCBsYW5nLCBnZW5kZXIpIHtcbiAgICBpZiAoIVNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgIGxhbmcgPSAnZW4tdXMnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgIGxhbmcgPSAnamEtanAnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IHV0dGVyYW5jZSA9IG5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UodGV4dCk7XG4gICAgaWYgKC8oaVBob25lfGlQYWR8aVBvZCkoPz0uKk9TIFs3LThdKS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkgdXR0ZXJhbmNlLnJhdGUgPSAwLjI7XG4gICAgY29uc3Qgdm9pY2VzID0gc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpLmZpbHRlcihlID0+IGUubGFuZy50b0xvd2VyQ2FzZSgpID09PSBsYW5nKTtcbiAgICBsZXQgdm9pY2UgPSBudWxsO1xuICAgIGlmICh2b2ljZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBsZXQgbmFtZXMgPSBudWxsO1xuICAgICAgICBzd2l0Y2ggKGxhbmcpIHtcbiAgICAgICAgICAgIGNhc2UgJ2phLWpwJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydPdG95YScsICdIYXR0b3JpJywgJ0ljaGlybyddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnTy1yZW7vvIjmi6HlvLXvvIknLCAnTy1yZW4nLCAnS3lva28nLCAnSGFydWthJ107IC8vIFdpbmRvd3MgMTDjga5BeXVtaeOBruWjsOOBr+S7iuOBsuOBqOOBpFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW4tdXMnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZ2VuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ0FsZXgnLCAnRnJlZCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnU2FtYW50aGEnLCAnVmljdG9yaWEnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZXMpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IG5hbWVzLnNvbWUobiA9PiB2Lm5hbWUuaW5kZXhPZihuKSA+PSAwKSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF2b2ljZSkge1xuICAgICAgICAgICAgdm9pY2UgPSB2b2ljZXMuZmlsdGVyKHYgPT4gdi5nZW5kZXIgJiYgdi5nZW5kZXIudG9Mb3dlckNhc2UoKSA9PT0gZ2VuZGVyKVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB1dHRlcmFuY2Uudm9pY2UgPSB2b2ljZSB8fCB2b2ljZXNbMF07XG4gICAgLy8gaU9TIDEwIFNhZmFyaSBoYXMgYSBidWcgdGhhdCB1dHRlcmFuY2Uudm9pY2UgaXMgbm8gZWZmZWN0LlxuICAgIHV0dGVyYW5jZS52b2x1bWUgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd2b2x1bWUnKSB8fCAnMS4wJyk7XG4gICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKHV0dGVyYW5jZSk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHVubG9jaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2spO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayhuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKCcnKSk7XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKHNwZWVjaFN5bnRoZXNpcykge1xuICAgICAgICBzcGVlY2hTeW50aGVzaXMuZ2V0Vm9pY2VzKCk7XG4gICAgICAgIGlmIChzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNwZWVjaFN5bnRoZXNpcy5vbnZvaWNlc2NoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29udm9pY2VzY2hhbmdlZCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2ssIGZhbHNlKTsgLy8gZm9yIGlPU1xuICAgIH1cbn0pOyJdfQ==
