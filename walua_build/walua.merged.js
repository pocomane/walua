// EMCC runtime injection

var WaLua = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  return (
function(WaLua) {
  WaLua = WaLua || {};

var Module = typeof WaLua !== "undefined" ? WaLua : {};

Module.print = function(txt) {
 if (null != append_output) {
  append_output(txt);
 } else {
  console.log(txt);
 }
};

Module.printErr = function(txt) {
 if (null != append_error) {
  append_output(txt);
 } else {
  console.log(txt);
 }
};

compile_lua = function(scr) {
 return Module.ccall("compile_lua", "number", [ "string" ], [ scr ]);
};

step_lua = function() {
 return Module.ccall("continue_lua", "number", [], []);
};

var moduleOverrides = {};

var key;

for (key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}

Module["arguments"] = [];

Module["thisProgram"] = "./this.program";

Module["quit"] = function(status, toThrow) {
 throw toThrow;
};

Module["preRun"] = [];

Module["postRun"] = [];

var ENVIRONMENT_IS_WEB = false;

var ENVIRONMENT_IS_WORKER = false;

var ENVIRONMENT_IS_NODE = false;

var ENVIRONMENT_IS_SHELL = false;

ENVIRONMENT_IS_WEB = typeof window === "object";

ENVIRONMENT_IS_WORKER = typeof importScripts === "function";

ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;

ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 } else {
  return scriptDirectory + path;
 }
}

if (ENVIRONMENT_IS_NODE) {
 scriptDirectory = __dirname + "/";
 var nodeFS;
 var nodePath;
 Module["read"] = function shell_read(filename, binary) {
  var ret;
  if (!nodeFS) nodeFS = require("fs");
  if (!nodePath) nodePath = require("path");
  filename = nodePath["normalize"](filename);
  ret = nodeFS["readFileSync"](filename);
  return binary ? ret : ret.toString();
 };
 Module["readBinary"] = function readBinary(filename) {
  var ret = Module["read"](filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
 };
 if (process["argv"].length > 1) {
  Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
 }
 Module["arguments"] = process["argv"].slice(2);
 process["on"]("uncaughtException", function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 });
 process["on"]("unhandledRejection", abort);
 Module["quit"] = function(status) {
  process["exit"](status);
 };
 Module["inspect"] = function() {
  return "[Emscripten Module object]";
 };
} else if (ENVIRONMENT_IS_SHELL) {
 if (typeof read != "undefined") {
  Module["read"] = function shell_read(f) {
   return read(f);
  };
 }
 Module["readBinary"] = function readBinary(f) {
  var data;
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  Module["arguments"] = scriptArgs;
 } else if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 if (typeof quit === "function") {
  Module["quit"] = function(status) {
   quit(status);
  };
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (_scriptDir) {
  scriptDirectory = _scriptDir;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 Module["read"] = function shell_read(url) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.send(null);
  return xhr.responseText;
 };
 if (ENVIRONMENT_IS_WORKER) {
  Module["readBinary"] = function readBinary(url) {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, false);
   xhr.responseType = "arraybuffer";
   xhr.send(null);
   return new Uint8Array(xhr.response);
  };
 }
 Module["readAsync"] = function readAsync(url, onload, onerror) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function xhr_onload() {
   if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
    onload(xhr.response);
    return;
   }
   onerror();
  };
  xhr.onerror = onerror;
  xhr.send(null);
 };
 Module["setWindowTitle"] = function(title) {
  document.title = title;
 };
} else {}

var out = Module["print"] || (typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null);

var err = Module["printErr"] || (typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn.bind(console) || out);

for (key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}

moduleOverrides = undefined;

function dynamicAlloc(size) {
 var ret = HEAP32[DYNAMICTOP_PTR >> 2];
 var end = ret + size + 15 & -16;
 if (end <= _emscripten_get_heap_size()) {
  HEAP32[DYNAMICTOP_PTR >> 2] = end;
 } else {
  return 0;
 }
 return ret;
}

function getNativeTypeSize(type) {
 switch (type) {
 case "i1":
 case "i8":
  return 1;

 case "i16":
  return 2;

 case "i32":
  return 4;

 case "i64":
  return 8;

 case "float":
  return 4;

 case "double":
  return 8;

 default:
  {
   if (type[type.length - 1] === "*") {
    return 4;
   } else if (type[0] === "i") {
    var bits = parseInt(type.substr(1));
    assert(bits % 8 === 0, "getNativeTypeSize invalid bits " + bits + ", type " + type);
    return bits / 8;
   } else {
    return 0;
   }
  }
 }
}

var asm2wasmImports = {
 "f64-rem": function(x, y) {
  return x % y;
 },
 "debugger": function() {
  debugger;
 }
};

var functionPointers = new Array(0);

var tempRet0 = 0;

var setTempRet0 = function(value) {
 tempRet0 = value;
};

var getTempRet0 = function() {
 return tempRet0;
};

if (typeof WebAssembly !== "object") {
 err("no native wasm support detected");
}

var wasmMemory;

var wasmTable;

var ABORT = false;

var EXITSTATUS = 0;

function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}

function getCFunc(ident) {
 var func = Module["_" + ident];
 assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
 return func;
}

function ccall(ident, returnType, argTypes, args, opts) {
 var toC = {
  "string": function(str) {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    var len = (str.length << 2) + 1;
    ret = stackAlloc(len);
    stringToUTF8(str, ret, len);
   }
   return ret;
  },
  "array": function(arr) {
   var ret = stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }
 };
 function convertReturnValue(ret) {
  if (returnType === "string") return UTF8ToString(ret);
  if (returnType === "boolean") return Boolean(ret);
  return ret;
 }
 var func = getCFunc(ident);
 var cArgs = [];
 var stack = 0;
 if (args) {
  for (var i = 0; i < args.length; i++) {
   var converter = toC[argTypes[i]];
   if (converter) {
    if (stack === 0) stack = stackSave();
    cArgs[i] = converter(args[i]);
   } else {
    cArgs[i] = args[i];
   }
  }
 }
 var ret = func.apply(null, cArgs);
 ret = convertReturnValue(ret);
 if (stack !== 0) stackRestore(stack);
 return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
 argTypes = argTypes || [];
 var numericArgs = argTypes.every(function(type) {
  return type === "number";
 });
 var numericRet = returnType !== "string";
 if (numericRet && numericArgs && !opts) {
  return getCFunc(ident);
 }
 return function() {
  return ccall(ident, returnType, argTypes, arguments, opts);
 };
}

function setValue(ptr, value, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  HEAP8[ptr >> 0] = value;
  break;

 case "i8":
  HEAP8[ptr >> 0] = value;
  break;

 case "i16":
  HEAP16[ptr >> 1] = value;
  break;

 case "i32":
  HEAP32[ptr >> 2] = value;
  break;

 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
  HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
  break;

 case "float":
  HEAPF32[ptr >> 2] = value;
  break;

 case "double":
  HEAPF64[ptr >> 3] = value;
  break;

 default:
  abort("invalid type for setValue: " + type);
 }
}

var ALLOC_NORMAL = 0;

var ALLOC_NONE = 3;

function allocate(slab, types, allocator, ptr) {
 var zeroinit, size;
 if (typeof slab === "number") {
  zeroinit = true;
  size = slab;
 } else {
  zeroinit = false;
  size = slab.length;
 }
 var singleType = typeof types === "string" ? types : null;
 var ret;
 if (allocator == ALLOC_NONE) {
  ret = ptr;
 } else {
  ret = [ _malloc, stackAlloc, dynamicAlloc ][allocator](Math.max(size, singleType ? 1 : types.length));
 }
 if (zeroinit) {
  var stop;
  ptr = ret;
  assert((ret & 3) == 0);
  stop = ret + (size & ~3);
  for (;ptr < stop; ptr += 4) {
   HEAP32[ptr >> 2] = 0;
  }
  stop = ret + size;
  while (ptr < stop) {
   HEAP8[ptr++ >> 0] = 0;
  }
  return ret;
 }
 if (singleType === "i8") {
  if (slab.subarray || slab.slice) {
   HEAPU8.set(slab, ret);
  } else {
   HEAPU8.set(new Uint8Array(slab), ret);
  }
  return ret;
 }
 var i = 0, type, typeSize, previousType;
 while (i < size) {
  var curr = slab[i];
  type = singleType || types[i];
  if (type === 0) {
   i++;
   continue;
  }
  if (type == "i64") type = "i32";
  setValue(ret + i, curr, type);
  if (previousType !== type) {
   typeSize = getNativeTypeSize(type);
   previousType = type;
  }
  i += typeSize;
 }
 return ret;
}

function getMemory(size) {
 if (!runtimeInitialized) return dynamicAlloc(size);
 return _malloc(size);
}

var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
  return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
 } else {
  var str = "";
  while (idx < endPtr) {
   var u0 = u8Array[idx++];
   if (!(u0 & 128)) {
    str += String.fromCharCode(u0);
    continue;
   }
   var u1 = u8Array[idx++] & 63;
   if ((u0 & 224) == 192) {
    str += String.fromCharCode((u0 & 31) << 6 | u1);
    continue;
   }
   var u2 = u8Array[idx++] & 63;
   if ((u0 & 240) == 224) {
    u0 = (u0 & 15) << 12 | u1 << 6 | u2;
   } else {
    u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u8Array[idx++] & 63;
   }
   if (u0 < 65536) {
    str += String.fromCharCode(u0);
   } else {
    var ch = u0 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
   }
  }
 }
 return str;
}

function UTF8ToString(ptr, maxBytesToRead) {
 return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | u1 & 1023;
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   outU8Array[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   outU8Array[outIdx++] = 192 | u >> 6;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   outU8Array[outIdx++] = 224 | u >> 12;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 3 >= endIdx) break;
   outU8Array[outIdx++] = 240 | u >> 18;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  }
 }
 outU8Array[outIdx] = 0;
 return outIdx - startIdx;
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
 return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}

function lengthBytesUTF8(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) ++len; else if (u <= 2047) len += 2; else if (u <= 65535) len += 3; else len += 4;
 }
 return len;
}

var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

function allocateUTF8(str) {
 var size = lengthBytesUTF8(str) + 1;
 var ret = _malloc(size);
 if (ret) stringToUTF8Array(str, HEAP8, ret, size);
 return ret;
}

function writeArrayToMemory(array, buffer) {
 HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
 for (var i = 0; i < str.length; ++i) {
  HEAP8[buffer++ >> 0] = str.charCodeAt(i);
 }
 if (!dontAddNull) HEAP8[buffer >> 0] = 0;
}

function demangle(func) {
 return func;
}

function demangleAll(text) {
 var regex = /__Z[\w\d_]+/g;
 return text.replace(regex, function(x) {
  var y = demangle(x);
  return x === y ? x : y + " [" + x + "]";
 });
}

function jsStackTrace() {
 var err = new Error();
 if (!err.stack) {
  try {
   throw new Error(0);
  } catch (e) {
   err = e;
  }
  if (!err.stack) {
   return "(no stack trace available)";
  }
 }
 return err.stack.toString();
}

function stackTrace() {
 var js = jsStackTrace();
 if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
 return demangleAll(js);
}

var WASM_PAGE_SIZE = 65536;

var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferViews() {
 Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
 Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
 Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
}

var DYNAMIC_BASE = 5264144, DYNAMICTOP_PTR = 21008;

var TOTAL_STACK = 5242880;

var INITIAL_TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;

if (INITIAL_TOTAL_MEMORY < TOTAL_STACK) err("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + INITIAL_TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");

if (Module["buffer"]) {
 buffer = Module["buffer"];
} else {
 if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
  wasmMemory = new WebAssembly.Memory({
   "initial": INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE,
   "maximum": INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
  });
  buffer = wasmMemory.buffer;
 } else {
  buffer = new ArrayBuffer(INITIAL_TOTAL_MEMORY);
 }
}

updateGlobalBufferViews();

HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;

function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback();
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Module["dynCall_v"](func);
   } else {
    Module["dynCall_vi"](func, callback.arg);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

var runtimeExited = false;

function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
 if (runtimeInitialized) return;
 runtimeInitialized = true;
 if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
 TTY.init();
 callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
 FS.ignorePermissions = false;
 callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
 runtimeExited = true;
}

function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

var Math_abs = Math.abs;

var Math_ceil = Math.ceil;

var Math_floor = Math.floor;

var Math_min = Math.min;

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
 return id;
}

function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}

function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

Module["preloadedImages"] = {};

Module["preloadedAudios"] = {};

var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
 return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0;
}

var wasmBinaryFile = "walua.wasm";

// WASM sub-injection - vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv...
var wasmBinaryFile = "data:application/octet-stream;base64,AGFzbQEAAAABigM6YAR/f39/AX9gAX8Bf2ACf38AYAN/f38Bf2ACfHwBfGADf39/AGACf38Bf2ABfwBgAAF/YAAAYAJ/fwF8YAF8AXxgA39/fwF8YAN/f38BfmACf38BfmACf3wAYAJ/fgBgAn9+AX9gA39/fgF/YAN/f34AYAR/f39/AGAGf39/f39/AX9gBX9/f39/AX9gA39/fgF+YAF/AX5gBX9/f39/AGABfgF/YAN/f3wAYAJ/fAF/YAZ/f39/f38AYAd/f39/f39/AGAJf39/f39/f39/AGAEf39+fgBgAn5/AX5gA35+fwF+YAd/f39/f39/AX9gBH9/fn4BfmADf3x8AXxgAn5/AX9gBX9/f39/AX5gBX9+f39/AGADf35/AX9gAXwBf2AEf39+fwBgAn9+AX5gBn9/fn9/fwBgAX8BfGADfH9/AX9gAn58AX9gAnx+AX9gA39+fgF+YAJ+fgF+YAV/fn9/fgF/YAN+f38Bf2AGf3x/f39/AX9gAnx/AXxgAnx/AX9gA3x8fwF8AsQDMQNlbnYBYgABA2VudgFjAAcDZW52AWQABgNlbnYBZQAHA2VudgFmAAEDZW52AWcABwNlbnYBaAAIA2VudgFpAAIDZW52AWoABgNlbnYBawAHCGFzbTJ3YXNtB2Y2NC1yZW0ABANlbnYBbAAIA2VudgFtAAYDZW52AW4ABgNlbnYBbwAGA2VudgFwAAYDZW52AXEABwNlbnYBcgAFA2VudgFzAAEDZW52AXQAAQNlbnYBdQAAA2VudgF2AAEDZW52AXcAAQNlbnYBeAALA2VudgF5AAsDZW52AXoAAQNlbnYBQQAHA2VudgFCAAEDZW52AUMAAwNlbnYBRAAIA2VudgFFAAoDZW52AUYACQNlbnYBRwAGA2VudgFIAAYDZW52AUkABgNlbnYBSgAGA2VudgFLAAYDZW52AUwABgNlbnYBTQAGA2VudgFOAAYDZW52AU8ABgNlbnYBUAAGA2VudgFRAAcDZW52DF9fdGFibGVfYmFzZQN/AANlbnYBYQN/AAZnbG9iYWwDTmFOA3wABmdsb2JhbAhJbmZpbml0eQN8AANlbnYGbWVtb3J5AgGAAoACA2VudgV0YWJsZQFwAagCqAID4AjeCAIBBgMGBgMDAhABBgUOBgcVAxcCBwMGBQUCAwECAwMFBw8B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A0F/aw5fBQICAgICAgICAgIBAgIBAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgACCyAAEMYCIAJGDQIMAwsgAEEKEEQgABD6ASAEBEAgACgCPEEANgIECwwCCyAERQRAIAAgAxBECyAAKAI4IgMoAgAhBiADIAZBf2o2AgAgACAGBH8gAyADKAIEIgNBAWo2AgQgAy0AAAUgAxA1CzYCAAwBCwsMAQsgACgCNCEDIAVBht0AQdT8ACAEGzYCACAFIAg2AgQgACADQY7dACAFEE9BoAIQlgELIAAgACgCABBEIAAoAjgiBSgCACEDIAUgA0F/ajYCACAAIAMEfyAFIAUoAgQiBUEBajYCBCAFLQAABSAFEDULNgIAIARFBEAgASAAIAIgACgCPCIAKAIAaiAAKAIEIAJBAXRrEHY2AgALIAckCgsRACAAIAFBABAErCAArRDhAwtIAgJ/AX4jCiECIwpBEGokCiACIQMgACABEDgiBEKAgICACFoEQCAAIAFBgoIBEDEaCyADIAQ+AgAgAEGVggEgAxBFGiACJAoLVQECfyAAKAIAIgMoAgwiBCADIAEgAhBgIgE2AgAgBCABLAAEQcAAcjoACCADIAMoAgxBEGo2AgwgACAAKAIEQQFqIgE2AgQgAyABEJUCIABBATYCBAsVACAAQZjKAEGkygAgAUELRhsQMBoLdQEBfyAAEEYhAiAAQYXDACABEOcBGiAAQdjzQkH74QAQSBogACACQQFqIgFBAhDqBAR/IABBf0EAEDwiAhDTBUUEQCAAIAJBA2oQMBogAEF+QX8QQiAAQX4QKwsgACABELYBIAAgARArQQEFIAAgAhArQQALCzkBAX8jCiEEIwpBEGokCiAAIAEgAiADIAQiARDaBCICQX5HBEAgACgCDCABKAIAIAIQfRoLIAQkCgugAQEBfyAAKAJkIgEgASwABUEgcjoABSAAIAEQ/AEoAgA2AmQCfwJAAkACQAJAAkACQAJAIAEsAARBBWsOIgACAQUGBAYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgMGCyAAIAEQxQUMBgsgACABEMMFDAULIAAgARDIBQwECyAAIAEQyQUMAwsgACABEMcF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AgAgAkGgEDYC3AYgAkGgkAQ2AmAgBCAANgIAIAIgATYCfCACQQA2AtQGIAJBADYC2AYgAiADNgKcAiACIAMQ1AY2AsABIAJBADoAyQEgAkEANgKUASACQQA2ApgBIAJBADYCkAEgAkEAOgCoASACQQA2ApgCIAJBCDoAxQEgAkEAOgDGASACQQA6AMoBIAJB1AFqIgBCADcCACAAQgA3AgggAEIANwIQIABCADcCGCAAQgA3AiAgAEIANwIoIABCADcCMCAAQgA3AjggAEFAa0EANgIAIAJB4AY2AoABIAJBADYChAEgAkEANgKMASACQgA3A7ABIAJBAzoAuAEgAkEyOgDLASACQRk6AMwBIAJBDToAzQEgAkEZOgDIASACQRQ6AMcBIAJCADcCiAMgAkIANwKQAyACQgA3ApgDIAJCADcCoAMgAkEANgKoAyADQQlBABD3AQRAIAMQhwVBACEDCwsgAwsXACAAIAEQNiwACCIAQRZGIABB5gBGcgtdAQN/IwohAyMKQRBqJAogAyIEQQA2AgAgACABEDYgAiADQQAQlgUiBQRAIAAoAgwiAiAEKAIAIgEpAwA3AwAgAiABLAAIOgAIIAAgACgCDEEQajYCDAsgAyQKIAULjwEBA38jCiEEIwpBEGokCiAEIQMgAQRAIANBADYCACAAIAEoAmggAiADEPoCIgEEQCAAKAIMIgUgAygCACICKQMANwMAIAUgAiwACDoACCAAIAAoAgxBEGo2AgwLBSAAKAIMIgBBeGosAABBxgBGBH8gAEFwaigCACgCDCACQQAQogIFQQALIQELIAQkCiABCxUAIAAgACAAQShqEMMEIgA2AiAgAAspAQJ/IwohAyMKQRBqJAogAyAAIAAgAxDHBBsgASACEEkhBCADJAogBAvSAQECfwJAAkACQAJAAkACQCACLAAIQT9xQQRrDhEBAAMDAwMDAwMDAwMDAwMDAgMLIAIoAgAiBCgCGCIDBEAgAywABkEQcUUEQCADQQQgACgCECgCvAEQpAEiAw0FCwsgASAEELAENwMAIAFBAzoACAwECyABIAIoAgAtAAetNwMAIAFBAzoACAwDCyABIAIoAgAoAgytNwMAIAFBAzoACAwCCyAAIAJBBBCQASIDLAAIQQ9xDQAgACACQeuDARDSAQwBCyAAIAMgAiACIAEQmAILCyIA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wQBqIAJBAXRBIHFyOgAAIAJBBXYhAiADQQFqIgNBBkcNAAsgASQKC5gBAQV/IwohAiMKQRBqJAogAiIDIAFB/wFxIgY6AAACQAJAIAAoAhAiBA0AIAAQnAVFBEAgACgCECEEDAELDAELIAAoAhQiBSAESQRAIAAsAEsgAUH/AXFHBEAgACAFQQFqNgIUIAUgBjoAAAwCCwsgACADQQEgACgCJEEPcUGCAmoRAwBBAUYEfyADLQAABUF/CxoLIAIkCgvwAQEDfwJAAkAgAigCECIDDQAgAhCcBQR/QQAFIAIoAhAhAwwBCyEEDAELIAMgAigCFCIEayABSQRAIAIoAiQhAyACIAAgASADQQ9xQYICahEDACEEDAELIAFFIAIsAEtBAEhyBH9BAAUCfyABIQMDQCAAIANBf2oiBWosAABBCkcEQCAFBEAgBSEDDAIFQQAMAwsACwsgAigCJCEEIAIgACADIARBD3FBggJqEQMAIgQgA0kNAiAAIANqIQAgASADayEBIAIoAhQhBCADCwshBSAEIAAgARBAGiACIAEgAigCFGo2AhQgASAFaiEECyAEC20BAn8gAEErEDlFIQEgACwAACICQfIAR0ECIAEbIgEgAUGAAXIgAEH4ABA5RRsiASABQYCAIHIgAEHlABA5RRsiACAAQcAAciACQfIARhsiAEGABHIgACACQfcARhsiAEGACHIgACACQeEARhsLlgMBB38jCiEDIwpBQGskCiADQShqIQQgA0EYaiEFIANBEGohByADIQYgA0E4aiEIQd+FASABLAAAEDkEQEGECRC0ASICBEAgAkEAQfwAEJ8BGiABQSsQOUUEQCACQQhBBCABLAAAQfIARhs2AgALIAFB5QAQOQRAIAYgADYCACAGQQI2AgQgBkEBNgIIQd0BIAYQAhoLIAEsAABB4QBGBEAgByAANgIAIAdBAzYCBEHdASAHEAIiAUGACHFFBEAgBSAANgIAIAVBBDYCBCAFIAFBgAhyNgIIQd0BIAUQAhoLIAIgAigCAEGAAXIiATYCAAUgAigCACEBCyACIAA2AjwgAiACQYQBajYCLCACQYAINgIwIAJBfzoASyABQQhxRQRAIAQgADYCACAEQZOoATYCBCAEIAg2AghBNiAEEAxFBEAgAkEKOgBLCwsgAkEDNgIgIAJBATYCJCACQQI2AiggAkGeATYCDEGImwEoAgBFBEAgAkF/NgJMCyACEPsIBUEAIQILBUHEmwFBFjYCAAsgAyQKIAILXAIBfgF8IAAsAAhBA0YEfyAAKQMAIQIgASwACEEDRgR/IAIgASkDAFMFIAIgASsDABCFCQsFIAArAwAhAyABLAAIQRNGBH8gAyABKwMAYwUgAyABKQMAEIYJCwsLXAIBfgF8IAAsAAhBA0YEfyAAKQMAIQIgASwACEEDRgR/IAIgASkDAFcFIAIgASsDABCHCQsFIAArAwAhAyABLAAIQRNGBH8gAyABKwMAZQUgAyABKQMAEIgJCwsLlwIBCH8jCiEEIwpBEGokCiAEIgIgACgCECIDELkFIgE2AgAgAiABLAAEQcAAcjoACCAAIAJBAhCQASIFLAAIQQ9xBEAgACwAByEGIAMsAFEhByAAQQA6AAcgA0EAOgBRIAAgACgCDCIBQRBqNgIMIAEgBSkDADcDACABIAUsAAg6AAggACAAKAIMIgFBEGo2AgwgASACKQMANwMAIAEgAiwACDoACCAAKAIUIgIgAi4BIkHAAHI7ASICfyAAQQhBACAAKAIMQWBqIAAoAhxrQQAQowIhCCAAKAIUIgIgAi4BIkG/f3E7ASIgACAGOgAHIAMgBzoAUSAICwRAIABB8NUAELUEIAAgACgCDEFwajYCDAsLIAQkCgsEACMKCwYAIAAkCgsbAQJ/IwohAiAAIwpqJAojCkEPakFwcSQKIAILEgAgASACIABBD3FBlgJqEQIACwYAQQUQAwsIAEEBEANBAAuYAgEGfyMKIQIjCkEQaiQKIAFBjAFqIgQoAgAiAwRAIAEgAyABKAKIARDcAiAEQQA2AgALIAEgAUHgAGoiBSgCACABKAKYARDcAiABIAFB+ABqIgYoAgBBABDcAiAAELkCGiABQQM6AE0gACABIAAgASABQdgAaiIHIAEoAoABIAQQ3wEiAyABKAKEASAEEN8BGiABIAEoAoQBNgKIASABIAMoAgA2AoQBIAEgBygCADYCgAEgAkEANgIAIAAgASAAIAEgBSABKAKQASACEN8BIgMgASgClAEgAhDfARogASABKAKUATYCmAEgASADKAIANgKUASABIAUoAgA2ApABIAAgASAGQQAgAhDfARogACABEOcEIAIkCgsuACADKAIABEAgA0EIaiEABSADQQE2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RyEEIANBH0cEQANAIAIiAywACEEPcQRAIAIsAAlBwABxBEAgAigCECIGLAAFQRhxBEAgACAGED4LCyAERQRAIAAgAywACEHAAHEEfyACKAIABUEACxD5AUEARyEECwUgAhCDAgsgAkEYaiICIAVJDQALCyABQRxqIQIgACwATUECRiAEQQBHcQRAIAEgAiAAQewAahB5BSABIAIgAEHoAGoQeQsLhAEBA38gASgCDCICBEAgAiwABUEYcQRAIAAgAhA+CwsgAS4BBiICBEADQCABIANBBHRqLAAgQcAAcQRAIAFBGGogA0EEdGooAgAiBCwABUEYcQRAIAAgBBA+IAEuAQYhAgsLIANBAWoiAyACQf//A3FJDQALCyAAIAEQkwMgAS8BBkEBaguoAgEDfyABKAIcIQMCQAJAIAEsAAVBBnENACAALABNRQ0ADAELIAEgAUEkaiAAQegAahB5CyADBH8gAyABKAIMIgRJBEAgAyECIAQhAwN/IAIsAAhBwABxBEAgAigCACIELAAFQRhxBEAgACAEED4gASgCDCEDCwsgAkEQaiICIANJDQAgAgshAwsgASgCICICBEADQCACLAAFQRhxBEAgACACED4LIAIoAhAiAg0ACwsgACwATUECRgRAIAMgASgCHCABKAJkQQR0aiICSQRAA0AgA0EAOgAIIANBEGoiAyACSQ0ACwsgASABKAIoRgRAIAEoAiAEQCABIAAoApwBNgIoIAAgATYCnAELCwUgACwAUkUEQCABEP4CCwsgASgCZEEBagVBAQsL5gEBA38CQAJAIAEoAhgiA0UNAAJAAkAgAywABkEIcQ0AIANBAyAAKAK4ARCkASECIAEoAhgiAw0ADAELIAMsAAVBGHEEQCAAIAMQPgsLIAJFDQAgAiwACEEPcUEERw0AAn8gAigCAEEQaiICQesAEDkhBCACQfYAEDkhAiAEC0EARyIDIAJBAEciAnJFDQACQCADRQRAIAAgARDCBQwBCyACBEAgASABQRxqIABB9ABqEHkFIAAgAUEAEMoDGgsLDAELIAAgARDGBQsgASgCFAR/QQIgAS0AB3QFQQALIAEoAghBAWpqC+MBAQV/IAEoAhBBASABLQAHdEEYbGohBSABEIUBIgMEQANAIAEoAgwiBCACQQR0aiwACEHAAHEEQCACQQR0IARqKAIAIgQs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BRDlBEUNACAAQQIgASAFpxCuBAwBCyAAIAEgACACEKcEEPcCCyADJAoL0QEBBX8gACgCACEDIAAoAhBBAEoEQANAAkACQAJAAkAgAygCNCIFIAFBAnRqIgQoAgAiAkH/AHFBOGsOEQEDAwMDAwMDAwMDAwMCAgAAAwsgACwANkUEQCADLAAHRQ0DCyAEIAJBgH9xQcYAciICNgIADAELIAAgASAFIAEQjggQrwIMAQsgACwANgRAIAQgAkGAgAJyIgI2AgALIAMsAAcEQCAEIAMtAAZBGHRBgICACGogAkH///8HcXI2AgALCyABQQFqIgEgACgCEEgNAAsLC6MBACABKAIQIAEoAhRGBH8CfwJAAkACQAJAAkACQCABKAIAQQFrDgsCAQAFBQUDBQUFBAULIAJBAToACEEBDAULIAJBEToACEEBDAQLIAJBADoACEEBDAMLIAIgASgCCCIANgIAIAIgACwABEHAAHI6AAhBAQwCCyACIAAgARCBBSIAKQMANwMAIAIgACwACDoACEEBDAELIAEgAhCuAQsFQQALC54CAQN/An8CQCAAIAEgAiABEIUBIgQQjQgiACAESQR/IAEoAgwhBQNAAkAgAEEBaiEDIABBBHQgBWosAAhBD3ENACADIARJBEAgAyEADAIFIAMhAAwECwALCyACIAOtNwMAIAJBAzoACCACIAEoAgwiASAAQQR0aikDADcDECACIABBBHQgAWosAAg6ABhBAQUMAQsMAQsgACAEayIAQQEgAS0AB3QiA0gEfyABKAIQIQEDQCAAQRhsIAFqIgQsAAhBD3FFBEAgAEEBaiIAIANIBEAMAgVBAAwECwALCyACIABBGGwgAWopAxA3AwAgAiAAQRhsIAFqLAAJOgAIIAIgAEEYbCABaikDADcDECACIAQsAAg6ABhBAQVBAAsLCyIAIAAgARCXAyAAIAEoAgwgARCFAUEEdBBDIAAgAUEgEEMLUwECfyMKIQMjCkEQaiQKIAMhBCABLAAIQQNGBEAgBCABKQMANwMABSACIAEgASAEQQAQSRshAgsgA0EIaiIBIAAgAhDDAzYCACAAQavSACABEEoLVwECfyMKIQMjCkEQaiQKIANBCGohBCAAIAEQlgIiASAAIAIQlgIiAhBZBEAgBCABNgIAIAQgAjYCBCAAQfPSACAEEEoFIAMgATYCACAAQdLSACADEEoLCygAIAAgAiABIAEsAAhBD3FBfWpBGHRBGHVB/wFxQQJIG0Gf0gAQ0gELZgECfyABLAAGBEADQCAAQQlBIBCpASICIAJBEGo2AgggAkEAOgAYIAFBEGogA0ECdGogAjYCACABLAAFQSBxBEAgAiwABUEYcQRAIAAgASACEFALCyADQQFqIgMgAS0ABkkNAAsLC4IBACAAIAEoAjQgASgCFEECdBBDIAAgASgCOCABKAIcQQJ0EEMgACABKAIwIAEoAhBBBHQQQyAAIAFBQGsoAgAgASgCGBBDIAAgASgCRCABKAIkQQN0EEMgACABKAJIIAEoAiBBDGwQQyAAIAEoAjwgASgCDEEDdBBDIAAgAUHUABBDC1MBA38CQAJAIABBIGoiAygCACICRQ0AAkADQCACKAIIIgQgAUkNAiABIARGDQEgAkEQaiIDKAIAIgINAAsMAQsMAQsgAEEAIAEgAxCFBCECCyACC7kBAQV/IAAoAhQoAgwiAgRAIAAgAC4BCCIFQf//A3EiASAAKAJcaiIENgJcIAAgAigCDCIDBH8gAiADKAIMIgE2AgwgACAFQX9qOwEIIAAgA0EkEEMgAQRAA0ACQCABIAI2AgggASICKAIMIgNFDQAgAC4BCCEFIAIgAygCDCIENgIMIAAgBUF/ajsBCCAAIANBJBBDIAQEQCAEIQEMAgsLCwsgAC8BCCEBIAAoAlwFIAQLIAFrNgJcCwslAQF/IAFBfGohAiABIAEoAhxBfxB4GiABEN8EIAAgAkH4ABBDC+sBAQJ/IwohBCMKQUBrJAogACAAKAJcQYCABGo2AlwgBCABNgIAIAQgAjYCOCAEIAM2AjQgBEEANgIQIARBADYCGCAEQQA2AhwgBEEANgIkIARBADYCKCAEQQA2AjAgBEEANgIEIARBADYCDCAAQQUgBCAAKAIMIAAoAhxrIAAoAlgQowIhBSAEIAAgBCgCBCAEKAIMQQAQ6wE2AgQgBEEANgIMIAAgBCgCECAEKAIYQRhsEEMgACAEKAIcIAQoAiRBBHQQQyAAIAQoAiggBCgCMEEEdBBDIAAgACgCXEGAgHxqNgJcIAQkCiAFC4oCAQZ/IAIoAgAoAgwiBy0ACCEFAn8gBy0ABiEJIANBAEoEQANAIAEoAgAiBiAEQQR0aiAEQQR0IAJqKQMANwMAIARBBHQgBmogBEEEdCACaiwACDoACCAEQQFqIgQgA0cNAAsLIAAoAhggACgCDGtBBHUgBUH/AXEiBkwEQCAAKAIQKAIMQQBKBEAgABBLCyAAIAZBARCGARoLIAEoAgAhBSAJCyIEIANIBEAgAyECBQNAIANBBHQgBWpBADoACCADQQFqIQIgAyAESARAIAIhAwwBCwsLIAEgBUEQaiAGQQR0ajYCBCABIAcoAjQ2AhAgASABLgEiQRByOwEiIAAgAkEEdCAFajYCDAtGAQF/IAAoAhAhASAAQQAQgQMgAUEBEOcDIAAQjwUgACABKAJYIAEoAqQBEKYDIAAgASgCYEEAEKYDIAAgASgCfEEAEKYDCyQAIAAgAEEBEC9Bf0YEfyAABSAAEKwCCygCXEGAgARJEEdBAQsLACAAIAAQRhDVBgs/AQF/IAAQRiEBIABBAkEGEGIgAEEBEEcgAEEBEDMgAEEDQQIQQiAAIAAgAUF+akF/QQJBAkEKEOICQQIQmgMLewEDfyAAEEYhAiAAQQFBABAyGiACQQJOBEBBAiEBA0AgACABQQAQMhogAUEBaiEDIAEgAkcEQCADIQEMAQsLIAJBAUoEQEEBIQEDQCAAIAAgAUEAEDxBARCOBCABQQFqIgEgAkcNAAsLCyAAIAAgAkEAEDxBABCOBEEACykBAX8gAEEBEC8iAUF/RgRAIABBAUGa3wAQMRoLIAAgARCgARAwGkEBCxQAIABBARBUIABBAUEAEOwBGkEBC9IBAgR/AX4jCiEDIwpBEGokCiADQQhqIQIgAyEBAkACQCAAQQIQL0EBSARAAkAgAEEBEC9BA0YEQCAAQQEQKwwBCyAAQQEgAhA8IgEEQCAAIAEQ3gIhASACKAIAQQFqIAFGDQELIABBARBUDAILBSABQgA3AwAgAEECEDghBSAAQQFBBBBiIABBASACEDwhBCAFQn58QiNaBEAgAEECQdLIABAxGgsgBCAFpyABEN0IIAQgAigCAGpHDQEgACABKQMAEDQLDAELIAAQOgsgAyQKQQELbwEEfyMKIQEjCkEQaiQKIAEhAiAAQQIQLyEDIABBAUEFEGICQAJAIAMOBgEAAAAAAQALIABBAkH9zQAQuAELIABBAUHryAAQuQEEfyAAQffIACACEC4FIABBAhArIABBARC1AUEBCyEEIAEkCiAEC3QCAX8CfiAAEEYhAQJ/AkAgAEEBEC9BBEcNACAAQQFBABA8LAAAQSNHDQAgACABQX9qrBA0QQEMAQsgAEEBEDghAiABrCIDIAJ8IAMgAiACIANVGyACQgBTGyICQgBXBEAgAEEBQZvJABAxGgsgASACp2sLCyUAIABBAUEFEGIgAEECEFQgAEEDEFQgAEEDECsgAEEBEJIEQQELKQAgAEEBEC9BAXJBBUcEQCAAQQFBrskAELgBCyAAIABBARDgAhA0QQELIAAgAEEBQQUQYiAAQQIQVCAAQQIQKyAAQQEQ4wEaQQELHQAgAEEBEFQgAEECEFQgACAAQQFBAhDhAhBHQQELjgEBB38jCiEEIwpBEGokCiAEIQUgABBGIgZBAUgEQEG4PSgCACEBBUG4PSgCACEBQQEhAgNAAn8gACACIAUQ7AEhByACQQFLBEBBCSABEOEECyAHCyAFKAIAIAEQlQMaIABBfhArIAJBAWohAyACIAZHBEAgAyECDAELCwtBCiABEOEEIAEQcBogBCQKQQALMQAgAEEBEFQgAEEBEEcgAEEBQQEQQiAAIAAgABBGQX5qQX9BAEEAQQoQ4gJBABCaAws7ACAAQQEQVCAAQQFBvskAELkBBEAgAEEBEDMgAEEBQQNBABBlBSAAQQpBABB+IABBARAzIAAQOgtBAwsjACAAQQFBBRBiIABBAhArIABBARDjAgR/QQIFIAAQOkEBCws8AQN/IABBAUEAQQAQXCEBIABBAkEAQQAQXCECQQBBAyAAQQMQL0F/RhshAyAAIAAgASACEPICIAMQvgQLkwEBB38jCiEDIwpBEGokCiAAQQEgAyIBEDwhAiAAQQNBxskAQQAQXCEEIABBBBAvIQUgACACBH8gAEECIAJBABBcIQYgACACIAEoAgAgBiAEEKIEBSAAQQJByckAQQAQXCEBIABBAUEGEGIgAEEFECsgAEEJQQAgASAEEOQCC0EAQQQgBUF/RhsQvgQhByADJAogBwsfACAAQQEQVCAAQaABQQAQfiAAQQEQMyAAQgAQNEEDCyUAIABBARBUIABBARDmAQRAIABBAUHryAAQuQEaBSAAEDoLQQELPgEBfyAAQQFBAEEAEFwhASAAQQEQKyAAIAFBABDyAgRAIAAQ6AEFIABBAEF/QQgQZSAAQQBBABD0BA8LQQALEwAgABC7BBogAEGhAUEBEH5BAQsdACAAIAAgABCsAhCSBUECdEGgC2ooAgAQMBpBAQsNACAAIAAQkQIQR0ECC0oBAn8gACAAEKwCIAAQRkF/ahCUBSIBQQBIBEAgAEEAEEcgAEF+QQEQQkECIQIFIABBARBHIAFBAWohAiAAIAFBf3NBARBCCyACC4UDAQp/IwohASMKQdAAaiQKIAFBQGshCiABQTBqIQQgAUEoaiEFIAFBIGohBiABQRhqIQcgAUEQaiEIIAFBCGohAyABIQICQAJAAkACQAJAAkACQAJAIABBAUGQygBB8AkQnAJBAnRBoApqKAIAIglBA2sOCQAGAQICBgMEBQYLIABBAyACEKIBIQIgACAAQQQgAxCiAbdEAAAAAAAAUD+iIAK3oBBMDAYLIAggAEECQgAQPT4CACAAIABBBSAIEKIBEEcMBQsgByAAQQJCABA9PgIAIAAgACAJIAcQogGsEDQMBAsgACAAQQkgBhCiARBHDAMLIABBAkIAED2nIQMgAEEDQgAQPachAiAFIAM2AgAgBSACNgIEIAAgAEEKIAUQogEQ+QMMAgsgAEECQgAQPachBiAAQQNCABA9pyEDIABBBEIAED2nIQIgBCAGNgIAIAQgAzYCBCAEIAI2AgggACAAQQsgBBCiARD5AwwBCyAAIAAgCSAKEKIBrBA0CyABJApBAQtvAQV/IwohASMKQRBqJAogASECIAAgABCsAiIDEJIFIgRBf2pBAkkEfyADEJEEBH8gAEEAEEcgAyAAQQEQdUECBSAAQQEQR0EBCwUgAiAEQQJ0QaALaigCADYCACAAQeTLACACEC4LIQUgASQKIAULbQECfyAAIABB1/NCEN0CIgIgABBGEJQFIgFBAE4EQCABDwsCQAJAIAItAAYiAUEBTQ0AIAIQkQQaIAFBBEcNAAwBCyAAQX8QL0EERgRAIABBARDxAiAAQX5BARBCIABBAhCSAgsLIAAQ6AFBAAs4ACAAQQEQWgR/IAAQRgUgAEEBEFQgAEEBQX8QQiAAQX4QKyAAQdzKABAwGiAAQQEQKyAAELoECwuNAgEKfyMKIQcjCkEgaiQKIAchAyAAKAIwIQJBfyEBAkACQANAIAAgABB6EGghCCAAEO4HIgpB/wFxIQUgAiAIEIcBIAU6AAkgCkECRgR/IAFBf0cNAiAEIAItADJqBSABCyEJIARBAWohBiAAQSwQVgRAIAYhBCAJIQEMAQsLDAELIABB8O0AEM0BCyAAQT0QVgR/IAAgAxCAAgUgA0EANgIAQQALIQUgAiAIEIcBIQECQAJAIAUgBkcNACABLAAJQQFHDQAgAiADIAEQiAdFDQAgAUEDOgAJIAAgBBCsASACIAIsADJBAWo6ADIMAQsgACAGIAUgAxC3AyAAIAYQrAELIAAgCRDNCCAHJAoLUAEDfyMKIQEjCkEgaiQKIAAoAjAiAi0AMiEDIAAgABB6EGgaIABBARCsASAAIAFBACAAKAIEELMDIAIoAhAhACACIAMQvAQgADYCBCABJAoLwgEBBH8gABBqIQQgACgCACECIARBAWpB/////wFLBEAgAhClAQsgASACIARBA3RBABBtIgM2AjwgASAENgIMIARBAEoiBQRAQQAhAgNAIAJBA3QgA2pBADYCACAEIAJBAWoiAkcNAAsgBQRAQQAhAgNAIAAQcyEDIAEoAjwgAkEDdGogAzoABCAAEHMhAyABKAI8IAJBA3RqIAM6AAUgABBzIQMgASgCPCACQQN0aiADOgAGIAJBAWoiAiAERw0ACwsLC/MBAQN/IAAQaiEDIAAoAgAhAiADQQFqQf////8DSwRAIAIQpQELIAEgAiADQQJ0QQAQbSICNgI4IAEgAzYCHCADQQBKIgQEQCACQQA2AgAgA0EBRwRAQQEhAgNAIAEoAjggAkECdGpBADYCACADIAJBAWoiAkcNAAsLIAQEQEEAIQIDQCAAKAIAEKECIQQgASgCOCACQQJ0aiAENgIAIAEsAAVBIHEEQCABKAI4IAJBAnRqKAIAIgQsAAVBGHEEQCAAKAIAIAEgBBBQCwsgACABKAI4IAJBAnRqKAIAIAEoAkwQwgQgAkEBaiICIANHDQALCwsLsAMBBX8gABBqIQIgAUFAayAAKAIAIAJBABBtIgM2AgAgASACNgIYIAAgAyACEMEBIAAQaiEEIAAoAgAhAyAEQQFqQf////8BSwRAIAMQpQELIAEgAyAEQQN0QQAQbTYCRCABIAQ2AiQCfyAEQQBKIQYgABBqIQMgBgsEQEEAIQIDQCABKAJEIAJBA3RqIAM2AgAgABBqIQMgASgCRCACQQN0aiADNgIEIAJBAWohAiAAEGohAyACIARHDQALCyAAKAIAIQIgA0EBakHVqtWqAUsEQCACEKUBCyABIAIgA0EMbEEAEG0iBTYCSCABIAM2AiAgA0EASiIEBEBBACECA0AgAkEMbCAFakEANgIAIAJBAWoiAiADRw0ACyAEBEBBACECA0AgACABEKYCIQQgASgCSCACQQxsaiAENgIAIAAQaiEEIAEoAkggAkEMbGogBDYCBCAAEGohBCABKAJIIAJBDGxqIAQ2AgggAkEBaiICIANHDQALCwsgABBqIgRBAEoEQEEAIQMDQCAAIAEQpgIhAiABKAI8IANBA3RqIAI2AgAgA0EBaiIDIARHDQALCwurAgEFfyAAEGohBCAAKAIAIQIgBEEBakH/////AEsEQCACEKUBCyABIAIgBEEEdEEAEG0iBjYCMCABIAQ2AhAgBEEASiIDBEACQEEAIQIDQCACQQR0IAZqQQA6AAggBCACQQFqIgJHDQALIAMEQEEAIQIDQCACQQR0IAZqIQUCQAJAAkACQAJAIAAQcyIDQRh0QRh1DhUDAwQBAgQEBAQEBAQEBAQEBAMEAAIECyAFIAAQwAQ5AwBBEyEDDAILIAUgABDBBDcDAEEDIQMMAQsgBQJ/IAAiBSABEKYCIgMEQCADDAEFIAVBlv8AEIkBC0EACyIDNgIAIAMsAARBwAByIQMLIAJBBHQgBmogAzoACAsgBCACQQFqIgJGDQIgASgCMCEGDAAACwALCwsLSgEDfyAAEGohAyAAKAIAIQIgA0EBakH/////A0sEQCACEKUBBSABIAIgA0ECdCICQQAQbSIENgI0IAEgAzYCFCAAIAQgAhDBAQsLeAEDfyADBEAgAyABSwR/QQAFIAEgA0F/aiIEayIBBH8CfyACLAAAIQUgAkEBaiEGA39BACAAIAUgARB8IgNFDQEaIAMgA0EBaiICIAYgBBCzAUUNARogACABaiACayIBBH8gAiEADAEFQQALCwsFQQALCyEACyAACysAIABB/wFxQRh0IABBCHVB/wFxQRB0ciAAQRB1Qf8BcUEIdHIgAEEYdnILQwAgACAAQQFBABAyIABBAkEAEDIgAEEDQduFAUEAEFwgAEEEQbvkAEEAEFwQ6AMEf0EBBSAAEDogAEF+QQEQQkECCwukAQEBfyAAQQFBABAyIQEgAEEBECsgAEHY80JB++EAEEgaIABBAiABEEgaIABBfxBaBH9BAQUgAEF+ECsgACABEIwIIABBfkEBEEIgAEEBEDMgAEF9EDMgAEECQQFBABBlIABBfxAvBEAgAEECIAEQNwUgAEF+ECsLIABBAiABEEhFBEAgAEEBEEcgAEF+ELYBIABBAiABEDcLIABBfkEBEEJBAgsLRgEBfyAAIABBAUEAEDIgAEECQQAQMhCCAyIBBH9BmOUAQZ/lACABQQFGGyEBIAAQOiAAQX5BARBCIAAgARAwGkEDBUEBCwujAQEBfyABKAIkIgIEQAJAAkACQAJAIAEoAgAOFAIBAQEBAQEBAQEBAQEBAQEBAQAAAQsgACABQX8QngIgACABKAIYKAIIIAFBIGoiACgCAEF/EPQCIAAgACgCAEF/aiICNgIADAILIAAgARByIAEoAiQhAgsgACABKAIYKAIIIAFBIGoiACgCACACEPQCIAAoAgAhAgsgACABKAIkIAJqNgIACwuFAQEHfyMKIQUjCkHwAGokCiAFIQZBASECQQEhAQNAAn8gACABIAYQgAFFIQcgAUEBdCEEIAcLRQRAIAEhAiAEIQEMAQsLIAIgAUgEQANAIAAgASACakECbSIEIAYQgAFFIQMgAiAEQQFqIAMbIgIgBCABIAMbIgFIDQALCyAFJAogAUF/agtFAQF/IABBnwIQbANAAkAgACgCEEE7ayIDBEAgA0HkAUcNAQsgABDZAwwBCwsgACABEM4IIAAgASACIABBABCFAhD5BBoL4QMCBn8BfiMKIQYjCkEQaiQKIAYhAwNAIAMgADYCACAAQQFqIQIgAC0AAEGxC2osAABBCHEEQCACIQAMAQsLIAMQzgchBwJAAkAgAygCACIALAAAIgJBMEYEQAJAIAAsAAFB2ABrIgQEQCAEQSBHDQELIAMgAEECaiIANgIAIAAsAAAiAkH/AXFBsQtqIgQsAABBEHEEQANAIAJBGHRBGHUQ7wKsIAhCBIZ8IQggAyAAQQFqIgA2AgAgACwAACICQf8BcUGxC2oiBCwAAEEQcQ0ACwwDBUEBIQUMAwsACwsgAkH/AXFBsQtqIgQsAABBAnEEfyAHQQdqIQQCQANAIAJBGHRBGHVBUGohAiAIQsuZs+bMmbPmDFYEQCACIARKIAhCzJmz5syZs+YMUnINAgsgAqwgCEIKfnwhCCAAQQFqIgAsAAAiAkH/AXFBsQtqLAAAQQJxDQALIAMgADYCACAALAAAIgJB/wFxQbELaiEEDAILIAMgADYCAEEABUEBIQUMAQshAAwBCyAELAAAQQhxBEADQCAAQQFqIgAsAAAiAkH/AXFBsQtqLAAAQQhxDQALIAMgADYCAAsgAkH/AXEgBXIEQEEAIQAFIAFCACAIfSAIIAcbNwMACwsgBiQKIAALnQEBBH8jCiEEIwpB0AFqJAogBCEDAn8CQCAAQaTlABDUAyICRQ0AIAIsAABBIHJB/wFxQe4ARw0AQQAMAQsgACABEMkEIgIEfyACBSAAQS4QOSICRSAAEE1ByAFLcgR/QQAFIAMgABDFAiACIABrIANqQbTBACgCACwAADoAACAAIAMgARDJBCIAIANrakEAIAAbCwsLIQUgBCQKIAULVAEEfyMKIQMjCkEQaiQKIAMhAhALIQFBABAEIQAgAiABNgIAIAIgADYCBEEBIQADQCAAQQJ0IAJqKAIAIAFqIQEgAEEBaiIAQQJHDQALIAMkCiABC1sBA38jCiECIwpBEGokCiAAIAIiARCWA0QAAAAAAADgQaIiAEQAAAAAAADgw2YgAEQAAAAAAADgQ2NxBH8gASgCACAAsKdqIgFBH3UgAXMFQQALIQMgAiQKIAMLSgECfyAALAAAIgIEfyAAQQFqIQFB34UBIAJBBBB8BH8gAEECaiABIAEsAABBK0YbIgBB4dkAEIoCIQEgABBNIAFGBUEACwVBAAsLFgAgAwR/IAEgAxDzAwUgARDXAUEACwtcAQR/IwohAiMKQRBqJAogACgCMCABLQAMEIcBKAIQQRBqIQMgACgCNCEEIAEoAgghBSACIAEoAgBBEGo2AgAgAiAFNgIEIAIgAzYCCCAAIARB2eoAIAIQTxDNAQsyAQF/IABBAhBaIQEgAEEBQQAQMhogAEGoAUGpASABG0EAEH4gAEEBEDMgAEIAEDRBAwsJACAAQQEQywQLCQAgAEEAEMsEC4sBAQJ/IABBgQIQVgR/IAEgACgCNEGJ6gBBBRBgNgIAQQEFIAAoAhBBiQJGBH8gABCXBEGjAkYEfwJ/IAAgACgCKCIEEJsDIgMEQEEAIAAoAjAiARCOASABIAMtAAwQnQFKDQEaIAIgAygCBDYCAAUgASAENgIACyAAED8gABA/QQELBUEACwVBAAsLCzIBAn8CQAJAAkAgACgCACICLAAAQStrDgMBAgACC0EBIQEMAAsgACACQQFqNgIACyABCycBAX8gASAAKAIAQRBqIgFrIgJBcEoEfyACIAAoAgQgAWtIBUEACwseAQF+IAAgAEECEDhCAXwiARA0QQJBASAAIAEQUhsLEgAgACAAQcLWABCOA0EBENsECzUBAX8gAEEBEFQgABCgBCIBBEAgASgCBAR/IABBnNkAEDAFIABBkNkAEDALGgUgABA6C0EBCyEBAX8gABDZAhDMBSIBNgIAIAEEf0EBBSAAQQBBABBuCwvwAQEHfyMKIQIjCkEQaiQKIAJBCGohBCACIQEgAEHX80IQoQEhBSAAQdbzQkEAEGSnIQMgBSgCBAR/An8gAEEBECsgACADQfHXABCmASADQQFOBEBBASEBA0AgAEHV80IgAWsQMyABQQFqIQYgASADRwRAIAYhAQwBCwsLIABBACAAIAUoAgBBAhCUAyIBaxBaBH8gAQUgAUEBSgRAIAQgAEEBIAFrQQAQPDYCACAAQeD4ACAEEC4MAgsgAEHV80IQWgRAIABBABArIABB1/NCEDMgABC2AxoLQQALCwUgAEGE2AAgARAuCyEHIAIkCiAHCxIAIAAgAEGy1gAQjgNBARCUAwuLAQEGfyMKIQEjCkEQaiQKIAEhBCAAQQFBABAyIQUgAEECQdrkAEEAEFwhAiAAENcCIQMCQAJAAkAgAiwAAEHyAGsOBgABAQEBAAELIAIsAAENAAwBCyAAQQJBodkAEDEaCyAAQa7ZACAEEC4aIANBADYCACADQaQBNgIEIABBACAFEG4hBiABJAogBgsYACAAELoBGkHEmwFBADYCACAAQX8QpAQLEQAgAEHC1gBBxNkAENwEQQELWAEEfyAAQQFBABAyIQIgAEECQdrkAEEAEFwhAQJ/IAAQ2QIhBCABEMcHRQRAIABBAkGh2QAQMRoLIAQLIAIgARD+ASIBNgIAIAEEf0EBBSAAQQAgAhBuCwscACAAELoBQaIBNgIEIAAQOiAAQeHWABAwGkECC3oAIABBARAvQX9GBEAgABA6CyAAQQEQLwR/IAAgAEEBQQAQMkHa5AAQgQQgAEEBELYBIABBfhArIABBARC1AyAAEDogABA6IABBARAzQQQFIABB2PNCQbLWABBIGiAAQQEQtgEgAEF+ECsgABCLARogAEEAELUDQQELCxEAIABBstYAQdrkABDcBEEBCxQAIAAgAEHC1gAQjgMQcEVBABBuCxQAIAAgABC6ASgCABDZAUVBABBuCyAAIABBARAvQX9GBEAgAEHY80JBwtYAEEgaCyAAEO0EC/wBAQZ/IAAoAhAiBEEYaiEFIAEgAiAEKAJIQQEQ7AIhBgJAAkAgBSgCACAEKAIgIghBf2ogBnFBAnRqIgcoAgAiA0UNAANAAkAgAiADLQAHRgRAIAEgA0EQaiACELMBRQ0BCyADKAIMIgMNAQwCCwsgAyIALAAFIgEgBCwATEEYc3FB/wFxBEAgACABQRhzOgAFCwwBCyAEKAIcIAhOBEAgACAFEOgHIAUoAgAgBCgCIEF/aiAGcUECdGohBwsgACACQQQgBhD4BCIDQRBqIAEgAhBAGiADIAI6AAcgAyAHKAIANgIMIAcgAzYCACAEIAQoAhxBAWo2AhwLIAMLLQAgAUF/NgIQIAFBfzYCFCABQQk2AgAgASACOwEKIAEgACACEIcBLAAKOgAIC2kBAn8jCiECIwpBEGokCiABIAAQ0QEiAzYCKCABQcUAOgAwIAAgA0ECQQAQ9AEgAiAANgIAIAJByAA6AAggACADQgEgAhDyASACIAAQ0QE2AgAgAkHFADoACCAAIANCAiACEPIBIAIkCguHAQEEf0EAIAEtAFRBAnRBAXIiA2tBASABLQBVIgJ0QQR2bEGBgICAeCACQf8BcUEfSBshBSADIAEoAgxBBHZsIQICQAJAA0ACQCACIAAQ3gNrIQIgASwATUEIRiEEIAIgBUwNACAERQ0BDAILCyAEDQAgASACIANtQQR0ENQBDAELIAEQjAILC3QBBH8jCiEDIwpBEGokCgJ/IAAoAjAhBSADIgJBfzYCACAAIAIQ0AMgACgCEEGEAkYEQANAIAAgAhDQAyAAKAIQQYQCRg0ACwsgAEGDAhBWBEAgABC4AgsgAEGFAkGKAiABEJwBIAULIAIoAgAQpwEgAyQKC1kAIABB2PNCQZ3OABBIGiAAEJECGiAAQX4Q4wFBBkYEQCAAIAEoAgBBAnRB0A5qKAIAEDAaIAEoAhgiAUF/SgRAIAAgAawQNAUgABA6CyAAQQJBAEEAEGULC+gIAwl/BX4DfEE1IQQgACgCBCICIAAoAmRJBH8gACACQQFqNgIEIAItAAAFIAAQUQshAwJAAkADQAJAAkAgA0Euaw4DAwEAAQsgACgCBCICIAAoAmRJBH8gACACQQFqNgIEIAItAAAFIAAQUQshA0EBIQYMAQsLDAELIAAoAgQiAiAAKAJkSQR/IAAgAkEBajYCBCACLQAABSAAEFELIgNBMEYEfwN/IAAoAgQiAiAAKAJkSQR/IAAgAkEBajYCBCACLQAABSAAEFELIQMgC0J/fCELIANBMEYNACALIQ1BASEGQQELBUEBCyEFC0IAIQtEAAAAAAAA8D8hEEEAIQIDQAJAIANBIHIhBwJAAkAgA0FQaiIJQQpJDQAgA0EuRiIKIAdBn39qQQZJckUNAiAKRQ0AIAUEf0EuIQMMAwUgCyEMIAshDUEBCyEFDAELIAdBqX9qIAkgA0E5ShshAyALQghTBEAgECESIAMgAkEEdGohAgUgC0IOUwR8IBBEAAAAAAAAsD+iIhAhEiARIBAgA7eioAUgCEEBIANFIAhBAEdyIgMbIQggECESIBEgESAQRAAAAAAAAOA/oqAgAxsLIRELIAtCAXwhDCASIRBBASEGCyAAKAIEIgMgACgCZEkEfyAAIANBAWo2AgQgAy0AAAUgABBRCyEDIAwhCwwBCwsgBgR8AnwgC0IIUwRAIAshDANAIAJBBHQhAiAMQgF8IQ4gDEIHUwRAIA4hDAwBCwsLAn4gA0EgckHwAEYEfiAAEOkDIgxCgICAgICAgICAf1EEfiAAKAJkBEAgACAAKAIEQX9qNgIEC0IABSAMCwUgACgCZARAIAAgACgCBEF/ajYCBAtCAAshDyABt0QAAAAAAAAAAKIgAkUNARogDwsgDSALIAUbQgKGQmB8fCILQrIIVQRAQcSbAUEiNgIAIAG3RP///////+9/okT////////vf6IMAQsgC0LkdlMEQEHEmwFBIjYCACABt0QAAAAAAAAQAKJEAAAAAAAAEACiDAELIAJBf0oEQCACIQADQCARRAAAAAAAAOA/ZkUiAkEBcyAAQQF0ciEAIBEgESARRAAAAAAAAPC/oCACG6AhESALQn98IQsgAEF/Sg0ACwUgAiEACwJ8AkAgC0LSCHwiDUI1UwRAIA2nIgRBAEwEQEEAIQRB1AAhAgwCCwtB1AAgBGshAiAEQTVIDQAgAbchEEQAAAAAAAAAAAwBCyABtyEQRAAAAAAAAPA/IAIQeyAQEPwECyESRAAAAAAAAAAAIBEgAEEBcUUgBEEgSCARRAAAAAAAAAAAYnFxIgQbIBCiIBIgECAAIARBAXFquKKgoCASoSIRRAAAAAAAAAAAYQRAQcSbAUEiNgIACyARIAunEOoDCwUgACgCZEUiBEUEQCAAIAAoAgRBf2o2AgQLIARFBEAgACAAKAIEQX9qNgIEIAQgBUVyRQRAIAAgACgCBEF/ajYCBAsLIAG3RAAAAAAAAAAAogsLuwECAX8CfiABIAFCAFGtfCEBAkACQANAIAFCgICAgICAgIDAAFQEQCAAIAFCAYYiAxBeLAAIQQ9xRQ0CIAMhAQwBCwsgAEL///////////8AEF4sAAhBD3EEfkL///////////8ABUL///////////8AIQMMAQshAQwBCyADIAF9QgFWBEADQCAAIAEgA3xCAYgiBBBeLAAIQQ9xRSECIAQgAyACGyIDIAEgBCACGyIBfUIBVg0ACwsLIAELSAAgASgCBEH/////B0YEQCAAQQEQgAMgASgCBEH/////B0YEQCAAQQQQYwsLIAEoAggiAUGAgICAAkgEQCAAIAFBAXQQmwQLC2YBBH8gACgCMCEBIAAoAgQhAyAAIAAQeiIEEJsDIgIEQCABIAItAAwQnQEhACABEI4BIABKBEAgAUE2IABBAEEAQQAQOxoLIAEgARCDASACKAIEEM4BBSAAIAQgAyABEIMBENgCCwuCAQEDfyAAQdXzQhChASIBQQxqIQMgASAANgIYIAEoAgAiACABKAIQSwR/QQAFAn8DQAJAIAMQzAIgAyAAIAEoAgQQjAEiAgRAIAEoAgggAkcNAQtBACAAQQFqIgAgASgCEEsNAhoMAQsLIAEgAjYCCCABIAI2AgAgAyAAIAIQjgILCwudAQEGfyMKIQIjCkEQaiQKIABBASACQQRqIgEQMiEFIABBAiACEDIhBiAAQQNCARA9IAEoAgAQ4gFBf2ohAyAAQQIQKyAAQaQCEOQBIQQgASgCACIBQQFqIAMgAyABSxshAyAEQQxqIAAgBSABIAYgAigCABDRAiAEIAMgBWo2AgAgBCAGNgIEIARBADYCCCAAQacBQQMQfiACJApBAQtqAQJ/IAAoAgAoAgAiAywABiIABH8CfyAAQf8BcSEEQQAhAANAIANBEGogAEECdGooAgAoAgggAUcEQCAAQQFqIgAgBEkEQAwCBUEADAMLAAsLIAIgAygCDCAAEL4CNgIAQfH8AAsFQQALC5sCAAJ/AkACQAJAAkACQCAAQSNrDuwBAwQEBAQEBAQEBAEEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAIEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAEC0ECDAQLQQAMAwtBAQwCC0EDDAELQQQLC24BBX8jCiEDIwpBEGokCiADIQQgAEE8EFYEQCAAEHpBEGohAiAAQT4QbCACQZ7uABBZBEAgAkGk7gAQWQRAIAAoAjQhBSAEIAI2AgAgACAFQaruACAEEE8QzQEFQQIhAQsFQQEhAQsLIAMkCiABC1MBAX8gAQR/An8gAS8BIiIDQcAAcQRAIAJBkv0ANgIAQenQAAwBCyADQRBxBH9BAAUgASgCCCIBLgEiQQJxBH9BAAUgACABIAIQ+QcLCwsFQQALC00BA38gACgCFCICBEAgAiAAKAIQIgNLBEACQAN/IAAgAkFoaiIBNgIUIAJBcWosAABFDQEgASADSwR/IAEhAgwBBUEACwshAQsLCyABC6ADAAJ/AkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgAEElaw76AQMHFRUVAgAVARUFFRUVFRUVFRUVFRUVDxURFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFQQVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFQgVCRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRMVFRUVFRUVFRUVFRUVFRQVFRUVFRUGDBUOEhANCgsVC0EADBULQQEMFAtBAgwTC0EDDBILQQQMEQtBBQwQC0EGDA8LQQcMDgtBCAwNC0EJDAwLQQoMCwtBCwwKC0EMDAkLQRAMCAtBDQwHC0EODAYLQQ8MBQtBEQwEC0ESDAMLQRMMAgtBFAwBC0EVCwu1AQEEfwJ/AkAgACgCJCIERQ0AIAAoAkQiBSgCACABSg0AIARBf2oiA0EDdCAFaiIAKAIAIAFKBEAgBEECRgR/QQAhAyAFBUEAIQADQCAAIANqQQF2IgZBA3QgBWooAgAgAUohBCAAIAYgBBsiACAGIAMgBBsiA0F/akkNAAsgACEDIABBA3QgBWoLIQALIAIgACgCADYCACADQQN0IAVqQQRqDAELIAJBfzYCACAAQShqCygCAAsiACABKAIEIgAEfyACIAA2AgAgAUEANgIEIAEoAgAFQQALC1wAIAEoAgAiAEEASgRAIAIgADYCACABQQA2AgAgAUEIaiEABSABKAIEIgAoAkwaIAAoAgBBBHZBAXEEQEEAIQAFIAIgAUEIaiIAQYAIIAEoAgQQmQM2AgALCyAAC5IBAQN/IAEoAhQEQCAAIAEQ5QUFAkAgASgCECICQeQAbiABLQBQQQJ0bCEDIAEoAgwiBEEASgRAIAQgASgCCGogAiADaksEQCAAIAEQ3gQhACABKAIIIAEoAgxqIANBAXYgAmpJBEAgARDJAgUgASAANgIUIAEQjAILDAILCyAAIAEQrQUgARDJAiABIAI2AhALCwt6AQJ/IwohASMKQRBqJAogASEDIABBAkHRyQAQpgEgAEEBEDMgAEEAQQFBABBlIABBfxAvBH8gAEF/EOUBRQRAIABB68kAIAMQLhoLIABBBRC2ASAAQX4QKyAAQQUgAhA8BSAAQX4QKyACQQA2AgBBAAshBCABJAogBAs7AQJ+IAAQzAEiAUIAVQRAA0AgAEEBIAEQxwEaIABBfhArIAFCf3whAiABQgFVBEAgAiEBDAELCwtBAAtEAQJ/IwohAiMKQTBqJAogAkEYaiEDIAAQPyAAIAIgACADEPoHIAEQswMgACgCMCADIAIQnQIgACgCMCABEKgBIAIkCgvQAgEDfyABKAIAKAIAKAIMIQQgARCxAiIFQQJ0IAQoAjRqKAIAIQMgAS4BIkEEcQR/IAJBveQANgIAQYfRAAUCfwJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgA0H/AHFBC2sOQgICAgIDAwMDDAIMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMBAQEBQYMBwgLDAwJCgoMDAoKDAwMDAAACwwMDAwMAQwLIAQgBSADQQd2Qf8BcSACEKkCDA0LIAJB9NAANgIAQfTQAAwMC0EAIQEMCgtBASEBDAkLIANBGHYhAQwIC0ESIQEMBwtBEyEBDAYLQQQhAQwFC0EWIQEMBAtBBSEBDAMLIAJBgdEANgIAQenQAAwDCyACQaTuADYCAEHp0AAMAgtBAAwBCyACIAAoAhBBrAFqIAFBAnRqKAIAQRJqNgIAQenQAAsLC0kBAX8gACABEN0DAkACQANAAkAgACgCEEEuayICBEAgAkEMRg0DQQAhAAwBCyAAIAEQnQMMAQsLDAELIAAgARCdA0EBIQALIAALwwEBA38gAAJ/AkAgAUUNACABLAAEQSZGDQAgACABKAIMIgMoAkwiAgR/IAAgAkEQaiIBNgIQIAIsAARBBEYEfyACLQAHBSACKAIMCwUgAEG80QA2AhBBvNEAIQFBAgsiAjYCFCAAIAMoAigiBDYCHCAAIAMoAiw2AiBBxNEAQb/RACAEGwwBCyAAQbfRADYCECAAQQQ2AhQgAEF/NgIcIABBfzYCIEG30QAhAUEEIQJB3YUBCzYCDCAAQSxqIAEgAhCfBAsvACABLQBNQQNIBEAgABCjAwsgAEGAAhDAASAAQYABEMABIABBgAIQwAEgARCMAguxAgEEfyMKIQQjCkEgaiQKIARBEGohAiAEIQNBlMUAEKIFIQUgASgCTEF/SgR/QQEFQQALGiABEHAaAkACQCAABEAgAEGUxQAQ/gEiAEUNASAAKAI8IgIgASgCPCIDRgRAIABBfzYCPAUgAiADIAVBgIAgcRCECUEASARAIAAQ2QEaDAMLCyABIAAoAgAgASgCAEEBcXI2AgAgASAAKAIgNgIgIAEgACgCJDYCJCABIAAoAig2AiggASAAKAIMNgIMIAAQ2QEaBSAFQYCAIHEEQCADIAEoAjw2AgAgA0ECNgIEIANBATYCCEHdASADEAIaCyACIAEoAjw2AgAgAkEENgIEIAIgBUG//l9xNgIIQd0BIAIQAhB0QQBIDQELDAELIAEQ2QEaQQAhAQsgBCQKIAELnQEBA38gAC0AAEEYdCAALQABQRB0ciAALQACQQh0ciAAQQNqIgAsAAAiA0H/AXFyIQIgA0UiAyABLQADIAEtAABBGHQgAS0AAUEQdHIgAS0AAkEIdHJyIgQgAkZyBH8gAwUgAiEBA38gAEEBaiIALAAAIgJB/wFxIAFBCHRyIQEgAkUiAiABIARGckUNACACCwshAUEAIABBfWogARsL0QIBA38jCiECIwpBEGokCiAAKAIwIgQgAkEBEJkBIAAQPyAAEHohAwJAAkACQAJAIAAoAhBBLGsO4AEBAgICAgICAgICAgICAgICAgACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAQILIAAgAyABEIEIDAILIAAgAxCCCAwBCyAAQcHuABBpCyAAQYUCQYcCIAEQnAEgBBCXASACJAoL/gMDCX8DfgN8IwohAiMKQTBqJAogAkEgaiEIIAJBGGohCSACQRBqIQMgAkEIaiEGIAIhByABQRBqIQQgAUEgaiEFAn8CQCABLAAIQQNHDQACfyABLAAoQQNHDQEgASkDACELIAUpAwAiDEIAUQRAIABBrYQBIAkQSgsgASALNwMwIAFBAzoAOEEBIAAgCyAEIAMgDBCDCA0AGiADKQMAIQ0gDEIAVQRAIA0gC30hCyAMQgFSBEAgCyAMgCELCwUgCyANfUIAIAx9gCELCyAEIAs3AwAgAUEDOgAYQQALDAELIAEsABhBE0YEQCAGIAQrAwA5AwAFIAQgBhDIAUUEQCAAIARBwIQBEKACCwsgASwAKEETRgRAIAcgBSsDADkDAAUgBSAHEMgBRQRAIAAgBUHGhAEQoAILCyABLAAIQRNGBEAgAyABKwMAOQMABSABIAMQyAFFBEAgACABQcuEARCgAgsLIAcrAwAiD0QAAAAAAAAAAGEEQCAAQa2EASAIEEoLAkAgD0QAAAAAAAAAAGQEQCAGKwMAIhAgAysDACIOYw0BBSADKwMAIg4gBisDACIQ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C/cOSWxsZWdhbCBieXRlIHNlcXVlbmNlAERvbWFpbiBlcnJvcgBSZXN1bHQgbm90IHJlcHJlc2VudGFibGUATm90IGEgdHR5AFBlcm1pc3Npb24gZGVuaWVkAE9wZXJhdGlvbiBub3QgcGVybWl0dGVkAE5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkATm8gc3VjaCBwcm9jZXNzAEZpbGUgZXhpc3RzAFZhbHVlIHRvbyBsYXJnZSBmb3IgZGF0YSB0eXBlAE5vIHNwYWNlIGxlZnQgb24gZGV2aWNlAE91dCBvZiBtZW1vcnkAUmVzb3VyY2UgYnVzeQBJbnRlcnJ1cHRlZCBzeXN0ZW0gY2FsbABSZXNvdXJjZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZQBJbnZhbGlkIHNlZWsAQ3Jvc3MtZGV2aWNlIGxpbmsAUmVhZC1vbmx5IGZpbGUgc3lzdGVtAERpcmVjdG9yeSBub3QgZW1wdHkAQ29ubmVjdGlvbiByZXNldCBieSBwZWVyAE9wZXJhdGlvbiB0aW1lZCBvdXQAQ29ubmVjdGlvbiByZWZ1c2VkAEhvc3QgaXMgZG93bgBIb3N0IGlzIHVucmVhY2hhYmxlAEFkZHJlc3MgaW4gdXNlAEJyb2tlbiBwaXBlAEkvTyBlcnJvcgBObyBzdWNoIGRldmljZSBvciBhZGRyZXNzAEJsb2NrIGRldmljZSByZXF1aXJlZABObyBzdWNoIGRldmljZQBOb3QgYSBkaXJlY3RvcnkASXMgYSBkaXJlY3RvcnkAVGV4dCBmaWxlIGJ1c3kARXhlYyBmb3JtYXQgZXJyb3IASW52YWxpZCBhcmd1bWVudABBcmd1bWVudCBsaXN0IHRvbyBsb25nAFN5bWJvbGljIGxpbmsgbG9vcABGaWxlbmFtZSB0b28gbG9uZwBUb28gbWFueSBvcGVuIGZpbGVzIGluIHN5c3RlbQBObyBmaWxlIGRlc2NyaXB0b3JzIGF2YWlsYWJsZQBCYWQgZmlsZSBkZXNjcmlwdG9yAE5vIGNoaWxkIHByb2Nlc3MAQmFkIGFkZHJlc3MARmlsZSB0b28gbGFyZ2UAVG9vIG1hbnkgbGlua3MATm8gbG9ja3MgYXZhaWxhYmxlAFJlc291cmNlIGRlYWRsb2NrIHdvdWxkIG9jY3VyAFN0YXRlIG5vdCByZWNvdmVyYWJsZQBQcmV2aW91cyBvd25lciBkaWVkAE9wZXJhdGlvbiBjYW5jZWxlZABGdW5jdGlvbiBub3QgaW1wbGVtZW50ZWQATm8gbWVzc2FnZSBvZiBkZXNpcmVkIHR5cGUASWRlbnRpZmllciByZW1vdmVkAERldmljZSBub3QgYSBzdHJlYW0ATm8gZGF0YSBhdmFpbGFibGUARGV2aWNlIHRpbWVvdXQAT3V0IG9mIHN0cmVhbXMgcmVzb3VyY2VzAExpbmsgaGFzIGJlZW4gc2V2ZXJlZABQcm90b2NvbCBlcnJvcgBCYWQgbWVzc2FnZQBGaWxlIGRlc2NyaXB0b3IgaW4gYmFkIHN0YXRlAE5vdCBhIHNvY2tldABEZXN0aW5hdGlvbiBhZGRyZXNzIHJlcXVpcmVkAE1lc3NhZ2UgdG9vIGxhcmdlAFByb3RvY29sIHdyb25nIHR5cGUgZm9yIHNvY2tldABQcm90b2NvbCBub3QgYXZhaWxhYmxlAFByb3RvY29sIG5vdCBzdXBwb3J0ZWQAU29ja2V0IHR5cGUgbm90IHN1cHBvcnRlZABOb3Qgc3VwcG9ydGVkAFByb3RvY29sIGZhbWlseSBub3Qgc3VwcG9ydGVkAEFkZHJlc3MgZmFtaWx5IG5vdCBzdXBwb3J0ZWQgYnkgcHJvdG9jb2wAQWRkcmVzcyBub3QgYXZhaWxhYmxlAE5ldHdvcmsgaXMgZG93bgBOZXR3b3JrIHVucmVhY2hhYmxlAENvbm5lY3Rpb24gcmVzZXQgYnkgbmV0d29yawBDb25uZWN0aW9uIGFib3J0ZWQATm8gYnVmZmVyIHNwYWNlIGF2YWlsYWJsZQBTb2NrZXQgaXMgY29ubmVjdGVkAFNvY2tldCBub3QgY29ubmVjdGVkAENhbm5vdCBzZW5kIGFmdGVyIHNvY2tldCBzaHV0ZG93bgBPcGVyYXRpb24gYWxyZWFkeSBpbiBwcm9ncmVzcwBPcGVyYXRpb24gaW4gcHJvZ3Jlc3MAU3RhbGUgZmlsZSBoYW5kbGUAUmVtb3RlIEkvTyBlcnJvcgBRdW90YSBleGNlZWRlZABObyBtZWRpdW0gZm91bmQAV3JvbmcgbWVkaXVtIHR5cGUATm8gZXJyb3IgaW5mb3Jt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cwBwY2FsbABwcmludAB3YXJuAHJhd2VxdWFsAHJhd2xlbgByYXdnZXQAcmF3c2V0AHNlbGVjdAB0b251bWJlcgB0b3N0cmluZwB4cGNhbGwAYmFzZSBvdXQgb2YgcmFuZ2UAIAwKDQkLAF9fbWV0YXRhYmxlAGNhbm5vdCBjaGFuZ2UgYSBwcm90ZWN0ZWQgbWV0YXRhYmxlAGluZGV4IG91dCBvZiByYW5nZQB0YWJsZSBvciBzdHJpbmcAX19wYWlycwBidAA9KGxvYWQpAHRvbyBtYW55IG5lc3RlZCBmdW5jdGlvbnMAcmVhZGVyIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGEgc3RyaW5nAGNvbGxlY3QAaW5jcmVtZW50YWwAZ2VuZXJhdGlvbmFsAHN0b3AAcmVzdGFydABzZXRwYXVzZQBzZXRzdGVwbXVsAGlzcnVubmluZwBhc3NlcnRpb24gZmFpbGVkIQBvcGNvZGVzAGZ1bmN0aW9uIG9yIGV4cHJlc3Npb24gbmVlZHMgdG9vIG1hbnkgcmVnaXN0ZXJzAGNvbnN0YW50cwBjcmVhdGUAcmVzdW1lAHJ1bm5pbmcAc3RhdHVzAHdyYXAAeWllbGQAaXN5aWVsZGFibGUAY2Fubm90IGNsb3NlIGEgJXMgY29yb3V0aW5lAGRlYWQAc3VzcGVuZGVkAG5vcm1hbAB0b28gbWFueSBhcmd1bWVudHMgdG8gcmVzdW1lAHRvbyBtYW55IHJlc3VsdHMgdG8gcmVzdW1lAGdldHVzZXJ2YWx1ZQBnZXRob29rAGdldGluZm8AZ2V0bG9jYWwAZ2V0cmVnaXN0cnkAZ2V0bWV0YXRhYmxlAGdldHVwdmFsdWUAdXB2YWx1ZWpvaW4AdXB2YWx1ZWlkAHNldHVzZXJ2YWx1ZQBzZXRob29rAHNldGxvY2FsAHNldG1ldGF0YWJsZQBzZXR1cHZhbHVlAHRyYWNlYmFjawBzZXRjc3RhY2tsaW1pdABuaWwgb3IgdGFibGUAbGV2ZWwgb3V0IG9mIHJhbmdlAF9IT09LS0VZAGsAY291bnQAdGFpbCBjYWxsAGludmFsaWQgdXB2YWx1ZSBpbmRleABMdWEgZnVuY3Rpb24gZXhwZWN0ZWQAZmxuU3J0dQA+JXMAaW52YWxpZCBvcHRpb24Ac291cmNlAHNob3J0X3NyYwBsaW5lZGVmaW5lZABsYXN0bGluZWRlZmluZWQAd2hhdABjdXJyZW50bGluZQBudXBzAG5wYXJhbXMAaXN2YXJhcmcAbmFtZQBuYW1ld2hhdABmdHJhbnNmZXIAbnRyYW5zZmVyAGlzdGFpbGNhbGwAYWN0aXZlbGluZXMAZnVuYwBleHRlcm5hbCBob29rAGx1YV9kZWJ1Zz4gAGNvbnQKAD0oZGVidWcgY29tbWFuZCkAJXMKACh0ZW1wb3JhcnkpAChDIHRlbXBvcmFyeSkAKHZhcmFyZykAbWV0YW1ldGhvZABmb3IgaXRlcmF0b3IAb3JkZXIAaG9vawBpbnRlZ2VyIGluZGV4AGNvbnN0YW50AGZpZWxkAG1ldGhvZABnbG9iYWwAPVtDXQA9PwBtYWluAEx1YQBhdHRlbXB0IHRvICVzIGEgJXMgdmFsdWUlcwAlczolZDogJXMAICglcyAnJXMnKQBiYWQgJ2ZvcicgJXMgKG51bWJlciBleHBlY3RlZCwgZ290ICVzKQBjb25jYXRlbmF0ZQBudW1iZXIlcyBoYXMgbm8gaW50ZWdlciByZXByZXNlbnRhdGlvbgBhdHRlbXB0IHRvIGNvbXBhcmUgdHdvICVzIHZhbHVlcwBhdHRlbXB0IHRvIGNvbXBhcmUgJXMgd2l0aCAlcwBlcnJvciBpbiBlcnJvciBoYW5kbGluZwBzdGFjayBvdmVyZmxvdwBjYWxsAGNhbm5vdCByZXN1bWUgbm9uLXN1c3BlbmRlZCBjb3JvdXRpbmUAY2Fubm90IHJlc3VtZSBkZWFkIGNvcm91dGluZQBhdHRlbXB0IHRvIHlpZWxkIGFjcm9zcyBhIEMtY2FsbCBib3VuZGFyeQBhdHRlbXB0IHRvIHlpZWxkIGZyb20gb3V0c2lkZSBhIGNvcm91dGluZQBiaW5hcnkAdGV4dABhdHRlbXB0IHRvIGxvYWQgYSAlcyBjaHVuayAobW9kZSBpcyAnJXMnKQB2YXJpYWJsZSAnJXMnIGdvdCBhIG5vbi1jbG9zYWJsZSB2YWx1ZQBhdHRlbXB0IHRvIGNsb3NlIG5vbi1jbG9zYWJsZSB2YXJpYWJsZSAnJXMnAF9fY2xvc2UgbWV0YW1ldGhvZABfX2djIG1ldGFtZXRob2QAAQMDBAQFBl9HAHBhY2thZ2UAY29yb3V0aW5lAGlvAG9zAG1hdGgAdXRmOABkZWJ1ZwBfSU9faW5wdXQAc3RkaW4AX0lPX291dHB1dABzdGRvdXQAc3RkZXJyAEZJTEUqAGNhbm5vdCBjbG9zZSBzdGFuZGFyZCBmaWxlAHJlYWQAd3JpdGUAbGluZXMAZmx1c2gAc2VlawBzZXR2YnVmAG5vAGZ1bGwAbGluZQBhdHRlbXB0IHRvIHVzZSBhIGNsb3NlZCBmaWxlAGN1cgBub3QgYW4gaW50ZWdlciBpbiBwcm9wZXIgcmFuZ2UAc2V0AHRvbyBtYW55IGFyZ3VtZW50cwBmaWxlIGlzIGFscmVhZHkgY2xvc2VkAGludmFsaWQgZm9ybWF0ADAwAGVFAHBQAF9fdG9zdHJpbmcAZmlsZSAoY2xvc2VkKQBmaWxlICglcCkAaW5wdXQAb3BlbgBvdXRwdXQAcG9wZW4AdG1wZmlsZQBkZWZhdWx0ICVzIGZpbGUgaXMgY2xvc2VkAGNsb3NlZCBmaWxlAGZpbGUAaW52YWxpZCBtb2RlACdwb3Blbicgbm90IHN1cHBvcnRlZAB3AGNhbm5vdCBvcGVuIGZpbGUgJyVzJyAoJXMpAGIAX0VOVgBhbmQAZG8AZWxzZQBlbHNlaWYAZW5kAGZhbHNlAGZvcgBnb3RvAGlmAGluAGxvY2FsAG5vdABvcgByZXBlYXQAcmV0dXJuAHRoZW4AdHJ1ZQB1bnRpbAB3aGlsZQAvLwAuLgA9PQA+PQA8PQB+PQA8PAA+PgA6OgA8ZW9mPgA8bnVtYmVyPgA8aW50ZWdlcj4APG5hbWU+ADxzdHJpbmc+ACclYycAJzxcJWQ+JwAnJXMnACVzIG5lYXIgJXMAbGV4aWNhbCBlbGVtZW50IHRvbyBsb25nAGludmFsaWQgbG9uZyBzdHJpbmcgZGVsaW1pdGVyAHhYAEVlAFBwAC0rAG1hbGZvcm1lZCBudW1iZXIAdW5maW5pc2hlZCBzdHJpbmcAaW52YWxpZCBlc2NhcGUgc2VxdWVuY2UAZGVjaW1hbCBlc2NhcGUgdG9vIGxhcmdlAG1pc3NpbmcgJ3snAFVURi04IHZhbHVlIHRvbyBsYXJnZQBtaXNzaW5nICd9JwBoZXhhZGVjaW1hbCBkaWdpdCBleHBlY3RlZABjb21tZW50AHVuZmluaXNoZWQgbG9uZyAlcyAoc3RhcnRpbmcgYXQgbGluZSAlZCkAY2h1bmsgaGFzIHRvbyBtYW55IGxpbmVzAHBpAGh1Z2UAbWF4aW50ZWdlcgBtaW5pbnRlZ2VyAHJhbmRvbQByYW5kb21zZWVkAHdyb25nIG51bWJlciBvZiBhcmd1bWVudHMAaW50ZXJ2YWwgaXMgZW1wdHkAYWJzAGFjb3MAYXNpbgBhdGFuAGNlaWwAY29zAGRlZwBleHAAdG9pbnRlZ2VyAGZsb29yAGZtb2QAdWx0AGxvZwBtYXgAbW9kZgByYWQAc2luAHNxcnQAdGFuAHR5cGUAZmxvYXQAaW50ZWdlcgB2YWx1ZSBleHBlY3RlZAB6ZXJvAHRvbyBtYW55ICVzIChsaW1pdCBpcyAlZCkAbWVtb3J5IGFsbG9jYXRpb24gZXJyb3I6IGJsb2NrIHRvbyBiaWcAcGF0aABMVUFfUEFUSAAvdXNyL2xvY2FsL3NoYXJlL2x1YS81LjQvPy5sdWE7L3Vzci9sb2NhbC9zaGFyZS9sdWEvNS40Lz8vaW5pdC5sdWE7L3Vzci9sb2NhbC9saWIvbHVhLzUuNC8/Lmx1YTsvdXNyL2xvY2FsL2xpYi9sdWEvNS40Lz8vaW5pdC5sdWE7Li8/Lmx1YTsuLz8vaW5pdC5sdWEAY3BhdGgATFVBX0NQQVRIAC91c3IvbG9jYWwvbGliL2x1YS81LjQvPy5zbzsvdXNyL2xvY2FsL2xpYi9sdWEvNS40L2xvYWRhbGwuc287Li8/LnNvAC8KOwo/CiEKLQoAY29uZmlnAF9MT0FERUQAbG9hZGVkAF9QUkVMT0FEAHByZWxvYWQAcmVxdWlyZQBzZWFyY2hlcnMAJ3BhY2thZ2Uuc2VhcmNoZXJzJyBtdXN0IGJlIGEgdGFibGUACgkAbW9kdWxlICclcycgbm90IGZvdW5kOiVzACVzJXMAXzVfNAA7OwBMVUFfTk9FTlYAbm8gbW9kdWxlICclcycgaW4gZmlsZSAnJXMnAGVycm9yIGxvYWRpbmcgbW9kdWxlICclcycgZnJvbSBmaWxlICclcyc6CgklcwBfAGx1YW9wZW5fJXMAZHluYW1pYyBsaWJyYXJpZXMgbm90IGVuYWJsZWQ7IGNoZWNrIHlvdXIgTHVhIGluc3RhbGxhdGlvbgBfQ0xJQlMAJ3BhY2thZ2UuJXMnIG11c3QgYmUgYSBzdHJpbmcALwA/AG5vIGZpbGUgJwA7ACcKCW5vIGZpbGUgJwAnAHIAbm8gZmllbGQgcGFja2FnZS5wcmVsb2FkWyclcyddADpwcmVsb2FkOgBsb2FkbGliAHNlYXJjaHBhdGgAYWJzZW50AGluaXQALnhYbk4AJS4xNGcALTAxMjM0NTY3ODkAJXAAJQBpbnZhbGlkIG9wdGlvbiAnJSUlYycgdG8gJ2x1YV9wdXNoZnN0cmluZycALi4uAFtzdHJpbmcgIgAiXQBjbG9jawBkYXRlAGRpZmZ0aW1lAGV4ZWN1dGUAZXhpdABnZXRlbnYAcmVuYW1lAHNldGxvY2FsZQB0aW1lAHRtcG5hbWUAdW5hYmxlIHRvIGdlbmVyYXRlIGEgdW5pcXVlIGZpbGVuYW1lAHllYXIAbW9udGgAZGF5AGhvdXIAbWluAHNlYwB0aW1lIHJlc3VsdCBjYW5ub3QgYmUgcmVwcmVzZW50ZWQgaW4gdGhpcyBpbnN0YWxsYXRpb24AeWRheQB3ZGF5AGlzZHN0AGZpZWxkICclcycgaXMgbm90IGFuIGludGVnZXIAZmllbGQgJyVzJyBtaXNzaW5nIGluIGRhdGUgdGFibGUAZmllbGQgJyVzJyBpcyBvdXQtb2YtYm91bmQAYWxsAGNvbGxhdGUAY3R5cGUAbW9uZXRhcnkAbnVtZXJpYwB0aW1lIG91dC1vZi1ib3VuZHMAJWMAZGF0ZSByZXN1bHQgY2Fubm90IGJlIHJlcHJlc2VudGVkIGluIHRoaXMgaW5zdGFsbGF0aW9uACp0AGFBYkJjQ2REZUZnR2hISWptTW5wclJTdFR1VVZ3V3hYeVl6WiV8fEVjRUNFeEVYRXlFWU9kT2VPSE9JT21PTU9TT3VPVU9WT3dPV095AGludmFsaWQgY29udmVyc2lvbiBzcGVjaWZpZXIgJyUlJXMnAGJyZWFrAGJyZWFrIG91dHNpZGUgbG9vcCBhdCBsaW5lICVkAG5vIHZpc2libGUgbGFiZWwgJyVzJyBmb3IgPGdvdG8+IGF0IGxpbmUgJWQAPGdvdG8gJXM+IGF0IGxpbmUgJWQganVtcHMgaW50byB0aGUgc2NvcGUgb2YgbG9jYWwgJyVzJwBsYWJlbHMvZ290b3MAJXMgZXhwZWN0ZWQAc3ludGF4IGVycm9yAGNhbm5vdCB1c2UgJy4uLicgb3V0c2lkZSBhIHZhcmFyZyBmdW5jdGlvbgBzZWxmADxuYW1lPiBvciAnLi4uJyBleHBlY3RlZABsb2NhbCB2YXJpYWJsZXMAZnVuY3Rpb24gYXQgbGluZSAlZABtYWluIGZ1bmN0aW9uAHRvbyBtYW55ICVzIChsaW1pdCBpcyAlZCkgaW4gJXMAZnVuY3Rpb25zAGl0ZW1zIGluIGEgY29uc3RydWN0b3IAYXR0ZW1wdCB0byBhc3NpZ24gdG8gY29uc3QgdmFyaWFibGUgJyVzJwBmdW5jdGlvbiBhcmd1bWVudHMgZXhwZWN0ZWQAdW5leHBlY3RlZCBzeW1ib2wAbGFiZWwgJyVzJyBhbHJlYWR5IGRlZmluZWQgb24gbGluZSAlZABtdWx0aXBsZSB0by1iZS1jbG9zZWQgdmFyaWFibGVzIGluIGxvY2FsIGxpc3QAY29uc3QAY2xvc2UAdW5rbm93biBhdHRyaWJ1dGUgJyVzJwAnPScgb3IgJ2luJyBleHBlY3RlZAAoZm9yIHN0YXRlKQBjb250cm9sIHN0cnVjdHVyZSB0b28gbG9uZwAlcyBleHBlY3RlZCAodG8gY2xvc2UgJXMgYXQgbGluZSAlZCkAdXB2YWx1ZXMAQyBzdGFjayBvdmVyZmxvdwBlcnJvciBvYmplY3QgaXMgbm90IGEgc3RyaW5nAGVycm9yIGluIAAgKAApAG5vdCBlbm91Z2ggbWVtb3J5AGF0dGVtcHQgdG8gJXMgYSAnJXMnIHdpdGggYSAnJXMnAGJ5dGUAZHVtcABmaW5kAGZvcm1hdABnbWF0Y2gAZ3N1YgBsb3dlcgBtYXRjaAByZXAAcmV2ZXJzZQBzdWIAdXBwZXIAcGFja3NpemUAaW5pdGlhbCBwb3NpdGlvbiBvdXQgb2Ygc3RyaW5nAGRhdGEgc3RyaW5nIHRvbyBzaG9ydAB0b28gbWFueSByZXN1bHRzAHVuZmluaXNoZWQgc3RyaW5nIGZvciBmb3JtYXQgJ3onACVkLWJ5dGUgaW50ZWdlciBkb2VzIG5vdCBmaXQgaW50byBMdWEgSW50ZWdlcgBpbnZhbGlkIG5leHQgb3B0aW9uIGZvciBvcHRpb24gJ1gnAGZvcm1hdCBhc2tzIGZvciBhbGlnbm1lbnQgbm90IHBvd2VyIG9mIDIAbWlzc2luZyBzaXplIGZvciBmb3JtYXQgb3B0aW9uICdjJwBpbnZhbGlkIGZvcm1hdCBvcHRpb24gJyVjJwBpbnRlZ3JhbCBzaXplICglZCkgb3V0IG9mIGxpbWl0cyBbMSwlZF0AdmFyaWFibGUtbGVuZ3RoIGZvcm1hdABmb3JtYXQgcmVzdWx0IHRvbyBsYXJnZQB1bnNpZ25lZCBvdmVyZmxvdwBzdHJpbmcgbG9uZ2VyIHRoYW4gZ2l2ZW4gc2l6ZQBzdHJpbmcgbGVuZ3RoIGRvZXMgbm90IGZpdCBpbiBnaXZlbiBzaXplAHN0cmluZyBjb250YWlucyB6ZXJvcwByZXN1bHRpbmcgc3RyaW5nIHRvbyBsYXJnZQB0b28gbWFueSBjYXB0dXJlcwBpbnZhbGlkIGNhcHR1cmUgaW5kZXggJSUlZAB1bmZpbmlzaGVkIGNhcHR1cmUAcGF0dGVybiB0b28gY29tcGxleABtaXNzaW5nICdbJyBhZnRlciAnJSVmJyBpbiBwYXR0ZXJuAG1hbGZvcm1lZCBwYXR0ZXJuIChlbmRzIHdpdGggJyUlJykAbWFsZm9ybWVkIHBhdHRlcm4gKG1pc3NpbmcgJ10nKQBtYWxmb3JtZWQgcGF0dGVybiAobWlzc2luZyBhcmd1bWVudHMgdG8gJyUlYicpAGludmFsaWQgcGF0dGVybiBjYXB0dXJlAF4kKis/LihbJS0Ac3RyaW5nL2Z1bmN0aW9uL3RhYmxlAGludmFsaWQgcmVwbGFjZW1lbnQgdmFsdWUgKGEgJXMpAGludmFsaWQgdXNlIG9mICclYycgaW4gcmVwbGFjZW1lbnQgc3RyaW5nAGxsAHNwZWNpZmllciAnJSVxJyBjYW5ub3QgaGF2ZSBtb2RpZmllcnMAaW52YWxpZCBjb252ZXJzaW9uICclcycgdG8gJ2Zvcm1hdCcAMHglbGx4ACVsbGQAdmFsdWUgaGFzIG5vIGxpdGVyYWwgZm9ybQAlYQAxZTk5OTkALTFlOTk5OQAoMC8wKQAlcwBcJWQAXCUwM2QALSsgIzAAaW52YWxpZCBmb3JtYXQgKHJlcGVhdGVkIGZsYWdzKQBpbnZhbGlkIGZvcm1hdCAod2lkdGggb3IgcHJlY2lzaW9uIHRvbyBsb25nKQB1bmFibGUgdG8gZHVtcCBnaXZlbiBmdW5jdGlvbgBpbnZhbGlkIGtleSB0byAnbmV4dCcAdGFibGUgaW5kZXggaXMgbmlsAHRhYmxlIGluZGV4IGlzIE5hTgB0YWJsZSBvdmVyZmxvdwBjb25jYXQAaW5zZXJ0AHBhY2sAdW5wYWNrAHJlbW92ZQBtb3ZlAHNvcnQAYXJyYXkgdG9vIGJpZwBpbnZhbGlkIG9yZGVyIGZ1bmN0aW9uIGZvciBzb3J0aW5nAHRvbyBtYW55IGVsZW1lbnRzIHRvIG1vdmUAZGVzdGluYXRpb24gd3JhcCBhcm91bmQAdG9vIG1hbnkgcmVzdWx0cyB0byB1bnBhY2sAbgB3cm9uZyBudW1iZXIgb2YgYXJndW1lbnRzIHRvICdpbnNlcnQnAGludmFsaWQgdmFsdWUgKCVzKSBhdCBpbmRleCAlZCBpbiB0YWJsZSBmb3IgJ2NvbmNhdCcAbm8gdmFsdWUAbmlsAGJvb2xlYW4AdXNlcmRhdGEAbnVtYmVyAHN0cmluZwB0YWJsZQBmdW5jdGlvbgB0aHJlYWQAdXB2YWx1ZQBwcm90bwBfX2luZGV4AF9fbmV3aW5kZXgAX19nYwBfX21vZGUAX19sZW4AX19lcQBfX2FkZABfX3N1YgBfX211bABfX21vZABfX3BvdwBfX2RpdgBfX2lkaXYAX19iYW5kAF9fYm9yAF9fYnhvcgBfX3NobABfX3NocgBfX3VubQBfX2Jub3QAX19sdABfX2xlAF9fY29uY2F0AF9fY2FsbABfX2Nsb3NlAF9fbmFtZQBwZXJmb3JtIGJpdHdpc2Ugb3BlcmF0aW9uIG9uAHBlcmZvcm0gYXJpdGhtZXRpYyBvbgBiaW5hcnkgc3RyaW5nAHRydW5jYXRlZCBjaHVuawAlczogYmFkIGJpbmFyeSBmb3JtYXQgKCVzKQBiYWQgZm9ybWF0IGZvciBjb25zdGFudCBzdHJpbmcAaW50ZWdlciBvdmVyZmxvdwAbTHVhAG5vdCBhIGJpbmFyeSBjaHVuawB2ZXJzaW9uIG1pc21hdGNoAGZvcm1hdCBtaXNtYXRjaAAZkw0KGgoAY29ycnVwdGVkIGNodW5rAEluc3RydWN0aW9uAGx1YV9JbnRlZ2VyAGx1YV9OdW1iZXIAaW50ZWdlciBmb3JtYXQgbWlzbWF0Y2gAZmxvYXQgZm9ybWF0IG1pc21hdGNoACVzIHNpemUgbWlzbWF0Y2gAWwAtf8It/V1bgC2/XSoAY2hhcnBhdHRlcm4Ab2Zmc2V0AGNvZGVwb2ludABjaGFyAGxlbgBjb2RlcwBpbnZhbGlkIFVURi04IGNvZGUAaW5pdGlhbCBwb3NpdGlvbiBvdXQgb2YgYm91bmRzAGZpbmFsIHBvc2l0aW9uIG91dCBvZiBib3VuZHMAdmFsdWUgb3V0IG9mIHJhbmdlACVVAG91dCBvZiBib3VuZHMAc3RyaW5nIHNsaWNlIHRvbyBsb25nAHBvc2l0aW9uIG91dCBvZiBib3VuZHMAaW5pdGlhbCBwb3NpdGlvbiBpcyBhIGNvbnRpbnVhdGlvbiBieXRlAGluZGV4ACdfX2luZGV4JyBjaGFpbiB0b28gbG9uZzsgcG9zc2libGUgbG9vcAAnX19uZXdpbmRleCcgY2hhaW4gdG9vIGxvbmc7IHBvc3NpYmxlIGxvb3AAc3RyaW5nIGxlbmd0aCBvdmVyZmxvdwBnZXQgbGVuZ3RoIG9mAGF0dGVtcHQgdG8gZGl2aWRlIGJ5IHplcm8AYXR0ZW1wdCB0byBwZXJmb3JtICduJSUwJwAnZm9yJyBzdGVwIGlzIHplcm8AbGltaXQAc3RlcABpbml0aWFsIHZhbHVlAGxvYWQAV0FMVUFfQ09NUElMRQBXQUxVQV9TVEVQAC0rICAgMFgweAAobnVsbCkALTBYKzBYIDBYLTB4KzB4IDB4AGluZgBJTkYATkFOAGluZmluaXR5AG5hbgBMQ19BTEwATEFORwBDLlVURi04AFBPU0lYAE1VU0xfTE9DUEFUSAAuAEMAcndhAHcrAKqCAQRuYW1lAaGCAYkJAAdfZ2V0ZW52AQlfX191bmxvY2sCDV9fX3N5c2NhbGwyMjEDBWFib3J0BAVfdGltZQULc2V0VGVtcFJldDAGC2dldFRlbXBSZXQwBwhfbG9uZ2ptcAgLX19fc3lzY2FsbDYJB19fX2xvY2sKB2Y2NC1yZW0LBl9jbG9jawwMX19fc3lzY2FsbDU0DQtfX19zeXNjYWxsNQ4NX19fc3lzY2FsbDE0Ng8MX19fc3lzY2FsbDEwEAtfX19zZXRFcnJObxEKaW52b2tlX3ZpaRIXYWJvcnRPbkNhbm5vdEdyb3dNZW1vcnkTB19zeXN0ZW0UCV9zdHJmdGltZRUHX21rdGltZRYKX2xvY2FsdGltZRcOX2xsdm1fbG9nMl9mNjQYD19sbHZtX2xvZzEwX2Y2NBkHX2dtdGltZRoFX2V4aXQbF19lbXNjcmlwdGVuX3Jlc2l6ZV9oZWFwHBZfZW1zY3JpcHRlbl9tZW1jcHlfYmlnHRlfZW1zY3JpcHRlbl9nZXRfaGVhcF9zaXplHglfZGlmZnRpbWUfBl9hYm9ydCAMX19fc3lzY2FsbDkxIQxfX19zeXNjYWxsNjMiDF9fX3N5c2NhbGw0MCMMX19fc3lzY2FsbDM4JA1fX19zeXNjYWxsMzMwJQ1fX19zeXNjYWxsMTk2Jg1fX19zeXNjYWxsMTQ1Jw1fX19zeXNjYWxsMTQwKAtfX19tYXBfZmlsZSkQX19fY2xvY2tfZ2V0dGltZSoTX19fYnVpbGRFbnZpcm9ubWVudCsLX2x1YV9zZXR0b3AsAmIwLQ9fbHVhR190cmFjZWV4ZWMuC19sdWFMX2Vycm9yLwlfbHVhX3R5cGUwD19sdWFfcHVzaHN0cmluZzEOX2x1YUxfYXJnZXJyb3IyEl9sdWFMX2NoZWNrbHN0cmluZzMOX2x1YV9wdXNodmFsdWU0EF9sdWFfcHVzaGludGVnZXI1Cl9sdWFaX2ZpbGw2DF9pbmRleDJ2YWx1ZTcNX2x1YV9zZXRmaWVsZDgSX2x1YUxfY2hlY2tpbnRlZ2VyOQdfc3RyY2hyOgxfbHVhX3B1c2huaWw7Dl9sdWFLX2NvZGVBQkNrPA5fbHVhX3RvbHN0cmluZz0QX2x1YUxfb3B0aW50ZWdlcj4RX3JlYWxseW1hcmtvYmplY3Q/Cl9sdWFYX25leHRAB19tZW1jcHlBEl9sdWFMX3ByZXBidWZmc2l6ZUILX2x1YV9yb3RhdGVDC19sdWFNX2ZyZWVfRAVfc2F2ZUUQX2x1YV9wdXNoZnN0cmluZ0YLX2x1YV9nZXR0b3BHEF9sdWFfcHVzaGJvb2xlYW5IDV9sdWFfZ2V0ZmllbGRJEV9sdWFWX3RvaW50ZWdlcm5zSg5fbHVhR19ydW5lcnJvcksKX2x1YUNfc3RlcEwPX2x1YV9wdXNobnVtYmVyTQdfc3RybGVuThFfbHVhTF9jaGVja251bWJlck8RX2x1YU9fcHVzaGZzdHJpbmdQDl9sdWFDX2JhcnJpZXJfUQlfX19zaGdldGNSCV9sdWFfZ2V0aVMEX291dFQOX2x1YUxfY2hlY2thbnlVEF9sdWFLX2V4cDJhbnlyZWdWCV90ZXN0bmV4dFcIX3BhZF82NjlYEF9sdWFfY3JlYXRldGFibGVZB19zdHJjbXBaDl9sdWFfdG9ib29sZWFuWxBfbHVhTF9wdXNocmVzdWx0XBBfbHVhTF9vcHRsc3RyaW5nXQ5fbHVhTF9idWZmaW5pdF4MX2x1YUhfZ2V0aW50XwhfZHVtcEludGANX2x1YVNfbmV3bHN0cmEOX2x1YUxfc2V0ZnVuY3NiD19sdWFMX2NoZWNrdHlwZWMLX2x1YURfdGhyb3dkD19sdWFfdG9pbnRlZ2VyeGUKX2x1YV9jYWxsa2YQX2x1YUxfYWRkbHN0cmluZ2cJX3NucHJpbnRmaA1fbmV3X2xvY2FsdmFyaRFfbHVhWF9zeW50YXhlcnJvcmoIX2xvYWRJbnRrCV9pbml0X2V4cGwKX2NoZWNrbmV4dG0NX2x1YU1fbWFsbG9jX24QX2x1YUxfZmlsZXJlc3VsdG8SX2x1YUNfYmFycmllcmJhY2tfcAdfZmZsdXNocQlfZHVtcEJ5dGVyEV9sdWFLX2V4cDJuZXh0cmVncwlfbG9hZEJ5dGV0Dl9fX3N5c2NhbGxfcmV0dQpfbHVhX3htb3Zldg9fbHVhWF9uZXdzdHJpbmd3Dl9sdWFMX2FkZHZhbHVleAtfbHVhRl9jbG9zZXkMX2xpbmtnY2xpc3Rfeg5fc3RyX2NoZWNrbmFtZXsHX3NjYWxibnwHX21lbWNocn0QX2x1YV9wdXNobHN0cmluZ34RX2x1YV9wdXNoY2Nsb3N1cmV/Dl9sdWFfaXNpbnRlZ2VygAENX2x1YV9nZXRzdGFja4EBD19sdWFMX2FkZHN0cmluZ4IBEV9sdWFLX3Jlc2VydmVyZWdzgwEKX2x1YUtfanVtcIQBE19sdWFLX2Rpc2NoYXJnZXZhcnOFAQ9fbHVhSF9yZWFsYXNpemWGAQ9fbHVhRF9ncm93c3RhY2uHARBfZ2V0bG9jYWx2YXJkZXNjiAEIX2ZyZWVleHCJAQZfZXJyb3KKAQxfY2hlY2tfbmV4dDGLAQdfdG9maWxljAEGX21hdGNojQEJX2x1YV9zZXRpjgEPX2x1YVlfbnZhcnN0YWNrjwESX2x1YVZfZmx0dG9pbnRlZ2VykAEQX2x1YVRfZ2V0dG1ieW9iapEBCV9sdWFTX25ld5IBDl9sdWFNX2dyb3dhdXhfkwETX2x1YUxfY2hlY2t2ZXJzaW9uX5QBEV9sdWFIX2dldHNob3J0c3RylQEKX2x1YURfY2FsbJYBCV9sZXhlcnJvcpcBC19sZWF2ZWJsb2NrmAEFX2V4cHKZAQtfZW50ZXJibG9ja5oBCl9kdW1wQmxvY2ubAQZfZGlnaXScAQxfY2hlY2tfbWF0Y2idAQtfc3RhY2tsZXZlbJ4BCV9zZXRmaWVsZJ8BB19tZW1zZXSgAQ1fbHVhX3R5cGVuYW1loQEPX2x1YV90b3VzZXJkYXRhogEHX2x1YV9nY6MBD19sdWFWX2ZpbmlzaGdldKQBC19sdWFUX2dldHRtpQEMX2x1YU1fdG9vYmlnpgEQX2x1YUxfY2hlY2tzdGFja6cBEV9sdWFLX3BhdGNodG9oZXJlqAENX2x1YUtfZml4bGluZakBDF9sdWFDX25ld29iaqoBBV9nZXRjqwEGX2FyaXRorAEQX2FkanVzdGxvY2FsdmFyc60BAmI0rgEKX3RvbnVtZXJhbK8BBl9zd2FwY7ABCl9zb3J0X2NvbXCxAQlfc2V0dGFic2myAQVfc2Jya7MBB19tZW1jbXC0AQdfbWFsbG9jtQERX2x1YV9zZXRtZXRhdGFibGW2AQlfbHVhX2NvcHm3ARNfbHVhTV9zaHJpbmt2ZWN0b3JfuAEPX2x1YUxfdHlwZWVycm9yuQESX2x1YUxfZ2V0bWV0YWZpZWxkugEQX2x1YUxfY2hlY2t1ZGF0YbsBDl9sdWFLX2dldGxhYmVsvAEJX2x1YUhfZ2V0vQERX2x1YURfc2V0ZXJyb3JvYmq+AQ1fbHVhRF9wb3NjYWxsvwERX2x1YURfY2FsbG5veWllbGTAARFfbHVhQ19ydW50aWxzdGF0ZcEBCl9sb2FkQmxvY2vCAQhfZnJlZXJlZ8MBAmIyxAEGX3Rlc3QyxQEJX3N3YXBleHBzxgEFX3NldDLHAQxfbHVhX3Jhd2dldGnIAQ9fbHVhVl90b251bWJlcl/JAQxfbHVhVl9zaGlmdGzKAQ9fbHVhVl9maW5pc2hzZXTLAQ5fbHVhVF90cnliaW5UTcwBCV9sdWFMX2xlbs0BDl9sdWFLX3NlbWVycm9yzgEPX2x1YUtfcGF0Y2hsaXN0zwEMX2x1YUtfY29uY2F00AEKX2x1YUtfY29kZdEBCV9sdWFIX25ld9IBD19sdWFHX3R5cGVlcnJvctMBDV9sdWFFX3dhcm5pbmfUAQ1fbHVhRV9zZXRkZWJ01QEKX2dldHRocmVhZNYBCV9nZXRmaWVsZNcBBV9mcmVl2AEGX2ZtdF912QEHX2ZjbG9zZdoBCV9lc2NjaGVja9sBCV9jaGVja3RhYtwBDF9hZGRzdHIyYnVmZt0BBV9hZGRr3gELX3VfcG9zcmVsYXTfAQlfc3dlZXBnZW7gAQlfc3RhdGxpc3ThAQ1fcHJvcGFnYXRlYWxs4gEKX3Bvc3JlbGF0SeMBC19sdWFfcmF3Z2V05AESX2x1YV9uZXd1c2VyZGF0YXV25QENX2x1YV9pc3N0cmluZ+YBEV9sdWFfZ2V0bWV0YXRhYmxl5wEMX2x1YV9nZXRpbmZv6AEKX2x1YV9lcnJvcukBD19sdWFfY2hlY2tzdGFja+oBDl9sdWFWX2VxdWFsb2Jq6wESX2x1YU1fc2FmZXJlYWxsb2Nf7AEPX2x1YUxfdG9sc3RyaW5n7QEUX2x1YUxfcHVzaHJlc3VsdHNpemXuARFfbHVhTF9nZXRzdWJ0YWJsZe8BEl9sdWFMX2J1ZmZpbml0c2l6ZfABDF9sdWFLX2V4cDJSS/EBDV9sdWFLX2NvZGVBQnjyAQxfbHVhSF9zZXRpbnTzAQlfbHVhSF9zZXT0AQxfbHVhSF9yZXNpemX1ARFfbHVhR19nZXRmdW5jbGluZfYBEF9sdWFFX2VudGVyQ2NhbGz3ARVfbHVhRF9yYXdydW5wcm90ZWN0ZWT4AQpfbHVhRF9ob29r+QEKX2lzY2xlYXJlZPoBDl9pbmNsaW5lbnVtYmVy+wEJX2dldHRhYmxl/AEKX2dldGdjbGlzdP0BBl9mcHV0c/4BBl9mb3Blbv8BEF9maW5pc2hiaW5leHB2YWyAAghfZXhwbGlzdIECC19kdW1wU3RyaW5nggIJX2NvZGVBQlJLgwIJX2NsZWFya2V5hAILX2NoZWNrc3RhY2uFAg1fYmxvY2tfZm9sbG93hgIGX19fc2luhwIGX19fY29ziAIKX3RhZ19lcnJvcokCDF90YWJsZXJlaGFzaIoCB19zdHJzcG6LAglfc2V0dGFic3OMAglfc2V0cGF1c2WNAg1fcmVzdW1lX2Vycm9yjgIOX3B1c2hfY2FwdHVyZXOPAg1fcHJlcGJ1ZmZzaXplkAIOX2x1YV90b251bWJlcniRAg9fbHVhX3B1c2h0aHJlYWSSAgtfbHVhX2NvbmNhdJMCDF9sdWFfY29tcGFyZZQCD19sdWFYX3Rva2VuMnN0cpUCDF9sdWFWX2NvbmNhdJYCEV9sdWFUX29ianR5cGVuYW1llwISX2x1YVRfY2FsbG9yZGVyaVRNmAIPX2x1YVRfY2FsbFRNcmVzmQIOX2x1YU9fdG9zdHJpbmeaAhJfbHVhT19wdXNodmZzdHJpbmebAg5fbHVhTV9yZWFsbG9jX5wCEV9sdWFMX2NoZWNrb3B0aW9unQIOX2x1YUtfc3RvcmV2YXKeAhBfbHVhS19zZXRyZXR1cm5znwINX2x1YUtfaW5kZXhlZKACDl9sdWFHX2ZvcmVycm9yoQIOX2x1YUZfbmV3cHJvdG+iAhJfbHVhRl9nZXRsb2NhbG5hbWWjAgtfbHVhRF9wY2FsbKQCDF9sdWFEX2luY3RvcKUCCV9sdWFDX2ZpeKYCDF9sb2FkU3RyaW5nTqcCCF9pc2FsbnVtqAILX2lzU0NudW1iZXKpAgtfZ2V0b2JqbmFtZaoCDF9nZXRudW1saW1pdKsCCF9nZXRqdW1wrAIGX2dldGNvrQIIX2ZyZWVvYmquAghfZnByaW50Zq8CCF9maXhqdW1wsAIGX2ZpdHNDsQIKX2N1cnJlbnRwY7ICEF9jb3JyZWN0Z3JheWxpc3SzAglfY29uZGp1bXC0AgtfY29kZXN0cmluZ7UCDl9jb2RlYmluZXhwdmFstgIOX2NsZWFyYnl2YWx1ZXO3Ag1fY2hlY2twb2ludGVyuAIGX2Jsb2NruQIHX2F0b21pY7oCCF9fX3VmbG93uwIMX19fc3RyY2hybnVsvAIKX3doaXRlbGlzdL0CDF91dGY4X2RlY29kZb4CCl91cHZhbG5hbWW/Agpfc3dlZXBzdGVwwAIKX3N3ZWVwMm9sZMECDF9zdWZmaXhlZGV4cMICCF9zdWJleHBywwIHX3N0cnN0csQCCV9zdHJlcnJvcsUCB19zdHJjcHnGAglfc2tpcF9zZXDHAg1fc2luZ2xldmFyYXV4yAIMX3NpbmdsZW1hdGNoyQINX3NldG1pbm9yZGVidMoCCF9yZXZlcnNlywIKX3Jlc2l6ZWJveMwCDF9yZXByZXBzdGF0Zc0CC19yZWFkZGlnaXRzzgIKX3JlYWRfbGluZc8CC19wdXNobnVtaW500AIMX3ByaW50Zl9jb3Jl0QIKX3ByZXBzdGF0ZdICEl9wcmVwY2xvc2luZ21ldGhvZNMCBF9wb3fUAg1fcGF0Y2hsaXN0YXV41QIIX3BhY2tpbnTWAglfbmV4dHJhbmTXAgtfbmV3cHJlZmlsZdgCDV9uZXdnb3RvZW50cnnZAghfbmV3ZmlsZdoCEl9tYXRjaGJyYWNrZXRjbGFzc9sCCl9tYXJrdXB2YWzcAghfbWFya29sZN0CDV9sdWFfdG90aHJlYWTeAhNfbHVhX3N0cmluZ3RvbnVtYmVy3wIMX2x1YV9yYXdzZXRp4AILX2x1YV9yYXdsZW7hAg1fbHVhX3Jhd2VxdWFs4gILX2x1YV9wY2FsbGvjAglfbHVhX25leHTkAglfbHVhX2xvYWTlAg5fbHVhX2dldGdsb2JhbOYCDV9sdWFfYWJzaW5kZXjnAgpfbHVhVl9tb2Rm6AIJX2x1YVZfbW9k6QIKX2x1YVZfaWRpduoCDV9sdWFWX2V4ZWN1dGXrAhFfbHVhVF9jYWxsb3JkZXJUTewCCl9sdWFTX2hhc2jtAhVfbHVhU19jcmVhdGVsbmdzdHJvYmruAg1fbHVhT19zdHIybnVt7wIPX2x1YU9faGV4YXZhbHVl8AIOX2x1YU9fY2VpbGxvZzLxAgtfbHVhTF93aGVyZfICD19sdWFMX2xvYWRmaWxlePMCDV9sdWFMX2FkZGdzdWL0Ag1fbHVhS19zZXRsaXN09QIMX2x1YUtfaXNLaW509gIOX2x1YUtfZ29pZnRydWX3AgtfbHVhS19jb2Rla/gCDF9sdWFIX25ld2tlefkCDF9sdWFIX2dldHN0cvoCD19sdWFHX2ZpbmRsb2NhbPsCEV9sdWFGX25ld3RiY3VwdmFs/AIRX2x1YUZfbmV3TGNsb3N1cmX9AgxfbHVhRV9mcmVlQ0n+AhFfbHVhRF9zaHJpbmtzdGFja/8CEl9sdWFEX3JlYWxsb2NzdGFja4ADDF9sdWFDX2Z1bGxnY4EDEF9sdWFDX2NoYW5nZW1vZGWCAwxfbG9va2ZvcmZ1bmODAwRfbG9nhAMMX2xfY2hlY2t0aW1lhQMGX2tuYW1lhgMIX2lzc3BhY2WHAwhfaXNsb3dlcogDCF9pc1NDaW50iQMLX2luaXRoZWFkZXKKAwxfaW5kZXgyc3RhY2uLAwRfZ3hmjAMMX2dldHVwdmFscmVmjQMPX2dldGp1bXBjb250cm9sjgMKX2dldGlvZmlsZY8DCF9nZXRoZXhhkAMLX2dldGdlbmVyaWORAwtfZ2V0ZGV0YWlsc5IDCF9nZXRidWZmkwMIX2dlbmxpbmuUAwdfZ19yZWFklQMHX2Z3cml0ZZYDBl9mcmV4cJcDCV9mcmVlaGFzaJgDCV9mcmVlZXhwc5kDBl9mcmVhZJoDDF9maW5pc2hwY2FsbJsDCl9maW5kbGFiZWycAwlfZmluZGZpbGWdAwlfZmllbGRzZWyeAwtfZmNoZWNrc2l6ZZ8DCF9leHAycmVnoAMFX2V4cDGhAxFfZXhjaGFuZ2VoYXNocGFydKIDCF9lcnJmaWxlowMLX2VudGVyc3dlZXCkAwlfZW50ZXJpbmOlAwlfZHVtcFNpemWmAwtfZGVsZXRlbGlzdKcDDl9jcmVhdGVzdGRmaWxlqAMJX2NvZGVuYW1lqQMJX2NvZGViaW5pqgMKX2NsZWFyYnVmZqsDC19jaGVja3VwdmFsrAMKX2NoZWNrbG9hZK0DC19jaGVja2xpbWl0rgMLX2NoZWNrZmllbGSvAwxfY2hlY2tfbmV4dDKwAwZfY2hlY2uxAwpfY2FsbGNsb3NlsgMKX2NhbGxiaW5UTbMDBV9ib2R5tAMIX2F1eHNvcnS1AwpfYXV4X2xpbmVztgMKX2F1eF9jbG9zZbcDDl9hZGp1c3RfYXNzaWduuAMMX2FkZG51bTJidWZmuQMKX2FkZGxlbm1vZLoDCV9fX3RvcmVhZLsDCF9fX3NobGltvAMLX19fcmVtX3BpbzK9AwtfX19vZmxfbG9ja74DEl9fX2ZmbHVzaF91bmxvY2tlZL8DAmIzwAMHX3lpbmRleMEDB193Y3RvbWLCAwlfdmZwcmludGbDAwhfdmFyaW5mb8QDCV92YXJlcnJvcsUDB191bnJvbGzGAwpfdW5wYWNraW50xwMHX3VuZ2V0Y8gDCV90cnlhZ2FpbskDEV90cmVhdHN0YWNrb3B0aW9uygMSX3RyYXZlcnNlZXBoZW1lcm9uywMLX3RvdXNlcmRhdGHMAwhfdG91cHBlcs0DDV90b3N0cmluZ2J1ZmbOAwZfdG9udW3PAwhfdG9sb3dlctADEF90ZXN0X3RoZW5fYmxvY2vRAwtfdGVzdFNldGptcNIDDF9zd2VlcHRvbGl2ZdMDCl9zd2VlcGxpc3TUAwhfc3RycGJya9UDCF9zdHJpbmdL1gMIX3N0cmNvbGzXAw1fc3RyX2ZpbmRfYXV42AMGX3N0cjJL2QMKX3N0YXRlbWVudNoDDl9zdGFydF9jYXB0dXJl2wMLX3N0YWNrX2luaXTcAwxfc2tpcGNvbW1lbnTdAwpfc2luZ2xldmFy3gMLX3NpbmdsZXN0ZXDfAwpfc2V0dmFyYXJn4AMJX3NldHRhYnNi4QMIX3NldHNlZWTiAwhfc2V0cGF0aOMDDl9zZXRub2RldmVjdG9y5AMXX3NldGxvY2FsZV9vbmVfdW5sb2NrZWTlAw9fc2V0bGltaXR0b3NpemXmAw1fc2V0YWxsZmllbGRz5wMQX3NlcGFyYXRldG9iZWZueugDC19zZWFyY2hwYXRo6QMIX3NjYW5leHDqAwhfc2NhbGJubOsDDV9zYXZlbGluZWluZm/sAwtfc2F2ZVNldGptcO0DBV9yb3Rs7gMGX3JuYW1l7wMLX3Jlc3Rhc3NpZ27wAw1fcmVtb3ZldmFsdWVz8QMTX3JlbW92ZWxhc3RsaW5laW5mb/IDCV9yZWNmaWVsZPMDCF9yZWFsbG9j9AMNX3JlYWRfbnVtZXJhbPUDEV9yZWFkX2xvbmdfc3RyaW5n9gMJX3JhbmRzZWVk9wMMX3B1c2h1dGZjaGFy+AMIX3B1c2hzdHL5AwlfcHVzaG1vZGX6AxNfcHVzaGdsb2JhbGZ1bmNuYW1l+wMQX3B1c2hfb25lY2FwdHVyZfwDDl9wcm9wYWdhdGVtYXJr/QMUX3ByZXZpb3VzaW5zdHJ1Y3Rpb27+Aw9fcHJlaW5pdF90aHJlYWT/AwhfcG9wX2FyZ4AEDV9wYXRjaHRlc3RyZWeBBApfb3BlbmNoZWNrggQKX29wZW5fZnVuY4MECV9udW1hcml0aIQEBl9uZXh0Y4UECV9uZXd1cHZhbIYEDl9uZXdsYWJlbGVudHJ5hwQQX25lZ2F0ZWNvbmRpdGlvbogEC19uZWVkX3ZhbHVliQQMX21hdGNoX2NsYXNzigQHX21hcmttdIsEDV9tYXJrYmVpbmdmbnqMBA9fbWFpbnBvc2l0aW9uVFaNBA1fbWFpbnBvc2l0aW9ujgQMX2x1YV93YXJuaW5njwQOX2x1YV90b3BvaW50ZXKQBA9fbHVhX3NldHVwdmFsdWWRBBBfbHVhX3Jlc2V0dGhyZWFkkgQLX2x1YV9yYXdzZXSTBA1fbHVhX25ld3N0YXRllAQQX2x1YV9pc2NmdW5jdGlvbpUED19sdWFfZ2V0dXB2YWx1ZZYEDV9sdWFfZ2V0bG9jYWyXBA9fbHVhWF9sb29rYWhlYWSYBA9fbHVhVl90b2ludGVnZXKZBAxfbHVhVl9vYmpsZW6aBBNfbHVhVF90cnliaW5hc3NvY1RNmwQMX2x1YVNfcmVzaXplnAQOX2x1YVNfZXFsbmdzdHKdBA1fbHVhT191dGY4ZXNjngQOX2x1YU9fcmF3YXJpdGifBA1fbHVhT19jaHVua2lkoAQPX2x1YUxfdGVzdHVkYXRhoQQSX2x1YUxfbmV3bWV0YXRhYmxlogQRX2x1YUxfbG9hZGJ1ZmZlcnijBApfbHVhTF9nc3VipAQQX2x1YUxfZXhlY3Jlc3VsdKUED19sdWFLX3NldG9uZXJldKYECV9sdWFLX3JldKcEDV9sdWFLX251bWJlckuoBAlfbHVhS19uaWypBApfbHVhS19pbnRLqgQJX2x1YUtfaW50qwQPX2x1YUtfZ29pZmZhbHNlrAQSX2x1YUtfZXhwMmFueXJlZ3VwrQQLX2x1YUtfZXhwMkuuBA5fbHVhS19jb2RlQXNCeK8EEF9sdWFLX2NoZWNrc3RhY2uwBApfbHVhSF9nZXRusQQQX2x1YUdfb3BpbnRlcnJvcrIEDl9sdWFHX2Vycm9ybXNnswQNX2x1YUdfYWRkaW5mb7QEEV9sdWFGX3VubGlua3VwdmFstQQPX2x1YUVfd2FybmVycm9ytgQOX2x1YUVfZXh0ZW5kQ0m3BA9fbHVhRF90cnlmdW5jVE24BA5fbHVhRF9ob29rY2FsbLkEFF9sdWFDX2NoZWNrZmluYWxpemVyugQLX2x1YUJfZXJyb3K7BA5fbHVhQl9jb2NyZWF0ZbwED19sb2NhbGRlYnVnaW5mb70ECV9sb2FkZnVuY74ECV9sb2FkX2F1eL8EDV9sb2FkVW5zaWduZWTABAtfbG9hZE51bWJlcsEEDF9sb2FkSW50ZWdlcsIEDV9sb2FkRnVuY3Rpb27DBAVfbGxleMQECl9saXN0ZmllbGTFBA9fbGVzc3RoYW5vdGhlcnPGBBBfbGVzc2VxdWFsb3RoZXJzxwQJX2xfc3RydG9uyAQJX2xfc3RyY21wyQQLX2xfc3RyMmRsb2PKBAtfanVtcG9uY29uZMsECV9pdGVyX2F1eMwECV9pc3hkaWdpdM0ECF9pc3VwcGVyzgQQX2lzcG93MnJlYWxhc2l6Zc8ECF9pc2dyYXBo0AQIX2lzY250cmzRBAhfaXNhbHBoYdIEB19pc0tzdHLTBAlfaW50YXJpdGjUBApfZ2V0b3B0aW9u1QQHX2dldG51bdYEEF9nZXRuZXh0ZmlsZW5hbWXXBAdfZ2V0aW502AQKX2dldGVuZHBvc9kED19nZXRjdXJyZW50bGluZdoED19nZXRfb25lY2FwdHVyZdsECF9nX3dyaXRl3AQJX2dfaW9maWxl3QQJX2Z1bmNhcmdz3gQIX2Z1bGxnZW7fBApfZnJlZXN0YWNr4AQJX2ZyZWVyZWdz4QQGX2ZwdXRj4gQIX2ZvcmJvZHnjBAZfZm1vZGzkBAtfZml4Zm9yanVtcOUEB19maXRzQnjmBA1fZmluaXNocmF3Z2V05wQPX2ZpbmlzaGdlbmN5Y2xl6AQQX2ZpbmlzaGJpbmV4cG5lZ+kEDF9maW5pc2hDY2FsbOoECl9maW5kZmllbGTrBAZfZmdldHPsBAdfZmVycm9y7QQIX2ZfY2xvc2XuBA9fZXJyb3JfZXhwZWN0ZWTvBAlfZXF1YWxrZXnwBAlfZW50ZXJnZW7xBAtfZHVtcE51bWJlcvIEDF9kdW1wSW50ZWdlcvMEDV9kdW1wRnVuY3Rpb270BAtfZG9maWxlY29udPUEDl9kaXNwb3NlX2NodW5r9gQOX2Rpc2NoYXJnZTJyZWf3BBFfZGlzY2hhcmdlMmFueXJlZ/gEDV9jcmVhdGVzdHJvYmr5BAxfY3JlYXRlbGFiZWz6BAlfY291bnRpbnT7BA9fY29weXdpdGhlbmRpYW78BApfY29weXNpZ25s/QQKX2NvcHkyYnVmZv4EE19jb252ZXJnZWVwaGVtZXJvbnP/BAxfY29uc3RydWN0b3KABQ1fY29uc3Rmb2xkaW5ngQUKX2NvbnN0MnZhbIIFBV9jb25kgwUKX2NvZGVvcmRlcoQFDV9jb2RlZXh0cmFhcmeFBQpfY29kZWFyaXRohgUOX2NvZGVfbG9hZGJvb2yHBQxfY2xvc2Vfc3RhdGWIBQtfY2xvc2VfZnVuY4kFD19jbGVhcmdyYXlsaXN0c4oFDF9jbGVhcmJ5a2V5c4sFCV9jbGFzc2VuZIwFCl9jaGVja21vZGWNBQ1fY2hlY2tsaXRlcmFsjgULX2NoZWNrU2l6ZXOPBRlfY2FsbGFsbHBlbmRpbmdmaW5hbGl6ZXJzkAUKX2JpbnNlYXJjaJEFC19hdXh1cHZhbHVlkgUKX2F1eHN0YXR1c5MFCl9hdXhzZXRzdHKUBQpfYXV4cmVzdW1llQUKX2F1eGdldHN0cpYFDF9hdXhfdXB2YWx1ZZcFC19hdG9taWMyZ2VumAUFX2F0YW6ZBQtfYXJyYXlpbmRleJoFDV9hbGxvY3VwdmFsdWWbBQlfYWRkZmllbGScBQpfX190b3dyaXRlnQUGX19fdGFungUOX19fc3RkaW9fd3JpdGWfBQtfX19yYW5kbmFtZaAFC19fX292ZXJmbG93oQUKX19fZndyaXRleKIFDV9fX2Ztb2RlZmxhZ3OjBQlfX19mZG9wZW6kBQZfTFRudW2lBQZfTEVudW2mBQVfR0NUTacFCXN0YWNrU2F2ZagFDHN0YWNrUmVzdG9yZakFCnN0YWNrQWxsb2OqBQtkeW5DYWxsX3ZpaasFAmI1rAUCYjGtBRBfeW91bmdjb2xsZWN0aW9urgUHX3dyaXRlcq8FCl93aGlsZXN0YXSwBQhfd2NydG9tYrEFBl93YXJuZrIFCl92c25wcmludGazBQhfdmFsaWRvcLQFB191dGZsZW61BQhfdXRmY2hhcrYFCF91dGY4ZXNjtwULX3VubWFrZW1hc2u4BQpfdW5kZWZnb3RvuQUPX3VkYXRhMmZpbmFsaXplugUJX3R4dFRva2VuuwUOX3R3b3dheV9zdHJzdHK8BQ9fdHdvYnl0ZV9zdHJzdHK9BQhfdHVucGFja74FD190cnluZXd0YmN1cHZhbL8FBl90cnltdMAFEl90cnlfcmVhbGxvY19jaHVua8EFCF90cmVtb3ZlwgUSX3RyYXZlcnNld2Vha3ZhbHVlwwUOX3RyYXZlcnNldWRhdGHEBQ9fdHJhdmVyc2V0aHJlYWTFBQ5fdHJhdmVyc2V0YWJsZcYFFF90cmF2ZXJzZXN0cm9uZ3RhYmxlxwUOX3RyYXZlcnNlcHJvdG/IBRFfdHJhdmVyc2VMY2xvc3VyZckFEV90cmF2ZXJzZUNjbG9zdXJlygUGX3RwYWNrywUHX3RtcG5hbcwFCF90bXBmaWxlzQUGX3Rtb3ZlzgUIX3RpbnNlcnTPBRFfdGhyZWVieXRlX3N0cnN0ctAFCF90Y29uY2F00QUEX3RhbtIFB19zdHJ0b3jTBQhfc3RybmNtcNQFCF9zdHJjc3Bu1QUKX3N0cl91cHBlctYFC19zdHJfdW5wYWNr1wUIX3N0cl9zdWLYBQxfc3RyX3JldmVyc2XZBQhfc3RyX3JlcNoFDV9zdHJfcGFja3NpemXbBQlfc3RyX3BhY2vcBQpfc3RyX21hdGNo3QUKX3N0cl9sb3dlct4FCF9zdHJfbGVu3wUJX3N0cl9nc3Vi4AULX3N0cl9mb3JtYXThBQlfc3RyX2ZpbmTiBQlfc3RyX2R1bXDjBQlfc3RyX2NoYXLkBQlfc3RyX2J5dGXlBQxfc3RlcGdlbmZ1bGzmBQtfc3RhY2tpbnVzZecFBV9zb3J06AULX3NvbHZlZ290b3PpBQpfc29sdmVnb3Rv6gUJX3NuX3dyaXRl6wUIX3NraXBCT03sBQRfc2lu7QUKX3NpbXBsZWV4cO4FCF9zZXR2YnVm7wUJX3NldHRyYXBz8AUKX3NldGxvY2FsZfEFCV9zZXRUaHJld/IFCl9zZWFyY2h2YXLzBQ5fc2VhcmNodXB2YWx1ZfQFEV9zZWFyY2hlcl9wcmVsb2Fk9QUNX3NlYXJjaGVyX0x1YfYFD19zZWFyY2hlcl9Dcm9vdPcFC19zZWFyY2hlcl9D+AULX3NjYW5mb3JtYXT5BRJfcnVuYWZld2ZpbmFsaXplcnP6BQdfcmtuYW1l+wUIX3JldHN0YXT8BQhfcmV0aG9va/0FB19yZXN1bWX+BRJfcmVzdGFydGNvbGxlY3Rpb27/BQtfcmVwZWF0c3RhdIAGB19yZW5hbWWBBgtfcmVtb3ZldmFyc4IGB19yZW1vdmWDBg1fcmVtYXJrdXB2YWxzhAYJX3JlaW5zZXJ0hQYHX3JlaGFzaIYGEV9yZWdpc3RlcmxvY2FsdmFyhwYIX3JlY292ZXKIBgxfcmVhZHV0Zjhlc2OJBgxfcmVhZGhleGFlc2OKBgtfcmVhZGRlY2VzY4sGDF9yZWFkX3N0cmluZ4wGDF9yZWFkX251bWJlco0GC19yZWFkX2NoYXJzjgYJX3JlYWRfYWxsjwYLX3F1b3RlZmxvYXSQBg1fcHVzaGZ1bmNuYW1lkQYSX3B1c2hlcnJvcm5vdGZvdW5kkgYMX3B1c2hjbG9zdXJlkwYIX3Byb2plY3SUBgtfcHJpbWFyeWV4cJUGCl9wYXJ0aXRpb26WBghfcGFybGlzdJcGBl9wYW5pY5gGC19vc190bXBuYW1lmQYIX29zX3RpbWWaBg1fb3Nfc2V0bG9jYWxlmwYKX29zX3JlbmFtZZwGCl9vc19yZW1vdmWdBgpfb3NfZ2V0ZW52ngYIX29zX2V4aXSfBgtfb3NfZXhlY3V0ZaAGDF9vc19kaWZmdGltZaEGCF9vc19kYXRlogYJX29zX2Nsb2NrowYLX251bXVzZWhhc2ikBgxfbnVtdXNlYXJyYXmlBgtfbm9zcGVjaWFsc6YGBV9uaWxLpwYJX25leHRsaW5lqAYLX25ld3VwdmFsdWWpBgxfbmV3YnVmZnNpemWqBgdfbmV3Ym94qwYMX21vdmVyZXN1bHRzrAYNX21vdmVnb3Rvc291dK0GC19taW5fZXhwYW5krgYLX21heF9leHBhbmSvBglfbWF0aF91bHSwBgpfbWF0aF90eXBlsQYLX21hdGhfdG9pbnSyBglfbWF0aF90YW6zBgpfbWF0aF9zcXJ0tAYJX21hdGhfc2lutQYQX21hdGhfcmFuZG9tc2VlZLYGDF9tYXRoX3JhbmRvbbcGCV9tYXRoX3JhZLgGCl9tYXRoX21vZGa5BglfbWF0aF9taW66BglfbWF0aF9tYXi7BglfbWF0aF9sb2e8BgpfbWF0aF9mbW9kvQYLX21hdGhfZmxvb3K+BglfbWF0aF9leHC/BglfbWF0aF9kZWfABglfbWF0aF9jb3PBBgpfbWF0aF9jZWlswgYKX21hdGhfYXRhbsMGCl9tYXRoX2FzaW7EBgpfbWF0aF9hY29zxQYJX21hdGhfYWJzxgYNX21hdGNoYmFsYW5jZccGDl9tYXRjaF9jYXB0dXJlyAYJX21ha2VtYXNryQYJX21haW5mdW5jygYNX2x1YW9wZW5fdXRmOMsGDl9sdWFvcGVuX3RhYmxlzAYPX2x1YW9wZW5fc3RyaW5nzQYQX2x1YW9wZW5fcGFja2FnZc4GC19sdWFvcGVuX29zzwYNX2x1YW9wZW5fbWF0aNAGC19sdWFvcGVuX2lv0QYOX2x1YW9wZW5fZGVidWfSBhJfbHVhb3Blbl9jb3JvdXRpbmXTBg1fbHVhb3Blbl9iYXNl1AYOX2x1YWlfbWFrZXNlZWTVBgtfbHVhX3lpZWxka9YGEF9sdWFfdXB2YWx1ZWpvaW7XBg5fbHVhX3VwdmFsdWVpZNgGDF9sdWFfdG9jbG9zZdkGDV9sdWFfc2V0bG9jYWzaBhJfbHVhX3NldGl1c2VydmFsdWXbBgxfbHVhX3NldGhvb2vcBhNfbHVhX3NldGNzdGFja2xpbWl03QYLX2x1YV9yZXN1bWXeBg5fbHVhX25ld3RocmVhZN8GCF9sdWFfbGVu4AYNX2x1YV9pc251bWJlcuEGDV9sdWFfZ2V0dGFibGXiBhJfbHVhX2dldGl1c2VydmFsdWXjBglfbHVhX2R1bXDkBgpfbHVhX2FyaXRo5QYKX2x1YVpfcmVhZOYGCl9sdWFaX2luaXTnBgxfbHVhWV9wYXJzZXLoBg5fbHVhWF9zZXRpbnB1dOkGCl9sdWFYX2luaXTqBg5fbHVhVl9sZXNzdGhhbusGD19sdWFWX2xlc3NlcXVhbOwGDl9sdWFWX2ZpbmlzaE9w7QYMX2x1YVVfdW5kdW1w7gYKX2x1YVVfZHVtcO8GEV9sdWFUX3RyeWNvbmNhdFRN8AYPX2x1YVRfdHJ5YmluaVRN8QYKX2x1YVRfaW5pdPIGEF9sdWFUX2dldHZhcmFyZ3PzBgxfbHVhVF9jYWxsVE30BhNfbHVhVF9hZGp1c3R2YXJhcmdz9QYMX2x1YVNfcmVtb3Zl9gYOX2x1YVNfbmV3dWRhdGH3BgpfbHVhU19pbml0+AYRX2x1YVNfaGFzaGxvbmdzdHL5BhBfbHVhU19jbGVhcmNhY2hl+gYLX2x1YU9fYXJpdGj7Bg9fbHVhTF90cmFjZWJhY2v8Bg5fbHVhTF9yZXF1aXJlZv0GCV9sdWFMX3JlZv4GDl9sdWFMX29wZW5saWJz/wYOX2x1YUxfbmV3c3RhdGWABw5fbHVhTF9jYWxsbWV0YYEHEl9sdWFLX3NldHRhYmxlc2l6ZYIHCl9sdWFLX3NlbGaDBwxfbHVhS19wcmVmaXiEBwxfbHVhS19wb3NmaXiFBwtfbHVhS19pbmZpeIYHC19sdWFLX2Zsb2F0hwcMX2x1YUtfZmluaXNoiAcPX2x1YUtfZXhwMmNvbnN0iQcKX2x1YUhfbmV4dIoHCl9sdWFIX2ZyZWWLBxBfbHVhR190b2ludGVycm9yjAcQX2x1YUdfb3JkZXJlcnJvco0HEV9sdWFHX2NvbmNhdGVycm9yjgcQX2x1YUZfaW5pdHVwdmFsc48HD19sdWFGX2ZyZWVwcm90b5AHD19sdWFGX2ZpbmR1cHZhbJEHDl9sdWFFX3Nocmlua0NJkgcQX2x1YUVfZnJlZXRocmVhZJMHFV9sdWFEX3Byb3RlY3RlZHBhcnNlcpQHEV9sdWFEX3ByZXRhaWxjYWxslQcUX2x1YUNfZnJlZWFsbG9iamVjdHOWBw9fbHVhQl95aWVsZGFibGWXBwtfbHVhQl95aWVsZJgHDF9sdWFCX3hwY2FsbJkHCl9sdWFCX3dhcm6aBwpfbHVhQl90eXBlmwcOX2x1YUJfdG9zdHJpbmecBw5fbHVhQl90b251bWJlcp0HEl9sdWFCX3NldG1ldGF0YWJsZZ4HDF9sdWFCX3NlbGVjdJ8HDF9sdWFCX3Jhd3NldKAHDF9sdWFCX3Jhd2xlbqEHDF9sdWFCX3Jhd2dldKIHDl9sdWFCX3Jhd2VxdWFsowcLX2x1YUJfcHJpbnSkBwtfbHVhQl9wY2FsbKUHC19sdWFCX3BhaXJzpgcKX2x1YUJfbmV4dKcHDl9sdWFCX2xvYWRmaWxlqAcKX2x1YUJfbG9hZKkHDF9sdWFCX2lwYWlyc6oHEl9sdWFCX2dldG1ldGF0YWJsZasHDF9sdWFCX2RvZmlsZawHDF9sdWFCX2Nvd3JhcK0HDl9sdWFCX2Nvc3RhdHVzrgcPX2x1YUJfY29ydW5uaW5nrwcOX2x1YUJfY29yZXN1bWWwBxRfbHVhQl9jb2xsZWN0Z2FyYmFnZbEHC19sdWFCX2Nsb3NlsgcNX2x1YUJfYXV4d3JhcLMHDF9sdWFCX2Fzc2VydLQHCl9sb2NhbHN0YXS1BwpfbG9jYWxmdW5jtgcNX2xvYWRVcHZhbHVlc7cHC19sb2FkUHJvdG9zuAcKX2xvYWREZWJ1Z7kHDl9sb2FkQ29uc3RhbnRzugcJX2xvYWRDb2RluwcJX2xtZW1maW5kvAcPX2xsdm1fYnN3YXBfaTMyvQcOX2xsX3NlYXJjaHBhdGi+BwtfbGxfcmVxdWlyZb8HC19sbF9sb2FkbGliwAcOX2xhc3RsaXN0ZmllbGTBBwpfbGFzdGxldmVswgcKX2xhYmVsc3RhdMMHCl9sX3N0cjJpbnTEBwhfbF9zdHIyZMUHEV9sX3JhbmRvbWl6ZVBpdm90xgcMX2xfaGFzaGZsb2F0xwcMX2xfY2hlY2ttb2RlyAcIX2xfYWxsb2PJBw9fanVtcHNjb3BlZXJyb3LKBwtfaXRlcl9jb2Rlc8sHD19pdGVyX2F1eHN0cmljdMwHDF9pdGVyX2F1eGxheM0HDV9pc3NpbmdsZWp1bXDOBwZfaXNuZWfPBwpfaXNpbnN0YWNr0AcKX2lwYWlyc2F1eNEHCV9pb193cml0ZdIHCF9pb190eXBl0wcLX2lvX3RtcGZpbGXUBwxfaW9fcmVhZGxpbmXVBwhfaW9fcmVhZNYHCV9pb19wb3BlbtcHCl9pb19wY2xvc2XYBwpfaW9fb3V0cHV02QcIX2lvX29wZW7aBwtfaW9fbm9jbG9zZdsHCV9pb19saW5lc9wHCV9pb19pbnB1dN0HCV9pb19mbHVzaN4HCl9pb19mY2xvc2XfBwlfaW9fY2xvc2XgBw1faW50ZXJuc2hyc3Ry4QcJX2luaXRfdmFy4gcOX2luaXRfcmVnaXN0cnnjBwhfaW5jc3RlcOQHB19pZnN0YXTlBwZfaG9va2bmBwlfaGV4ZmxvYXTnBwxfaGFzaF9zZWFyY2joBwtfZ3Jvd3N0cnRhYukHCV9nb3Rvc3RhdOoHC19nbWF0Y2hfYXV46wcHX2dtYXRjaOwHDV9nZXR1cHZhbG5hbWXtBwlfZ2V0dW5vcHLuBxJfZ2V0bG9jYWxhdHRyaWJ1dGXvBwxfZ2V0ZnVuY25hbWXwBwtfZ2V0ZnJlZXBvc/EHCl9nZXRiaW5vcHLyBwxfZ2V0YmFzZWxpbmXzBwVfZ2V0U/QHBV9nZXRG9QcIX2dlbnN0ZXD2Bw9fZ2VuZXJpY19yZWFkZXL3BwVfZ2N0bfgHCV9mdW5jc3RhdPkHEV9mdW5jbmFtZWZyb21jb2Rl+gcJX2Z1bmNuYW1l+wcJX2Z1bmNpbmZv/AcIX2Z1bGxpbmP9BwhfZnJlb3Blbv4HEF9mb3VyYnl0ZV9zdHJzdHL/BwhfZm9yc3RhdIAICF9mb3JwcmVwgQgHX2Zvcm51bYIICF9mb3JsaXN0gwgJX2ZvcmxpbWl0hAgGX2ZtdF94hQgGX2ZtdF9vhggHX2ZtdF9mcIcIBV9mbW9kiAgNX2Zsb2F0Zm9ybG9vcIkIC19maW5kdmFyYXJniggLX2ZpbmRzZXRyZWeLCApfZmluZHBjYWxsjAgLX2ZpbmRsb2FkZXKNCApfZmluZGluZGV4jggMX2ZpbmFsdGFyZ2V0jwgGX2ZpZWxkkAgIX2Zfd3JpdGWRCAtfZl90b3N0cmluZ5IICl9mX3NldHZidWaTCAdfZl9zZWVrlAgHX2ZfcmVhZJUICV9mX3BhcnNlcpYICl9mX2x1YW9wZW6XCAhfZl9saW5lc5gIBV9mX2djmQgIX2ZfZmx1c2iaCAdfZl9jYWxsmwgJX2V4cHJzdGF0nAgEX2V4cJ0IC19lcnJvcmxpbWl0nggMX2VuZF9jYXB0dXJlnwgNX2R1bXBVcHZhbHVlc6AIC19kdW1wUHJvdG9zoQgLX2R1bXBIZWFkZXKiCApfZHVtcERlYnVnowgOX2R1bXBDb25zdGFudHOkCApfZG90aGVjYWxspQgJX2RlY2Zsb2F0pggPX2RiX3VwdmFsdWVqb2lupwgNX2RiX3VwdmFsdWVpZKgIDV9kYl90cmFjZWJhY2upCBBfZGJfc2V0dXNlcnZhbHVlqggOX2RiX3NldHVwdmFsdWWrCBBfZGJfc2V0bWV0YXRhYmxlrAgMX2RiX3NldGxvY2FsrQgLX2RiX3NldGhvb2uuCBJfZGJfc2V0Y3N0YWNrbGltaXSvCBBfZGJfZ2V0dXNlcnZhbHVlsAgOX2RiX2dldHVwdmFsdWWxCA9fZGJfZ2V0cmVnaXN0cnmyCBBfZGJfZ2V0bWV0YXRhYmxlswgMX2RiX2dldGxvY2FstAgLX2RiX2dldGluZm+1CAtfZGJfZ2V0aG9va7YICV9kYl9kZWJ1Z7cIFV9jcmVhdGVzZWFyY2hlcnN0YWJsZbgIEF9jcmVhdGVtZXRhdGFibGW5CAtfY3JlYXRlbWV0YboIEV9jcmVhdGVjbGlic3RhYmxluwgEX2Nvc7wIDV9jb3JyZWN0c3RhY2u9CBBfY29ycmVjdHBvaW50ZXJzvggRX2NvcnJlY3RncmF5bGlzdHO/CA1fY29udGludWVfbHVhwAgKX2NvbnN0MmV4cMEIDV9jb21wdXRlc2l6ZXPCCAxfY29tcGlsZV9sdWHDCBJfY29sbGVjdHZhbGlkbGluZXPECA1fY29kZXVuZXhwdmFsxQgKX2NvZGVwb2ludMYICF9jb2Rlbm90xwgHX2NvZGVlccgIC19jb2RlY29uY2F0yQgQX2NvZGVjb21tdXRhdGl2ZcoIDF9jb2RlY2xvc3VyZcsIDF9jb2RlYml0d2lzZcwID19jbG9zZWxpc3RmaWVsZM0IDV9jaGVja3RvY2xvc2XOCA5fY2hlY2tyZXBlYXRlZM8IDF9jaGVja29wdGlvbtAICl9jaGVja2NsaWLRCA9fY2hlY2tfcmVhZG9ubHnSCA9fY2hlY2tfY29uZmxpY3TTCA5fY2hlY2tfY2FwdHVyZdQIDF9jaGVja0hlYWRlctUIDF9jaGFuZ2VkbGluZdYIEV9jYXB0dXJlX3RvX2Nsb3Nl1wgNX2NhbGxjbG9zZW10aNgIC19ieXRlb2Zmc2V02QgKX2JyZWFrc3RhdNoIBl9ib3hnY9sIBl9ib29sVNwIBl9ib29sRt0ICl9iX3N0cjJpbnTeCAtfYXV4Z2V0aW5mb98IC19hdXhfcmF3c2V04AgGX2F0YW4y4QgFX2FzaW7iCApfYXJpdGhfdW5t4wgKX2FyaXRoX3N1YuQICl9hcml0aF9wb3flCApfYXJpdGhfbXVs5ggKX2FyaXRoX21vZOcIC19hcml0aF9pZGl26AgKX2FyaXRoX2RpdukICl9hcml0aF9hZGTqCApfYWRkcXVvdGVk6wgNX2FkZHByb3RvdHlwZewIC19hZGRsaXRlcmFs7QgKX2FkZF92YWx1Ze4IBl9hZGRfc+8IBV9hY29z8AgMX19nZXRfdHpuYW1l8QgOX19nZXRfdGltZXpvbmXyCA5fX2dldF9kYXlsaWdodPMIFV9fX3VubGlzdF9sb2NrZWRfZmlsZfQIDV9fX3N0cmVycm9yX2z1CAlfX19zdHBjcHn2CA9fX19zdGRvdXRfd3JpdGX3CA1fX19zdGRpb19zZWVr+AgNX19fc3RkaW9fcmVhZPkIDl9fX3N0ZGlvX2Nsb3Nl+ggRX19fcmVtX3BpbzJfbGFyZ2X7CApfX19vZmxfYWRk/AgJX19fbXVubWFw/QgMX19fbW9fbG9va3Vw/ggNX19fZ2V0X2xvY2FsZf8IEl9fX2Z0ZWxsb191bmxvY2tlZIAJEl9fX2ZzZWVrb191bmxvY2tlZIEJDF9fX2Zsb2F0c2NhboIJEV9fX2Vycm5vX2xvY2F0aW9ugwkhX19fZW1zY3JpcHRlbl9lbnZpcm9uX2NvbnN0cnVjdG9yhAkHX19fZHVwM4UJC19MVGludGZsb2F0hgkLX0xUZmxvYXRpbnSHCQtfTEVpbnRmbG9hdIgJC19MRWZsb2F0aW50";
// WASM sub-injection - ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^...

if (!isDataURI(wasmBinaryFile)) {
 wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
 try {
  if (Module["wasmBinary"]) {
   return new Uint8Array(Module["wasmBinary"]);
  }
  if (Module["readBinary"]) {
   return Module["readBinary"](wasmBinaryFile);
  } else {
   throw "both async and sync fetching of the wasm failed";
  }
 } catch (err) {
  abort(err);
 }
}

function getBinaryPromise() {
 if (!Module["wasmBinary"] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
  return fetch(wasmBinaryFile, {
   credentials: "same-origin"
  }).then(function(response) {
   if (!response["ok"]) {
    throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
   }
   return response["arrayBuffer"]();
  }).catch(function() {
   return getBinary();
  });
 }
 return new Promise(function(resolve, reject) {
  resolve(getBinary());
 });
}

function createWasm(env) {
 var info = {
  "env": env,
  "global": {
   "NaN": NaN,
   Infinity: Infinity
  },
  "global.Math": Math,
  "asm2wasm": asm2wasmImports
 };
 function receiveInstance(instance, module) {
  var exports = instance.exports;
  Module["asm"] = exports;
  removeRunDependency("wasm-instantiate");
 }
 addRunDependency("wasm-instantiate");
 if (Module["instantiateWasm"]) {
  try {
   return Module["instantiateWasm"](info, receiveInstance);
  } catch (e) {
   err("Module.instantiateWasm callback failed with error: " + e);
   return false;
  }
 }
 function receiveInstantiatedSource(output) {
  receiveInstance(output["instance"]);
 }
 function instantiateArrayBuffer(receiver) {
  getBinaryPromise().then(function(binary) {
   return WebAssembly.instantiate(binary, info);
  }).then(receiver, function(reason) {
   err("failed to asynchronously prepare wasm: " + reason);
   abort(reason);
  });
 }
 if (!Module["wasmBinary"] && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
  WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, {
   credentials: "same-origin"
  }), info).then(receiveInstantiatedSource, function(reason) {
   err("wasm streaming compile failed: " + reason);
   err("falling back to ArrayBuffer instantiation");
   instantiateArrayBuffer(receiveInstantiatedSource);
  });
 } else {
  instantiateArrayBuffer(receiveInstantiatedSource);
 }
 return {};
}

Module["asm"] = function(global, env, providedBuffer) {
 env["memory"] = wasmMemory;
 env["table"] = wasmTable = new WebAssembly.Table({
  "initial": 296,
  "maximum": 296,
  "element": "anyfunc"
 });
 env["__memory_base"] = 1024;
 env["__table_base"] = 0;
 var exports = createWasm(env);
 return exports;
};

__ATINIT__.push({
 func: function() {
  ___emscripten_environ_constructor();
 }
});

var ENV = {};

function ___buildEnvironment(environ) {
 var MAX_ENV_VALUES = 64;
 var TOTAL_ENV_SIZE = 1024;
 var poolPtr;
 var envPtr;
 if (!___buildEnvironment.called) {
  ___buildEnvironment.called = true;
  ENV["USER"] = ENV["LOGNAME"] = "web_user";
  ENV["PATH"] = "/";
  ENV["PWD"] = "/";
  ENV["HOME"] = "/home/web_user";
  ENV["LANG"] = "C.UTF-8";
  ENV["_"] = Module["thisProgram"];
  poolPtr = getMemory(TOTAL_ENV_SIZE);
  envPtr = getMemory(MAX_ENV_VALUES * 4);
  HEAP32[envPtr >> 2] = poolPtr;
  HEAP32[environ >> 2] = envPtr;
 } else {
  envPtr = HEAP32[environ >> 2];
  poolPtr = HEAP32[envPtr >> 2];
 }
 var strings = [];
 var totalSize = 0;
 for (var key in ENV) {
  if (typeof ENV[key] === "string") {
   var line = key + "=" + ENV[key];
   strings.push(line);
   totalSize += line.length;
  }
 }
 if (totalSize > TOTAL_ENV_SIZE) {
  throw new Error("Environment size exceeded TOTAL_ENV_SIZE!");
 }
 var ptrSize = 4;
 for (var i = 0; i < strings.length; i++) {
  var line = strings[i];
  writeAsciiToMemory(line, poolPtr);
  HEAP32[envPtr + i * ptrSize >> 2] = poolPtr;
  poolPtr += line.length + 1;
 }
 HEAP32[envPtr + strings.length * ptrSize >> 2] = 0;
}

function _emscripten_get_now() {
 abort();
}

function _emscripten_get_now_is_monotonic() {
 return 0 || ENVIRONMENT_IS_NODE || typeof dateNow !== "undefined" || typeof performance === "object" && performance && typeof performance["now"] === "function";
}

function ___setErrNo(value) {
 if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
 return value;
}

function _clock_gettime(clk_id, tp) {
 var now;
 if (clk_id === 0) {
  now = Date.now();
 } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
  now = _emscripten_get_now();
 } else {
  ___setErrNo(22);
  return -1;
 }
 HEAP32[tp >> 2] = now / 1e3 | 0;
 HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;
 return 0;
}

function ___clock_gettime(a0, a1) {
 return _clock_gettime(a0, a1);
}

function ___lock() {}

function ___map_file(pathname, size) {
 ___setErrNo(1);
 return -1;
}

var PATH = {
 splitPath: function(filename) {
  var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  return splitPathRe.exec(filename).slice(1);
 },
 normalizeArray: function(parts, allowAboveRoot) {
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
   var last = parts[i];
   if (last === ".") {
    parts.splice(i, 1);
   } else if (last === "..") {
    parts.splice(i, 1);
    up++;
   } else if (up) {
    parts.splice(i, 1);
    up--;
   }
  }
  if (allowAboveRoot) {
   for (;up; up--) {
    parts.unshift("..");
   }
  }
  return parts;
 },
 normalize: function(path) {
  var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
  path = PATH.normalizeArray(path.split("/").filter(function(p) {
   return !!p;
  }), !isAbsolute).join("/");
  if (!path && !isAbsolute) {
   path = ".";
  }
  if (path && trailingSlash) {
   path += "/";
  }
  return (isAbsolute ? "/" : "") + path;
 },
 dirname: function(path) {
  var result = PATH.splitPath(path), root = result[0], dir = result[1];
  if (!root && !dir) {
   return ".";
  }
  if (dir) {
   dir = dir.substr(0, dir.length - 1);
  }
  return root + dir;
 },
 basename: function(path) {
  if (path === "/") return "/";
  var lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;
  return path.substr(lastSlash + 1);
 },
 extname: function(path) {
  return PATH.splitPath(path)[3];
 },
 join: function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return PATH.normalize(paths.join("/"));
 },
 join2: function(l, r) {
  return PATH.normalize(l + "/" + r);
 },
 resolve: function() {
  var resolvedPath = "", resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
   var path = i >= 0 ? arguments[i] : FS.cwd();
   if (typeof path !== "string") {
    throw new TypeError("Arguments to path.resolve must be strings");
   } else if (!path) {
    return "";
   }
   resolvedPath = path + "/" + resolvedPath;
   resolvedAbsolute = path.charAt(0) === "/";
  }
  resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
   return !!p;
  }), !resolvedAbsolute).join("/");
  return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
 },
 relative: function(from, to) {
  from = PATH.resolve(from).substr(1);
  to = PATH.resolve(to).substr(1);
  function trim(arr) {
   var start = 0;
   for (;start < arr.length; start++) {
    if (arr[start] !== "") break;
   }
   var end = arr.length - 1;
   for (;end >= 0; end--) {
    if (arr[end] !== "") break;
   }
   if (start > end) return [];
   return arr.slice(start, end - start + 1);
  }
  var fromParts = trim(from.split("/"));
  var toParts = trim(to.split("/"));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
   if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
  }
  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
   outputParts.push("..");
  }
  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
 }
};

var TTY = {
 ttys: [],
 init: function() {},
 shutdown: function() {},
 register: function(dev, ops) {
  TTY.ttys[dev] = {
   input: [],
   output: [],
   ops: ops
  };
  FS.registerDevice(dev, TTY.stream_ops);
 },
 stream_ops: {
  open: function(stream) {
   var tty = TTY.ttys[stream.node.rdev];
   if (!tty) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   stream.tty = tty;
   stream.seekable = false;
  },
  close: function(stream) {
   stream.tty.ops.flush(stream.tty);
  },
  flush: function(stream) {
   stream.tty.ops.flush(stream.tty);
  },
  read: function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.get_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   var bytesRead = 0;
   for (var i = 0; i < length; i++) {
    var result;
    try {
     result = stream.tty.ops.get_char(stream.tty);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    if (result === undefined && bytesRead === 0) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
    if (result === null || result === undefined) break;
    bytesRead++;
    buffer[offset + i] = result;
   }
   if (bytesRead) {
    stream.node.timestamp = Date.now();
   }
   return bytesRead;
  },
  write: function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.put_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   try {
    for (var i = 0; i < length; i++) {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    }
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES.EIO);
   }
   if (length) {
    stream.node.timestamp = Date.now();
   }
   return i;
  }
 },
 default_tty_ops: {
  get_char: function(tty) {
   if (!tty.input.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
     var BUFSIZE = 256;
     var buf = new Buffer(BUFSIZE);
     var bytesRead = 0;
     var isPosixPlatform = process.platform != "win32";
     var fd = process.stdin.fd;
     if (isPosixPlatform) {
      var usingDevice = false;
      try {
       fd = fs.openSync("/dev/stdin", "r");
       usingDevice = true;
      } catch (e) {}
     }
     try {
      bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
     } catch (e) {
      if (e.toString().indexOf("EOF") != -1) bytesRead = 0; else throw e;
     }
     if (usingDevice) {
      fs.closeSync(fd);
     }
     if (bytesRead > 0) {
      result = buf.slice(0, bytesRead).toString("utf-8");
     } else {
      result = null;
     }
    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
     result = window.prompt("Input: ");
     if (result !== null) {
      result += "\n";
     }
    } else if (typeof readline == "function") {
     result = readline();
     if (result !== null) {
      result += "\n";
     }
    }
    if (!result) {
     return null;
    }
    tty.input = intArrayFromString(result, true);
   }
   return tty.input.shift();
  },
  put_char: function(tty, val) {
   if (val === null || val === 10) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  flush: function(tty) {
   if (tty.output && tty.output.length > 0) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  }
 },
 default_tty1_ops: {
  put_char: function(tty, val) {
   if (val === null || val === 10) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  flush: function(tty) {
   if (tty.output && tty.output.length > 0) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  }
 }
};

var MEMFS = {
 ops_table: null,
 mount: function(mount) {
  return MEMFS.createNode(null, "/", 16384 | 511, 0);
 },
 createNode: function(parent, name, mode, dev) {
  if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (!MEMFS.ops_table) {
   MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: MEMFS.node_ops.rename,
      unlink: MEMFS.node_ops.unlink,
      rmdir: MEMFS.node_ops.rmdir,
      readdir: MEMFS.node_ops.readdir,
      symlink: MEMFS.node_ops.symlink
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek
     }
    },
    file: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek,
      read: MEMFS.stream_ops.read,
      write: MEMFS.stream_ops.write,
      allocate: MEMFS.stream_ops.allocate,
      mmap: MEMFS.stream_ops.mmap,
      msync: MEMFS.stream_ops.msync
     }
    },
    link: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      readlink: MEMFS.node_ops.readlink
     },
     stream: {}
    },
    chrdev: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: FS.chrdev_stream_ops
    }
   };
  }
  var node = FS.createNode(parent, name, mode, dev);
  if (FS.isDir(node.mode)) {
   node.node_ops = MEMFS.ops_table.dir.node;
   node.stream_ops = MEMFS.ops_table.dir.stream;
   node.contents = {};
  } else if (FS.isFile(node.mode)) {
   node.node_ops = MEMFS.ops_table.file.node;
   node.stream_ops = MEMFS.ops_table.file.stream;
   node.usedBytes = 0;
   node.contents = null;
  } else if (FS.isLink(node.mode)) {
   node.node_ops = MEMFS.ops_table.link.node;
   node.stream_ops = MEMFS.ops_table.link.stream;
  } else if (FS.isChrdev(node.mode)) {
   node.node_ops = MEMFS.ops_table.chrdev.node;
   node.stream_ops = MEMFS.ops_table.chrdev.stream;
  }
  node.timestamp = Date.now();
  if (parent) {
   parent.contents[name] = node;
  }
  return node;
 },
 getFileDataAsRegularArray: function(node) {
  if (node.contents && node.contents.subarray) {
   var arr = [];
   for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
   return arr;
  }
  return node.contents;
 },
 getFileDataAsTypedArray: function(node) {
  if (!node.contents) return new Uint8Array();
  if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
  return new Uint8Array(node.contents);
 },
 expandFileStorage: function(node, newCapacity) {
  var prevCapacity = node.contents ? node.contents.length : 0;
  if (prevCapacity >= newCapacity) return;
  var CAPACITY_DOUBLING_MAX = 1024 * 1024;
  newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
  if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
  var oldContents = node.contents;
  node.contents = new Uint8Array(newCapacity);
  if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
  return;
 },
 resizeFileStorage: function(node, newSize) {
  if (node.usedBytes == newSize) return;
  if (newSize == 0) {
   node.contents = null;
   node.usedBytes = 0;
   return;
  }
  if (!node.contents || node.contents.subarray) {
   var oldContents = node.contents;
   node.contents = new Uint8Array(new ArrayBuffer(newSize));
   if (oldContents) {
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
   }
   node.usedBytes = newSize;
   return;
  }
  if (!node.contents) node.contents = [];
  if (node.contents.length > newSize) node.contents.length = newSize; else while (node.contents.length < newSize) node.contents.push(0);
  node.usedBytes = newSize;
 },
 node_ops: {
  getattr: function(node) {
   var attr = {};
   attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
   attr.ino = node.id;
   attr.mode = node.mode;
   attr.nlink = 1;
   attr.uid = 0;
   attr.gid = 0;
   attr.rdev = node.rdev;
   if (FS.isDir(node.mode)) {
    attr.size = 4096;
   } else if (FS.isFile(node.mode)) {
    attr.size = node.usedBytes;
   } else if (FS.isLink(node.mode)) {
    attr.size = node.link.length;
   } else {
    attr.size = 0;
   }
   attr.atime = new Date(node.timestamp);
   attr.mtime = new Date(node.timestamp);
   attr.ctime = new Date(node.timestamp);
   attr.blksize = 4096;
   attr.blocks = Math.ceil(attr.size / attr.blksize);
   return attr;
  },
  setattr: function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
   if (attr.size !== undefined) {
    MEMFS.resizeFileStorage(node, attr.size);
   }
  },
  lookup: function(parent, name) {
   throw FS.genericErrors[ERRNO_CODES.ENOENT];
  },
  mknod: function(parent, name, mode, dev) {
   return MEMFS.createNode(parent, name, mode, dev);
  },
  rename: function(old_node, new_dir, new_name) {
   if (FS.isDir(old_node.mode)) {
    var new_node;
    try {
     new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    if (new_node) {
     for (var i in new_node.contents) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
     }
    }
   }
   delete old_node.parent.contents[old_node.name];
   old_node.name = new_name;
   new_dir.contents[new_name] = old_node;
   old_node.parent = new_dir;
  },
  unlink: function(parent, name) {
   delete parent.contents[name];
  },
  rmdir: function(parent, name) {
   var node = FS.lookupNode(parent, name);
   for (var i in node.contents) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
   }
   delete parent.contents[name];
  },
  readdir: function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  },
  symlink: function(parent, newname, oldpath) {
   var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
   node.link = oldpath;
   return node;
  },
  readlink: function(node) {
   if (!FS.isLink(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return node.link;
  }
 },
 stream_ops: {
  read: function(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= stream.node.usedBytes) return 0;
   var size = Math.min(stream.node.usedBytes - position, length);
   if (size > 8 && contents.subarray) {
    buffer.set(contents.subarray(position, position + size), offset);
   } else {
    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
   }
   return size;
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
   if (!length) return 0;
   var node = stream.node;
   node.timestamp = Date.now();
   if (buffer.subarray && (!node.contents || node.contents.subarray)) {
    if (canOwn) {
     node.contents = buffer.subarray(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (node.usedBytes === 0 && position === 0) {
     node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
     node.usedBytes = length;
     return length;
    } else if (position + length <= node.usedBytes) {
     node.contents.set(buffer.subarray(offset, offset + length), position);
     return length;
    }
   }
   MEMFS.expandFileStorage(node, position + length);
   if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else {
    for (var i = 0; i < length; i++) {
     node.contents[position + i] = buffer[offset + i];
    }
   }
   node.usedBytes = Math.max(node.usedBytes, position + length);
   return length;
  },
  llseek: function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.usedBytes;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  },
  allocate: function(stream, offset, length) {
   MEMFS.expandFileStorage(stream.node, offset + length);
   stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
  },
  mmap: function(stream, buffer, offset, length, position, prot, flags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   var ptr;
   var allocated;
   var contents = stream.node.contents;
   if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
    allocated = false;
    ptr = contents.byteOffset;
   } else {
    if (position > 0 || position + length < stream.node.usedBytes) {
     if (contents.subarray) {
      contents = contents.subarray(position, position + length);
     } else {
      contents = Array.prototype.slice.call(contents, position, position + length);
     }
    }
    allocated = true;
    ptr = _malloc(length);
    if (!ptr) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
    }
    buffer.set(contents, ptr);
   }
   return {
    ptr: ptr,
    allocated: allocated
   };
  },
  msync: function(stream, buffer, offset, length, mmapFlags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   if (mmapFlags & 2) {
    return 0;
   }
   var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
   return 0;
  }
 }
};

var IDBFS = {
 dbs: {},
 indexedDB: function() {
  if (typeof indexedDB !== "undefined") return indexedDB;
  var ret = null;
  if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  assert(ret, "IDBFS used, but indexedDB not supported");
  return ret;
 },
 DB_VERSION: 21,
 DB_STORE_NAME: "FILE_DATA",
 mount: function(mount) {
  return MEMFS.mount.apply(null, arguments);
 },
 syncfs: function(mount, populate, callback) {
  IDBFS.getLocalSet(mount, function(err, local) {
   if (err) return callback(err);
   IDBFS.getRemoteSet(mount, function(err, remote) {
    if (err) return callback(err);
    var src = populate ? remote : local;
    var dst = populate ? local : remote;
    IDBFS.reconcile(src, dst, callback);
   });
  });
 },
 getDB: function(name, callback) {
  var db = IDBFS.dbs[name];
  if (db) {
   return callback(null, db);
  }
  var req;
  try {
   req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
  } catch (e) {
   return callback(e);
  }
  if (!req) {
   return callback("Unable to connect to IndexedDB");
  }
  req.onupgradeneeded = function(e) {
   var db = e.target.result;
   var transaction = e.target.transaction;
   var fileStore;
   if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
    fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
   } else {
    fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
   }
   if (!fileStore.indexNames.contains("timestamp")) {
    fileStore.createIndex("timestamp", "timestamp", {
     unique: false
    });
   }
  };
  req.onsuccess = function() {
   db = req.result;
   IDBFS.dbs[name] = db;
   callback(null, db);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 getLocalSet: function(mount, callback) {
  var entries = {};
  function isRealDir(p) {
   return p !== "." && p !== "..";
  }
  function toAbsolute(root) {
   return function(p) {
    return PATH.join2(root, p);
   };
  }
  var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  while (check.length) {
   var path = check.pop();
   var stat;
   try {
    stat = FS.stat(path);
   } catch (e) {
    return callback(e);
   }
   if (FS.isDir(stat.mode)) {
    check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
   }
   entries[path] = {
    timestamp: stat.mtime
   };
  }
  return callback(null, {
   type: "local",
   entries: entries
  });
 },
 getRemoteSet: function(mount, callback) {
  var entries = {};
  IDBFS.getDB(mount.mountpoint, function(err, db) {
   if (err) return callback(err);
   try {
    var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readonly");
    transaction.onerror = function(e) {
     callback(this.error);
     e.preventDefault();
    };
    var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
    var index = store.index("timestamp");
    index.openKeyCursor().onsuccess = function(event) {
     var cursor = event.target.result;
     if (!cursor) {
      return callback(null, {
       type: "remote",
       db: db,
       entries: entries
      });
     }
     entries[cursor.primaryKey] = {
      timestamp: cursor.key
     };
     cursor.continue();
    };
   } catch (e) {
    return callback(e);
   }
  });
 },
 loadLocalEntry: function(path, callback) {
  var stat, node;
  try {
   var lookup = FS.lookupPath(path);
   node = lookup.node;
   stat = FS.stat(path);
  } catch (e) {
   return callback(e);
  }
  if (FS.isDir(stat.mode)) {
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode
   });
  } else if (FS.isFile(stat.mode)) {
   node.contents = MEMFS.getFileDataAsTypedArray(node);
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode,
    contents: node.contents
   });
  } else {
   return callback(new Error("node type not supported"));
  }
 },
 storeLocalEntry: function(path, entry, callback) {
  try {
   if (FS.isDir(entry.mode)) {
    FS.mkdir(path, entry.mode);
   } else if (FS.isFile(entry.mode)) {
    FS.writeFile(path, entry.contents, {
     canOwn: true
    });
   } else {
    return callback(new Error("node type not supported"));
   }
   FS.chmod(path, entry.mode);
   FS.utime(path, entry.timestamp, entry.timestamp);
  } catch (e) {
   return callback(e);
  }
  callback(null);
 },
 removeLocalEntry: function(path, callback) {
  try {
   var lookup = FS.lookupPath(path);
   var stat = FS.stat(path);
   if (FS.isDir(stat.mode)) {
    FS.rmdir(path);
   } else if (FS.isFile(stat.mode)) {
    FS.unlink(path);
   }
  } catch (e) {
   return callback(e);
  }
  callback(null);
 },
 loadRemoteEntry: function(store, path, callback) {
  var req = store.get(path);
  req.onsuccess = function(event) {
   callback(null, event.target.result);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 storeRemoteEntry: function(store, path, entry, callback) {
  var req = store.put(entry, path);
  req.onsuccess = function() {
   callback(null);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 removeRemoteEntry: function(store, path, callback) {
  var req = store.delete(path);
  req.onsuccess = function() {
   callback(null);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 reconcile: function(src, dst, callback) {
  var total = 0;
  var create = [];
  Object.keys(src.entries).forEach(function(key) {
   var e = src.entries[key];
   var e2 = dst.entries[key];
   if (!e2 || e.timestamp > e2.timestamp) {
    create.push(key);
    total++;
   }
  });
  var remove = [];
  Object.keys(dst.entries).forEach(function(key) {
   var e = dst.entries[key];
   var e2 = src.entries[key];
   if (!e2) {
    remove.push(key);
    total++;
   }
  });
  if (!total) {
   return callback(null);
  }
  var errored = false;
  var completed = 0;
  var db = src.type === "remote" ? src.db : dst.db;
  var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readwrite");
  var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= total) {
    return callback(null);
   }
  }
  transaction.onerror = function(e) {
   done(this.error);
   e.preventDefault();
  };
  create.sort().forEach(function(path) {
   if (dst.type === "local") {
    IDBFS.loadRemoteEntry(store, path, function(err, entry) {
     if (err) return done(err);
     IDBFS.storeLocalEntry(path, entry, done);
    });
   } else {
    IDBFS.loadLocalEntry(path, function(err, entry) {
     if (err) return done(err);
     IDBFS.storeRemoteEntry(store, path, entry, done);
    });
   }
  });
  remove.sort().reverse().forEach(function(path) {
   if (dst.type === "local") {
    IDBFS.removeLocalEntry(path, done);
   } else {
    IDBFS.removeRemoteEntry(store, path, done);
   }
  });
 }
};

var NODEFS = {
 isWindows: false,
 staticInit: function() {
  NODEFS.isWindows = !!process.platform.match(/^win/);
  var flags = process["binding"]("constants");
  if (flags["fs"]) {
   flags = flags["fs"];
  }
  NODEFS.flagsForNodeMap = {
   1024: flags["O_APPEND"],
   64: flags["O_CREAT"],
   128: flags["O_EXCL"],
   0: flags["O_RDONLY"],
   2: flags["O_RDWR"],
   4096: flags["O_SYNC"],
   512: flags["O_TRUNC"],
   1: flags["O_WRONLY"]
  };
 },
 bufferFrom: function(arrayBuffer) {
  return Buffer.alloc ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer);
 },
 mount: function(mount) {
  assert(ENVIRONMENT_IS_NODE);
  return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
 },
 createNode: function(parent, name, mode, dev) {
  if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = FS.createNode(parent, name, mode);
  node.node_ops = NODEFS.node_ops;
  node.stream_ops = NODEFS.stream_ops;
  return node;
 },
 getMode: function(path) {
  var stat;
  try {
   stat = fs.lstatSync(path);
   if (NODEFS.isWindows) {
    stat.mode = stat.mode | (stat.mode & 292) >> 2;
   }
  } catch (e) {
   if (!e.code) throw e;
   throw new FS.ErrnoError(ERRNO_CODES[e.code]);
  }
  return stat.mode;
 },
 realPath: function(node) {
  var parts = [];
  while (node.parent !== node) {
   parts.push(node.name);
   node = node.parent;
  }
  parts.push(node.mount.opts.root);
  parts.reverse();
  return PATH.join.apply(null, parts);
 },
 flagsForNode: function(flags) {
  flags &= ~2097152;
  flags &= ~2048;
  flags &= ~32768;
  flags &= ~524288;
  var newFlags = 0;
  for (var k in NODEFS.flagsForNodeMap) {
   if (flags & k) {
    newFlags |= NODEFS.flagsForNodeMap[k];
    flags ^= k;
   }
  }
  if (!flags) {
   return newFlags;
  } else {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
 },
 node_ops: {
  getattr: function(node) {
   var path = NODEFS.realPath(node);
   var stat;
   try {
    stat = fs.lstatSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (NODEFS.isWindows && !stat.blksize) {
    stat.blksize = 4096;
   }
   if (NODEFS.isWindows && !stat.blocks) {
    stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
   }
   return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    rdev: stat.rdev,
    size: stat.size,
    atime: stat.atime,
    mtime: stat.mtime,
    ctime: stat.ctime,
    blksize: stat.blksize,
    blocks: stat.blocks
   };
  },
  setattr: function(node, attr) {
   var path = NODEFS.realPath(node);
   try {
    if (attr.mode !== undefined) {
     fs.chmodSync(path, attr.mode);
     node.mode = attr.mode;
    }
    if (attr.timestamp !== undefined) {
     var date = new Date(attr.timestamp);
     fs.utimesSync(path, date, date);
    }
    if (attr.size !== undefined) {
     fs.truncateSync(path, attr.size);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  lookup: function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   var mode = NODEFS.getMode(path);
   return NODEFS.createNode(parent, name, mode);
  },
  mknod: function(parent, name, mode, dev) {
   var node = NODEFS.createNode(parent, name, mode, dev);
   var path = NODEFS.realPath(node);
   try {
    if (FS.isDir(node.mode)) {
     fs.mkdirSync(path, node.mode);
    } else {
     fs.writeFileSync(path, "", {
      mode: node.mode
     });
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return node;
  },
  rename: function(oldNode, newDir, newName) {
   var oldPath = NODEFS.realPath(oldNode);
   var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
   try {
    fs.renameSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  unlink: function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.unlinkSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  rmdir: function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.rmdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  readdir: function(node) {
   var path = NODEFS.realPath(node);
   try {
    return fs.readdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  symlink: function(parent, newName, oldPath) {
   var newPath = PATH.join2(NODEFS.realPath(parent), newName);
   try {
    fs.symlinkSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  readlink: function(node) {
   var path = NODEFS.realPath(node);
   try {
    path = fs.readlinkSync(path);
    path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
    return path;
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }
 },
 stream_ops: {
  open: function(stream) {
   var path = NODEFS.realPath(stream.node);
   try {
    if (FS.isFile(stream.node.mode)) {
     stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags));
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  close: function(stream) {
   try {
    if (FS.isFile(stream.node.mode) && stream.nfd) {
     fs.closeSync(stream.nfd);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  read: function(stream, buffer, offset, length, position) {
   if (length === 0) return 0;
   try {
    return fs.readSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  write: function(stream, buffer, offset, length, position) {
   try {
    return fs.writeSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  llseek: function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     try {
      var stat = fs.fstatSync(stream.nfd);
      position += stat.size;
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES[e.code]);
     }
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  }
 }
};

var WORKERFS = {
 DIR_MODE: 16895,
 FILE_MODE: 33279,
 reader: null,
 mount: function(mount) {
  assert(ENVIRONMENT_IS_WORKER);
  if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
  var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
  var createdParents = {};
  function ensureParent(path) {
   var parts = path.split("/");
   var parent = root;
   for (var i = 0; i < parts.length - 1; i++) {
    var curr = parts.slice(0, i + 1).join("/");
    if (!createdParents[curr]) {
     createdParents[curr] = WORKERFS.createNode(parent, parts[i], WORKERFS.DIR_MODE, 0);
    }
    parent = createdParents[curr];
   }
   return parent;
  }
  function base(path) {
   var parts = path.split("/");
   return parts[parts.length - 1];
  }
  Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
   WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
  });
  (mount.opts["blobs"] || []).forEach(function(obj) {
   WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
  });
  (mount.opts["packages"] || []).forEach(function(pack) {
   pack["metadata"].files.forEach(function(file) {
    var name = file.filename.substr(1);
    WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack["blob"].slice(file.start, file.end));
   });
  });
  return root;
 },
 createNode: function(parent, name, mode, dev, contents, mtime) {
  var node = FS.createNode(parent, name, mode);
  node.mode = mode;
  node.node_ops = WORKERFS.node_ops;
  node.stream_ops = WORKERFS.stream_ops;
  node.timestamp = (mtime || new Date()).getTime();
  assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
  if (mode === WORKERFS.FILE_MODE) {
   node.size = contents.size;
   node.contents = contents;
  } else {
   node.size = 4096;
   node.contents = {};
  }
  if (parent) {
   parent.contents[name] = node;
  }
  return node;
 },
 node_ops: {
  getattr: function(node) {
   return {
    dev: 1,
    ino: undefined,
    mode: node.mode,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: undefined,
    size: node.size,
    atime: new Date(node.timestamp),
    mtime: new Date(node.timestamp),
    ctime: new Date(node.timestamp),
    blksize: 4096,
    blocks: Math.ceil(node.size / 4096)
   };
  },
  setattr: function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
  },
  lookup: function(parent, name) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  },
  mknod: function(parent, name, mode, dev) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  rename: function(oldNode, newDir, newName) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  unlink: function(parent, name) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  rmdir: function(parent, name) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  readdir: function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  },
  symlink: function(parent, newName, oldPath) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  readlink: function(node) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
 },
 stream_ops: {
  read: function(stream, buffer, offset, length, position) {
   if (position >= stream.node.size) return 0;
   var chunk = stream.node.contents.slice(position, position + length);
   var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
   buffer.set(new Uint8Array(ab), offset);
   return chunk.size;
  },
  write: function(stream, buffer, offset, length, position) {
   throw new FS.ErrnoError(ERRNO_CODES.EIO);
  },
  llseek: function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.size;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  }
 }
};

var FS = {
 root: null,
 mounts: [],
 devices: {},
 streams: [],
 nextInode: 1,
 nameTable: null,
 currentPath: "/",
 initialized: false,
 ignorePermissions: true,
 trackingDelegate: {},
 tracking: {
  openFlags: {
   READ: 1,
   WRITE: 2
  }
 },
 ErrnoError: null,
 genericErrors: {},
 filesystems: null,
 syncFSRequests: 0,
 handleFSError: function(e) {
  if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
  return ___setErrNo(e.errno);
 },
 lookupPath: function(path, opts) {
  path = PATH.resolve(FS.cwd(), path);
  opts = opts || {};
  if (!path) return {
   path: "",
   node: null
  };
  var defaults = {
   follow_mount: true,
   recurse_count: 0
  };
  for (var key in defaults) {
   if (opts[key] === undefined) {
    opts[key] = defaults[key];
   }
  }
  if (opts.recurse_count > 8) {
   throw new FS.ErrnoError(40);
  }
  var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
   return !!p;
  }), false);
  var current = FS.root;
  var current_path = "/";
  for (var i = 0; i < parts.length; i++) {
   var islast = i === parts.length - 1;
   if (islast && opts.parent) {
    break;
   }
   current = FS.lookupNode(current, parts[i]);
   current_path = PATH.join2(current_path, parts[i]);
   if (FS.isMountpoint(current)) {
    if (!islast || islast && opts.follow_mount) {
     current = current.mounted.root;
    }
   }
   if (!islast || opts.follow) {
    var count = 0;
    while (FS.isLink(current.mode)) {
     var link = FS.readlink(current_path);
     current_path = PATH.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     });
     current = lookup.node;
     if (count++ > 40) {
      throw new FS.ErrnoError(40);
     }
    }
   }
  }
  return {
   path: current_path,
   node: current
  };
 },
 getPath: function(node) {
  var path;
  while (true) {
   if (FS.isRoot(node)) {
    var mount = node.mount.mountpoint;
    if (!path) return mount;
    return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
   }
   path = path ? node.name + "/" + path : node.name;
   node = node.parent;
  }
 },
 hashName: function(parentid, name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
   hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
  }
  return (parentid + hash >>> 0) % FS.nameTable.length;
 },
 hashAddNode: function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  node.name_next = FS.nameTable[hash];
  FS.nameTable[hash] = node;
 },
 hashRemoveNode: function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  if (FS.nameTable[hash] === node) {
   FS.nameTable[hash] = node.name_next;
  } else {
   var current = FS.nameTable[hash];
   while (current) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  }
 },
 lookupNode: function(parent, name) {
  var err = FS.mayLookup(parent);
  if (err) {
   throw new FS.ErrnoError(err, parent);
  }
  var hash = FS.hashName(parent.id, name);
  for (var node = FS.nameTable[hash]; node; node = node.name_next) {
   var nodeName = node.name;
   if (node.parent.id === parent.id && nodeName === name) {
    return node;
   }
  }
  return FS.lookup(parent, name);
 },
 createNode: function(parent, name, mode, rdev) {
  if (!FS.FSNode) {
   FS.FSNode = function(parent, name, mode, rdev) {
    if (!parent) {
     parent = this;
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
   };
   FS.FSNode.prototype = {};
   var readMode = 292 | 73;
   var writeMode = 146;
   Object.defineProperties(FS.FSNode.prototype, {
    read: {
     get: function() {
      return (this.mode & readMode) === readMode;
     },
     set: function(val) {
      val ? this.mode |= readMode : this.mode &= ~readMode;
     }
    },
    write: {
     get: function() {
      return (this.mode & writeMode) === writeMode;
     },
     set: function(val) {
      val ? this.mode |= writeMode : this.mode &= ~writeMode;
     }
    },
    isFolder: {
     get: function() {
      return FS.isDir(this.mode);
     }
    },
    isDevice: {
     get: function() {
      return FS.isChrdev(this.mode);
     }
    }
   });
  }
  var node = new FS.FSNode(parent, name, mode, rdev);
  FS.hashAddNode(node);
  return node;
 },
 destroyNode: function(node) {
  FS.hashRemoveNode(node);
 },
 isRoot: function(node) {
  return node === node.parent;
 },
 isMountpoint: function(node) {
  return !!node.mounted;
 },
 isFile: function(mode) {
  return (mode & 61440) === 32768;
 },
 isDir: function(mode) {
  return (mode & 61440) === 16384;
 },
 isLink: function(mode) {
  return (mode & 61440) === 40960;
 },
 isChrdev: function(mode) {
  return (mode & 61440) === 8192;
 },
 isBlkdev: function(mode) {
  return (mode & 61440) === 24576;
 },
 isFIFO: function(mode) {
  return (mode & 61440) === 4096;
 },
 isSocket: function(mode) {
  return (mode & 49152) === 49152;
 },
 flagModes: {
  "r": 0,
  "rs": 1052672,
  "r+": 2,
  "w": 577,
  "wx": 705,
  "xw": 705,
  "w+": 578,
  "wx+": 706,
  "xw+": 706,
  "a": 1089,
  "ax": 1217,
  "xa": 1217,
  "a+": 1090,
  "ax+": 1218,
  "xa+": 1218
 },
 modeStringToFlags: function(str) {
  var flags = FS.flagModes[str];
  if (typeof flags === "undefined") {
   throw new Error("Unknown file open mode: " + str);
  }
  return flags;
 },
 flagsToPermissionString: function(flag) {
  var perms = [ "r", "w", "rw" ][flag & 3];
  if (flag & 512) {
   perms += "w";
  }
  return perms;
 },
 nodePermissions: function(node, perms) {
  if (FS.ignorePermissions) {
   return 0;
  }
  if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
   return 13;
  } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
   return 13;
  } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
   return 13;
  }
  return 0;
 },
 mayLookup: function(dir) {
  var err = FS.nodePermissions(dir, "x");
  if (err) return err;
  if (!dir.node_ops.lookup) return 13;
  return 0;
 },
 mayCreate: function(dir, name) {
  try {
   var node = FS.lookupNode(dir, name);
   return 17;
  } catch (e) {}
  return FS.nodePermissions(dir, "wx");
 },
 mayDelete: function(dir, name, isdir) {
  var node;
  try {
   node = FS.lookupNode(dir, name);
  } catch (e) {
   return e.errno;
  }
  var err = FS.nodePermissions(dir, "wx");
  if (err) {
   return err;
  }
  if (isdir) {
   if (!FS.isDir(node.mode)) {
    return 20;
   }
   if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
    return 16;
   }
  } else {
   if (FS.isDir(node.mode)) {
    return 21;
   }
  }
  return 0;
 },
 mayOpen: function(node, flags) {
  if (!node) {
   return 2;
  }
  if (FS.isLink(node.mode)) {
   return 40;
  } else if (FS.isDir(node.mode)) {
   if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
    return 21;
   }
  }
  return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
 },
 MAX_OPEN_FDS: 4096,
 nextfd: function(fd_start, fd_end) {
  fd_start = fd_start || 0;
  fd_end = fd_end || FS.MAX_OPEN_FDS;
  for (var fd = fd_start; fd <= fd_end; fd++) {
   if (!FS.streams[fd]) {
    return fd;
   }
  }
  throw new FS.ErrnoError(24);
 },
 getStream: function(fd) {
  return FS.streams[fd];
 },
 createStream: function(stream, fd_start, fd_end) {
  if (!FS.FSStream) {
   FS.FSStream = function() {};
   FS.FSStream.prototype = {};
   Object.defineProperties(FS.FSStream.prototype, {
    object: {
     get: function() {
      return this.node;
     },
     set: function(val) {
      this.node = val;
     }
    },
    isRead: {
     get: function() {
      return (this.flags & 2097155) !== 1;
     }
    },
    isWrite: {
     get: function() {
      return (this.flags & 2097155) !== 0;
     }
    },
    isAppend: {
     get: function() {
      return this.flags & 1024;
     }
    }
   });
  }
  var newStream = new FS.FSStream();
  for (var p in stream) {
   newStream[p] = stream[p];
  }
  stream = newStream;
  var fd = FS.nextfd(fd_start, fd_end);
  stream.fd = fd;
  FS.streams[fd] = stream;
  return stream;
 },
 closeStream: function(fd) {
  FS.streams[fd] = null;
 },
 chrdev_stream_ops: {
  open: function(stream) {
   var device = FS.getDevice(stream.node.rdev);
   stream.stream_ops = device.stream_ops;
   if (stream.stream_ops.open) {
    stream.stream_ops.open(stream);
   }
  },
  llseek: function() {
   throw new FS.ErrnoError(29);
  }
 },
 major: function(dev) {
  return dev >> 8;
 },
 minor: function(dev) {
  return dev & 255;
 },
 makedev: function(ma, mi) {
  return ma << 8 | mi;
 },
 registerDevice: function(dev, ops) {
  FS.devices[dev] = {
   stream_ops: ops
  };
 },
 getDevice: function(dev) {
  return FS.devices[dev];
 },
 getMounts: function(mount) {
  var mounts = [];
  var check = [ mount ];
  while (check.length) {
   var m = check.pop();
   mounts.push(m);
   check.push.apply(check, m.mounts);
  }
  return mounts;
 },
 syncfs: function(populate, callback) {
  if (typeof populate === "function") {
   callback = populate;
   populate = false;
  }
  FS.syncFSRequests++;
  if (FS.syncFSRequests > 1) {
   console.log("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work");
  }
  var mounts = FS.getMounts(FS.root.mount);
  var completed = 0;
  function doCallback(err) {
   FS.syncFSRequests--;
   return callback(err);
  }
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return doCallback(err);
    }
    return;
   }
   if (++completed >= mounts.length) {
    doCallback(null);
   }
  }
  mounts.forEach(function(mount) {
   if (!mount.type.syncfs) {
    return done(null);
   }
   mount.type.syncfs(mount, populate, done);
  });
 },
 mount: function(type, opts, mountpoint) {
  var root = mountpoint === "/";
  var pseudo = !mountpoint;
  var node;
  if (root && FS.root) {
   throw new FS.ErrnoError(16);
  } else if (!root && !pseudo) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: false
   });
   mountpoint = lookup.path;
   node = lookup.node;
   if (FS.isMountpoint(node)) {
    throw new FS.ErrnoError(16);
   }
   if (!FS.isDir(node.mode)) {
    throw new FS.ErrnoError(20);
   }
  }
  var mount = {
   type: type,
   opts: opts,
   mountpoint: mountpoint,
   mounts: []
  };
  var mountRoot = type.mount(mount);
  mountRoot.mount = mount;
  mount.root = mountRoot;
  if (root) {
   FS.root = mountRoot;
  } else if (node) {
   node.mounted = mount;
   if (node.mount) {
    node.mount.mounts.push(mount);
   }
  }
  return mountRoot;
 },
 unmount: function(mountpoint) {
  var lookup = FS.lookupPath(mountpoint, {
   follow_mount: false
  });
  if (!FS.isMountpoint(lookup.node)) {
   throw new FS.ErrnoError(22);
  }
  var node = lookup.node;
  var mount = node.mounted;
  var mounts = FS.getMounts(mount);
  Object.keys(FS.nameTable).forEach(function(hash) {
   var current = FS.nameTable[hash];
   while (current) {
    var next = current.name_next;
    if (mounts.indexOf(current.mount) !== -1) {
     FS.destroyNode(current);
    }
    current = next;
   }
  });
  node.mounted = null;
  var idx = node.mount.mounts.indexOf(mount);
  node.mount.mounts.splice(idx, 1);
 },
 lookup: function(parent, name) {
  return parent.node_ops.lookup(parent, name);
 },
 mknod: function(path, mode, dev) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  if (!name || name === "." || name === "..") {
   throw new FS.ErrnoError(22);
  }
  var err = FS.mayCreate(parent, name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.mknod) {
   throw new FS.ErrnoError(1);
  }
  return parent.node_ops.mknod(parent, name, mode, dev);
 },
 create: function(path, mode) {
  mode = mode !== undefined ? mode : 438;
  mode &= 4095;
  mode |= 32768;
  return FS.mknod(path, mode, 0);
 },
 mkdir: function(path, mode) {
  mode = mode !== undefined ? mode : 511;
  mode &= 511 | 512;
  mode |= 16384;
  return FS.mknod(path, mode, 0);
 },
 mkdirTree: function(path, mode) {
  var dirs = path.split("/");
  var d = "";
  for (var i = 0; i < dirs.length; ++i) {
   if (!dirs[i]) continue;
   d += "/" + dirs[i];
   try {
    FS.mkdir(d, mode);
   } catch (e) {
    if (e.errno != 17) throw e;
   }
  }
 },
 mkdev: function(path, mode, dev) {
  if (typeof dev === "undefined") {
   dev = mode;
   mode = 438;
  }
  mode |= 8192;
  return FS.mknod(path, mode, dev);
 },
 symlink: function(oldpath, newpath) {
  if (!PATH.resolve(oldpath)) {
   throw new FS.ErrnoError(2);
  }
  var lookup = FS.lookupPath(newpath, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(2);
  }
  var newname = PATH.basename(newpath);
  var err = FS.mayCreate(parent, newname);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.symlink) {
   throw new FS.ErrnoError(1);
  }
  return parent.node_ops.symlink(parent, newname, oldpath);
 },
 rename: function(old_path, new_path) {
  var old_dirname = PATH.dirname(old_path);
  var new_dirname = PATH.dirname(new_path);
  var old_name = PATH.basename(old_path);
  var new_name = PATH.basename(new_path);
  var lookup, old_dir, new_dir;
  try {
   lookup = FS.lookupPath(old_path, {
    parent: true
   });
   old_dir = lookup.node;
   lookup = FS.lookupPath(new_path, {
    parent: true
   });
   new_dir = lookup.node;
  } catch (e) {
   throw new FS.ErrnoError(16);
  }
  if (!old_dir || !new_dir) throw new FS.ErrnoError(2);
  if (old_dir.mount !== new_dir.mount) {
   throw new FS.ErrnoError(18);
  }
  var old_node = FS.lookupNode(old_dir, old_name);
  var relative = PATH.relative(old_path, new_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(22);
  }
  relative = PATH.relative(new_path, old_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(39);
  }
  var new_node;
  try {
   new_node = FS.lookupNode(new_dir, new_name);
  } catch (e) {}
  if (old_node === new_node) {
   return;
  }
  var isdir = FS.isDir(old_node.mode);
  var err = FS.mayDelete(old_dir, old_name, isdir);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!old_dir.node_ops.rename) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
   throw new FS.ErrnoError(16);
  }
  if (new_dir !== old_dir) {
   err = FS.nodePermissions(old_dir, "w");
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  try {
   if (FS.trackingDelegate["willMovePath"]) {
    FS.trackingDelegate["willMovePath"](old_path, new_path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
  FS.hashRemoveNode(old_node);
  try {
   old_dir.node_ops.rename(old_node, new_dir, new_name);
  } catch (e) {
   throw e;
  } finally {
   FS.hashAddNode(old_node);
  }
  try {
   if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path);
  } catch (e) {
   console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
 },
 rmdir: function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, true);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.rmdir) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(16);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.rmdir(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 },
 readdir: function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node.node_ops.readdir) {
   throw new FS.ErrnoError(20);
  }
  return node.node_ops.readdir(node);
 },
 unlink: function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, false);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.unlink) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(16);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.unlink(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 },
 readlink: function(path) {
  var lookup = FS.lookupPath(path);
  var link = lookup.node;
  if (!link) {
   throw new FS.ErrnoError(2);
  }
  if (!link.node_ops.readlink) {
   throw new FS.ErrnoError(22);
  }
  return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
 },
 stat: function(path, dontFollow) {
  var lookup = FS.lookupPath(path, {
   follow: !dontFollow
  });
  var node = lookup.node;
  if (!node) {
   throw new FS.ErrnoError(2);
  }
  if (!node.node_ops.getattr) {
   throw new FS.ErrnoError(1);
  }
  return node.node_ops.getattr(node);
 },
 lstat: function(path) {
  return FS.stat(path, true);
 },
 chmod: function(path, mode, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(1);
  }
  node.node_ops.setattr(node, {
   mode: mode & 4095 | node.mode & ~4095,
   timestamp: Date.now()
  });
 },
 lchmod: function(path, mode) {
  FS.chmod(path, mode, true);
 },
 fchmod: function(fd, mode) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(9);
  }
  FS.chmod(stream.node, mode);
 },
 chown: function(path, uid, gid, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(1);
  }
  node.node_ops.setattr(node, {
   timestamp: Date.now()
  });
 },
 lchown: function(path, uid, gid) {
  FS.chown(path, uid, gid, true);
 },
 fchown: function(fd, uid, gid) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(9);
  }
  FS.chown(stream.node, uid, gid);
 },
 truncate: function(path, len) {
  if (len < 0) {
   throw new FS.ErrnoError(22);
  }
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: true
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isDir(node.mode)) {
   throw new FS.ErrnoError(21);
  }
  if (!FS.isFile(node.mode)) {
   throw new FS.ErrnoError(22);
  }
  var err = FS.nodePermissions(node, "w");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  node.node_ops.setattr(node, {
   size: len,
   timestamp: Date.now()
  });
 },
 ftruncate: function(fd, len) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(9);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(22);
  }
  FS.truncate(stream.node, len);
 },
 utime: function(path, atime, mtime) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  node.node_ops.setattr(node, {
   timestamp: Math.max(atime, mtime)
  });
 },
 open: function(path, flags, mode, fd_start, fd_end) {
  if (path === "") {
   throw new FS.ErrnoError(2);
  }
  flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
  mode = typeof mode === "undefined" ? 438 : mode;
  if (flags & 64) {
   mode = mode & 4095 | 32768;
  } else {
   mode = 0;
  }
  var node;
  if (typeof path === "object") {
   node = path;
  } else {
   path = PATH.normalize(path);
   try {
    var lookup = FS.lookupPath(path, {
     follow: !(flags & 131072)
    });
    node = lookup.node;
   } catch (e) {}
  }
  var created = false;
  if (flags & 64) {
   if (node) {
    if (flags & 128) {
     throw new FS.ErrnoError(17);
    }
   } else {
    node = FS.mknod(path, mode, 0);
    created = true;
   }
  }
  if (!node) {
   throw new FS.ErrnoError(2);
  }
  if (FS.isChrdev(node.mode)) {
   flags &= ~512;
  }
  if (flags & 65536 && !FS.isDir(node.mode)) {
   throw new FS.ErrnoError(20);
  }
  if (!created) {
   var err = FS.mayOpen(node, flags);
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  if (flags & 512) {
   FS.truncate(node, 0);
  }
  flags &= ~(128 | 512);
  var stream = FS.createStream({
   node: node,
   path: FS.getPath(node),
   flags: flags,
   seekable: true,
   position: 0,
   stream_ops: node.stream_ops,
   ungotten: [],
   error: false
  }, fd_start, fd_end);
  if (stream.stream_ops.open) {
   stream.stream_ops.open(stream);
  }
  if (Module["logReadFiles"] && !(flags & 1)) {
   if (!FS.readFiles) FS.readFiles = {};
   if (!(path in FS.readFiles)) {
    FS.readFiles[path] = 1;
    console.log("FS.trackingDelegate error on read file: " + path);
   }
  }
  try {
   if (FS.trackingDelegate["onOpenFile"]) {
    var trackingFlags = 0;
    if ((flags & 2097155) !== 1) {
     trackingFlags |= FS.tracking.openFlags.READ;
    }
    if ((flags & 2097155) !== 0) {
     trackingFlags |= FS.tracking.openFlags.WRITE;
    }
    FS.trackingDelegate["onOpenFile"](path, trackingFlags);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
  }
  return stream;
 },
 close: function(stream) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if (stream.getdents) stream.getdents = null;
  try {
   if (stream.stream_ops.close) {
    stream.stream_ops.close(stream);
   }
  } catch (e) {
   throw e;
  } finally {
   FS.closeStream(stream.fd);
  }
  stream.fd = null;
 },
 isClosed: function(stream) {
  return stream.fd === null;
 },
 llseek: function(stream, offset, whence) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if (!stream.seekable || !stream.stream_ops.llseek) {
   throw new FS.ErrnoError(29);
  }
  if (whence != 0 && whence != 1 && whence != 2) {
   throw new FS.ErrnoError(22);
  }
  stream.position = stream.stream_ops.llseek(stream, offset, whence);
  stream.ungotten = [];
  return stream.position;
 },
 read: function(stream, buffer, offset, length, position) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(22);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(9);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(21);
  }
  if (!stream.stream_ops.read) {
   throw new FS.ErrnoError(22);
  }
  var seeking = typeof position !== "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(29);
  }
  var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
  if (!seeking) stream.position += bytesRead;
  return bytesRead;
 },
 write: function(stream, buffer, offset, length, position, canOwn) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(22);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(9);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(21);
  }
  if (!stream.stream_ops.write) {
   throw new FS.ErrnoError(22);
  }
  if (stream.flags & 1024) {
   FS.llseek(stream, 0, 2);
  }
  var seeking = typeof position !== "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(29);
  }
  var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
  if (!seeking) stream.position += bytesWritten;
  try {
   if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path);
  } catch (e) {
   console.log("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message);
  }
  return bytesWritten;
 },
 allocate: function(stream, offset, length) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if (offset < 0 || length <= 0) {
   throw new FS.ErrnoError(22);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(9);
  }
  if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(19);
  }
  if (!stream.stream_ops.allocate) {
   throw new FS.ErrnoError(95);
  }
  stream.stream_ops.allocate(stream, offset, length);
 },
 mmap: function(stream, buffer, offset, length, position, prot, flags) {
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(13);
  }
  if (!stream.stream_ops.mmap) {
   throw new FS.ErrnoError(19);
  }
  return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
 },
 msync: function(stream, buffer, offset, length, mmapFlags) {
  if (!stream || !stream.stream_ops.msync) {
   return 0;
  }
  return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
 },
 munmap: function(stream) {
  return 0;
 },
 ioctl: function(stream, cmd, arg) {
  if (!stream.stream_ops.ioctl) {
   throw new FS.ErrnoError(25);
  }
  return stream.stream_ops.ioctl(stream, cmd, arg);
 },
 readFile: function(path, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "r";
  opts.encoding = opts.encoding || "binary";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var ret;
  var stream = FS.open(path, opts.flags);
  var stat = FS.stat(path);
  var length = stat.size;
  var buf = new Uint8Array(length);
  FS.read(stream, buf, 0, length, 0);
  if (opts.encoding === "utf8") {
   ret = UTF8ArrayToString(buf, 0);
  } else if (opts.encoding === "binary") {
   ret = buf;
  }
  FS.close(stream);
  return ret;
 },
 writeFile: function(path, data, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "w";
  var stream = FS.open(path, opts.flags, opts.mode);
  if (typeof data === "string") {
   var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
   var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
   FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
  } else if (ArrayBuffer.isView(data)) {
   FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
  } else {
   throw new Error("Unsupported data type");
  }
  FS.close(stream);
 },
 cwd: function() {
  return FS.currentPath;
 },
 chdir: function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  if (lookup.node === null) {
   throw new FS.ErrnoError(2);
  }
  if (!FS.isDir(lookup.node.mode)) {
   throw new FS.ErrnoError(20);
  }
  var err = FS.nodePermissions(lookup.node, "x");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  FS.currentPath = lookup.path;
 },
 createDefaultDirectories: function() {
  FS.mkdir("/tmp");
  FS.mkdir("/home");
  FS.mkdir("/home/web_user");
 },
 createDefaultDevices: function() {
  FS.mkdir("/dev");
  FS.registerDevice(FS.makedev(1, 3), {
   read: function() {
    return 0;
   },
   write: function(stream, buffer, offset, length, pos) {
    return length;
   }
  });
  FS.mkdev("/dev/null", FS.makedev(1, 3));
  TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
  TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
  FS.mkdev("/dev/tty", FS.makedev(5, 0));
  FS.mkdev("/dev/tty1", FS.makedev(6, 0));
  var random_device;
  if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
   var randomBuffer = new Uint8Array(1);
   random_device = function() {
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0];
   };
  } else if (ENVIRONMENT_IS_NODE) {
   try {
    var crypto_module = require("crypto");
    random_device = function() {
     return crypto_module["randomBytes"](1)[0];
    };
   } catch (e) {}
  } else {}
  if (!random_device) {
   random_device = function() {
    abort("random_device");
   };
  }
  FS.createDevice("/dev", "random", random_device);
  FS.createDevice("/dev", "urandom", random_device);
  FS.mkdir("/dev/shm");
  FS.mkdir("/dev/shm/tmp");
 },
 createSpecialDirectories: function() {
  FS.mkdir("/proc");
  FS.mkdir("/proc/self");
  FS.mkdir("/proc/self/fd");
  FS.mount({
   mount: function() {
    var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
    node.node_ops = {
     lookup: function(parent, name) {
      var fd = +name;
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(9);
      var ret = {
       parent: null,
       mount: {
        mountpoint: "fake"
       },
       node_ops: {
        readlink: function() {
         return stream.path;
        }
       }
      };
      ret.parent = ret;
      return ret;
     }
    };
    return node;
   }
  }, {}, "/proc/self/fd");
 },
 createStandardStreams: function() {
  if (Module["stdin"]) {
   FS.createDevice("/dev", "stdin", Module["stdin"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdin");
  }
  if (Module["stdout"]) {
   FS.createDevice("/dev", "stdout", null, Module["stdout"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdout");
  }
  if (Module["stderr"]) {
   FS.createDevice("/dev", "stderr", null, Module["stderr"]);
  } else {
   FS.symlink("/dev/tty1", "/dev/stderr");
  }
  var stdin = FS.open("/dev/stdin", "r");
  var stdout = FS.open("/dev/stdout", "w");
  var stderr = FS.open("/dev/stderr", "w");
 },
 ensureErrnoError: function() {
  if (FS.ErrnoError) return;
  FS.ErrnoError = function ErrnoError(errno, node) {
   this.node = node;
   this.setErrno = function(errno) {
    this.errno = errno;
   };
   this.setErrno(errno);
   this.message = "FS error";
   if (this.stack) Object.defineProperty(this, "stack", {
    value: new Error().stack,
    writable: true
   });
  };
  FS.ErrnoError.prototype = new Error();
  FS.ErrnoError.prototype.constructor = FS.ErrnoError;
  [ 2 ].forEach(function(code) {
   FS.genericErrors[code] = new FS.ErrnoError(code);
   FS.genericErrors[code].stack = "<generic error, no stack>";
  });
 },
 staticInit: function() {
  FS.ensureErrnoError();
  FS.nameTable = new Array(4096);
  FS.mount(MEMFS, {}, "/");
  FS.createDefaultDirectories();
  FS.createDefaultDevices();
  FS.createSpecialDirectories();
  FS.filesystems = {
   "MEMFS": MEMFS,
   "IDBFS": IDBFS,
   "NODEFS": NODEFS,
   "WORKERFS": WORKERFS
  };
 },
 init: function(input, output, error) {
  FS.init.initialized = true;
  FS.ensureErrnoError();
  Module["stdin"] = input || Module["stdin"];
  Module["stdout"] = output || Module["stdout"];
  Module["stderr"] = error || Module["stderr"];
  FS.createStandardStreams();
 },
 quit: function() {
  FS.init.initialized = false;
  var fflush = Module["_fflush"];
  if (fflush) fflush(0);
  for (var i = 0; i < FS.streams.length; i++) {
   var stream = FS.streams[i];
   if (!stream) {
    continue;
   }
   FS.close(stream);
  }
 },
 getMode: function(canRead, canWrite) {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
 },
 joinPath: function(parts, forceRelative) {
  var path = PATH.join.apply(null, parts);
  if (forceRelative && path[0] == "/") path = path.substr(1);
  return path;
 },
 absolutePath: function(relative, base) {
  return PATH.resolve(base, relative);
 },
 standardizePath: function(path) {
  return PATH.normalize(path);
 },
 findObject: function(path, dontResolveLastLink) {
  var ret = FS.analyzePath(path, dontResolveLastLink);
  if (ret.exists) {
   return ret.object;
  } else {
   ___setErrNo(ret.error);
   return null;
  }
 },
 analyzePath: function(path, dontResolveLastLink) {
  try {
   var lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   path = lookup.path;
  } catch (e) {}
  var ret = {
   isRoot: false,
   exists: false,
   error: 0,
   name: null,
   path: null,
   object: null,
   parentExists: false,
   parentPath: null,
   parentObject: null
  };
  try {
   var lookup = FS.lookupPath(path, {
    parent: true
   });
   ret.parentExists = true;
   ret.parentPath = lookup.path;
   ret.parentObject = lookup.node;
   ret.name = PATH.basename(path);
   lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   ret.exists = true;
   ret.path = lookup.path;
   ret.object = lookup.node;
   ret.name = lookup.node.name;
   ret.isRoot = lookup.path === "/";
  } catch (e) {
   ret.error = e.errno;
  }
  return ret;
 },
 createFolder: function(parent, name, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.mkdir(path, mode);
 },
 createPath: function(parent, path, canRead, canWrite) {
  parent = typeof parent === "string" ? parent : FS.getPath(parent);
  var parts = path.split("/").reverse();
  while (parts.length) {
   var part = parts.pop();
   if (!part) continue;
   var current = PATH.join2(parent, part);
   try {
    FS.mkdir(current);
   } catch (e) {}
   parent = current;
  }
  return current;
 },
 createFile: function(parent, name, properties, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.create(path, mode);
 },
 createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
  var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
  var mode = FS.getMode(canRead, canWrite);
  var node = FS.create(path, mode);
  if (data) {
   if (typeof data === "string") {
    var arr = new Array(data.length);
    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
    data = arr;
   }
   FS.chmod(node, mode | 146);
   var stream = FS.open(node, "w");
   FS.write(stream, data, 0, data.length, 0, canOwn);
   FS.close(stream);
   FS.chmod(node, mode);
  }
  return node;
 },
 createDevice: function(parent, name, input, output) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(!!input, !!output);
  if (!FS.createDevice.major) FS.createDevice.major = 64;
  var dev = FS.makedev(FS.createDevice.major++, 0);
  FS.registerDevice(dev, {
   open: function(stream) {
    stream.seekable = false;
   },
   close: function(stream) {
    if (output && output.buffer && output.buffer.length) {
     output(10);
    }
   },
   read: function(stream, buffer, offset, length, pos) {
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
     var result;
     try {
      result = input();
     } catch (e) {
      throw new FS.ErrnoError(5);
     }
     if (result === undefined && bytesRead === 0) {
      throw new FS.ErrnoError(11);
     }
     if (result === null || result === undefined) break;
     bytesRead++;
     buffer[offset + i] = result;
    }
    if (bytesRead) {
     stream.node.timestamp = Date.now();
    }
    return bytesRead;
   },
   write: function(stream, buffer, offset, length, pos) {
    for (var i = 0; i < length; i++) {
     try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(5);
     }
    }
    if (length) {
     stream.node.timestamp = Date.now();
    }
    return i;
   }
  });
  return FS.mkdev(path, mode, dev);
 },
 createLink: function(parent, name, target, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  return FS.symlink(target, path);
 },
 forceLoadFile: function(obj) {
  if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
  var success = true;
  if (typeof XMLHttpRequest !== "undefined") {
   throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
  } else if (Module["read"]) {
   try {
    obj.contents = intArrayFromString(Module["read"](obj.url), true);
    obj.usedBytes = obj.contents.length;
   } catch (e) {
    success = false;
   }
  } else {
   throw new Error("Cannot load without read() or XMLHttpRequest.");
  }
  if (!success) ___setErrNo(5);
  return success;
 },
 createLazyFile: function(parent, name, url, canRead, canWrite) {
  function LazyUint8Array() {
   this.lengthKnown = false;
   this.chunks = [];
  }
  LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
   if (idx > this.length - 1 || idx < 0) {
    return undefined;
   }
   var chunkOffset = idx % this.chunkSize;
   var chunkNum = idx / this.chunkSize | 0;
   return this.getter(chunkNum)[chunkOffset];
  };
  LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
   this.getter = getter;
  };
  LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
   var xhr = new XMLHttpRequest();
   xhr.open("HEAD", url, false);
   xhr.send(null);
   if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
   var datalength = Number(xhr.getResponseHeader("Content-length"));
   var header;
   var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
   var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
   var chunkSize = 1024 * 1024;
   if (!hasByteServing) chunkSize = datalength;
   var doXHR = function(from, to) {
    if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
    if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
    if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
    if (xhr.overrideMimeType) {
     xhr.overrideMimeType("text/plain; charset=x-user-defined");
    }
    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
    if (xhr.response !== undefined) {
     return new Uint8Array(xhr.response || []);
    } else {
     return intArrayFromString(xhr.responseText || "", true);
    }
   };
   var lazyArray = this;
   lazyArray.setDataGetter(function(chunkNum) {
    var start = chunkNum * chunkSize;
    var end = (chunkNum + 1) * chunkSize - 1;
    end = Math.min(end, datalength - 1);
    if (typeof lazyArray.chunks[chunkNum] === "undefined") {
     lazyArray.chunks[chunkNum] = doXHR(start, end);
    }
    if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
    return lazyArray.chunks[chunkNum];
   });
   if (usesGzip || !datalength) {
    chunkSize = datalength = 1;
    datalength = this.getter(0).length;
    chunkSize = datalength;
    console.log("LazyFiles on gzip forces download of the whole file when length is accessed");
   }
   this._length = datalength;
   this._chunkSize = chunkSize;
   this.lengthKnown = true;
  };
  if (typeof XMLHttpRequest !== "undefined") {
   if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
   var lazyArray = new LazyUint8Array();
   Object.defineProperties(lazyArray, {
    length: {
     get: function() {
      if (!this.lengthKnown) {
       this.cacheLength();
      }
      return this._length;
     }
    },
    chunkSize: {
     get: function() {
      if (!this.lengthKnown) {
       this.cacheLength();
      }
      return this._chunkSize;
     }
    }
   });
   var properties = {
    isDevice: false,
    contents: lazyArray
   };
  } else {
   var properties = {
    isDevice: false,
    url: url
   };
  }
  var node = FS.createFile(parent, name, properties, canRead, canWrite);
  if (properties.contents) {
   node.contents = properties.contents;
  } else if (properties.url) {
   node.contents = null;
   node.url = properties.url;
  }
  Object.defineProperties(node, {
   usedBytes: {
    get: function() {
     return this.contents.length;
    }
   }
  });
  var stream_ops = {};
  var keys = Object.keys(node.stream_ops);
  keys.forEach(function(key) {
   var fn = node.stream_ops[key];
   stream_ops[key] = function forceLoadLazyFile() {
    if (!FS.forceLoadFile(node)) {
     throw new FS.ErrnoError(5);
    }
    return fn.apply(null, arguments);
   };
  });
  stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
   if (!FS.forceLoadFile(node)) {
    throw new FS.ErrnoError(5);
   }
   var contents = stream.node.contents;
   if (position >= contents.length) return 0;
   var size = Math.min(contents.length - position, length);
   if (contents.slice) {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents[position + i];
    }
   } else {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents.get(position + i);
    }
   }
   return size;
  };
  node.stream_ops = stream_ops;
  return node;
 },
 createPreloadedFile: function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
  Browser.init();
  var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
  var dep = getUniqueRunDependency("cp " + fullname);
  function processData(byteArray) {
   function finish(byteArray) {
    if (preFinish) preFinish();
    if (!dontCreateFile) {
     FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
    if (onload) onload();
    removeRunDependency(dep);
   }
   var handled = false;
   Module["preloadPlugins"].forEach(function(plugin) {
    if (handled) return;
    if (plugin["canHandle"](fullname)) {
     plugin["handle"](byteArray, fullname, finish, function() {
      if (onerror) onerror();
      removeRunDependency(dep);
     });
     handled = true;
    }
   });
   if (!handled) finish(byteArray);
  }
  addRunDependency(dep);
  if (typeof url == "string") {
   Browser.asyncLoad(url, function(byteArray) {
    processData(byteArray);
   }, onerror);
  } else {
   processData(url);
  }
 },
 indexedDB: function() {
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
 },
 DB_NAME: function() {
  return "EM_FS_" + window.location.pathname;
 },
 DB_VERSION: 20,
 DB_STORE_NAME: "FILE_DATA",
 saveFilesToDB: function(paths, onload, onerror) {
  onload = onload || function() {};
  onerror = onerror || function() {};
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
   console.log("creating db");
   var db = openRequest.result;
   db.createObjectStore(FS.DB_STORE_NAME);
  };
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   var transaction = db.transaction([ FS.DB_STORE_NAME ], "readwrite");
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach(function(path) {
    var putRequest = files.put(FS.analyzePath(path).object.contents, path);
    putRequest.onsuccess = function putRequest_onsuccess() {
     ok++;
     if (ok + fail == total) finish();
    };
    putRequest.onerror = function putRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   });
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 },
 loadFilesFromDB: function(paths, onload, onerror) {
  onload = onload || function() {};
  onerror = onerror || function() {};
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = onerror;
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   try {
    var transaction = db.transaction([ FS.DB_STORE_NAME ], "readonly");
   } catch (e) {
    onerror(e);
    return;
   }
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach(function(path) {
    var getRequest = files.get(path);
    getRequest.onsuccess = function getRequest_onsuccess() {
     if (FS.analyzePath(path).exists) {
      FS.unlink(path);
     }
     FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
     ok++;
     if (ok + fail == total) finish();
    };
    getRequest.onerror = function getRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   });
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 }
};

var ERRNO_CODES = {
 EPERM: 1,
 ENOENT: 2,
 ESRCH: 3,
 EINTR: 4,
 EIO: 5,
 ENXIO: 6,
 E2BIG: 7,
 ENOEXEC: 8,
 EBADF: 9,
 ECHILD: 10,
 EAGAIN: 11,
 EWOULDBLOCK: 11,
 ENOMEM: 12,
 EACCES: 13,
 EFAULT: 14,
 ENOTBLK: 15,
 EBUSY: 16,
 EEXIST: 17,
 EXDEV: 18,
 ENODEV: 19,
 ENOTDIR: 20,
 EISDIR: 21,
 EINVAL: 22,
 ENFILE: 23,
 EMFILE: 24,
 ENOTTY: 25,
 ETXTBSY: 26,
 EFBIG: 27,
 ENOSPC: 28,
 ESPIPE: 29,
 EROFS: 30,
 EMLINK: 31,
 EPIPE: 32,
 EDOM: 33,
 ERANGE: 34,
 ENOMSG: 42,
 EIDRM: 43,
 ECHRNG: 44,
 EL2NSYNC: 45,
 EL3HLT: 46,
 EL3RST: 47,
 ELNRNG: 48,
 EUNATCH: 49,
 ENOCSI: 50,
 EL2HLT: 51,
 EDEADLK: 35,
 ENOLCK: 37,
 EBADE: 52,
 EBADR: 53,
 EXFULL: 54,
 ENOANO: 55,
 EBADRQC: 56,
 EBADSLT: 57,
 EDEADLOCK: 35,
 EBFONT: 59,
 ENOSTR: 60,
 ENODATA: 61,
 ETIME: 62,
 ENOSR: 63,
 ENONET: 64,
 ENOPKG: 65,
 EREMOTE: 66,
 ENOLINK: 67,
 EADV: 68,
 ESRMNT: 69,
 ECOMM: 70,
 EPROTO: 71,
 EMULTIHOP: 72,
 EDOTDOT: 73,
 EBADMSG: 74,
 ENOTUNIQ: 76,
 EBADFD: 77,
 EREMCHG: 78,
 ELIBACC: 79,
 ELIBBAD: 80,
 ELIBSCN: 81,
 ELIBMAX: 82,
 ELIBEXEC: 83,
 ENOSYS: 38,
 ENOTEMPTY: 39,
 ENAMETOOLONG: 36,
 ELOOP: 40,
 EOPNOTSUPP: 95,
 EPFNOSUPPORT: 96,
 ECONNRESET: 104,
 ENOBUFS: 105,
 EAFNOSUPPORT: 97,
 EPROTOTYPE: 91,
 ENOTSOCK: 88,
 ENOPROTOOPT: 92,
 ESHUTDOWN: 108,
 ECONNREFUSED: 111,
 EADDRINUSE: 98,
 ECONNABORTED: 103,
 ENETUNREACH: 101,
 ENETDOWN: 100,
 ETIMEDOUT: 110,
 EHOSTDOWN: 112,
 EHOSTUNREACH: 113,
 EINPROGRESS: 115,
 EALREADY: 114,
 EDESTADDRREQ: 89,
 EMSGSIZE: 90,
 EPROTONOSUPPORT: 93,
 ESOCKTNOSUPPORT: 94,
 EADDRNOTAVAIL: 99,
 ENETRESET: 102,
 EISCONN: 106,
 ENOTCONN: 107,
 ETOOMANYREFS: 109,
 EUSERS: 87,
 EDQUOT: 122,
 ESTALE: 116,
 ENOTSUP: 95,
 ENOMEDIUM: 123,
 EILSEQ: 84,
 EOVERFLOW: 75,
 ECANCELED: 125,
 ENOTRECOVERABLE: 131,
 EOWNERDEAD: 130,
 ESTRPIPE: 86
};

var SYSCALLS = {
 DEFAULT_POLLMASK: 5,
 mappings: {},
 umask: 511,
 calculateAt: function(dirfd, path) {
  if (path[0] !== "/") {
   var dir;
   if (dirfd === -100) {
    dir = FS.cwd();
   } else {
    var dirstream = FS.getStream(dirfd);
    if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    dir = dirstream.path;
   }
   path = PATH.join2(dir, path);
  }
  return path;
 },
 doStat: function(func, path, buf) {
  try {
   var stat = func(path);
  } catch (e) {
   if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
    return -ERRNO_CODES.ENOTDIR;
   }
   throw e;
  }
  HEAP32[buf >> 2] = stat.dev;
  HEAP32[buf + 4 >> 2] = 0;
  HEAP32[buf + 8 >> 2] = stat.ino;
  HEAP32[buf + 12 >> 2] = stat.mode;
  HEAP32[buf + 16 >> 2] = stat.nlink;
  HEAP32[buf + 20 >> 2] = stat.uid;
  HEAP32[buf + 24 >> 2] = stat.gid;
  HEAP32[buf + 28 >> 2] = stat.rdev;
  HEAP32[buf + 32 >> 2] = 0;
  HEAP32[buf + 36 >> 2] = stat.size;
  HEAP32[buf + 40 >> 2] = 4096;
  HEAP32[buf + 44 >> 2] = stat.blocks;
  HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
  HEAP32[buf + 52 >> 2] = 0;
  HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
  HEAP32[buf + 60 >> 2] = 0;
  HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
  HEAP32[buf + 68 >> 2] = 0;
  HEAP32[buf + 72 >> 2] = stat.ino;
  return 0;
 },
 doMsync: function(addr, stream, len, flags) {
  var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
  FS.msync(stream, buffer, 0, len, flags);
 },
 doMkdir: function(path, mode) {
  path = PATH.normalize(path);
  if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
  FS.mkdir(path, mode, 0);
  return 0;
 },
 doMknod: function(path, mode, dev) {
  switch (mode & 61440) {
  case 32768:
  case 8192:
  case 24576:
  case 4096:
  case 49152:
   break;

  default:
   return -ERRNO_CODES.EINVAL;
  }
  FS.mknod(path, mode, dev);
  return 0;
 },
 doReadlink: function(path, buf, bufsize) {
  if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
  var ret = FS.readlink(path);
  var len = Math.min(bufsize, lengthBytesUTF8(ret));
  var endChar = HEAP8[buf + len];
  stringToUTF8(ret, buf, bufsize + 1);
  HEAP8[buf + len] = endChar;
  return len;
 },
 doAccess: function(path, amode) {
  if (amode & ~7) {
   return -ERRNO_CODES.EINVAL;
  }
  var node;
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  node = lookup.node;
  var perms = "";
  if (amode & 4) perms += "r";
  if (amode & 2) perms += "w";
  if (amode & 1) perms += "x";
  if (perms && FS.nodePermissions(node, perms)) {
   return -ERRNO_CODES.EACCES;
  }
  return 0;
 },
 doDup: function(path, flags, suggestFD) {
  var suggest = FS.getStream(suggestFD);
  if (suggest) FS.close(suggest);
  return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
 },
 doReadv: function(stream, iov, iovcnt, offset) {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
   var ptr = HEAP32[iov + i * 8 >> 2];
   var len = HEAP32[iov + (i * 8 + 4) >> 2];
   var curr = FS.read(stream, HEAP8, ptr, len, offset);
   if (curr < 0) return -1;
   ret += curr;
   if (curr < len) break;
  }
  return ret;
 },
 doWritev: function(stream, iov, iovcnt, offset) {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
   var ptr = HEAP32[iov + i * 8 >> 2];
   var len = HEAP32[iov + (i * 8 + 4) >> 2];
   var curr = FS.write(stream, HEAP8, ptr, len, offset);
   if (curr < 0) return -1;
   ret += curr;
  }
  return ret;
 },
 varargs: 0,
 get: function(varargs) {
  SYSCALLS.varargs += 4;
  var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
  return ret;
 },
 getStr: function() {
  var ret = UTF8ToString(SYSCALLS.get());
  return ret;
 },
 getStreamFromFD: function() {
  var stream = FS.getStream(SYSCALLS.get());
  if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  return stream;
 },
 getSocketFromFD: function() {
  var socket = SOCKFS.getSocket(SYSCALLS.get());
  if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  return socket;
 },
 getSocketAddress: function(allowNull) {
  var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
  if (allowNull && addrp === 0) return null;
  var info = __read_sockaddr(addrp, addrlen);
  if (info.errno) throw new FS.ErrnoError(info.errno);
  info.addr = DNS.lookup_addr(info.addr) || info.addr;
  return info;
 },
 get64: function() {
  var low = SYSCALLS.get(), high = SYSCALLS.get();
  return low;
 },
 getZero: function() {
  SYSCALLS.get();
 }
};

function ___syscall10(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var path = SYSCALLS.getStr();
  FS.unlink(path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall140(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
  var offset = offset_low;
  FS.llseek(stream, offset, whence);
  HEAP32[result >> 2] = stream.position;
  if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall145(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
  return SYSCALLS.doReadv(stream, iov, iovcnt);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall146(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
  return SYSCALLS.doWritev(stream, iov, iovcnt);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall196(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var path = SYSCALLS.getStr(), buf = SYSCALLS.get();
  return SYSCALLS.doStat(FS.lstat, path, buf);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall221(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), cmd = SYSCALLS.get();
  switch (cmd) {
  case 0:
   {
    var arg = SYSCALLS.get();
    if (arg < 0) {
     return -ERRNO_CODES.EINVAL;
    }
    var newStream;
    newStream = FS.open(stream.path, stream.flags, 0, arg);
    return newStream.fd;
   }

  case 1:
  case 2:
   return 0;

  case 3:
   return stream.flags;

  case 4:
   {
    var arg = SYSCALLS.get();
    stream.flags |= arg;
    return 0;
   }

  case 12:
   {
    var arg = SYSCALLS.get();
    var offset = 0;
    HEAP16[arg + offset >> 1] = 2;
    return 0;
   }

  case 13:
  case 14:
   return 0;

  case 16:
  case 8:
   return -ERRNO_CODES.EINVAL;

  case 9:
   ___setErrNo(ERRNO_CODES.EINVAL);
   return -1;

  default:
   {
    return -ERRNO_CODES.EINVAL;
   }
  }
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall330(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var old = SYSCALLS.getStreamFromFD(), suggestFD = SYSCALLS.get(), flags = SYSCALLS.get();
  if (old.fd === suggestFD) return -ERRNO_CODES.EINVAL;
  return SYSCALLS.doDup(old.path, old.flags, suggestFD);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall38(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var old_path = SYSCALLS.getStr(), new_path = SYSCALLS.getStr();
  FS.rename(old_path, new_path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall40(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var path = SYSCALLS.getStr();
  FS.rmdir(path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall5(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var pathname = SYSCALLS.getStr(), flags = SYSCALLS.get(), mode = SYSCALLS.get();
  var stream = FS.open(pathname, flags, mode);
  return stream.fd;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall54(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
  switch (op) {
  case 21509:
  case 21505:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  case 21510:
  case 21511:
  case 21512:
  case 21506:
  case 21507:
  case 21508:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  case 21519:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    var argp = SYSCALLS.get();
    HEAP32[argp >> 2] = 0;
    return 0;
   }

  case 21520:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return -ERRNO_CODES.EINVAL;
   }

  case 21531:
   {
    var argp = SYSCALLS.get();
    return FS.ioctl(stream, op, argp);
   }

  case 21523:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  case 21524:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  default:
   abort("bad ioctl syscall " + op);
  }
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall6(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD();
  FS.close(stream);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall63(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var old = SYSCALLS.getStreamFromFD(), suggestFD = SYSCALLS.get();
  if (old.fd === suggestFD) return suggestFD;
  return SYSCALLS.doDup(old.path, old.flags, suggestFD);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall91(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var addr = SYSCALLS.get(), len = SYSCALLS.get();
  var info = SYSCALLS.mappings[addr];
  if (!info) return 0;
  if (len === info.len) {
   var stream = FS.getStream(info.fd);
   SYSCALLS.doMsync(addr, stream, len, info.flags);
   FS.munmap(stream);
   SYSCALLS.mappings[addr] = null;
   if (info.allocated) {
    _free(info.malloc);
   }
  }
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___unlock() {}

function _abort() {
 Module["abort"]();
}

function _clock() {
 if (_clock.start === undefined) _clock.start = Date.now();
 return (Date.now() - _clock.start) * (1e6 / 1e3) | 0;
}

function _difftime(time1, time0) {
 return time1 - time0;
}

function _emscripten_get_heap_size() {
 return HEAP8.length;
}

function abortOnCannotGrowMemory(requestedSize) {
 abort("OOM");
}

function _emscripten_resize_heap(requestedSize) {
 abortOnCannotGrowMemory(requestedSize);
}

function _exit(status) {
 exit(status);
}

function _getenv(name) {
 if (name === 0) return 0;
 name = UTF8ToString(name);
 if (!ENV.hasOwnProperty(name)) return 0;
 if (_getenv.ret) _free(_getenv.ret);
 _getenv.ret = allocateUTF8(ENV[name]);
 return _getenv.ret;
}

var ___tm_current = 21104;

var ___tm_timezone = (stringToUTF8("GMT", 21152, 4), 21152);

function _gmtime_r(time, tmPtr) {
 var date = new Date(HEAP32[time >> 2] * 1e3);
 HEAP32[tmPtr >> 2] = date.getUTCSeconds();
 HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
 HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
 HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
 HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
 HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
 HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
 HEAP32[tmPtr + 36 >> 2] = 0;
 HEAP32[tmPtr + 32 >> 2] = 0;
 var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
 var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
 HEAP32[tmPtr + 28 >> 2] = yday;
 HEAP32[tmPtr + 40 >> 2] = ___tm_timezone;
 return tmPtr;
}

function _gmtime(time) {
 return _gmtime_r(time, ___tm_current);
}

function _llvm_log10_f32(x) {
 return Math.log(x) / Math.LN10;
}

function _llvm_log10_f64(a0) {
 return _llvm_log10_f32(a0);
}

function _llvm_log2_f32(x) {
 return Math.log(x) / Math.LN2;
}

function _llvm_log2_f64(a0) {
 return _llvm_log2_f32(a0);
}

function _tzset() {
 if (_tzset.called) return;
 _tzset.called = true;
 HEAP32[__get_timezone() >> 2] = new Date().getTimezoneOffset() * 60;
 var winter = new Date(2e3, 0, 1);
 var summer = new Date(2e3, 6, 1);
 HEAP32[__get_daylight() >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());
 function extractZone(date) {
  var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
  return match ? match[1] : "GMT";
 }
 var winterName = extractZone(winter);
 var summerName = extractZone(summer);
 var winterNamePtr = allocate(intArrayFromString(winterName), "i8", ALLOC_NORMAL);
 var summerNamePtr = allocate(intArrayFromString(summerName), "i8", ALLOC_NORMAL);
 if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
  HEAP32[__get_tzname() >> 2] = winterNamePtr;
  HEAP32[__get_tzname() + 4 >> 2] = summerNamePtr;
 } else {
  HEAP32[__get_tzname() >> 2] = summerNamePtr;
  HEAP32[__get_tzname() + 4 >> 2] = winterNamePtr;
 }
}

function _localtime_r(time, tmPtr) {
 _tzset();
 var date = new Date(HEAP32[time >> 2] * 1e3);
 HEAP32[tmPtr >> 2] = date.getSeconds();
 HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
 HEAP32[tmPtr + 8 >> 2] = date.getHours();
 HEAP32[tmPtr + 12 >> 2] = date.getDate();
 HEAP32[tmPtr + 16 >> 2] = date.getMonth();
 HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
 HEAP32[tmPtr + 24 >> 2] = date.getDay();
 var start = new Date(date.getFullYear(), 0, 1);
 var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
 HEAP32[tmPtr + 28 >> 2] = yday;
 HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
 var summerOffset = new Date(2e3, 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
 HEAP32[tmPtr + 32 >> 2] = dst;
 var zonePtr = HEAP32[__get_tzname() + (dst ? 4 : 0) >> 2];
 HEAP32[tmPtr + 40 >> 2] = zonePtr;
 return tmPtr;
}

function _localtime(time) {
 return _localtime_r(time, ___tm_current);
}

function _longjmp(env, value) {
 _setThrew(env, value || 1);
 throw "longjmp";
}

function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
}

function _mktime(tmPtr) {
 _tzset();
 var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
 var dst = HEAP32[tmPtr + 32 >> 2];
 var guessedOffset = date.getTimezoneOffset();
 var start = new Date(date.getFullYear(), 0, 1);
 var summerOffset = new Date(2e3, 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dstOffset = Math.min(winterOffset, summerOffset);
 if (dst < 0) {
  HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
 } else if (dst > 0 != (dstOffset == guessedOffset)) {
  var nonDstOffset = Math.max(winterOffset, summerOffset);
  var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
  date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
 }
 HEAP32[tmPtr + 24 >> 2] = date.getDay();
 var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
 HEAP32[tmPtr + 28 >> 2] = yday;
 return date.getTime() / 1e3 | 0;
}

function __isLeapYear(year) {
 return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function __arraySum(array, index) {
 var sum = 0;
 for (var i = 0; i <= index; sum += array[i++]) ;
 return sum;
}

var __MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var __MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

function __addDays(date, days) {
 var newDate = new Date(date.getTime());
 while (days > 0) {
  var leap = __isLeapYear(newDate.getFullYear());
  var currentMonth = newDate.getMonth();
  var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  if (days > daysInCurrentMonth - newDate.getDate()) {
   days -= daysInCurrentMonth - newDate.getDate() + 1;
   newDate.setDate(1);
   if (currentMonth < 11) {
    newDate.setMonth(currentMonth + 1);
   } else {
    newDate.setMonth(0);
    newDate.setFullYear(newDate.getFullYear() + 1);
   }
  } else {
   newDate.setDate(newDate.getDate() + days);
   return newDate;
  }
 }
 return newDate;
}

function _strftime(s, maxsize, format, tm) {
 var tm_zone = HEAP32[tm + 40 >> 2];
 var date = {
  tm_sec: HEAP32[tm >> 2],
  tm_min: HEAP32[tm + 4 >> 2],
  tm_hour: HEAP32[tm + 8 >> 2],
  tm_mday: HEAP32[tm + 12 >> 2],
  tm_mon: HEAP32[tm + 16 >> 2],
  tm_year: HEAP32[tm + 20 >> 2],
  tm_wday: HEAP32[tm + 24 >> 2],
  tm_yday: HEAP32[tm + 28 >> 2],
  tm_isdst: HEAP32[tm + 32 >> 2],
  tm_gmtoff: HEAP32[tm + 36 >> 2],
  tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
 };
 var pattern = UTF8ToString(format);
 var EXPANSION_RULES_1 = {
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m/%d/%y",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%r": "%I:%M:%S %p",
  "%R": "%H:%M",
  "%T": "%H:%M:%S",
  "%x": "%m/%d/%y",
  "%X": "%H:%M:%S"
 };
 for (var rule in EXPANSION_RULES_1) {
  pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
 }
 var WEEKDAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
 var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
 function leadingSomething(value, digits, character) {
  var str = typeof value === "number" ? value.toString() : value || "";
  while (str.length < digits) {
   str = character[0] + str;
  }
  return str;
 }
 function leadingNulls(value, digits) {
  return leadingSomething(value, digits, "0");
 }
 function compareByDay(date1, date2) {
  function sgn(value) {
   return value < 0 ? -1 : value > 0 ? 1 : 0;
  }
  var compare;
  if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
   if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
    compare = sgn(date1.getDate() - date2.getDate());
   }
  }
  return compare;
 }
 function getFirstWeekStartDate(janFourth) {
  switch (janFourth.getDay()) {
  case 0:
   return new Date(janFourth.getFullYear() - 1, 11, 29);

  case 1:
   return janFourth;

  case 2:
   return new Date(janFourth.getFullYear(), 0, 3);

  case 3:
   return new Date(janFourth.getFullYear(), 0, 2);

  case 4:
   return new Date(janFourth.getFullYear(), 0, 1);

  case 5:
   return new Date(janFourth.getFullYear() - 1, 11, 31);

  case 6:
   return new Date(janFourth.getFullYear() - 1, 11, 30);
  }
 }
 function getWeekBasedYear(date) {
  var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
  var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
  var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
  var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
  var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
   if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
    return thisDate.getFullYear() + 1;
   } else {
    return thisDate.getFullYear();
   }
  } else {
   return thisDate.getFullYear() - 1;
  }
 }
 var EXPANSION_RULES_2 = {
  "%a": function(date) {
   return WEEKDAYS[date.tm_wday].substring(0, 3);
  },
  "%A": function(date) {
   return WEEKDAYS[date.tm_wday];
  },
  "%b": function(date) {
   return MONTHS[date.tm_mon].substring(0, 3);
  },
  "%B": function(date) {
   return MONTHS[date.tm_mon];
  },
  "%C": function(date) {
   var year = date.tm_year + 1900;
   return leadingNulls(year / 100 | 0, 2);
  },
  "%d": function(date) {
   return leadingNulls(date.tm_mday, 2);
  },
  "%e": function(date) {
   return leadingSomething(date.tm_mday, 2, " ");
  },
  "%g": function(date) {
   return getWeekBasedYear(date).toString().substring(2);
  },
  "%G": function(date) {
   return getWeekBasedYear(date);
  },
  "%H": function(date) {
   return leadingNulls(date.tm_hour, 2);
  },
  "%I": function(date) {
   var twelveHour = date.tm_hour;
   if (twelveHour == 0) twelveHour = 12; else if (twelveHour > 12) twelveHour -= 12;
   return leadingNulls(twelveHour, 2);
  },
  "%j": function(date) {
   return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3);
  },
  "%m": function(date) {
   return leadingNulls(date.tm_mon + 1, 2);
  },
  "%M": function(date) {
   return leadingNulls(date.tm_min, 2);
  },
  "%n": function() {
   return "\n";
  },
  "%p": function(date) {
   if (date.tm_hour >= 0 && date.tm_hour < 12) {
    return "AM";
   } else {
    return "PM";
   }
  },
  "%S": function(date) {
   return leadingNulls(date.tm_sec, 2);
  },
  "%t": function() {
   return "\t";
  },
  "%u": function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay() || 7;
  },
  "%U": function(date) {
   var janFirst = new Date(date.tm_year + 1900, 0, 1);
   var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstSunday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
    var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00";
  },
  "%V": function(date) {
   var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
   var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
   var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
   var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
   var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
   if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
    return "53";
   }
   if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
    return "01";
   }
   var daysDifference;
   if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
    daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate();
   } else {
    daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate();
   }
   return leadingNulls(Math.ceil(daysDifference / 7), 2);
  },
  "%w": function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay();
  },
  "%W": function(date) {
   var janFirst = new Date(date.tm_year, 0, 1);
   var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstMonday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
    var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00";
  },
  "%y": function(date) {
   return (date.tm_year + 1900).toString().substring(2);
  },
  "%Y": function(date) {
   return date.tm_year + 1900;
  },
  "%z": function(date) {
   var off = date.tm_gmtoff;
   var ahead = off >= 0;
   off = Math.abs(off) / 60;
   off = off / 60 * 100 + off % 60;
   return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
  },
  "%Z": function(date) {
   return date.tm_zone;
  },
  "%%": function() {
   return "%";
  }
 };
 for (var rule in EXPANSION_RULES_2) {
  if (pattern.indexOf(rule) >= 0) {
   pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
  }
 }
 var bytes = intArrayFromString(pattern, false);
 if (bytes.length > maxsize) {
  return 0;
 }
 writeArrayToMemory(bytes, s);
 return bytes.length - 1;
}

function _system(command) {
 ___setErrNo(11);
 return -1;
}

function _time(ptr) {
 var ret = Date.now() / 1e3 | 0;
 if (ptr) {
  HEAP32[ptr >> 2] = ret;
 }
 return ret;
}

if (ENVIRONMENT_IS_NODE) {
 _emscripten_get_now = function _emscripten_get_now_actual() {
  var t = process["hrtime"]();
  return t[0] * 1e3 + t[1] / 1e6;
 };
} else if (typeof dateNow !== "undefined") {
 _emscripten_get_now = dateNow;
} else if (typeof performance === "object" && performance && typeof performance["now"] === "function") {
 _emscripten_get_now = function() {
  return performance["now"]();
 };
} else {
 _emscripten_get_now = Date.now;
}

FS.staticInit();

if (ENVIRONMENT_IS_NODE) {
 var fs = require("fs");
 var NODEJS_PATH = require("path");
 NODEFS.staticInit();
}

function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}

function invoke_vii(index, a1, a2) {
 var sp = stackSave();
 try {
  dynCall_vii(index, a1, a2);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0 && e !== "longjmp") throw e;
  _setThrew(1, 0);
 }
}

var asmGlobalArg = {};

var asmLibraryArg = {
 "e": abort,
 "g": setTempRet0,
 "h": getTempRet0,
 "r": invoke_vii,
 "Q": ___buildEnvironment,
 "P": ___clock_gettime,
 "k": ___lock,
 "O": ___map_file,
 "q": ___setErrNo,
 "p": ___syscall10,
 "N": ___syscall140,
 "M": ___syscall145,
 "o": ___syscall146,
 "L": ___syscall196,
 "d": ___syscall221,
 "K": ___syscall330,
 "J": ___syscall38,
 "I": ___syscall40,
 "n": ___syscall5,
 "m": ___syscall54,
 "j": ___syscall6,
 "H": ___syscall63,
 "G": ___syscall91,
 "c": ___unlock,
 "F": _abort,
 "l": _clock,
 "E": _difftime,
 "D": _emscripten_get_heap_size,
 "C": _emscripten_memcpy_big,
 "B": _emscripten_resize_heap,
 "A": _exit,
 "b": _getenv,
 "z": _gmtime,
 "y": _llvm_log10_f64,
 "x": _llvm_log2_f64,
 "w": _localtime,
 "i": _longjmp,
 "v": _mktime,
 "u": _strftime,
 "t": _system,
 "f": _time,
 "s": abortOnCannotGrowMemory,
 "a": DYNAMICTOP_PTR
};

var asm = Module["asm"](asmGlobalArg, asmLibraryArg, buffer);

Module["asm"] = asm;

var ___emscripten_environ_constructor = Module["___emscripten_environ_constructor"] = function() {
 return Module["asm"]["R"].apply(null, arguments);
};

var ___errno_location = Module["___errno_location"] = function() {
 return Module["asm"]["S"].apply(null, arguments);
};

var __get_daylight = Module["__get_daylight"] = function() {
 return Module["asm"]["T"].apply(null, arguments);
};

var __get_timezone = Module["__get_timezone"] = function() {
 return Module["asm"]["U"].apply(null, arguments);
};

var __get_tzname = Module["__get_tzname"] = function() {
 return Module["asm"]["V"].apply(null, arguments);
};

var _compile_lua = Module["_compile_lua"] = function() {
 return Module["asm"]["W"].apply(null, arguments);
};

var _continue_lua = Module["_continue_lua"] = function() {
 return Module["asm"]["X"].apply(null, arguments);
};

var _free = Module["_free"] = function() {
 return Module["asm"]["Y"].apply(null, arguments);
};

var _malloc = Module["_malloc"] = function() {
 return Module["asm"]["Z"].apply(null, arguments);
};

var _setThrew = Module["_setThrew"] = function() {
 return Module["asm"]["_"].apply(null, arguments);
};

var stackAlloc = Module["stackAlloc"] = function() {
 return Module["asm"]["aa"].apply(null, arguments);
};

var stackRestore = Module["stackRestore"] = function() {
 return Module["asm"]["ba"].apply(null, arguments);
};

var stackSave = Module["stackSave"] = function() {
 return Module["asm"]["ca"].apply(null, arguments);
};

var dynCall_vii = Module["dynCall_vii"] = function() {
 return Module["asm"]["$"].apply(null, arguments);
};

Module["asm"] = asm;

Module["ccall"] = ccall;

Module["cwrap"] = cwrap;

Module["then"] = function(func) {
 if (Module["calledRun"]) {
  func(Module);
 } else {
  var old = Module["onRuntimeInitialized"];
  Module["onRuntimeInitialized"] = function() {
   if (old) old();
   func(Module);
  };
 }
 return Module;
};

function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}

ExitStatus.prototype = new Error();

ExitStatus.prototype.constructor = ExitStatus;

dependenciesFulfilled = function runCaller() {
 if (!Module["calledRun"]) run();
 if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
};

function run(args) {
 args = args || Module["arguments"];
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 if (Module["calledRun"]) return;
 function doRun() {
  if (Module["calledRun"]) return;
  Module["calledRun"] = true;
  if (ABORT) return;
  ensureInitRuntime();
  preMain();
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
}

Module["run"] = run;

function exit(status, implicit) {
 if (implicit && Module["noExitRuntime"] && status === 0) {
  return;
 }
 if (Module["noExitRuntime"]) {} else {
  ABORT = true;
  EXITSTATUS = status;
  exitRuntime();
  if (Module["onExit"]) Module["onExit"](status);
 }
 Module["quit"](status, new ExitStatus(status));
}

function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 if (what !== undefined) {
  out(what);
  err(what);
  what = JSON.stringify(what);
 } else {
  what = "";
 }
 ABORT = true;
 EXITSTATUS = 1;
 throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
}

Module["abort"] = abort;

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

Module["noExitRuntime"] = true;

run();


  return WaLua
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = WaLua;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return WaLua; });
    else if (typeof exports === 'object')
      exports["WaLua"] = WaLua;
    