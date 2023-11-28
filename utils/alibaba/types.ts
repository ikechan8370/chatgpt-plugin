import Keyv from 'keyv'

export type Role = 'user' | 'assistant' | 'system'

export type FetchFn = typeof fetch

export type QWenAPIOptions = {
    apiKey: string

    /** @defaultValue `'https://dashscope.aliyuncs.com/api/v1'` **/
    apiBaseUrl?: string

    apiOrg?: string

    /** @defaultValue `false` **/
    debug?: boolean

    completionParams?: Partial<
        Omit<qwen.CreateChatCompletionRequest, 'messages' | 'n' | 'stream'>
    >
    parameters?: qwen.QWenParameters,

    systemMessage?: string

    messageStore?: Keyv
    getMessageById?: GetMessageByIdFunction
    upsertMessage?: UpsertMessageFunction

    fetch?: FetchFn
}

export type SendMessageOptions = {
    /**
     * function role name
     */
    name?: string
    messageId?: string
    stream?: boolean
    systemMessage?: string
    parentMessageId?: string
    conversationId?: string
    timeoutMs?: number
    onProgress?: (partialResponse: ChatMessage) => void
    abortSignal?: AbortSignal
    completionParams?: Partial<
        Omit<qwen.CreateChatCompletionRequest, 'messages' | 'n' | 'stream'>
    >
}

export type MessageActionType = 'next' | 'variant'

export type SendMessageBrowserOptions = {
    conversationId?: string
    parentMessageId?: string
    messageId?: string
    action?: MessageActionType
    timeoutMs?: number
    onProgress?: (partialResponse: ChatMessage) => void
    abortSignal?: AbortSignal
}

export interface ChatMessage {
    id: string
    text: string
    role: Role
    parentMessageId?: string
    conversationId?: string
    detail?:
        | qwen.CreateChatCompletionResponse
        | CreateChatCompletionStreamResponse
}

export class ChatGPTError extends Error {
    statusCode?: number
    statusText?: string
    isFinal?: boolean
    accountId?: string
}

/** Returns a chat message from a store by it's ID (or null if not found). */
export type GetMessageByIdFunction = (id: string) => Promise<ChatMessage>

/** Upserts a chat message to a store. */
export type UpsertMessageFunction = (message: ChatMessage) => Promise<void>

export interface CreateChatCompletionStreamResponse
    extends openai.CreateChatCompletionDeltaResponse {
    usage: CreateCompletionStreamResponseUsage
}

export interface CreateCompletionStreamResponseUsage
    extends openai.CreateCompletionResponseUsage {
    estimated: true
}

/**
 * https://chat.openapi.com/backend-api/conversation
 */
export type ConversationJSONBody = {
    /**
     * The action to take
     */
    action: string

    /**
     * The ID of the conversation
     */
    conversation_id?: string

    /**
     * Prompts to provide
     */
    messages: Prompt[]

    /**
     * The model to use
     */
    model: string

    /**
     * The parent message ID
     */
    parent_message_id: string
}

export type Prompt = {
    /**
     * The content of the prompt
     */
    content: PromptContent

    /**
     * The ID of the prompt
     */
    id: string

    /**
     * The role played in the prompt
     */
    role: Role
}

export type ContentType = 'text'

export type PromptContent = {
    /**
     * The content type of the prompt
     */
    content_type: ContentType

    /**
     * The parts to the prompt
     */
    parts: string[]
}

export type ConversationResponseEvent = {
    message?: Message
    conversation_id?: string
    error?: string | null
}

export type Message = {
    id: string
    content: MessageContent
    role: Role
    user: string | null
    create_time: string | null
    update_time: string | null
    end_turn: null
    weight: number
    recipient: string
    metadata: MessageMetadata
}

export type MessageContent = {
    content_type: string
    parts: string[]
}

export type MessageMetadata = any

export namespace qwen {
    export interface CreateChatCompletionDeltaResponse {
        id: string
        object: 'chat.completion.chunk'
        created: number
        model: string
        choices: [
            {
                delta: {
                    role: Role
                    content?: string,
                    function_call?: {name: string, arguments: string}
                }
                index: number
                finish_reason: string | null
            }
        ]
    }

    /**
     *
     * @export
     * @interface ChatCompletionRequestMessage
     */
    export interface ChatCompletionRequestMessage {
        /**
         * The role of the author of this message.
         * @type {string}
         * @memberof ChatCompletionRequestMessage
         */
        role: ChatCompletionRequestMessageRoleEnum
        /**
         * The contents of the message
         * @type {string}
         * @memberof ChatCompletionRequestMessage
         */
        content: string
    }

    export declare const ChatCompletionRequestMessageRoleEnum: {
        readonly System: 'system'
        readonly User: 'user'
        readonly Assistant: 'assistant'
    }
    export declare type ChatCompletionRequestMessageRoleEnum =
        (typeof ChatCompletionRequestMessageRoleEnum)[keyof typeof ChatCompletionRequestMessageRoleEnum]


    export interface QWenInput {
        messages: Array<ChatCompletionRequestMessage>
    }

    export interface QWenParameters {
        result_format: string
        top_p: number
        top_k: number
        seed: number
        temperature: number
        enable_search: boolean
        incremental_output: boolean
    }
    /**
     *
     * @export
     * @interface CreateChatCompletionRequest
     */
    export interface CreateChatCompletionRequest {
        /**
         * ID of the model to use. Currently, only `gpt-3.5-turbo` and `gpt-3.5-turbo-0301` are supported.
         * @type {string}
         * @memberof CreateChatCompletionRequest
         */
        model: string
        /**
         * The messages to generate chat completions for, in the [chat format](/docs/guides/chat/introduction).
         * @type {Array<ChatCompletionRequestMessage>}
         * @memberof CreateChatCompletionRequest
         */
        input?: QWenInput

        parameters: QWenParameters
    }
    /**
     *
     * @export
     * @interface CreateChatCompletionResponse
     */
    export interface CreateChatCompletionResponse {
        /**
         *
         * @type {string}
         * @memberof CreateChatCompletionResponse
         */
        request_id: string
        /**
         *
         * @type {QWenOutput}
         * @memberof CreateChatCompletionResponse
         */
        output: QWenOutput
        /**
         *
         * @type {CreateCompletionResponseUsage}
         * @memberof CreateChatCompletionResponse
         */
        usage?: CreateCompletionResponseUsage
    }
    export interface QWenOutput {
        finish_reason: string
        text: string
    }
    /**
     *
     * @export
     * @interface CreateCompletionResponseUsage
     */
    export interface CreateCompletionResponseUsage {
        /**
         *
         * @type {number}
         * @memberof CreateCompletionResponseUsage
         */
        input_tokens: number
        /**
         *
         * @type {number}
         * @memberof CreateCompletionResponseUsage
         */
        output_tokens: number
    }
}
