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
import { fetchSSE } from './fetch-sse.js';
var CHATGPT_MODEL = 'gpt-3.5-turbo-0613';
var USER_LABEL_DEFAULT = 'User';
var ASSISTANT_LABEL_DEFAULT = 'ChatGPT';
var ChatGPTAPI = /** @class */ (function () {
    /**
     * Creates a new client wrapper around OpenAI's chat completion API, mimicing the official ChatGPT webapp's functionality as closely as possible.
     *
     * @param apiKey - OpenAI API key (required).
     * @param apiOrg - Optional OpenAI API organization (optional).
     * @param apiBaseUrl - Optional override for the OpenAI API base URL.
     * @param debug - Optional enables logging debugging info to stdout.
     * @param completionParams - Param overrides to send to the [OpenAI chat completion API](https://platform.openai.com/docs/api-reference/chat/create). Options like `temperature` and `presence_penalty` can be tweaked to change the personality of the assistant.
     * @param maxModelTokens - Optional override for the maximum number of tokens allowed by the model's context. Defaults to 4096.
     * @param maxResponseTokens - Optional override for the minimum number of tokens allowed for the model's response. Defaults to 1000.
     * @param messageStore - Optional [Keyv](https://github.com/jaredwray/keyv) store to persist chat messages to. If not provided, messages will be lost when the process exits.
     * @param getMessageById - Optional function to retrieve a message by its ID. If not provided, the default implementation will be used (using an in-memory `messageStore`).
     * @param upsertMessage - Optional function to insert or update a message. If not provided, the default implementation will be used (using an in-memory `messageStore`).
     * @param fetch - Optional override for the `fetch` implementation to use. Defaults to the global `fetch` function.
     */
    function ChatGPTAPI(opts) {
        var apiKey = opts.apiKey, apiOrg = opts.apiOrg, _a = opts.apiBaseUrl, apiBaseUrl = _a === void 0 ? 'https://api.openai.com/v1' : _a, _b = opts.debug, debug = _b === void 0 ? false : _b, messageStore = opts.messageStore, completionParams = opts.completionParams, systemMessage = opts.systemMessage, _c = opts.maxModelTokens, maxModelTokens = _c === void 0 ? 4000 : _c, _d = opts.maxResponseTokens, maxResponseTokens = _d === void 0 ? 1000 : _d, getMessageById = opts.getMessageById, upsertMessage = opts.upsertMessage, _e = opts.fetch, fetch = _e === void 0 ? globalFetch : _e;
        this._apiKey = apiKey;
        this._apiOrg = apiOrg;
        this._apiBaseUrl = apiBaseUrl;
        this._debug = !!debug;
        this._fetch = fetch;
        this._completionParams = __assign({ model: CHATGPT_MODEL, temperature: 0.8, top_p: 1.0, presence_penalty: 1.0 }, completionParams);
        this._systemMessage = systemMessage;
        if (this._systemMessage === undefined) {
            var currentDate = new Date().toISOString().split('T')[0];
            this._systemMessage = "You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.\nKnowledge cutoff: 2021-09-01\nCurrent date: ".concat(currentDate);
        }
        this._maxModelTokens = maxModelTokens;
        this._maxResponseTokens = maxResponseTokens;
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
            throw new Error('OpenAI missing required apiKey');
        }
        if (!this._fetch) {
            throw new Error('Invalid environment; fetch is not defined');
        }
        if (typeof this._fetch !== 'function') {
            throw new Error('Invalid "fetch" is not a function');
        }
    }
    /**
     * Sends a message to the OpenAI chat completions endpoint, waits for the response
     * to resolve, and returns the response.
     *
     * If you want your response to have historical context, you must provide a valid `parentMessageId`.
     *
     * If you want to receive a stream of partial responses, use `opts.onProgress`.
     *
     * Set `debug: true` in the `ChatGPTAPI` constructor to log more info on the full prompt sent to the OpenAI chat completions API. You can override the `systemMessage` in `opts` to customize the assistant's instructions.
     *
     * @param message - The prompt message to send
     * @param opts.parentMessageId - Optional ID of the previous message in the conversation (defaults to `undefined`)
     * @param opts.conversationId - Optional ID of the conversation (defaults to `undefined`)
     * @param opts.messageId - Optional ID of the message to send (defaults to a random UUID)
     * @param opts.systemMessage - Optional override for the chat "system message" which acts as instructions to the model (defaults to the ChatGPT system message)
     * @param opts.timeoutMs - Optional timeout in milliseconds (defaults to no timeout)
     * @param opts.onProgress - Optional callback which will be invoked every time the partial response is updated
     * @param opts.abortSignal - Optional callback used to abort the underlying `fetch` call using an [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
     * @param completionParams - Optional overrides to send to the [OpenAI chat completion API](https://platform.openai.com/docs/api-reference/chat/create). Options like `temperature` and `presence_penalty` can be tweaked to change the personality of the assistant.
     *
     * @returns The response from ChatGPT
     */
    ChatGPTAPI.prototype.sendMessage = function (text, opts, role) {
        if (opts === void 0) { opts = {}; }
        if (role === void 0) { role = 'user'; }
        return __awaiter(this, void 0, void 0, function () {
            var parentMessageId, _a, messageId, timeoutMs, onProgress, _b, stream, completionParams, conversationId, abortSignal, abortController, message, latestQuestion, _c, messages, maxTokens, numTokens, result, responseP;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        parentMessageId = opts.parentMessageId, _a = opts.messageId, messageId = _a === void 0 ? uuidv4() : _a, timeoutMs = opts.timeoutMs, onProgress = opts.onProgress, _b = opts.stream, stream = _b === void 0 ? onProgress ? true : false : _b, completionParams = opts.completionParams, conversationId = opts.conversationId;
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
                            name: opts.name
                        };
                        latestQuestion = message;
                        return [4 /*yield*/, this._buildMessages(text, role, opts)];
                    case 1:
                        _c = _d.sent(), messages = _c.messages, maxTokens = _c.maxTokens, numTokens = _c.numTokens;
                        result = {
                            role: 'assistant',
                            id: uuidv4(),
                            conversationId: conversationId,
                            parentMessageId: messageId,
                            text: '',
                            functionCall: null
                        };
                        responseP = new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                            var url, headers, body, res, reason, msg, error, response, message_1, res_1, err_1;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        url = "".concat(this._apiBaseUrl, "/chat/completions");
                                        headers = {
                                            'Content-Type': 'application/json',
                                            Authorization: "Bearer ".concat(this._apiKey)
                                        };
                                        body = __assign(__assign(__assign({ max_tokens: maxTokens }, this._completionParams), completionParams), { messages: messages, stream: stream });
                                        // Support multiple organizations
                                        // See https://platform.openai.com/docs/api-reference/authentication
                                        if (this._apiOrg) {
                                            headers['OpenAI-Organization'] = this._apiOrg;
                                        }
                                        if (this._debug) {
                                            // console.log(JSON.stringify(body))
                                            console.log("sendMessage (".concat(numTokens, " tokens)"), body);
                                        }
                                        if (!stream) return [3 /*break*/, 1];
                                        fetchSSE(url, {
                                            method: 'POST',
                                            headers: headers,
                                            body: JSON.stringify(body),
                                            signal: abortSignal,
                                            onMessage: function (data) {
                                                var _a;
                                                if (data === '[DONE]') {
                                                    result.text = result.text.trim();
                                                    return resolve(result);
                                                }
                                                try {
                                                    var response = JSON.parse(data);
                                                    if (response.id) {
                                                        result.id = response.id;
                                                    }
                                                    if ((_a = response.choices) === null || _a === void 0 ? void 0 : _a.length) {
                                                        var delta = response.choices[0].delta;
                                                        if (delta.function_call) {
                                                            if (delta.function_call.name) {
                                                                result.functionCall = {
                                                                    name: delta.function_call.name,
                                                                    arguments: delta.function_call.arguments
                                                                };
                                                            }
                                                            else {
                                                                result.functionCall.arguments = result.functionCall.arguments || '' + delta.function_call.arguments;
                                                            }
                                                        }
                                                        else {
                                                            result.delta = delta.content;
                                                            if (delta === null || delta === void 0 ? void 0 : delta.content)
                                                                result.text += delta.content;
                                                        }
                                                        if (delta.role) {
                                                            result.role = delta.role;
                                                        }
                                                        result.detail = response;
                                                        onProgress === null || onProgress === void 0 ? void 0 : onProgress(result);
                                                    }
                                                }
                                                catch (err) {
                                                    console.warn('OpenAI stream SEE event unexpected error', err);
                                                    return reject(err);
                                                }
                                            }
                                        }, this._fetch).catch(reject);
                                        return [3 /*break*/, 7];
                                    case 1:
                                        _c.trys.push([1, 6, , 7]);
                                        return [4 /*yield*/, this._fetch(url, {
                                                method: 'POST',
                                                headers: headers,
                                                body: JSON.stringify(body),
                                                signal: abortSignal
                                            })];
                                    case 2:
                                        res = _c.sent();
                                        if (!!res.ok) return [3 /*break*/, 4];
                                        return [4 /*yield*/, res.text()];
                                    case 3:
                                        reason = _c.sent();
                                        msg = "OpenAI error ".concat(res.status || res.statusText, ": ").concat(reason);
                                        error = new types.ChatGPTError(msg, { cause: res });
                                        error.statusCode = res.status;
                                        error.statusText = res.statusText;
                                        return [2 /*return*/, reject(error)];
                                    case 4: return [4 /*yield*/, res.json()];
                                    case 5:
                                        response = _c.sent();
                                        if (this._debug) {
                                            console.log(response);
                                        }
                                        if (response === null || response === void 0 ? void 0 : response.id) {
                                            result.id = response.id;
                                        }
                                        if ((_a = response === null || response === void 0 ? void 0 : response.choices) === null || _a === void 0 ? void 0 : _a.length) {
                                            message_1 = response.choices[0].message;
                                            if (message_1.content) {
                                                result.text = message_1.content;
                                            }
                                            else if (message_1.function_call) {
                                                result.functionCall = message_1.function_call;
                                            }
                                            if (message_1.role) {
                                                result.role = message_1.role;
                                            }
                                        }
                                        else {
                                            res_1 = response;
                                            return [2 /*return*/, reject(new Error("OpenAI error: ".concat(((_b = res_1 === null || res_1 === void 0 ? void 0 : res_1.detail) === null || _b === void 0 ? void 0 : _b.message) || (res_1 === null || res_1 === void 0 ? void 0 : res_1.detail) || 'unknown')))];
                                        }
                                        result.detail = response;
                                        return [2 /*return*/, resolve(result)];
                                    case 6:
                                        err_1 = _c.sent();
                                        return [2 /*return*/, reject(err_1)];
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); }).then(function (message) { return __awaiter(_this, void 0, void 0, function () {
                            var promptTokens, completionTokens, err_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!(message.detail && !message.detail.usage)) return [3 /*break*/, 4];
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        promptTokens = numTokens;
                                        return [4 /*yield*/, this._getTokenCount(message.text)];
                                    case 2:
                                        completionTokens = _a.sent();
                                        message.detail.usage = {
                                            prompt_tokens: promptTokens,
                                            completion_tokens: completionTokens,
                                            total_tokens: promptTokens + completionTokens,
                                            estimated: true
                                        };
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_2 = _a.sent();
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/, Promise.all([
                                            this._upsertMessage(latestQuestion),
                                            this._upsertMessage(message)
                                        ]).then(function () { return message; })];
                                }
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
                                    message: 'OpenAI timed out waiting for response'
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
    Object.defineProperty(ChatGPTAPI.prototype, "apiKey", {
        get: function () {
            return this._apiKey;
        },
        set: function (apiKey) {
            this._apiKey = apiKey;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChatGPTAPI.prototype, "apiOrg", {
        get: function () {
            return this._apiOrg;
        },
        set: function (apiOrg) {
            this._apiOrg = apiOrg;
        },
        enumerable: false,
        configurable: true
    });
    ChatGPTAPI.prototype._buildMessages = function (text, role, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, systemMessage, parentMessageId, userLabel, assistantLabel, maxNumTokens, messages, systemMessageOffset, nextMessages, numTokens, prompt_1, nextNumTokensEstimate, isValidPrompt, parentMessage, parentMessageRole, maxTokens;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = opts.systemMessage, systemMessage = _a === void 0 ? this._systemMessage : _a;
                        parentMessageId = opts.parentMessageId;
                        userLabel = USER_LABEL_DEFAULT;
                        assistantLabel = ASSISTANT_LABEL_DEFAULT;
                        maxNumTokens = this._maxModelTokens - this._maxResponseTokens;
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
                                    content: text,
                                    name: opts.name
                                }
                            ])
                            : messages;
                        numTokens = 0;
                        _b.label = 1;
                    case 1:
                        prompt_1 = nextMessages
                            .reduce(function (prompt, message) {
                            switch (message.role) {
                                case 'system':
                                    return prompt.concat(["Instructions:\n".concat(message.content)]);
                                case 'user':
                                    return prompt.concat(["".concat(userLabel, ":\n").concat(message.content)]);
                                case 'function':
                                    return prompt.concat(["Function:\n".concat(message.content)]);
                                default:
                                    return message.content ? prompt.concat(["".concat(assistantLabel, ":\n").concat(message.content)]) : prompt;
                            }
                        }, [])
                            .join('\n\n');
                        return [4 /*yield*/, this._getTokenCount(prompt_1)];
                    case 2:
                        nextNumTokensEstimate = _b.sent();
                        isValidPrompt = nextNumTokensEstimate <= maxNumTokens;
                        if (prompt_1 && !isValidPrompt) {
                            return [3 /*break*/, 5];
                        }
                        messages = nextMessages;
                        numTokens = nextNumTokensEstimate;
                        if (!isValidPrompt) {
                            return [3 /*break*/, 5];
                        }
                        if (!parentMessageId) {
                            return [3 /*break*/, 5];
                        }
                        return [4 /*yield*/, this._getMessageById(parentMessageId)];
                    case 3:
                        parentMessage = _b.sent();
                        if (!parentMessage) {
                            return [3 /*break*/, 5];
                        }
                        parentMessageRole = parentMessage.role || 'user';
                        nextMessages = nextMessages.slice(0, systemMessageOffset).concat(__spreadArray([
                            {
                                role: parentMessageRole,
                                content: parentMessage.text,
                                name: parentMessage.name,
                                function_call: parentMessage.functionCall ? parentMessage.functionCall : undefined,

                            }
                        ], nextMessages.slice(systemMessageOffset), true));
                        parentMessageId = parentMessage.parentMessageId;
                        _b.label = 4;
                    case 4:
                        if (true) return [3 /*break*/, 1];
                        _b.label = 5;
                    case 5:
                        maxTokens = Math.max(1, Math.min(this._maxModelTokens - numTokens, this._maxResponseTokens));
                        return [2 /*return*/, { messages: messages, maxTokens: maxTokens, numTokens: numTokens }];
                }
            });
        });
    };
    ChatGPTAPI.prototype._getTokenCount = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: use a better fix in the tokenizer
                text = text.replace(/<\|endoftext\|>/g, '');
                return [2 /*return*/, tokenizer.encode(text).length];
            });
        });
    };
    ChatGPTAPI.prototype._defaultGetMessageById = function (id) {
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
    ChatGPTAPI.prototype._defaultUpsertMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._messageStore.set(message.id, message)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return ChatGPTAPI;
}());
export { ChatGPTAPI };
