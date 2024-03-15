import Keyv from 'keyv'
import pTimeout from 'p-timeout'
import QuickLRU from 'quick-lru'
import { v4 as uuidv4 } from 'uuid'

import * as tokenizer from './tokenizer'
import * as types from './types'
import globalFetch from 'node-fetch'
import {qwen, Role} from "./types";
import {openai} from "../openai/types";

const CHATGPT_MODEL = 'qwen-turbo' // qwen-plus

const USER_LABEL_DEFAULT = 'User'
const ASSISTANT_LABEL_DEFAULT = '通义千问'

export class QwenApi {
    protected _apiKey: string
    protected _apiBaseUrl: string
    protected _debug: boolean

    protected _systemMessage: string
    protected _completionParams: Omit<
        types.qwen.CreateChatCompletionRequest,
        'messages' | 'n'
        >
    protected _maxModelTokens: number
    protected _maxResponseTokens: number
    protected _fetch: types.FetchFn

    protected _getMessageById: types.GetMessageByIdFunction
    protected _upsertMessage: types.UpsertMessageFunction

    protected _messageStore: Keyv<types.ChatMessage>

    /**
     * Creates a new client wrapper around Qwen's chat completion API, mimicing the official ChatGPT webapp's functionality as closely as possible.
     *
     * @param opts
     */
    constructor(opts: types.QWenAPIOptions) {
        const {
            apiKey,
            apiBaseUrl = 'https://dashscope.aliyuncs.com/api/v1',
            debug = false,
            messageStore,
            completionParams,
            parameters,
            systemMessage,
            getMessageById,
            upsertMessage,
            fetch = globalFetch
        } = opts

        this._apiKey = apiKey
        this._apiBaseUrl = apiBaseUrl
        this._debug = !!debug
        this._fetch = fetch

        this._completionParams = {
            model: CHATGPT_MODEL,
            parameters: {
                top_p: 0.5,
                top_k: 50,
                temperature: 1.0,
                seed: 114514,
                enable_search: true,
                result_format: "message",
                incremental_output: false,
                ...parameters
            },
            ...completionParams
        }

        this._systemMessage = systemMessage

        if (this._systemMessage === undefined) {
            const currentDate = new Date().toISOString().split('T')[0]
            this._systemMessage = `You are Qwen, a large language model trained by Alibaba Cloud. Answer as concisely as possible.\nCurrent date: ${currentDate}`
        }

        this._getMessageById = getMessageById ?? this._defaultGetMessageById
        this._upsertMessage = upsertMessage ?? this._defaultUpsertMessage

        if (messageStore) {
            this._messageStore = messageStore
        } else {
            this._messageStore = new Keyv<types.ChatMessage, any>({
                store: new QuickLRU<string, types.ChatMessage>({ maxSize: 10000 })
            })
        }

        if (!this._apiKey) {
            throw new Error('Qwen missing required apiKey')
        }

        if (!this._fetch) {
            throw new Error('Invalid environment; fetch is not defined')
        }

        if (typeof this._fetch !== 'function') {
            throw new Error('Invalid "fetch" is not a function')
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
     * @param opts.completionParams - Optional overrides to send to the [Qwen chat completion API](https://platform.openai.com/docs/api-reference/chat/create). Options like `temperature` and `presence_penalty` can be tweaked to change the personality of the assistant.
     *
     * @returns The response from ChatGPT
     */
    async sendMessage(
        text: string,
        opts: types.SendMessageOptions = {},
        role: Role = 'user',
    ): Promise<types.ChatMessage> {
        let {
            parentMessageId,
            messageId = uuidv4(),
            timeoutMs,
            completionParams,
            conversationId
        } = opts

        let { abortSignal } = opts

        let abortController: AbortController = null
        if (timeoutMs && !abortSignal) {
            abortController = new AbortController()
            abortSignal = abortController.signal
        }

        const message: types.ChatMessage = {
            role,
            id: messageId,
            conversationId,
            parentMessageId,
            text,
        }

        const latestQuestion = message

        let parameters = Object.assign(
            this._completionParams.parameters,
            completionParams.parameters
        )
        completionParams = Object.assign(this._completionParams, completionParams)
        completionParams.parameters = parameters
        const { messages, maxTokens, numTokens } = await this._buildMessages(
            text,
            role,
            opts,
            completionParams
        )

        console.log(`maxTokens: ${maxTokens}, numTokens: ${numTokens}`)
        const result: types.ChatMessage & { conversation: qwen.ChatCompletionRequestMessage[] } = {
            role: 'assistant',
            id: uuidv4(),
            conversationId,
            parentMessageId: messageId,
            text: undefined,
            functionCall: undefined,
            conversation: []
        }
        completionParams.input = { messages }
        const responseP = new Promise<types.ChatMessage>(
            async (resolve, reject) => {
                const url = `${this._apiBaseUrl}/services/aigc/text-generation/generation`
                const headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this._apiKey}`
                }
                const body = completionParams
                if (this._debug) {
                    console.log(JSON.stringify(body))
                }

                if (this._debug) {
                    console.log(`sendMessage (${numTokens} tokens)`, body)
                }
                try {
                    const res = await this._fetch(url, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(body),
                        signal: abortSignal
                    })

                    if (!res.ok) {
                        const reason = await res.text()
                        const msg = `Qwen error ${
                            res.status || res.statusText
                        }: ${reason}`
                        const error = new types.ChatGPTError(msg, { cause: res })
                        error.statusCode = res.status
                        error.statusText = res.statusText
                        return reject(error)
                    }

                    const response: types.qwen.CreateChatCompletionResponse =
                        await res.json()
                    if (this._debug) {
                        console.log(response)
                    }
                    if (response.output?.choices?.[0]?.message?.tool_calls?.length > 0) {
                        // function call result
                        result.functionCall = response.output.choices[0].message.tool_calls[0].function
                    }
                    if (response?.request_id) {
                        result.id = response.request_id
                    }
                    result.detail = response
                    result.text = response.output.choices[0].message.content
                    result.conversation = messages
                    return resolve(result)
                } catch (err) {
                    return reject(err)
                }

            }
        ).then(async (message) => {
            return Promise.all([
                this._upsertMessage(latestQuestion),
                this._upsertMessage(message)
            ]).then(() => message)
        })

        if (timeoutMs) {
            if (abortController) {
                // This will be called when a timeout occurs in order for us to forcibly
                // ensure that the underlying HTTP request is aborted.
                ;(responseP as any).cancel = () => {
                    abortController.abort()
                }
            }

            return pTimeout(responseP, {
                milliseconds: timeoutMs,
                message: 'Qwen timed out waiting for response'
            })
        } else {
            return responseP
        }
    }

    get apiKey(): string {
        return this._apiKey
    }

    set apiKey(apiKey: string) {
        this._apiKey = apiKey
    }


    protected async _buildMessages(text: string, role: Role, opts: types.SendMessageOptions, completionParams: Partial<
        Omit<qwen.CreateChatCompletionRequest, 'messages' | 'n' | 'stream'>
    >) {
        const { systemMessage = this._systemMessage } = opts
        let { parentMessageId } = opts

        const userLabel = USER_LABEL_DEFAULT
        const assistantLabel = ASSISTANT_LABEL_DEFAULT

        // fix number of qwen
        const maxNumTokens = 6000
        let messages: types.qwen.ChatCompletionRequestMessage[] = []

        if (systemMessage) {
            messages.push({
                role: 'system',
                content: systemMessage
            })
        }

        const systemMessageOffset = messages.length
        let nextMessages = text
            ? messages.concat([
                {
                    role,
                    content: text,
                    name: role === 'tool' ? opts.name : undefined
                }
            ])
            : messages

        let functionToken = 0

        let numTokens = functionToken

        do {
            const prompt = nextMessages
                .reduce((prompt, message) => {
                    switch (message.role) {
                        case 'system':
                            return prompt.concat([`Instructions:\n${message.content}`])
                        case 'user':
                            return prompt.concat([`${userLabel}:\n${message.content}`])
                        default:
                            return message.content ? prompt.concat([`${assistantLabel}:\n${message.content}`]) : prompt
                    }
                }, [] as string[])
                .join('\n\n')

            let nextNumTokensEstimate = await this._getTokenCount(prompt)

            for (const m1 of nextMessages) {
                nextNumTokensEstimate += await this._getTokenCount('')
            }

            const isValidPrompt = nextNumTokensEstimate + functionToken <= maxNumTokens

            if (prompt && !isValidPrompt) {
                break
            }
            messages = nextMessages
            numTokens = nextNumTokensEstimate + functionToken

            if (!isValidPrompt) {
                break
            }

            if (!parentMessageId) {
                break
            }

            const parentMessage = await this._getMessageById(parentMessageId)
            if (!parentMessage) {
                break
            }

            const parentMessageRole = parentMessage.role || 'user'

            nextMessages = nextMessages.slice(0, systemMessageOffset).concat([
                {
                    role: parentMessageRole,
                    content: parentMessage.functionCall ? parentMessage.functionCall.arguments : parentMessage.text,
                    name: parentMessage.functionCall ? parentMessage.functionCall.name : undefined
                },
                ...nextMessages.slice(systemMessageOffset)
            ])

            parentMessageId = parentMessage.parentMessageId

        } while (true)

        // Use up to 4096 tokens (prompt + response), but try to leave 1000 tokens
        // for the response.
        const maxTokens = Math.max(
            1,
            Math.min(this._maxModelTokens - numTokens, this._maxResponseTokens)
        )

        return { messages, maxTokens, numTokens }
    }

    protected async _getTokenCount(text: string) {
        if (!text) {
            return 0
        }
        // TODO: use a better fix in the tokenizer
        text = text.replace(/<\|endoftext\|>/g, '')

        return tokenizer.encode(text).length
    }

    protected async _defaultGetMessageById(
        id: string
    ): Promise<types.ChatMessage> {
        const res = await this._messageStore.get(id)
        return res
    }

    protected async _defaultUpsertMessage(
        message: types.ChatMessage
    ): Promise<void> {
        await this._messageStore.set(message.request_id, message)
    }
}
