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

    async timeLeft() {
        return await this.invokeRM('timeLeft');
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
                    this.engine.stopPonder();
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
                const timeLeft = await this.engine.timeLeft();
                if (!this.timer) {
                    return; // 時間切れ
                }
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
            if (e === 'Error: No backend is available') {
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
                await engine.timeSettings(FIRST_TIME, FISHER_SEC);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnNvbi1vYmplY3RpZC9vYmplY3RpZC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd29ya2VyLXJtaS93b3JrZXItcm1pLmpzIiwic3JjL2NvbnN0YW50cy5qcyIsInNyYy9jb29yZF9jb252ZXJ0LmpzIiwic3JjL21haW4uanMiLCJzcmMvbmV1cmFsX25ldHdvcmsuanMiLCJzcmMvc3BlZWNoLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcbnZhciBNQUNISU5FX0lEID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYpO1xudmFyIGluZGV4ID0gT2JqZWN0SUQuaW5kZXggPSBwYXJzZUludChNYXRoLnJhbmRvbSgpICogMHhGRkZGRkYsIDEwKTtcbnZhciBwaWQgPSAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBwcm9jZXNzLnBpZCAhPT0gJ251bWJlcicgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDApIDogcHJvY2Vzcy5waWQpICUgMHhGRkZGO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgQnVmZmVyXG4gKlxuICogQXV0aG9yOiAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBMaWNlbnNlOiAgTUlUXG4gKlxuICovXG52YXIgaXNCdWZmZXIgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHJldHVybiAhIShcbiAgb2JqICE9IG51bGwgJiZcbiAgb2JqLmNvbnN0cnVjdG9yICYmXG4gIHR5cGVvZiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyKG9iailcbiAgKVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW1tdXRhYmxlIE9iamVjdElEIGluc3RhbmNlXG4gKlxuICogQGNsYXNzIFJlcHJlc2VudHMgdGhlIEJTT04gT2JqZWN0SUQgdHlwZVxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBhcmcgQ2FuIGJlIGEgMjQgYnl0ZSBoZXggc3RyaW5nLCAxMiBieXRlIGJpbmFyeSBzdHJpbmcgb3IgYSBOdW1iZXIuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGluc3RhbmNlIG9mIE9iamVjdElELlxuICovXG5mdW5jdGlvbiBPYmplY3RJRChhcmcpIHtcbiAgaWYoISh0aGlzIGluc3RhbmNlb2YgT2JqZWN0SUQpKSByZXR1cm4gbmV3IE9iamVjdElEKGFyZyk7XG4gIGlmKGFyZyAmJiAoKGFyZyBpbnN0YW5jZW9mIE9iamVjdElEKSB8fCBhcmcuX2Jzb250eXBlPT09XCJPYmplY3RJRFwiKSlcbiAgICByZXR1cm4gYXJnO1xuXG4gIHZhciBidWY7XG5cbiAgaWYoaXNCdWZmZXIoYXJnKSB8fCAoQXJyYXkuaXNBcnJheShhcmcpICYmIGFyZy5sZW5ndGg9PT0xMikpIHtcbiAgICBidWYgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmcpO1xuICB9XG4gIGVsc2UgaWYodHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIikge1xuICAgIGlmKGFyZy5sZW5ndGghPT0xMiAmJiAhT2JqZWN0SUQuaXNWYWxpZChhcmcpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXJndW1lbnQgcGFzc2VkIGluIG11c3QgYmUgYSBzaW5nbGUgU3RyaW5nIG9mIDEyIGJ5dGVzIG9yIGEgc3RyaW5nIG9mIDI0IGhleCBjaGFyYWN0ZXJzXCIpO1xuXG4gICAgYnVmID0gYnVmZmVyKGFyZyk7XG4gIH1cbiAgZWxzZSBpZigvbnVtYmVyfHVuZGVmaW5lZC8udGVzdCh0eXBlb2YgYXJnKSkge1xuICAgIGJ1ZiA9IGJ1ZmZlcihnZW5lcmF0ZShhcmcpKTtcbiAgfVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImlkXCIsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KHRoaXMsIGJ1Zik7IH1cbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInN0clwiLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGJ1Zi5tYXAoaGV4LmJpbmQodGhpcywgMikpLmpvaW4oJycpOyB9XG4gIH0pO1xufVxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3RJRDtcbk9iamVjdElELmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5PYmplY3RJRC5kZWZhdWx0ID0gT2JqZWN0SUQ7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBPYmplY3RJRCBmcm9tIGEgc2Vjb25kIGJhc2VkIG51bWJlciwgd2l0aCB0aGUgcmVzdCBvZiB0aGUgT2JqZWN0SUQgemVyb2VkIG91dC4gVXNlZCBmb3IgY29tcGFyaXNvbnMgb3Igc29ydGluZyB0aGUgT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgYW4gaW50ZWdlciBudW1iZXIgcmVwcmVzZW50aW5nIGEgbnVtYmVyIG9mIHNlY29uZHMuXG4gKiBAcmV0dXJuIHtPYmplY3RJRH0gcmV0dXJuIHRoZSBjcmVhdGVkIE9iamVjdElEXG4gKiBAYXBpIHB1YmxpY1xuICovXG5PYmplY3RJRC5jcmVhdGVGcm9tVGltZSA9IGZ1bmN0aW9uKHRpbWUpe1xuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcbiAgcmV0dXJuIG5ldyBPYmplY3RJRChoZXgoOCx0aW1lKStcIjAwMDAwMDAwMDAwMDAwMDBcIik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gT2JqZWN0SUQgZnJvbSBhIGhleCBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gT2JqZWN0SUQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhleFN0cmluZyBjcmVhdGUgYSBPYmplY3RJRCBmcm9tIGEgcGFzc2VkIGluIDI0IGJ5dGUgaGV4c3RyaW5nLlxuICogQHJldHVybiB7T2JqZWN0SUR9IHJldHVybiB0aGUgY3JlYXRlZCBPYmplY3RJRFxuICogQGFwaSBwdWJsaWNcbiAqL1xuT2JqZWN0SUQuY3JlYXRlRnJvbUhleFN0cmluZyA9IGZ1bmN0aW9uKGhleFN0cmluZykge1xuICBpZighT2JqZWN0SUQuaXNWYWxpZChoZXhTdHJpbmcpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgT2JqZWN0SUQgaGV4IHN0cmluZ1wiKTtcblxuICByZXR1cm4gbmV3IE9iamVjdElEKGhleFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgdmFsaWQgYnNvbiBPYmplY3RJZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBvYmplY3RpZCBDYW4gYmUgYSAyNCBieXRlIGhleCBzdHJpbmcgb3IgYW4gaW5zdGFuY2Ugb2YgT2JqZWN0SUQuXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXR1cm4gdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBic29uIE9iamVjdElELCByZXR1cm4gZmFsc2Ugb3RoZXJ3aXNlLlxuICogQGFwaSBwdWJsaWNcbiAqXG4gKiBUSEUgTkFUSVZFIERPQ1VNRU5UQVRJT04gSVNOJ1QgQ0xFQVIgT04gVEhJUyBHVVkhXG4gKiBodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS9hcGktYnNvbi1nZW5lcmF0ZWQvb2JqZWN0aWQuaHRtbCNvYmplY3RpZC1pc3ZhbGlkXG4gKi9cbk9iamVjdElELmlzVmFsaWQgPSBmdW5jdGlvbihvYmplY3RpZCkge1xuICBpZighb2JqZWN0aWQpIHJldHVybiBmYWxzZTtcblxuICAvL2NhbGwgLnRvU3RyaW5nKCkgdG8gZ2V0IHRoZSBoZXggaWYgd2UncmVcbiAgLy8gd29ya2luZyB3aXRoIGFuIGluc3RhbmNlIG9mIE9iamVjdElEXG4gIHJldHVybiAvXlswLTlBLUZdezI0fSQvaS50ZXN0KG9iamVjdGlkLnRvU3RyaW5nKCkpO1xufTtcblxuLyoqXG4gKiBzZXQgYSBjdXN0b20gbWFjaGluZUlEXG4gKiBcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gbWFjaGluZWlkIENhbiBiZSBhIHN0cmluZywgaGV4LXN0cmluZyBvciBhIG51bWJlclxuICogQHJldHVybiB7dm9pZH1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELnNldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKGFyZykge1xuICB2YXIgbWFjaGluZUlEO1xuXG4gIGlmKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAvLyBoZXggc3RyaW5nXG4gICAgbWFjaGluZUlEID0gcGFyc2VJbnQoYXJnLCAxNik7XG4gICBcbiAgICAvLyBhbnkgc3RyaW5nXG4gICAgaWYoaXNOYU4obWFjaGluZUlEKSkge1xuICAgICAgYXJnID0gKCcwMDAwMDAnICsgYXJnKS5zdWJzdHIoLTcsNik7XG5cbiAgICAgIG1hY2hpbmVJRCA9IFwiXCI7XG4gICAgICBmb3IodmFyIGkgPSAwO2k8NjsgaSsrKSB7XG4gICAgICAgIG1hY2hpbmVJRCArPSAoYXJnLmNoYXJDb2RlQXQoaSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBlbHNlIGlmKC9udW1iZXJ8dW5kZWZpbmVkLy50ZXN0KHR5cGVvZiBhcmcpKSB7XG4gICAgbWFjaGluZUlEID0gYXJnIHwgMDtcbiAgfVxuXG4gIE1BQ0hJTkVfSUQgPSAobWFjaGluZUlEICYgMHhGRkZGRkYpO1xufVxuXG4vKipcbiAqIGdldCB0aGUgbWFjaGluZUlEXG4gKiBcbiAqIEByZXR1cm4ge251bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cbk9iamVjdElELmdldE1hY2hpbmVJRCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTUFDSElORV9JRDtcbn1cblxuT2JqZWN0SUQucHJvdG90eXBlID0ge1xuICBfYnNvbnR5cGU6ICdPYmplY3RJRCcsXG4gIGNvbnN0cnVjdG9yOiBPYmplY3RJRCxcblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBPYmplY3RJRCBpZCBhcyBhIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgKlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybiB0aGUgMjQgYnl0ZSBoZXggc3RyaW5nIHJlcHJlc2VudGF0aW9uLlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgdG9IZXhTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN0cjtcbiAgfSxcblxuICAvKipcbiAgICogQ29tcGFyZXMgdGhlIGVxdWFsaXR5IG9mIHRoaXMgT2JqZWN0SUQgd2l0aCBgb3RoZXJJRGAuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvdGhlciBPYmplY3RJRCBpbnN0YW5jZSB0byBjb21wYXJlIGFnYWluc3QuXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59IHRoZSByZXN1bHQgb2YgY29tcGFyaW5nIHR3byBPYmplY3RJRCdzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBlcXVhbHM6IGZ1bmN0aW9uIChvdGhlcil7XG4gICAgcmV0dXJuICEhb3RoZXIgJiYgdGhpcy5zdHIgPT09IG90aGVyLnRvU3RyaW5nKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGdlbmVyYXRpb24gZGF0ZSAoYWNjdXJhdGUgdXAgdG8gdGhlIHNlY29uZCkgdGhhdCB0aGlzIElEIHdhcyBnZW5lcmF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm4ge0RhdGV9IHRoZSBnZW5lcmF0aW9uIGRhdGVcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIGdldFRpbWVzdGFtcDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbmV3IERhdGUocGFyc2VJbnQodGhpcy5zdHIuc3Vic3RyKDAsOCksIDE2KSAqIDEwMDApO1xuICB9XG59O1xuXG5mdW5jdGlvbiBuZXh0KCkge1xuICByZXR1cm4gaW5kZXggPSAoaW5kZXgrMSkgJSAweEZGRkZGRjtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGUodGltZSkge1xuICBpZiAodHlwZW9mIHRpbWUgIT09ICdudW1iZXInKVxuICAgIHRpbWUgPSBEYXRlLm5vdygpLzEwMDA7XG5cbiAgLy9rZWVwIGl0IGluIHRoZSByaW5nIVxuICB0aW1lID0gcGFyc2VJbnQodGltZSwgMTApICUgMHhGRkZGRkZGRjtcblxuICAvL0ZGRkZGRkZGIEZGRkZGRiBGRkZGIEZGRkZGRlxuICByZXR1cm4gaGV4KDgsdGltZSkgKyBoZXgoNixNQUNISU5FX0lEKSArIGhleCg0LHBpZCkgKyBoZXgoNixuZXh0KCkpO1xufVxuXG5mdW5jdGlvbiBoZXgobGVuZ3RoLCBuKSB7XG4gIG4gPSBuLnRvU3RyaW5nKDE2KTtcbiAgcmV0dXJuIChuLmxlbmd0aD09PWxlbmd0aCk/IG4gOiBcIjAwMDAwMDAwXCIuc3Vic3RyaW5nKG4ubGVuZ3RoLCBsZW5ndGgpICsgbjtcbn1cblxuZnVuY3Rpb24gYnVmZmVyKHN0cikge1xuICB2YXIgaT0wLG91dD1bXTtcblxuICBpZihzdHIubGVuZ3RoPT09MjQpXG4gICAgZm9yKDtpPDI0OyBvdXQucHVzaChwYXJzZUludChzdHJbaV0rc3RyW2krMV0sIDE2KSksaSs9Mik7XG5cbiAgZWxzZSBpZihzdHIubGVuZ3RoPT09MTIpXG4gICAgZm9yKDtpPDEyOyBvdXQucHVzaChzdHIuY2hhckNvZGVBdChpKSksaSsrKTtcblxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRvIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgSWQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm4gdGhlIDI0IGJ5dGUgaGV4IHN0cmluZyByZXByZXNlbnRhdGlvbi5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5PYmplY3RJRC5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJPYmplY3RJRChcIit0aGlzK1wiKVwiIH07XG5PYmplY3RJRC5wcm90b3R5cGUudG9KU09OID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuT2JqZWN0SUQucHJvdG90eXBlLnRvU3RyaW5nID0gT2JqZWN0SUQucHJvdG90eXBlLnRvSGV4U3RyaW5nO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qIGdsb2JhbCBleHBvcnRzICovXG4vKipcbiAqIEBmaWxlb3ZlcnZpZXcgYSB0aW55IGxpYnJhcnkgZm9yIFdlYiBXb3JrZXIgUmVtb3RlIE1ldGhvZCBJbnZvY2F0aW9uXG4gKlxuICovXG5jb25zdCBPYmplY3RJRCA9IHJlcXVpcmUoJ2Jzb24tb2JqZWN0aWQnKTtcblxuLyoqXG4gKiBAcHJpdmF0ZSByZXR1cm5zIGEgbGlzdCBvZiBUcmFuc2ZlcmFibGUgb2JqZWN0cyB3aGljaCB7QGNvZGUgb2JqfSBpbmNsdWRlc1xuICogQHBhcmFtIHtvYmplY3R9IG9iaiBhbnkgb2JqZWN0XG4gKiBAcGFyYW0ge0FycmF5fSBsaXN0IGZvciBpbnRlcm5hbCByZWN1cnNpb24gb25seVxuICogQHJldHVybiB7TGlzdH0gYSBsaXN0IG9mIFRyYW5zZmVyYWJsZSBvYmplY3RzXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zZmVyTGlzdChvYmosIGxpc3QgPSBbXSkge1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqLmJ1ZmZlcik7XG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICBpZiAoaXNUcmFuc2ZlcmFibGUob2JqKSkge1xuICAgICAgICBsaXN0LnB1c2gob2JqKTtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIGlmICghKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSkge1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwcm9wIGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICBnZXRUcmFuc2Zlckxpc3Qob2JqW3Byb3BdLCBsaXN0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbGlzdDtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZSBjaGVja3MgaWYge0Bjb2RlIG9ian0gaXMgVHJhbnNmZXJhYmxlIG9yIG5vdC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogYW55IG9iamVjdFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNUcmFuc2ZlcmFibGUob2JqKSB7XG4gICAgY29uc3QgdHJhbnNmZXJhYmxlID0gW0FycmF5QnVmZmVyXTtcbiAgICBpZiAodHlwZW9mIE1lc3NhZ2VQb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0cmFuc2ZlcmFibGUucHVzaChNZXNzYWdlUG9ydCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgSW1hZ2VCaXRtYXAgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRyYW5zZmVyYWJsZS5wdXNoKEltYWdlQml0bWFwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRyYW5zZmVyYWJsZS5zb21lKGUgPT4gb2JqIGluc3RhbmNlb2YgZSk7XG59XG5cbi8qKlxuICogQGNsYXNzIGJhc2UgY2xhc3Mgd2hvc2UgY2hpbGQgY2xhc3NlcyB1c2UgUk1JXG4gKi9cbmNsYXNzIFdvcmtlclJNSSB7XG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlbW90ZSBhbiBpbnN0YW5jZSB0byBjYWxsIHBvc3RNZXNzYWdlIG1ldGhvZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCB0byBzZXJ2ZXItc2lkZSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHJlbW90ZSwgLi4uYXJncykge1xuICAgICAgICB0aGlzLnJlbW90ZSA9IHJlbW90ZTtcbiAgICAgICAgdGhpcy5pZCA9IE9iamVjdElEKCkudG9TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5tZXRob2RTdGF0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5yZW1vdGUuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICAgICAgaWYgKGRhdGEuaWQgPT09IHRoaXMuaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVybkhhbmRsZXIoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgdGhpcy5jb25zdHJ1Y3RvclByb21pc2UgPSB0aGlzLmludm9rZVJNKHRoaXMuY29uc3RydWN0b3IubmFtZSwgYXJncyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW52b2tlcyByZW1vdGUgbWV0aG9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWUgTWV0aG9kIG5hbWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBiZSBwYXNzZWQgdG8gc2VydmVyLXNpZGUgaW5zdGFuY2VcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGludm9rZVJNKG1ldGhvZE5hbWUsIGFyZ3MgPSBbXSkge1xuICAgICAgICBpZiAoIXRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLm1ldGhvZFN0YXRlc1ttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBudW06IDAsXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXRob2RTdGF0ZSA9IHRoaXMubWV0aG9kU3RhdGVzW21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgbWV0aG9kU3RhdGUubnVtICs9IDE7XG4gICAgICAgICAgICBtZXRob2RTdGF0ZS5yZXNvbHZlUmVqZWN0c1ttZXRob2RTdGF0ZS5udW1dID0geyByZXNvbHZlLCByZWplY3QgfTtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgICAgICBtZXRob2ROYW1lLFxuICAgICAgICAgICAgICAgIG51bTogbWV0aG9kU3RhdGUubnVtLFxuICAgICAgICAgICAgICAgIGFyZ3NcbiAgICAgICAgICAgIH0sIGdldFRyYW5zZmVyTGlzdChhcmdzKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlIGhhbmRsZXMgY29ycmVzcG9uZGVudCAnbWVzc2FnZScgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29ian0gZGF0YSBkYXRhIHByb3BlcnR5IG9mICdtZXNzYWdlJyBldmVudFxuICAgICAqL1xuICAgIHJldHVybkhhbmRsZXIoZGF0YSkge1xuICAgICAgICBjb25zdCByZXNvbHZlUmVqZWN0cyA9IHRoaXMubWV0aG9kU3RhdGVzW2RhdGEubWV0aG9kTmFtZV0ucmVzb2x2ZVJlamVjdHM7XG4gICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV0ucmVqZWN0KGRhdGEuZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZVJlamVjdHNbZGF0YS5udW1dLnJlc29sdmUoZGF0YS5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZXNvbHZlUmVqZWN0c1tkYXRhLm51bV07XG4gICAgfVxufVxuXG5cbi8qKlxuICogQHByaXZhdGUgZXhlY3V0ZXMgYSBtZXRob2Qgb24gc2VydmVyIGFuZCBwb3N0IGEgcmVzdWx0IGFzIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge29ian0gZXZlbnQgJ21lc3NhZ2UnIGV2ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVdvcmtlclJNSShldmVudCkge1xuICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICBtZXRob2ROYW1lOiBkYXRhLm1ldGhvZE5hbWUsXG4gICAgICAgIG51bTogZGF0YS5udW0sXG4gICAgfTtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChkYXRhLm1ldGhvZE5hbWUgPT09IHRoaXMubmFtZSkge1xuICAgICAgICB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF0gPSBuZXcgdGhpcyguLi5kYXRhLmFyZ3MpO1xuICAgICAgICBtZXNzYWdlLnJlc3VsdCA9IG51bGw7XG4gICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlLCBnZXRUcmFuc2Zlckxpc3QocmVzdWx0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLndvcmtlclJNSS5pbnN0YW5jZXNbZGF0YS5pZF07XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZVtkYXRhLm1ldGhvZE5hbWVdLmFwcGx5KGluc3RhbmNlLCBkYXRhLmFyZ3MpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5yZXN1bHQgPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgdGhpcy53b3JrZXJSTUkudGFyZ2V0LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIGdldFRyYW5zZmVyTGlzdChyZXN1bHQpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmVycm9yID0gZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIHRoaXMud29ya2VyUk1JLnRhcmdldC5wb3N0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiByZWdpc3RlcnMgYSBjbGFzcyBhcyBhbiBleGVjdXRlciBvZiBSTUkgb24gc2VydmVyXG4gKiBAcGFyYW0ge29ian0gdGFyZ2V0IGFuIGluc3RhbmNlIHRoYXQgcmVjZWl2ZXMgJ21lc3NhZ2UnIGV2ZW50cyBvZiBSTUlcbiAqIEBwYXJhbSB7Q2xhc3N9IGtsYXNzIGEgY2xhc3MgdG8gYmUgcmVnaXN0ZXJlZFxuICovXG5mdW5jdGlvbiByZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAga2xhc3Mud29ya2VyUk1JID0ge1xuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGluc3RhbmNlczoge30sXG4gICAgICAgIGhhbmRsZXI6IGhhbmRsZVdvcmtlclJNSS5iaW5kKGtsYXNzKVxuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGtsYXNzLndvcmtlclJNSS5oYW5kbGVyKTtcbn1cblxuLyoqXG4gKiB1bnJlc2lndGVycyBhIGNsYXNzIHJlZ2lzdGVyZWQgYnkgcmVnaXN0ZXJXb3JrZXJSTUlcbiAqIEBwYXJhbSB7b2JqfSB0YXJnZXQgYW4gaW5zdGFuY2UgdGhhdCByZWNlaXZlcyAnbWVzc2FnZScgZXZlbnRzIG9mIFJNSVxuICogQHBhcmFtIHtDbGFzc30ga2xhc3MgYSBjbGFzcyB0byBiZSB1bnJlZ2lzdGVyZWRcbiAqL1xuZnVuY3Rpb24gdW5yZXNpZ3RlcldvcmtlclJNSSh0YXJnZXQsIGtsYXNzKSB7XG4gICAgdGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBrbGFzcy53b3JrZXJSTUkuaGFuZGxlcilcbiAgICBkZWxldGUga2xhc3Mud29ya2VyUk1JO1xufVxuXG5leHBvcnRzLldvcmtlclJNSSA9IFdvcmtlclJNSTtcbmV4cG9ydHMucmVzaWd0ZXJXb3JrZXJSTUkgPSByZXNpZ3RlcldvcmtlclJNSTtcbmV4cG9ydHMudW5yZXNpZ3RlcldvcmtlclJNSSA9IHVucmVzaWd0ZXJXb3JrZXJSTUk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbi8vLyDnooHnm6Tjga7jgrXjgqTjgrrjgafjgZnjgIJcbmNvbnN0IEJTSVpFID0gZXhwb3J0cy5CU0laRSA9IDE5O1xuXG4vLy8g5aSW5p6g44KS5oyB44Gk5ouh5by156KB55uk44Gu44K144Kk44K644Gn44GZ44CCXG5jb25zdCBFQlNJWkUgPSBleHBvcnRzLkVCU0laRSA9IEJTSVpFICsgMjtcblxuLy8vIOeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgQlZDTlQgPSBleHBvcnRzLkJWQ05UID0gQlNJWkUgKiBCU0laRTtcblxuLy8vIOaLoeW8teeigeebpOOBruS6pOeCueOBruaVsOOBp+OBmeOAglxuY29uc3QgRUJWQ05UID0gZXhwb3J0cy5FQlZDTlQgPSBFQlNJWkUgKiBFQlNJWkU7XG5cbi8vLyDjg5HjgrnjgpLooajjgZnnt5rlvaLluqfmqJnjgafjgZnjgILpgJrluLjjga7nnYDmiYvjga/mi6HlvLXnooHnm6Tjga7nt5rlvaLluqfmqJnjgafooajjgZfjgb7jgZnjgIJcbi8vIFRPRE8gLSDnnYDmiYvjga7jgZ/jgoHjgavliJfmjJnlnovjgpLkvZzjgaPjgZ/jgbvjgYbjgYzplqLmlbDjga7jgrfjgrDjg4vjg4Hjg6Pjga/oqq3jgb/jgoTjgZnjgYTjgIJcbmNvbnN0IFBBU1MgPSBleHBvcnRzLlBBU1MgPSBFQlZDTlQ7XG5cbi8vLyDnt5rlvaLluqfmqJnjga7jg5fjg6zjg7zjgrnjg5vjg6vjg4Djg7zjga7mnKrkvb/nlKjjgpLnpLrjgZnlgKTjgafjgZnjgIJcbi8vIFRPRE8gLSDoqbLlvZPjgZnjgovloLTmiYDjgatPcHRpb248dXNpemU+44KS5L2/44Gj44Gf44G744GG44GM6Zai5pWw44Gu44K344Kw44OL44OB44Oj44Gv6Kqt44G/44KE44GZ44GE44CCXG5jb25zdCBWTlVMTCA9IGV4cG9ydHMuVk5VTEwgPSBFQlZDTlQgKyAxO1xuXG4vLy8gTk7jgbjjga7lhaXlipvjgavplqLjgZnjgovlsaXmrbTjga7mt7HjgZXjgafjgZnjgIJcbmNvbnN0IEtFRVBfUFJFVl9DTlQgPSBleHBvcnRzLktFRVBfUFJFVl9DTlQgPSA3O1xuXG4vLy8gTk7jgbjjga7lhaXlipvjg5XjgqPjg7zjg4Hjg6Pjg7zjga7mlbDjgafjgZnjgIJcbmNvbnN0IEZFQVRVUkVfQ05UID0gZXhwb3J0cy5GRUFUVVJFX0NOVCA9IEtFRVBfUFJFVl9DTlQgKiAyICsgNDsiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICAgIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuWF9MQUJFTFMgPSB1bmRlZmluZWQ7XG5leHBvcnRzLm1vdmUyeHkgPSBtb3ZlMnh5O1xuZXhwb3J0cy5ldjJ4eSA9IGV2Mnh5O1xuZXhwb3J0cy54eTJldiA9IHh5MmV2O1xuZXhwb3J0cy5ydjJldiA9IHJ2MmV2O1xuZXhwb3J0cy5ldjJydiA9IGV2MnJ2O1xuZXhwb3J0cy5ldjJzdHIgPSBldjJzdHI7XG5leHBvcnRzLnN0cjJldiA9IHN0cjJldjtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG5jb25zdCBYX0xBQkVMUyA9IGV4cG9ydHMuWF9MQUJFTFMgPSAnQEFCQ0RFRkdISktMTU5PUFFSU1QnO1xuXG5mdW5jdGlvbiBtb3ZlMnh5KHMpIHtcbiAgICBjb25zdCBPRkZTRVQgPSAnYScuY2hhckNvZGVBdCgwKSAtIDE7XG4gICAgcmV0dXJuIFtzLmNoYXJDb2RlQXQoMCkgLSBPRkZTRVQsIF9jb25zdGFudHMuQlNJWkUgKyAxIC0gKHMuY2hhckNvZGVBdCgxKSAtIE9GRlNFVCldO1xufVxuXG5mdW5jdGlvbiBldjJ4eShldikge1xuICAgIHJldHVybiBbZXYgJSBfY29uc3RhbnRzLkVCU0laRSwgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFKV07XG59XG5cbmZ1bmN0aW9uIHh5MmV2KHgsIHkpIHtcbiAgICByZXR1cm4geSAqIF9jb25zdGFudHMuRUJTSVpFICsgeDtcbn1cblxuZnVuY3Rpb24gcnYyZXYocnYpIHtcbiAgICByZXR1cm4gcnYgPT09IF9jb25zdGFudHMuQlZDTlQgPyBfY29uc3RhbnRzLlBBU1MgOiBydiAlIF9jb25zdGFudHMuQlNJWkUgKyAxICsgTWF0aC5mbG9vcihydiAvIF9jb25zdGFudHMuQlNJWkUgKyAxKSAqIF9jb25zdGFudHMuRUJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJydihldikge1xuICAgIHJldHVybiBldiA9PT0gX2NvbnN0YW50cy5QQVNTID8gX2NvbnN0YW50cy5CVkNOVCA6IGV2ICUgX2NvbnN0YW50cy5FQlNJWkUgLSAxICsgTWF0aC5mbG9vcihldiAvIF9jb25zdGFudHMuRUJTSVpFIC0gMSkgKiBfY29uc3RhbnRzLkJTSVpFO1xufVxuXG5mdW5jdGlvbiBldjJzdHIoZXYpIHtcbiAgICBpZiAoZXYgPj0gX2NvbnN0YW50cy5QQVNTKSB7XG4gICAgICAgIHJldHVybiAncGFzcyc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgW3gsIHldID0gZXYyeHkoZXYpO1xuICAgICAgICByZXR1cm4gWF9MQUJFTFMuY2hhckF0KHgpICsgeS50b1N0cmluZygpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RyMmV2KHYpIHtcbiAgICBjb25zdCB2U3RyID0gdi50b1VwcGVyQ2FzZSgpO1xuICAgIGlmICh2U3RyID09PSAnUEFTUycgfHwgdlN0ciA9PT0gJ1JFU0lHTicpIHtcbiAgICAgICAgcmV0dXJuIF9jb25zdGFudHMuUEFTUztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB4ID0gWF9MQUJFTFMuaW5kZXhPZih2U3RyLmNoYXJBdCgwKSk7XG4gICAgICAgIGNvbnN0IHkgPSBwYXJzZUludCh2U3RyLnNsaWNlKDEpKTtcbiAgICAgICAgcmV0dXJuIHh5MmV2KHgsIHkpO1xuICAgIH1cbn0iLCIndXNlIHN0cmljdCc7XG5cbnZhciBfd29ya2VyUm1pID0gcmVxdWlyZSgnd29ya2VyLXJtaScpO1xuXG52YXIgX25ldXJhbF9uZXR3b3JrID0gcmVxdWlyZSgnLi9uZXVyYWxfbmV0d29yay5qcycpO1xuXG52YXIgX2Nvb3JkX2NvbnZlcnQgPSByZXF1aXJlKCcuL2Nvb3JkX2NvbnZlcnQuanMnKTtcblxudmFyIF9jb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cy5qcycpO1xuXG52YXIgX3NwZWVjaCA9IHJlcXVpcmUoJy4vc3BlZWNoLmpzJyk7XG5cbmNvbnN0IEZJUlNUX1RJTUUgPSA3ICogNjA7IC8qIGdsb2JhbCAkIEpHTyBCb2FyZENvbnRyb2xsZXIgaTE4biAqL1xuXG5jb25zdCBGSVNIRVJfU0VDID0gMztcblxuZnVuY3Rpb24gaTE4blNwZWFrKG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gKDAsIF9zcGVlY2guc3BlYWspKG1lc3NhZ2UsIGkxOG4ubGFuZywgJ2ZlbWFsZScpO1xufVxuXG5jbGFzcyBBOUVuZ2luZSBleHRlbmRzIF93b3JrZXJSbWkuV29ya2VyUk1JIHtcbiAgICBhc3luYyBsb2FkTk4oKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2xvYWROTicpO1xuICAgIH1cblxuICAgIGFzeW5jIGNsZWFyKCkge1xuICAgICAgICBhd2FpdCB0aGlzLnN0b3BQb25kZXIoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnY2xlYXInKTtcbiAgICB9XG5cbiAgICBhc3luYyB0aW1lU2V0dGluZ3MobWFpblRpbWUsIGJ5b3lvbWkpIHtcbiAgICAgICAgdGhpcy5tYWluVGltZSA9IG1haW5UaW1lO1xuICAgICAgICB0aGlzLmJ5b3lvbWkgPSBieW95b21pO1xuICAgICAgICBhd2FpdCB0aGlzLmludm9rZVJNKCd0aW1lU2V0dGluZ3MnLCBbbWFpblRpbWUsIGJ5b3lvbWldKTtcbiAgICB9XG5cbiAgICBhc3luYyBnZW5tb3ZlKCkge1xuICAgICAgICBjb25zdCBbbW92ZSwgd2luUmF0ZV0gPSBhd2FpdCB0aGlzLmJlc3RNb3ZlKCk7XG4gICAgICAgIGlmICh3aW5SYXRlIDwgMC4xKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3Jlc2lnbic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsYXkobW92ZSk7XG4gICAgICAgICAgICByZXR1cm4gKDAsIF9jb29yZF9jb252ZXJ0LmV2MnN0cikobW92ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBwbGF5KGV2KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuaW52b2tlUk0oJ3BsYXknLCBbZXZdKTtcbiAgICB9XG5cbiAgICBhc3luYyBiZXN0TW92ZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2Jlc3RNb3ZlJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZmluYWxTY29yZSgpIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW52b2tlUk0oJ2ZpbmFsU2NvcmUnKTtcbiAgICB9XG5cbiAgICBzdGFydFBvbmRlcigpIHtcbiAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gdGhpcy5pbnZva2VSTSgncG9uZGVyJyk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3RvcFBvbmRlcigpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZGVyUHJvbWlzZSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VSTSgnc3RvcFBvbmRlcicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wb25kZXJQcm9taXNlO1xuICAgICAgICAgICAgdGhpcy5wb25kZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHRpbWVMZWZ0KCkge1xuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnZva2VSTSgndGltZUxlZnQnKTtcbiAgICB9XG59XG5cbmNsYXNzIFBsYXlDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihlbmdpbmUsIGJvYXJkLCBpZ29RdWVzdCA9IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuZW5naW5lID0gZW5naW5lO1xuICAgICAgICB0aGlzLmJvYXJkID0gYm9hcmQ7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlnb1F1ZXN0ID0gaWdvUXVlc3Q7XG4gICAgICAgIGlmIChpZ29RdWVzdCkge1xuICAgICAgICAgICAgdGhpcy50aW1lTGVmdCA9IFswLCAvLyBkdW15XG4gICAgICAgICAgICBGSVJTVF9USU1FICogMTAwMCwgLy8gYmxhY2tcbiAgICAgICAgICAgIEZJUlNUX1RJTUUgKiAxMDAwXTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC09IHN0YXJ0IC0gdGhpcy5zdGFydDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgJCgnI3lvdXItdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvcl0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3IgJSAyICsgMV0gLyAxMDAwKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoaTE4bi50aW1lb3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50aW1lTGVmdCA9IFswLCAvLyBkdW15XG4gICAgICAgICAgICB0aGlzLmJvYXJkLm93bkNvbG9yID09PSBKR08uQkxBQ0sgPyBJbmZpbml0eSA6IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwLCAvLyBibGFja1xuICAgICAgICAgICAgdGhpcy5ib2FyZC5vd25Db2xvciA9PT0gSkdPLkJMQUNLID8gdGhpcy5lbmdpbmUuYnlveW9taSAqIDEwMDAgOiBJbmZpbml0eV07XG4gICAgICAgICAgICB0aGlzLnN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC50dXJuXSAtPSBzdGFydCAtIHRoaXMuc3RhcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJvYXJkLnR1cm4gPT0gdGhpcy5ib2FyZC5vd25Db2xvcikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjeW91ci10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNhaS10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLnR1cm5dIC8gMTAwMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnI3lvdXItdGltZScpLnRleHQoTWF0aC5jZWlsKHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvcl0gLyAxMDAwKSk7XG4gICAgICAgICQoJyNhaS10aW1lJykudGV4dChNYXRoLmNlaWwodGhpcy50aW1lTGVmdFt0aGlzLmJvYXJkLm93bkNvbG9yICUgMiArIDFdIC8gMTAwMCkpO1xuICAgIH1cblxuICAgIGNsZWFyVGltZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2V0SXNTZWxmUGxheShpc1NlbGZQbGF5KSB7XG4gICAgICAgIHRoaXMuaXNTZWxmUGxheSA9IGlzU2VsZlBsYXk7XG4gICAgfVxuICAgIGFzeW5jIHVwZGF0ZShjb29yZCkge1xuICAgICAgICBpZiAoY29vcmQgPT09ICdlbmQnKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZXIoKTtcbiAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLnNjb3JpbmcpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY29yZSA9IGF3YWl0IHRoaXMuZmluYWxTY29yZSgpO1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIGlmIChzY29yZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gaTE4bi5qaWdvO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBpMThuW3Njb3JlID4gMCA/ICdibGFjaycgOiAnd2hpdGUnXTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChpMThuLmxhbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IGAgd29uIGJ5ICR7c2NvcmV9IHBvaW50c2A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdqYSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhYnNTY29yZSA9IE1hdGguYWJzKHNjb3JlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSBhYnNTY29yZSA8IDEgPyAn5Y2K55uu5Yud44GhJyA6IE1hdGguZmxvb3IoYWJzU2NvcmUpICsgJ+ebruWNiuWLneOBoSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaTE4bi5sYW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJz8nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gJ+OBp+OBmeOBi++8nyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaTE4blNwZWFrKG1lc3NhZ2UucmVwbGFjZSgn5Y2KJywgJ+OBr+OCkycpKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgIGkxOG5TcGVhayhpMThuLmZhaWxTY29yaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlnb1F1ZXN0KSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQudHVybiAlIDIgKyAxXSArPSBGSVNIRVJfU0VDICogMTAwMDtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJvYXJkLnR1cm4gPT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHRoaXMudGltZUxlZnRbdGhpcy5ib2FyZC5vd25Db2xvciAlIDIgKyAxXSA9IHRoaXMuZW5naW5lLmJ5b3lvbWkgKiAxMDAwO1xuICAgICAgICAgICAgJCgnI2FpLXRpbWUnKS50ZXh0KE1hdGguY2VpbCh0aGlzLnRpbWVMZWZ0W3RoaXMuYm9hcmQub3duQ29sb3IgJSAyICsgMV0gLyAxMDAwKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuaXNTZWxmUGxheSAmJiB0eXBlb2YgY29vcmQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5zdG9wUG9uZGVyKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5wbGF5KCgwLCBfY29vcmRfY29udmVydC54eTJldikoY29vcmQuaSArIDEsIF9jb25zdGFudHMuQlNJWkUgLSBjb29yZC5qKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuaXNTZWxmUGxheSB8fCB0aGlzLmJvYXJkLnR1cm4gIT09IHRoaXMuYm9hcmQub3duQ29sb3IpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vdmUgPSBhd2FpdCB0aGlzLmVuZ2luZS5nZW5tb3ZlKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGltZUxlZnQgPSBhd2FpdCB0aGlzLmVuZ2luZS50aW1lTGVmdCgpO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy50aW1lcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIOaZgumWk+WIh+OCjFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1vdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVzaWduJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJUaW1lcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4ucmVzaWduKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Bhc3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4ucGFzcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldiA9ICgwLCBfY29vcmRfY29udmVydC5zdHIyZXYpKG1vdmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHh5ID0gKDAsIF9jb29yZF9jb252ZXJ0LmV2Mnh5KShldik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5wbGF5KG5ldyBKR08uQ29vcmRpbmF0ZSh4eVswXSAtIDEsIF9jb25zdGFudHMuQlNJWkUgLSB4eVsxXSksIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbmdpbmUuc3RhcnRQb25kZXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHBhc3MoKSB7XG4gICAgICAgIGlmICh0aGlzLmJvYXJkLm93bkNvbG9yID09PSB0aGlzLmJvYXJkLnR1cm4pIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLnN0b3BQb25kZXIoKTtcbiAgICAgICAgICAgIHRoaXMuZW5naW5lLnBsYXkoX2NvbnN0YW50cy5QQVNTKTtcbiAgICAgICAgICAgIHRoaXMuYm9hcmQucGxheShudWxsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGZpbmFsU2NvcmUoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICQucG9zdCh7XG4gICAgICAgICAgICB1cmw6ICdodHRwczovL21pbWlha2EtcHl0aG9uLmhlcm9rdWFwcC5jb20vZ251Z28nLCAvLyBodHRw44Gn44Gv6YCa5L+h44Gn44GN44Gq44GL44Gj44Gf44CCICdodHRwOi8vMzUuMjAzLjE2MS4xMDAvZ251Z28nLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHNnZjogdGhpcy5ib2FyZC5qcmVjb3JkLnRvU2dmKCksXG4gICAgICAgICAgICAgICAgbW92ZTogJ2VzdCcsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnYWZ0ZXJtYXRoJyxcbiAgICAgICAgICAgICAgICBydWxlOiB0aGlzLmJvYXJkLmpyZWNvcmQuZ2V0Um9vdE5vZGUoKS5pbmZvLmtvbWkgPT09ICc2LjUnID8gJ2phcGFuZXNlJyA6ICdjaGluZXNlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKC9KaWdvLy50ZXN0KHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hdGNoID0gcmVzdWx0Lm1hdGNoKC8oQmxhY2t8V2hpdGUpIHdpbnMgYnkgKFswLTkuXSspIHBvaW50cy8pO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGxldCBzY29yZSA9IHBhcnNlRmxvYXQobWF0Y2hbMl0pO1xuICAgICAgICAgICAgaWYgKG1hdGNoWzFdID09PSAnQmxhY2snKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3JlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLXNjb3JlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcbiAgICBjb25zdCBib2FyZCA9IGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMsIHJlaikge1xuICAgICAgICBuZXcgQm9hcmRDb250cm9sbGVyKF9jb25zdGFudHMuQlNJWkUsIDAsIDcuNSwgcmVzKTtcbiAgICB9KTtcbiAgICAvLyBKR0/jga7jg6zjg7Pjg4Djg6rjg7PjgrDjgpLlrozkuobjgZXjgZvjgovjgZ/jgoHjgatzZXRUaW1lb3V044Gn44Kk44OZ44Oz44OI44Or44O844OX44KS6YCy44KB44KLXG4gICAgY29uc3QgJHN0YXJ0TW9kYWwgPSAkKCcjc3RhcnQtbW9kYWwnKTtcbiAgICAkc3RhcnRNb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgIHNldFRpbWVvdXQoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZW5naW5lLmxvYWROTigpO1xuICAgICAgICAgICAgJCgnI2xvYWRpbmctbWVzc2FnZScpLnRleHQoaTE4bi5maW5pc2hEb3dubG9hZCk7XG4gICAgICAgICAgICAkKCcjc3RhcnQtZ2FtZScpLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZSA9PT0gJ0Vycm9yOiBObyBiYWNrZW5kIGlzIGF2YWlsYWJsZScpIHtcbiAgICAgICAgICAgICAgICBpZiAoLyhNYWMgT1MgWCAxMF8xM3woaVBhZHxpUGhvbmV8aVBvZCk7IENQVSBPUyAxMSkuKlNhZmFyaS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAhL0Nocm9tZS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuICAgICAgICAgICAgICAgICAgICBpMThuU3BlYWsoaTE4bi5ub3RTdXBwb3J0ICsgaTE4bi5zYWZhcmlXaXRob3V0V2ViZ3B1KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpMThuU3BlYWsoaTE4bi5ub3RTdXBwb3J0KSkge1xuICAgICAgICAgICAgICAgICAgICBhbGVydChpMThuLm5vdFN1cHBvcnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb25kaXRpb24gPSBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzLCByZWopIHtcbiAgICAgICAgICAgICRzdGFydE1vZGFsLm9uZSgnaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY29uZGl0aW9uRm9ybSA9ICQoJyNjb25kaXRpb24tZm9ybScpO1xuICAgICAgICAgICAgICAgIHJlcyh7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAkY29uZGl0aW9uRm9ybVswXVsnY29sb3InXS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZVJ1bGU6ICRjb25kaXRpb25Gb3JtWzBdWyd0aW1lJ10udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IHBhcnNlSW50KCRjb25kaXRpb25Gb3JtWzBdWydhaS1ieW95b21pJ10udmFsdWUpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN3aXRjaCAoY29uZGl0aW9uLnRpbWVSdWxlKSB7XG4gICAgICAgICAgICBjYXNlICdhaS10aW1lJzpcbiAgICAgICAgICAgICAgICBhd2FpdCBlbmdpbmUudGltZVNldHRpbmdzKDAsIGNvbmRpdGlvbi50aW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2lnby1xdWVzdCc6XG4gICAgICAgICAgICAgICAgYXdhaXQgZW5naW5lLnRpbWVTZXR0aW5ncyhGSVJTVF9USU1FLCBGSVNIRVJfU0VDKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnVycpIHtcbiAgICAgICAgICAgIGJvYXJkLnNldE93bkNvbG9yKEpHTy5XSElURSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZGl0aW9uLmNvbG9yID09PSAnQicpIHtcbiAgICAgICAgICAgIGJvYXJkLnNldE93bkNvbG9yKEpHTy5CTEFDSyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBQbGF5Q29udHJvbGxlcihlbmdpbmUsIGJvYXJkLCBjb25kaXRpb24udGltZVJ1bGUgPT09ICdpZ28tcXVlc3QnKTtcbiAgICAgICAgY29uc3QgaXNTZWxmUGxheSA9IGNvbmRpdGlvbi5jb2xvciA9PT0gJ3NlbGYtcGxheSc7XG4gICAgICAgIGlmICghaXNTZWxmUGxheSkge1xuICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4uc3RhcnRHcmVldCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udHJvbGxlci5zZXRJc1NlbGZQbGF5KGlzU2VsZlBsYXkpO1xuICAgICAgICBib2FyZC5hZGRPYnNlcnZlcihjb250cm9sbGVyKTtcbiAgICAgICAgJCgnI3Bhc3MnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGFzcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnI3Jlc2lnbicpLm9uKCdjbGljaycsIGFzeW5jIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgY29udHJvbGxlci5jbGVhclRpbWVyKCk7XG4gICAgICAgICAgICBhd2FpdCBlbmdpbmUuc3RvcFBvbmRlcigpO1xuICAgICAgICAgICAgaTE4blNwZWFrKGkxOG4uZW5kR3JlZXQpO1xuICAgICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcygnZW5kJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCcjcmV0cnknKS5vbmUoJ2NsaWNrJywgYXN5bmMgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAkKCcjcGFzcycpLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgICQoJyNyZXNpZ24nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICAgICBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBlbmdpbmUuY2xlYXIoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoJ2VuZCcpO1xuICAgICAgICAgICAgc2V0VGltZW91dChtYWluLCAwKTtcbiAgICAgICAgfSk7XG4gICAgfSwgMCk7XG59XG5cbmNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIoJ2pzL3dvcmtlci5qcycpO1xuKDAsIF93b3JrZXJSbWkucmVzaWd0ZXJXb3JrZXJSTUkpKHdvcmtlciwgX25ldXJhbF9uZXR3b3JrLk5ldXJhbE5ldHdvcmspO1xuY29uc3QgZW5naW5lID0gbmV3IEE5RW5naW5lKHdvcmtlcik7XG5tYWluKCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG4vKiBnbG9iYWwgV2ViRE5OICQgKi9cblxuaWYgKCFBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UpIHtcbiAgICBBcnJheUJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgICAgICB2YXIgdGhhdCA9IG5ldyBVaW50OEFycmF5KHRoaXMpO1xuICAgICAgICBpZiAoZW5kID09IHVuZGVmaW5lZCkgZW5kID0gdGhhdC5sZW5ndGg7XG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXlCdWZmZXIoZW5kIC0gc3RhcnQpO1xuICAgICAgICB2YXIgcmVzdWx0QXJyYXkgPSBuZXcgVWludDhBcnJheShyZXN1bHQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdEFycmF5Lmxlbmd0aDsgaSsrKSByZXN1bHRBcnJheVtpXSA9IHRoYXRbaSArIHN0YXJ0XTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBzZXRMb2FkaW5nQmFyKHBlcmNlbnRhZ2UpIHtcbiAgICBjb25zdCAkbG9hZGluZ0JhciA9ICQoJyNsb2FkaW5nLWJhcicpO1xuICAgICRsb2FkaW5nQmFyLmF0dHIoJ2FyaWEtdmFsdWVub3cnLCBwZXJjZW50YWdlKTtcbiAgICAkbG9hZGluZ0Jhci5jc3MoJ3dpZHRoJywgcGVyY2VudGFnZS50b1N0cmluZygpICsgJyUnKTtcbn1cblxuY2xhc3MgTmV1cmFsTmV0d29yayB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubm4gPSBudWxsO1xuICAgIH1cblxuICAgIGFzeW5jIGxvYWQoKSB7XG4gICAgICAgIGlmICh0aGlzLm5uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGJhY2tlbmRPcmRlcjogWyd3ZWJncHUnLCAnd2ViZ2wnXSxcbiAgICAgICAgICAgIHByb2dyZXNzQ2FsbGJhY2s6IGZ1bmN0aW9uIChsb2FkZWQsIHRvdGFsKSB7XG4gICAgICAgICAgICAgICAgc2V0TG9hZGluZ0Jhcihsb2FkZWQgLyB0b3RhbCAqIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHNldExvYWRpbmdCYXIoMCk7XG4gICAgICAgIHRoaXMubm4gPSBhd2FpdCBXZWJETk4ubG9hZCgnaHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL21pbWlha2Etc3RvcmFnZS9FTEZfT3BlbkdvJywgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGUoLi4uaW5wdXRzKSB7XG4gICAgICAgIGNvbnN0IHZpZXdzID0gdGhpcy5ubi5nZXRJbnB1dFZpZXdzKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2aWV3c1tpXS5zZXQoaW5wdXRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLm5uLnJ1bigpO1xuICAgICAgICByZXR1cm4gdGhpcy5ubi5nZXRPdXRwdXRWaWV3cygpLm1hcChlID0+IGUudG9BY3R1YWwoKS5zbGljZSgwKSk7IC8vIHRvLkFjdHVhbOOBneOBruOCguOBruOBp+OBr3dvcmtlcuWBtOOBp2RldGFjaOOBjOOBp+OBjeOBquOBhOaooeanmFxuICAgIH1cbn1cbmV4cG9ydHMuTmV1cmFsTmV0d29yayA9IE5ldXJhbE5ldHdvcms7IiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNwZWFrID0gc3BlYWs7XG5mdW5jdGlvbiBzcGVhayh0ZXh0LCBsYW5nLCBnZW5kZXIpIHtcbiAgICBpZiAoIVNwZWVjaFN5bnRoZXNpc1V0dGVyYW5jZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgc3dpdGNoIChsYW5nKSB7XG4gICAgICAgIGNhc2UgJ2VuJzpcbiAgICAgICAgICAgIGxhbmcgPSAnZW4tdXMnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2phJzpcbiAgICAgICAgICAgIGxhbmcgPSAnamEtanAnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IHV0dGVyYW5jZSA9IG5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UodGV4dCk7XG4gICAgaWYgKC8oaVBob25lfGlQYWR8aVBvZCkoPz0uKk9TIFs3LThdKS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkgdXR0ZXJhbmNlLnJhdGUgPSAwLjI7XG4gICAgY29uc3Qgdm9pY2VzID0gc3BlZWNoU3ludGhlc2lzLmdldFZvaWNlcygpLmZpbHRlcihlID0+IGUubGFuZy50b0xvd2VyQ2FzZSgpID09PSBsYW5nKTtcbiAgICBsZXQgdm9pY2UgPSBudWxsO1xuICAgIGlmICh2b2ljZXMubGVuZ3RoID4gMSkge1xuICAgICAgICBsZXQgbmFtZXMgPSBudWxsO1xuICAgICAgICBzd2l0Y2ggKGxhbmcpIHtcbiAgICAgICAgICAgIGNhc2UgJ2phLWpwJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGdlbmRlcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzID0gWydPdG95YScsICdIYXR0b3JpJywgJ0ljaGlybyddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnTy1yZW7vvIjmi6HlvLXvvIknLCAnTy1yZW4nLCAnS3lva28nLCAnSGFydWthJ107IC8vIFdpbmRvd3MgMTDjga5BeXVtaeOBruWjsOOBr+S7iuOBsuOBqOOBpFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW4tdXMnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZ2VuZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21hbGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXMgPSBbJ0FsZXgnLCAnRnJlZCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZlbWFsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lcyA9IFsnU2FtYW50aGEnLCAnVmljdG9yaWEnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZXMpIHtcbiAgICAgICAgICAgIHZvaWNlID0gdm9pY2VzLmZpbHRlcih2ID0+IG5hbWVzLnNvbWUobiA9PiB2Lm5hbWUuaW5kZXhPZihuKSA+PSAwKSlbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF2b2ljZSkge1xuICAgICAgICAgICAgdm9pY2UgPSB2b2ljZXMuZmlsdGVyKHYgPT4gdi5nZW5kZXIgJiYgdi5nZW5kZXIudG9Mb3dlckNhc2UoKSA9PT0gZ2VuZGVyKVswXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB1dHRlcmFuY2Uudm9pY2UgPSB2b2ljZSB8fCB2b2ljZXNbMF07XG4gICAgLy8gaU9TIDEwIFNhZmFyaSBoYXMgYSBidWcgdGhhdCB1dHRlcmFuY2Uudm9pY2UgaXMgbm8gZWZmZWN0LlxuICAgIHV0dGVyYW5jZS52b2x1bWUgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd2b2x1bWUnKSB8fCAnMS4wJyk7XG4gICAgc3BlZWNoU3ludGhlc2lzLnNwZWFrKHV0dGVyYW5jZSk7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHVubG9jaygpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2spO1xuICAgIHNwZWVjaFN5bnRoZXNpcy5zcGVhayhuZXcgU3BlZWNoU3ludGhlc2lzVXR0ZXJhbmNlKCcnKSk7XG59XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKHNwZWVjaFN5bnRoZXNpcykge1xuICAgICAgICBzcGVlY2hTeW50aGVzaXMuZ2V0Vm9pY2VzKCk7XG4gICAgICAgIGlmIChzcGVlY2hTeW50aGVzaXMub252b2ljZXNjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNwZWVjaFN5bnRoZXNpcy5vbnZvaWNlc2NoYW5nZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29udm9pY2VzY2hhbmdlZCcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2ssIGZhbHNlKTsgLy8gZm9yIGlPU1xuICAgIH1cbn0pOyJdfQ==
