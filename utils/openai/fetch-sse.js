var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { createParser } from 'eventsource-parser';
import * as types from './types.js';
import fetch  from 'node-fetch';
import { streamAsyncIterable } from './stream-async-iterable.js';
export function fetchSSE(url, options, fetchFn) {
    var _a, e_1, _b, _c;
    if (fetchFn === void 0) { fetchFn = fetch; }
    return __awaiter(this, void 0, void 0, function () {
        var onMessage, onError, fetchOptions, res, reason, err_1, msg, error, parser, feed, body_1, _d, _e, _f, chunk, str, e_1_1;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    onMessage = options.onMessage, onError = options.onError, fetchOptions = __rest(options, ["onMessage", "onError"]);
                    return [4 /*yield*/, fetchFn(url, fetchOptions)];
                case 1:
                    res = _g.sent();
                    if (!!res.ok) return [3 /*break*/, 6];
                    reason = void 0;
                    _g.label = 2;
                case 2:
                    _g.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, res.text()];
                case 3:
                    reason = _g.sent();
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _g.sent();
                    reason = res.statusText;
                    return [3 /*break*/, 5];
                case 5:
                    msg = "ChatGPT error ".concat(res.status, ": ").concat(reason);
                    error = new types.ChatGPTError(msg, { cause: res });
                    error.statusCode = res.status;
                    error.statusText = res.statusText;
                    throw error;
                case 6:
                    parser = createParser(function (event) {
                        if (event.type === 'event') {
                            onMessage(event.data);
                        }
                    });
                    feed = function (chunk) {
                        var _a;
                        var response = null;
                        try {
                            response = JSON.parse(chunk);
                        }
                        catch (_b) {
                            // ignore
                        }
                        if (((_a = response === null || response === void 0 ? void 0 : response.detail) === null || _a === void 0 ? void 0 : _a.type) === 'invalid_request_error') {
                            var msg = "ChatGPT error ".concat(response.detail.message, ": ").concat(response.detail.code, " (").concat(response.detail.type, ")");
                            var error = new types.ChatGPTError(msg, { cause: response });
                            error.statusCode = response.detail.code;
                            error.statusText = response.detail.message;
                            if (onError) {
                                onError(error);
                            }
                            else {
                                console.error(error);
                            }
                            // don't feed to the event parser
                            return;
                        }
                        parser.feed(chunk);
                    };
                    if (!!res.body.getReader) return [3 /*break*/, 7];
                    body_1 = res.body;
                    if (!body_1.on || !body_1.read) {
                        throw new types.ChatGPTError('unsupported "fetch" implementation');
                    }
                    body_1.on('readable', function () {
                        var chunk;
                        while (null !== (chunk = body_1.read())) {
                            feed(chunk.toString());
                        }
                    });
                    return [3 /*break*/, 18];
                case 7:
                    _g.trys.push([7, 12, 13, 18]);
                    _d = true, _e = __asyncValues(streamAsyncIterable(res.body));
                    _g.label = 8;
                case 8: return [4 /*yield*/, _e.next()];
                case 9:
                    if (!(_f = _g.sent(), _a = _f.done, !_a)) return [3 /*break*/, 11];
                    _c = _f.value;
                    _d = false;
                    chunk = _c;
                    str = new TextDecoder().decode(chunk);
                    feed(str);
                    _g.label = 10;
                case 10:
                    _d = true;
                    return [3 /*break*/, 8];
                case 11: return [3 /*break*/, 18];
                case 12:
                    e_1_1 = _g.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 18];
                case 13:
                    _g.trys.push([13, , 16, 17]);
                    if (!(!_d && !_a && (_b = _e.return))) return [3 /*break*/, 15];
                    return [4 /*yield*/, _b.call(_e)];
                case 14:
                    _g.sent();
                    _g.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 17: return [7 /*endfinally*/];
                case 18: return [2 /*return*/];
            }
        });
    });
}
