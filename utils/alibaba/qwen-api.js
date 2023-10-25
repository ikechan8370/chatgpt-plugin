var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import Keyv from 'keyv';
import pTimeout from 'p-timeout';
import QuickLRU from 'quick-lru';
import { v4 as uuidv4 } from 'uuid';
import * as tokenizer from './tokenizer.js';
import * as types from './types.js';
import globalFetch from 'node-fetch';
var CHATGPT_MODEL = 'qwen-turbo'; // qwen-plus
var USER_LABEL_DEFAULT = 'User';
var ASSISTANT_LABEL_DEFAULT = '同义千问';
var QwenApi = /** @class */ (function () {
    /**
     * Creates a new client wrapper around Qwen's chat completion API, mimicing the official ChatGPT webapp's functionality as closely as possible.
     *
     * @param opts
     */
    function QwenApi(opts) {
        var apiKey = opts.apiKey, _a = opts.apiBaseUrl, apiBaseUrl = _a === void 0 ? 'https://dashscope.aliyuncs.com/api/v1' : _a, _b = opts.debug, debug = _b === void 0 ? false : _b, messageStore = opts.messageStore, completionParams = opts.completionParams, parameters = opts.parameters, systemMessage = opts.systemMessage, getMessageById = opts.getMessageById, upsertMessage = opts.upsertMessage, _c = opts.fetch, fetch = _c === void 0 ? globalFetch : _c;
        this._apiKey = apiKey;
        this._apiBaseUrl = apiBaseUrl;
        this._debug = !!debug;
        this._fetch = fetch;
        this._completionParams = __assign({ model: CHATGPT_MODEL, parameters: __assign({ top_p: 0.5, top_k: 50, temperature: 1.0, seed: 114514, enable_search: true, result_format: "text", incremental_output: false }, parameters) }, completionParams);
        this._systemMessage = systemMessage;
        if (this._systemMessage === undefined) {
            var currentDate = new Date().toISOString().split('T')[0];
            this._systemMessage = "You are ChatGPT, a large language model trained by Qwen. Answer as concisely as possible.\nKnowledge cutoff: 2021-09-01\nCurrent date: ".concat(currentDate);
        }
        this._getMessageById = getMessageById !== null && getMessageById !== void 0 ? getMessageById : this._defaultGetMessageById;
        this._upsertMessage = upsertMessage !== null && upsertMessage !== void 0 ? upsertMessage : this._defaultUpsertMessage;
        if (messageStore) {
            this._messageStore = messageStore;
        }
        else {
            this._messageStore = new Keyv({
                store: new QuickLRU({ maxSize: 10000 })
            });
        }
        if (!this._apiKey) {
            throw new Error('Qwen missing required apiKey');
        }
        if (!this._fetch) {
            throw new Error('Invalid environment; fetch is not defined');
        }
        if (typeof this._fetch !== 'function') {
            throw new Error('Invalid "fetch" is not a function');
        }
    }
    /**
     * Sends a message to the Qwen chat completions endpoint, waits for the response
     * to resolve, and returns the response.
     *
     * If you want your response to have historical context, you must provide a valid `parentMessageId`.
     *
     * If you want to receive a stream of partial responses, use `opts.onProgress`.
     *
     * Set `debug: true` in the `ChatGPTAPI` constructor to log more info on the full prompt sent to the Qwen chat completions API. You can override the `systemMessage` in `opts` to customize the assistant's instructions.
     *
     * @param message - The prompt message to send
     * @param opts.parentMessageId - Optional ID of the previous message in the conversation (defaults to `undefined`)
     * @param opts.conversationId - Optional ID of the conversation (defaults to `undefined`)
     * @param opts.messageId - Optional ID of the message to send (defaults to a random UUID)
     * @param opts.systemMessage - Optional override for the chat "system message" which acts as instructions to the model (defaults to the ChatGPT system message)
     * @param opts.timeoutMs - Optional timeout in milliseconds (defaults to no timeout)
     * @param opts.onProgress - Optional callback which will be invoked every time the partial response is updated
     * @param opts.abortSignal - Optional callback used to abort the underlying `fetch` call using an [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
     * @param completionParams - Optional overrides to send to the [Qwen chat completion API](https://platform.openai.com/docs/api-reference/chat/create). Options like `temperature` and `presence_penalty` can be tweaked to change the personality of the assistant.
     *
     * @returns The response from ChatGPT
     */
    QwenApi.prototype.sendMessage = function (text, opts, role) {
        if (opts === void 0) { opts = {}; }
        if (role === void 0) { role = 'user'; }
        return __awaiter(this, void 0, void 0, function () {
            var parentMessageId, _a, messageId, timeoutMs, completionParams, conversationId, abortSignal, abortController, message, latestQuestion, _b, messages, maxTokens, numTokens, result, responseP;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        parentMessageId = opts.parentMessageId, _a = opts.messageId, messageId = _a === void 0 ? uuidv4() : _a, timeoutMs = opts.timeoutMs, completionParams = opts.completionParams, conversationId = opts.conversationId;
                        abortSignal = opts.abortSignal;
                        abortController = null;
                        if (timeoutMs && !abortSignal) {
                            abortController = new AbortController();
                            abortSignal = abortController.signal;
                        }
                        message = {
                            role: role,
                            id: messageId,
                            conversationId: conversationId,
                            parentMessageId: parentMessageId,
                            text: text,
                        };
                        latestQuestion = message;
                        return [4 /*yield*/, this._buildMessages(text, role, opts, completionParams)];
                    case 1:
                        _b = _c.sent(), messages = _b.messages, maxTokens = _b.maxTokens, numTokens = _b.numTokens;
                        console.log("maxTokens: ".concat(maxTokens, ", numTokens: ").concat(numTokens));
                        result = {
                            role: 'assistant',
                            id: uuidv4(),
                            conversationId: conversationId,
                            parentMessageId: messageId,
                            text: undefined,
                        };
                        this._completionParams.input = { messages: messages };
                        responseP = new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                            var url, headers, body, res, reason, msg, error, response, err_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        url = "".concat(this._apiBaseUrl, "/services/aigc/text-generation/generation");
                                        headers = {
                                            'Content-Type': 'application/json',
                                            Authorization: "Bearer ".concat(this._apiKey)
                                        };
                                        body = __assign(__assign({}, this._completionParams), completionParams);
                                        if (this._debug) {
                                            console.log(JSON.stringify(body));
                                        }
                                        if (this._debug) {
                                            console.log("sendMessage (".concat(numTokens, " tokens)"), body);
                                        }
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 6, , 7]);
                                        return [4 /*yield*/, this._fetch(url, {
                                                method: 'POST',
                                                headers: headers,
                                                body: JSON.stringify(body),
                                                signal: abortSignal
                                            })];
                                    case 2:
                                        res = _a.sent();
                                        if (!!res.ok) return [3 /*break*/, 4];
                                        return [4 /*yield*/, res.text()];
                                    case 3:
                                        reason = _a.sent();
                                        msg = "Qwen error ".concat(res.status || res.statusText, ": ").concat(reason);
                                        error = new types.ChatGPTError(msg, { cause: res });
                                        error.statusCode = res.status;
                                        error.statusText = res.statusText;
                                        return [2 /*return*/, reject(error)];
                                    case 4: return [4 /*yield*/, res.json()];
                                    case 5:
                                        response = _a.sent();
                                        if (this._debug) {
                                            console.log(response);
                                        }
                                        if (response === null || response === void 0 ? void 0 : response.request_id) {
                                            result.id = response.request_id;
                                        }
                                        result.detail = response;
                                        result.text = response.output.text;
                                        return [2 /*return*/, resolve(result)];
                                    case 6:
                                        err_1 = _a.sent();
                                        return [2 /*return*/, reject(err_1)];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); }).then(function (message) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, Promise.all([
                                        this._upsertMessage(latestQuestion),
                                        this._upsertMessage(message)
                                    ]).then(function () { return message; })];
                            });
                        }); });
                        if (timeoutMs) {
                            if (abortController) {
                                // This will be called when a timeout occurs in order for us to forcibly
                                // ensure that the underlying HTTP request is aborted.
                                ;
                                responseP.cancel = function () {
                                    abortController.abort();
                                };
                            }
                            return [2 /*return*/, pTimeout(responseP, {
                                    milliseconds: timeoutMs,
                                    message: 'Qwen timed out waiting for response'
                                })];
                        }
                        else {
                            return [2 /*return*/, responseP];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(QwenApi.prototype, "apiKey", {
        get: function () {
            return this._apiKey;
        },
        set: function (apiKey) {
            this._apiKey = apiKey;
        },
        enumerable: false,
        configurable: true
    });
    QwenApi.prototype._buildMessages = function (text, role, opts, completionParams) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, systemMessage, parentMessageId, userLabel, assistantLabel, maxNumTokens, messages, systemMessageOffset, nextMessages, functionToken, numTokens, prompt_1, nextNumTokensEstimate, _i, nextMessages_1, m1, _b, isValidPrompt, parentMessage, parentMessageRole, maxTokens;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = opts.systemMessage, systemMessage = _a === void 0 ? this._systemMessage : _a;
                        parentMessageId = opts.parentMessageId;
                        userLabel = USER_LABEL_DEFAULT;
                        assistantLabel = ASSISTANT_LABEL_DEFAULT;
                        maxNumTokens = 6000;
                        messages = [];
                        if (systemMessage) {
                            messages.push({
                                role: 'system',
                                content: systemMessage
                            });
                        }
                        systemMessageOffset = messages.length;
                        nextMessages = text
                            ? messages.concat([
                                {
                                    role: role,
                                    content: text
                                }
                            ])
                            : messages;
                        functionToken = 0;
                        numTokens = functionToken;
                        _c.label = 1;
                    case 1:
                        prompt_1 = nextMessages
                            .reduce(function (prompt, message) {
                            switch (message.role) {
                                case 'system':
                                    return prompt.concat(["Instructions:\n".concat(message.content)]);
                                case 'user':
                                    return prompt.concat(["".concat(userLabel, ":\n").concat(message.content)]);
                                default:
                                    return message.content ? prompt.concat(["".concat(assistantLabel, ":\n").concat(message.content)]) : prompt;
                            }
                        }, [])
                            .join('\n\n');
                        return [4 /*yield*/, this._getTokenCount(prompt_1)];
                    case 2:
                        nextNumTokensEstimate = _c.sent();
                        _i = 0, nextMessages_1 = nextMessages;
                        _c.label = 3;
                    case 3:
                        if (!(_i < nextMessages_1.length)) return [3 /*break*/, 6];
                        m1 = nextMessages_1[_i];
                        _b = nextNumTokensEstimate;
                        return [4 /*yield*/, this._getTokenCount('')];
                    case 4:
                        nextNumTokensEstimate = _b + _c.sent();
                        _c.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        isValidPrompt = nextNumTokensEstimate + functionToken <= maxNumTokens;
                        if (prompt_1 && !isValidPrompt) {
                            return [3 /*break*/, 9];
                        }
                        messages = nextMessages;
                        numTokens = nextNumTokensEstimate + functionToken;
                        if (!isValidPrompt) {
                            return [3 /*break*/, 9];
                        }
                        if (!parentMessageId) {
                            return [3 /*break*/, 9];
                        }
                        return [4 /*yield*/, this._getMessageById(parentMessageId)];
                    case 7:
                        parentMessage = _c.sent();
                        if (!parentMessage) {
                            return [3 /*break*/, 9];
                        }
                        parentMessageRole = parentMessage.role || 'user';
                        nextMessages = nextMessages.slice(0, systemMessageOffset).concat(__spreadArray([
                            {
                                role: parentMessageRole,
                                content: parentMessage.text
                            }
                        ], nextMessages.slice(systemMessageOffset), true));
                        parentMessageId = parentMessage.parentMessageId;
                        _c.label = 8;
                    case 8:
                        if (true) return [3 /*break*/, 1];
                        _c.label = 9;
                    case 9:
                        maxTokens = Math.max(1, Math.min(this._maxModelTokens - numTokens, this._maxResponseTokens));
                        return [2 /*return*/, { messages: messages, maxTokens: maxTokens, numTokens: numTokens }];
                }
            });
        });
    };
    QwenApi.prototype._getTokenCount = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!text) {
                    return [2 /*return*/, 0];
                }
                // TODO: use a better fix in the tokenizer
                text = text.replace(/<\|endoftext\|>/g, '');
                return [2 /*return*/, tokenizer.encode(text).length];
            });
        });
    };
    QwenApi.prototype._defaultGetMessageById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._messageStore.get(id)];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res];
                }
            });
        });
    };
    QwenApi.prototype._defaultUpsertMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._messageStore.set(message.request_id, message)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return QwenApi;
}());
export { QwenApi };
