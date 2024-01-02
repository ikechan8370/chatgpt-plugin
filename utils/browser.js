import lodash from 'lodash'
import { Config } from '../utils/config.js'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { getOpenAIAuth } from './openai-auth.js'
import { v4 as uuidv4 } from 'uuid'
import common from '../../../lib/common/common.js'
const chatUrl = 'https://chat.openai.com/chat'
let puppeteer = {}

class Puppeteer {
  constructor () {
    let args = [
      '--exclude-switches',
      '--no-sandbox',
      '--remote-debugging-port=51777',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--ignore-certificate-errors',
      '--no-first-run',
      '--no-service-autorun',
      '--password-store=basic',
      '--system-developer-mode',
      '--mute-audio',
      '--disable-default-apps',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--disable-web-security'
      // '--shm-size=1gb'
    ]
    if (Config.proxy) {
      args.push(`--proxy-server=${Config.proxy}`)
    }
    this.browser = false
    this.lock = false
    this.config = {
      headless: Config.headless,
      args
    }

    if (Config.chromePath) {
      this.config.executablePath = Config.chromePath
    }

    this.html = {}
  }

  async initPupp () {
    if (!lodash.isEmpty(puppeteer)) return puppeteer
    puppeteer = (await import('puppeteer-extra')).default
    const pluginStealth = StealthPlugin()
    puppeteer.use(pluginStealth)
    if (Config['2captchaToken']) {
      const pluginCaptcha = (await import('puppeteer-extra-plugin-recaptcha')).default
      puppeteer.use(pluginCaptcha({
        provider: {
          id: '2captcha',
          token: Config['2captchaToken'] // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
        },
        visualFeedback: true
      }))
    }
    return puppeteer
  }

  /**
     * 初始化chromium
     */
  async browserInit () {
    await this.initPupp()
    if (this.browser) return this.browser
    if (this.lock) return false
    this.lock = true

    logger.mark('chatgpt puppeteer 启动中...')
    const browserURL = 'http://127.0.0.1:51777'
    try {
      this.browser = await puppeteer.connect({ browserURL })
    } catch (e) {
      /** 初始化puppeteer */
      this.browser = await puppeteer.launch(this.config).catch((err) => {
        logger.error(err.toString())
        if (String(err).includes('correct Chromium')) {
          logger.error('没有正确安装Chromium，可以尝试执行安装命令：node ./node_modules/puppeteer/install.js')
        }
      })
    }
    this.lock = false

    if (!this.browser) {
      logger.error('chatgpt puppeteer 启动失败')
      return false
    }

    logger.mark('chatgpt puppeteer 启动成功')

    /** 监听Chromium实例是否断开 */
    this.browser.on('disconnected', (e) => {
      logger.info('Chromium实例关闭或崩溃！')
      this.browser = false
    })

    return this.browser
  }
}

export class ChatGPTPuppeteer extends Puppeteer {
  constructor (opts = {}) {
    super()
    const {
      email,
      password,
      markdown = true,
      debug = false,
      isGoogleLogin = false,
      minimize = true,
      captchaToken,
      executablePath
    } = opts

    this._email = email
    this._password = password

    this._markdown = !!markdown
    this._debug = !!debug
    this._isGoogleLogin = !!isGoogleLogin
    this._minimize = !!minimize
    this._captchaToken = captchaToken
    this._executablePath = executablePath
  }

  async getBrowser () {
    if (this.browser) {
      return this.browser
    } else {
      return await this.browserInit()
    }
  }

  async init () {
    // if (this.inited) {
    //   return true
    // }
    logger.info('init chatgpt browser')
    try {
      // this.browser = await getBrowser({
      //   captchaToken: this._captchaToken,
      //   executablePath: this._executablePath
      // })
      this.browser = await this.getBrowser()
      this._page =
                (await this.browser.pages())[0] || (await this.browser.newPage())
      await maximizePage(this._page)
      this._page.on('request', this._onRequest.bind(this))
      this._page.on('response', this._onResponse.bind(this))
      // bypass cloudflare and login
      let preCookies = await redis.get('CHATGPT:RAW_COOKIES')
      if (preCookies) {
        await this._page.setCookie(...JSON.parse(preCookies))
      }
      // const url = this._page.url().replace(/\/$/, '')
      // bypass annoying popup modals
      await this._page.evaluateOnNewDocument(() => {
        window.localStorage.setItem('oai/apps/hasSeenOnboarding/chat', 'true')
        const chatGPTUpdateDates = ['2022-12-15', '2022-12-19', '2023-01-09', '2023-01-30', '2023-02-10']
        chatGPTUpdateDates.forEach(date => {
          window.localStorage.setItem(
                `oai/apps/hasSeenReleaseAnnouncement/${date}`,
                'true'
          )
        })
      })
      await this._page.goto(chatUrl, {
        waitUntil: 'networkidle2'
      })
      let timeout = 30000
      try {
        while (timeout > 0 && (await this._page.title()).toLowerCase().indexOf('moment') > -1) {
          // if meet captcha
          if (Config['2captchaToken']) {
            await this._page.solveRecaptchas()
          }
          await common.sleep(300)
          timeout = timeout - 300
        }
      } catch (e) {
        // navigation后获取title会报错，报错说明已经在navigation了正合我意。
      }
      if (timeout < 0) {
        logger.error('wait for cloudflare navigation timeout. 可能遇见验证码')
        throw new Error('wait for cloudflare navigation timeout. 可能遇见验证码')
      }
      try {
        await this._page.waitForNavigation({ timeout: 3000 })
      } catch (e) {}

      if (!await this.getIsAuthenticated()) {
        await redis.del('CHATGPT:RAW_COOKIES')
        logger.info('需要登录，准备进行自动化登录')
        await getOpenAIAuth({
          email: this._email,
          password: this._password,
          browser: this.browser,
          page: this._page,
          isGoogleLogin: this._isGoogleLogin
        })
        logger.info('登录完成')
      } else {
        logger.info('无需登录')
      }
    } catch (err) {
      if (this.browser) {
        await this.browser.close()
      }

      this.browser = null
      this._page = null

      throw err
    }

    const url = this._page.url().replace(/\/$/, '')

    if (url !== chatUrl) {
      await this._page.goto(chatUrl, {
        waitUntil: 'networkidle2'
      })
    }

    // dismiss welcome modal (and other modals)
    do {
      const modalSelector = '[data-headlessui-state="open"]'

      if (!(await this._page.$(modalSelector))) {
        break
      }

      try {
        await this._page.click(`${modalSelector} button:last-child`)
      } catch (err) {
        // "next" button not found in welcome modal
        break
      }

      await common.sleep(300)
    } while (true)

    if (!await this.getIsAuthenticated()) {
      return false
    }

    if (this._minimize) {
      await minimizePage(this._page)
    }

    return true
  }

  _onRequest = (request) => {
    const url = request.url()
    if (!isRelevantRequest(url)) {
      return
    }

    const method = request.method()
    let body

    if (method === 'POST') {
      body = request.postData()

      try {
        body = JSON.parse(body)
      } catch (_) {
      }

      // if (url.endsWith('/conversation') && typeof body === 'object') {
      //   const conversationBody: types.ConversationJSONBody = body
      //   const conversationId = conversationBody.conversation_id
      //   const parentMessageId = conversationBody.parent_message_id
      //   const messageId = conversationBody.messages?.[0]?.id
      //   const prompt = conversationBody.messages?.[0]?.content?.parts?.[0]

      //   // TODO: store this info for the current sendMessage request
      // }
    }

    if (this._debug) {
      console.log('\nrequest', {
        url,
        method,
        headers: request.headers(),
        body
      })
    }
  }

  _onResponse = async (response) => {
    const request = response.request()

    const url = response.url()
    if (!isRelevantRequest(url)) {
      return
    }

    const status = response.status()

    let body
    try {
      body = await response.json()
    } catch (_) {
    }

    if (this._debug) {
      console.log('\nresponse', {
        url,
        ok: response.ok(),
        status,
        statusText: response.statusText(),
        headers: response.headers(),
        body,
        request: {
          method: request.method(),
          headers: request.headers(),
          body: request.postData()
        }
      })
    }

    if (url.endsWith('/conversation')) {
      if (status === 403) {
        await this.handle403Error()
      }
    } else if (url.endsWith('api/auth/session')) {
      if (status === 403) {
        await this.handle403Error()
      } else {
        const session = body
        if (session?.accessToken) {
          this._accessToken = session.accessToken
        }
      }
    }
  }

  async handle403Error () {
    console.log(`ChatGPT "${this._email}" session expired; refreshing...`)
    try {
      await maximizePage(this._page)
      await this._page.reload({
        waitUntil: 'networkidle2',
        timeout: Config.chromeTimeoutMS // 2 minutes
      })
      if (this._minimize) {
        await minimizePage(this._page)
      }
    } catch (err) {
      console.error(
              `ChatGPT "${this._email}" error refreshing session`,
              err.toString()
      )
    }
  }

  async getIsAuthenticated () {
    try {
      const inputBox = await this._getInputBox()
      return !!inputBox
    } catch (err) {
      // can happen when navigating during login
      return false
    }
  }

  async sendMessage (
    message,
    opts = {}
  ) {
    const {
      conversationId,
      parentMessageId = uuidv4(),
      messageId = uuidv4(),
      action = 'next',
      // TODO
      timeoutMs,
      // onProgress,
      onConversationResponse
    } = opts

    const inputBox = await this._getInputBox()
    if (!inputBox || !this._accessToken) {
      console.log(`chatgpt re-authenticating ${this._email}`)
      let isAuthenticated = false

      try {
        isAuthenticated = await this.init()
      } catch (err) {
        console.warn(
                `chatgpt error re-authenticating ${this._email}`,
                err.toString()
        )
        throw err
      }
      let timeout = 100000
      if (isAuthenticated) {
        while (!this._accessToken) {
          // wait for async response hook result
          await common.sleep(300)
          timeout = timeout - 300
          if (timeout < 0) {
            const error = new Error('Not signed in')
            error.statusCode = 401
            throw error
          }
        }
      } else if (!this._accessToken) {
        const error = new Error('Not signed in')
        error.statusCode = 401
        throw error
      }
    }

    const url = 'https://chat.openai.com/backend-api/conversation'
    const body = {
      action,
      messages: [
        {
          id: messageId,
          role: 'user',
          content: {
            content_type: 'text',
            parts: [message]
          }
        }
      ],
      model: Config.plus ? Config.useGPT4 ? 'gpt-4' : 'text-davinci-002-render-sha' : 'text-davinci-002-render-sha',
      parent_message_id: parentMessageId
    }

    if (conversationId) {
      body.conversation_id = conversationId
    }

    // console.log('>>> EVALUATE', url, this._accessToken, body)
    const result = await this._page.evaluate(
      browserPostEventStream,
      url,
      this._accessToken,
      body,
      timeoutMs
    )
    // console.log('<<< EVALUATE', result)

    if (result.error) {
      const error = new Error(result.error.message)
      error.statusCode = result.error.statusCode
      error.statusText = result.error.statusText

      if (error.statusCode === 403) {
        await this.handle403Error()
      }

      throw error
    }

    // TODO: support sending partial response events
    if (onConversationResponse) {
      onConversationResponse(result.conversationResponse)
    }

    return {
      text: result.response,
      conversationId: result.conversationResponse.conversation_id,
      id: messageId,
      parentMessageId
    }

    // const lastMessage = await this.getLastMessage()

    // await inputBox.focus()
    // const paragraphs = message.split('\n')
    // for (let i = 0; i < paragraphs.length; i++) {
    //   await inputBox.type(paragraphs[i], { delay: 0 })
    //   if (i < paragraphs.length - 1) {
    //     await this._page.keyboard.down('Shift')
    //     await inputBox.press('Enter')
    //     await this._page.keyboard.up('Shift')
    //   } else {
    //     await inputBox.press('Enter')
    //   }
    // }

    // const responseP = new Promise<string>(async (resolve, reject) => {
    //   try {
    //     do {
    //       await common.sleep(1000)

    //       // TODO: this logic needs some work because we can have repeat messages...
    //       const newLastMessage = await this.getLastMessage()
    //       if (
    //         newLastMessage &&
    //         lastMessage?.toLowerCase() !== newLastMessage?.toLowerCase()
    //       ) {
    //         return resolve(newLastMessage)
    //       }
    //     } while (true)
    //   } catch (err) {
    //     return reject(err)
    //   }
    // })

    // if (timeoutMs) {
    //   return pTimeout(responseP, {
    //     milliseconds: timeoutMs
    //   })
    // } else {
    //   return responseP
    // }
  }

  async resetThread () {
    try {
      await this._page.click('nav > a:nth-child(1)')
    } catch (err) {
      // ignore for now
    }
  }

  async close () {
    if (this.browser) {
      await this.browser.close()
    }
    this._page = null
    this.browser = null
  }

  protected

  async _getInputBox () {
    // [data-id="root"]
    return this._page?.$('textarea')
  }
}

export default new ChatGPTPuppeteer()

export async function minimizePage (page) {
  const session = await page.target().createCDPSession()
  const goods = await session.send('Browser.getWindowForTarget')
  const { windowId } = goods
  await session.send('Browser.setWindowBounds', {
    windowId,
    bounds: { windowState: 'minimized' }
  })
}

export async function maximizePage (page) {
  const session = await page.target().createCDPSession()
  const goods = await session.send('Browser.getWindowForTarget')
  const { windowId } = goods
  await session.send('Browser.setWindowBounds', {
    windowId,
    bounds: { windowState: 'normal' }
  })
}

export function isRelevantRequest (url) {
  let pathname

  try {
    const parsedUrl = new URL(url)
    pathname = parsedUrl.pathname
    url = parsedUrl.toString()
  } catch (_) {
    return false
  }

  if (!url.startsWith('https://chat.openai.com')) {
    return false
  }

  if (
    !pathname.startsWith('/backend-api/') &&
        !pathname.startsWith('/api/auth/session')
  ) {
    return false
  }

  if (pathname.endsWith('backend-api/moderations')) {
    return false
  }

  return true
}

/**
 * This function is injected into the ChatGPT webapp page using puppeteer. It
 * has to be fully self-contained, so we copied a few third-party sources and
 * included them in here.
 */
export async function browserPostEventStream (
  url,
  accessToken,
  body,
  timeoutMs
) {
  // Workaround for https://github.com/esbuild-kit/tsx/issues/113
  globalThis.__name = () => undefined

  const BOM = [239, 187, 191]

  let conversationResponse
  let conversationId = body?.conversation_id
  let messageId = body?.messages?.[0]?.id
  let response = ''

  try {
    console.log('browserPostEventStream', url, accessToken, body)

    let abortController = null
    if (timeoutMs) {
      abortController = new AbortController()
    }

    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      signal: abortController?.signal,
      headers: {
        accept: 'text/event-stream',
        'x-openai-assistant-app-id': '',
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      }
    })

    console.log('browserPostEventStream response', res)

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
      console.log({ pTimeout })
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
  //  async function pTimeout (promise, option) {
  //    return await pTimeout(promise, option)
  //  }
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
  /**
     TODO: Remove AbortError and just throw DOMException when targeting Node 18.
     */
  function getDOMException (errorMessage) {
    return globalThis.DOMException === undefined
      ? new Error(errorMessage)
      : new DOMException(errorMessage)
  }
}
