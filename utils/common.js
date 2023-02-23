// import { remark } from 'remark'
// import stripMarkdown from 'strip-markdown'
import { exec } from 'child_process'
import lodash from 'lodash'
// export function markdownToText (markdown) {
//  return remark()
//    .use(stripMarkdown)
//    .processSync(markdown ?? '')
//    .toString()
// }
export function escapeHtml (str) {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  }
  return str.replace(/[&<>"'/]/g, (match) => htmlEntities[match])
}

export function randomString(length = 5) {
  let str = ''
  for (let i = 0; i < length; i++) {
    str += lodash.random(36).toString(36)
  }
  return str.substr(0, length)
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
export async function pTimeout (
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

export async function checkPnpm () {
  let npm = 'npm'
  let ret = await execSync('pnpm -v')
  if (ret.stdout) npm = 'pnpm'
  return npm
}

async function execSync (cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr })
    })
  })
}
