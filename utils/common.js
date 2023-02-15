import { remark } from 'remark'
import stripMarkdown from 'strip-markdown'
export function markdownToText (markdown) {
  return remark()
    .use(stripMarkdown)
    .processSync(markdown ?? '')
    .toString()
}

export async function upsertMessage (message) {
  await redis.set(`CHATGPT:MESSAGE:${message.id}`, JSON.stringify(message))
}

export async function getMessageById (id) {
  let messageStr = await redis.get(`CHATGPT:MESSAGE:${id}`)
  return JSON.parse(messageStr)
}

export async function tryTimes (promiseFn, maxTries = 10) {
  try {
    return await promiseFn()
  } catch (e) {
    if (maxTries > 0) {
      logger.warn('Failed, retry ' + maxTries)
      return tryTimes(promiseFn, maxTries - 1)
    }
    throw e
  }
}

export async function makeForwardMsg (e, msg = [], dec = '') {
  let nickname = Bot.nickname
  if (e.isGroup) {
    let info = await Bot.getGroupMemberInfo(e.group_id, Bot.uin)
    nickname = info.card || info.nickname
  }
  let userInfo = {
    user_id: Bot.uin,
    nickname
  }

  let forwardMsg = []
  msg.forEach(v => {
    forwardMsg.push({
      ...userInfo,
      message: v
    })
  })

  /** 制作转发内容 */
  if (e.isGroup) {
    forwardMsg = await e.group.makeForwardMsg(forwardMsg)
  } else if (e.friend) {
    forwardMsg = await e.friend.makeForwardMsg(forwardMsg)
  } else {
    return false
  }

  if (dec) {
    /** 处理描述 */
    forwardMsg.data = forwardMsg.data
      .replace(/\n/g, '')
      .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
      .replace(/___+/, `<title color="#777777" size="26">${dec}</title>`)
  }

  return forwardMsg
}

// @see https://github.com/sindresorhus/p-timeout
export function pTimeout (
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
