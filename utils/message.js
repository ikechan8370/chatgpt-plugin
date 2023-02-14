import { v4 as uuidv4 } from 'uuid'
import { Config } from '../config/index.js'
const BOM = [239, 187, 191]
export class OfficialChatGPTClient {
  constructor (opts = {}) {
    const {
      accessToken,
      apiReverseUrl,
      timeoutMs
    } = opts
    this._accessToken = accessToken
    this._apiReverseUrl = apiReverseUrl
    this._timeoutMs = timeoutMs
  }

  async sendMessage (prompt, opts = {}) {
    let {
      timeoutMs = this._timeoutMs,
      conversationId = uuidv4(),
      parentMessageId = uuidv4(),
      messageId = uuidv4(),
      action = 'next'
    } = opts
    let conversationResponse
    let response = ''
    let abortController = null
    if (timeoutMs) {
      abortController = new AbortController()
    }
    const url = this._apiReverseUrl || 'https://chat.openai.com/backend-api/conversation'
    const body = {
      action,
      messages: [
        {
          id: messageId,
          role: 'user',
          content: {
            content_type: 'text',
            parts: [prompt]
          }
        }
      ],
      conversationId,
      model: Config.plus ? 'text-davinci-002-render-sha' : 'text-davinci-002-render-sha',
      parent_message_id: parentMessageId
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        signal: abortController?.signal,
        headers: {
          accept: 'text/event-stream',
          'x-openai-assistant-app-id': '',
          authorization: `Bearer ${this._accessToken}`,
          'content-type': 'application/json',
          referer: 'https://chat.openai.com/chat'
        }
      })

      if (!res.ok) {
        return {
          error: {
            message: `ChatGPTAPI error ${res.status || res.statusText}`,
            statusCode: res.status,
            statusText: res.statusText
          },
          response: null,
          conversationId,
          messageId
        }
      }

      const responseP = new Promise(
        async (resolve, reject) => {
          function onMessage (data) {
            if (data === '[DONE]') {
              return resolve({
                error: null,
                response,
                conversationId,
                messageId,
                conversationResponse
              })
            }
            try {
              const _checkJson = JSON.parse(data)
            } catch (error) {
              console.log('warning: parse error.')
              return
            }
            try {
              const convoResponseEvent =
                                JSON.parse(data)
              conversationResponse = convoResponseEvent
              if (convoResponseEvent.conversation_id) {
                conversationId = convoResponseEvent.conversation_id
              }

              if (convoResponseEvent.message?.id) {
                messageId = convoResponseEvent.message.id
              }

              const partialResponse =
                                convoResponseEvent.message?.content?.parts?.[0]
              if (partialResponse) {
                response = partialResponse
              }
            } catch (err) {
              console.warn('fetchSSE onMessage unexpected error', err)
              reject(err)
            }
          }

          const parser = createParser((event) => {
            if (event.type === 'event') {
              onMessage(event.data)
            }
          })

          for await (const chunk of streamAsyncIterable(res.body)) {
            const str = new TextDecoder().decode(chunk)
            parser.feed(str)
          }
        }
      )

      if (timeoutMs) {
        if (abortController) {
          // This will be called when a timeout occurs in order for us to forcibly
          // ensure that the underlying HTTP request is aborted.
          responseP.cancel = () => {
            abortController.abort()
          }
        }

        return await pTimeout(responseP, {
          milliseconds: timeoutMs,
          message: 'ChatGPT timed out waiting for response'
        })
      } else {
        return await responseP
      }
    } catch (err) {
      const errMessageL = err.toString().toLowerCase()

      if (
        response &&
                (errMessageL === 'error: typeerror: terminated' ||
                    errMessageL === 'typeerror: terminated')
      ) {
        // OpenAI sometimes forcefully terminates the socket from their end before
        // the HTTP request has resolved cleanly. In my testing, these cases tend to
        // happen when OpenAI has already send the last `response`, so we can ignore
        // the `fetch` error in this case.
        return {
          error: null,
          response,
          conversationId,
          messageId,
          conversationResponse
        }
      }

      return {
        error: {
          message: err.toString(),
          statusCode: err.statusCode || err.status || err.response?.statusCode,
          statusText: err.statusText || err.response?.statusText
        },
        response: null,
        conversationId,
        messageId,
        conversationResponse
      }
    }
  }
}
async function * streamAsyncIterable (stream) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

// @see https://github.com/rexxars/eventsource-parser
function createParser (onParse) {
  // Processing state
  let isFirstChunk
  let buffer
  let startingPosition
  let startingFieldLength

  // Event state
  let eventId
  let eventName
  let data

  reset()
  return { feed, reset }

  function reset () {
    isFirstChunk = true
    buffer = ''
    startingPosition = 0
    startingFieldLength = -1

    eventId = undefined
    eventName = undefined
    data = ''
  }

  function feed (chunk) {
    buffer = buffer ? buffer + chunk : chunk

    // Strip any UTF8 byte order mark (BOM) at the start of the stream.
    // Note that we do not strip any non - UTF8 BOM, as eventsource streams are
    // always decoded as UTF8 as per the specification.
    if (isFirstChunk && hasBom(buffer)) {
      buffer = buffer.slice(BOM.length)
    }

    isFirstChunk = false

    // Set up chunk-specific processing state
    const length = buffer.length
    let position = 0
    let discardTrailingNewline = false

    // Read the current buffer byte by byte
    while (position < length) {
      // EventSource allows for carriage return + line feed, which means we
      // need to ignore a linefeed character if the previous character was a
      // carriage return
      // @todo refactor to reduce nesting, consider checking previous byte?
      // @todo but consider multiple chunks etc
      if (discardTrailingNewline) {
        if (buffer[position] === '\n') {
          ++position
        }
        discardTrailingNewline = false
      }

      let lineLength = -1
      let fieldLength = startingFieldLength
      let character

      for (
        let index = startingPosition;
        lineLength < 0 && index < length;
        ++index
      ) {
        character = buffer[index]
        if (character === ':' && fieldLength < 0) {
          fieldLength = index - position
        } else if (character === '\r') {
          discardTrailingNewline = true
          lineLength = index - position
        } else if (character === '\n') {
          lineLength = index - position
        }
      }

      if (lineLength < 0) {
        startingPosition = length - position
        startingFieldLength = fieldLength
        break
      } else {
        startingPosition = 0
        startingFieldLength = -1
      }

      parseEventStreamLine(buffer, position, fieldLength, lineLength)

      position += lineLength + 1
    }

    if (position === length) {
      // If we consumed the entire buffer to read the event, reset the buffer
      buffer = ''
    } else if (position > 0) {
      // If there are bytes left to process, set the buffer to the unprocessed
      // portion of the buffer only
      buffer = buffer.slice(position)
    }
  }

  function parseEventStreamLine (
    lineBuffer,
    index,
    fieldLength,
    lineLength
  ) {
    if (lineLength === 0) {
      // We reached the last line of this event
      if (data.length > 0) {
        onParse({
          type: 'event',
          id: eventId,
          event: eventName || undefined,
          data: data.slice(0, -1) // remove trailing newline
        })

        data = ''
        eventId = undefined
      }
      eventName = undefined
      return
    }

    const noValue = fieldLength < 0
    const field = lineBuffer.slice(
      index,
      index + (noValue ? lineLength : fieldLength)
    )
    let step = 0

    if (noValue) {
      step = lineLength
    } else if (lineBuffer[index + fieldLength + 1] === ' ') {
      step = fieldLength + 2
    } else {
      step = fieldLength + 1
    }

    const position = index + step
    const valueLength = lineLength - step
    const value = lineBuffer
      .slice(position, position + valueLength)
      .toString()

    if (field === 'data') {
      data += value ? `${value}\n` : '\n'
    } else if (field === 'event') {
      eventName = value
    } else if (field === 'id' && !value.includes('\u0000')) {
      eventId = value
    } else if (field === 'retry') {
      const retry = parseInt(value, 10)
      if (!Number.isNaN(retry)) {
        onParse({ type: 'reconnect-interval', value: retry })
      }
    }
  }
}

function hasBom (buffer) {
  return BOM.every(
    (charCode, index) => buffer.charCodeAt(index) === charCode
  )
}

/**
 TODO: Remove AbortError and just throw DOMException when targeting Node 18.
 */
function getDOMException (errorMessage) {
  return globalThis.DOMException === undefined
    ? new Error(errorMessage)
    : new DOMException(errorMessage)
}

/**
 TODO: Remove below function and just 'reject(signal.reason)' when targeting Node 18.
 */
function getAbortedReason (signal) {
  const reason =
        signal.reason === undefined
          ? getDOMException('This operation was aborted.')
          : signal.reason

  return reason instanceof Error ? reason : getDOMException(reason)
}

// @see https://github.com/sindresorhus/p-timeout
function pTimeout (
  promise,
  options
) {
  const {
    milliseconds,
    fallback,
    message,
    customTimers = { setTimeout, clearTimeout }
  } = options

  let timer

  const cancelablePromise = new Promise((resolve, reject) => {
    if (typeof milliseconds !== 'number' || Math.sign(milliseconds) !== 1) {
      throw new TypeError(
                `Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``
      )
    }

    if (milliseconds === Number.POSITIVE_INFINITY) {
      resolve(promise)
      return
    }

    if (options.signal) {
      const { signal } = options
      if (signal.aborted) {
        reject(getAbortedReason(signal))
      }

      signal.addEventListener('abort', () => {
        reject(getAbortedReason(signal))
      })
    }

    timer = customTimers.setTimeout.call(
      undefined,
      () => {
        if (fallback) {
          try {
            resolve(fallback())
          } catch (error) {
            reject(error)
          }

          return
        }

        const errorMessage =
                    typeof message === 'string'
                      ? message
                      : `Promise timed out after ${milliseconds} milliseconds`
        const timeoutError =
                    message instanceof Error ? message : new Error(errorMessage)

        if (typeof promise.cancel === 'function') {
          promise.cancel()
        }

        reject(timeoutError)
      },
      milliseconds
    )
    ;(async () => {
      try {
        resolve(await promise)
      } catch (error) {
        reject(error)
      } finally {
        customTimers.clearTimeout.call(undefined, timer)
      }
    })()
  })

  cancelablePromise.clear = () => {
    customTimers.clearTimeout.call(undefined, timer)
    timer = undefined
  }

  return cancelablePromise
}
