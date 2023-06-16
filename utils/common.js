// import { remark } from 'remark'
// import stripMarkdown from 'strip-markdown'
import { exec } from 'child_process'
import lodash from 'lodash'
import fs from 'node:fs'
import path from 'node:path'
import buffer from 'buffer'
import yaml from 'yaml'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import { Config } from './config.js'
import { speakers as vitsRoleList } from './tts.js'
import { supportConfigurations as voxRoleList } from './tts/voicevox.js'
import { supportConfigurations as azureRoleList } from './tts/microsoft-azure.js'
// export function markdownToText (markdown) {
//  return remark()
//    .use(stripMarkdown)
//    .processSync(markdown ?? '')
//    .toString()
// }

let _puppeteer
try {
  const Puppeteer = (await import('../../../renderers/puppeteer/lib/puppeteer.js')).default
  let puppeteerCfg = {}
  let configFile = './renderers/puppeteer/config.yaml'
  if (fs.existsSync(configFile)) {
    try {
      puppeteerCfg = yaml.parse(fs.readFileSync(configFile, 'utf8'))
    } catch (e) {
      puppeteerCfg = {}
    }
  }
  _puppeteer = new Puppeteer(puppeteerCfg)
} catch (e) {
  logger.debug('未能加载puppeteer，尝试降级到Yunzai的puppeteer尝试')
  _puppeteer = puppeteer
}

let localIP = ''
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

export function randomString (length = 5) {
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

export function mkdirs (dirname) {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirs(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
  }
}

export function formatDate (date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // Note that getMonth() returns a zero-based index
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  const formattedDate = `${year}年${month}月${day}日 ${hour}:${minute}`
  return formattedDate
}
export async function getMasterQQ () {
  return (await import('../../../lib/config/config.js')).default.masterQQ
}

/**
 *
 * @param pluginKey plugin key
 * @param htmlPath html文件路径，相对于plugin resources目录
 * @param data 渲染数据
 * @param renderCfg 渲染配置
 * @param renderCfg.retType 返回值类型
 * * default/空：自动发送图片，返回true
 * * msgId：自动发送图片，返回msg id
 * * base64: 不自动发送图像，返回图像base64数据
 * @param renderCfg.beforeRender({data}) 可改写渲染的data数据
 * @returns {Promise<boolean>}
 */
export async function render (e, pluginKey, htmlPath, data = {}, renderCfg = {}) {
  // 处理传入的path
  htmlPath = htmlPath.replace(/.html$/, '')
  let paths = lodash.filter(htmlPath.split('/'), (p) => !!p)
  htmlPath = paths.join('/')
  // 创建目录
  const mkdir = (check) => {
    let currDir = `${process.cwd()}/data`
    for (let p of check.split('/')) {
      currDir = `${currDir}/${p}`
      if (!fs.existsSync(currDir)) {
        fs.mkdirSync(currDir)
      }
    }
    return currDir
  }
  mkdir(`html/${pluginKey}/${htmlPath}`)
  // 自动计算pluResPath
  let pluResPath = `../../../${lodash.repeat('../', paths.length)}plugins/${pluginKey}/resources/`
  // 渲染data
  data = {
    ...data,
    _plugin: pluginKey,
    _htmlPath: htmlPath,
    pluResPath,
    tplFile: `./plugins/${pluginKey}/resources/${htmlPath}.html`,
    saveId: data.saveId || data.save_id || paths[paths.length - 1],
    pageGotoParams: {
      waitUntil: 'networkidle0'
    }
  }
  // 处理beforeRender
  if (renderCfg.beforeRender) {
    data = renderCfg.beforeRender({ data }) || data
  }
  // 保存模板数据
  if (process.argv.includes('web-debug')) {
    // debug下保存当前页面的渲染数据，方便模板编写与调试
    // 由于只用于调试，开发者只关注自己当时开发的文件即可，暂不考虑app及plugin的命名冲突
    let saveDir = mkdir(`ViewData/${pluginKey}`)
    let file = `${saveDir}/${data._htmlPath.split('/').join('_')}.json`
    fs.writeFileSync(file, JSON.stringify(data))
  }
  // 截图
  let base64 = await puppeteer.screenshot(`${pluginKey}/${htmlPath}`, data)
  if (renderCfg.retType === 'base64') {
    return base64
  }
  let ret = true
  if (base64) {
    ret = await e.reply(base64)
  }
  return renderCfg.retType === 'msgId' ? ret : true
}

export async function renderUrl (e, url, renderCfg = {}) {
  // 云渲染
  if (Config.cloudRender) {
    url = url.replace(`127.0.0.1:${Config.serverPort || 3321}`, Config.serverHost || `${await getPublicIP()}:${Config.serverPort || 3321}`)
    const resultres = await fetch(`${Config.cloudTranscode}/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        option: {
          width: renderCfg.Viewport.width || 1280,
          height: renderCfg.Viewport.height || 720,
          timeout: 120000,
          waitUtil: renderCfg.waitUtil || 'networkidle2',
          wait: renderCfg.wait || 1000,
          func: renderCfg.func || '',
          dpr: renderCfg.deviceScaleFactor || 1
        },
        type: 'image'
      })
    })
    if (resultres.ok) {
      const buff = Buffer.from(await resultres.arrayBuffer())
      if (buff) {
        const base64 = segment.image(buff)
        if (renderCfg.retType === 'base64') {
          return base64
        }
        let ret = true
        if (base64) {
          ret = await e.reply(base64)
        }
        return renderCfg.retType === 'msgId' ? ret : true
      }
    }
  }

  await _puppeteer.browserInit()
  const page = await _puppeteer.browser.newPage()
  let base64
  try {
    await page.goto(url, { timeout: 120000 })
    await page.setViewport(renderCfg.Viewport || {
      width: 1280,
      height: 720
    })
    await page.waitForTimeout(renderCfg.wait || 1000)
    let buff = base64 = await page.screenshot({ fullPage: true })
    base64 = segment.image(buff)
    await page.close().catch((err) => logger.error(err))
  } catch (error) {
    logger.error(`${url}图片生成失败:${error}`)
    /** 关闭浏览器 */
    if (_puppeteer.browser) {
      await _puppeteer.browser.close().catch((err) => logger.error(err))
    }
    _puppeteer.browser = false
  }

  if (renderCfg.retType === 'base64') {
    return base64
  }
  let ret = true
  if (base64) {
    ret = await e.reply(base64)
  }
  return renderCfg.retType === 'msgId' ? ret : true
}

export function getDefaultReplySetting () {
  return {
    usePicture: Config.defaultUsePicture,
    useTTS: Config.defaultUseTTS,
    ttsRole: Config.defaultTTSRole,
    ttsRoleAzure: Config.azureTTSSpeaker,
    ttsRoleVoiceVox: Config.voicevoxTTSSpeaker
  }
}

export function parseDuration (duration) {
  const timeMap = {
    秒: 1,
    分: 60,
    小时: 60 * 60
  }

  // 去掉多余的空格并将单位转化为小写字母
  duration = duration.trim().toLowerCase()

  // 去掉末尾的 "钟" 字符
  if (duration.endsWith('钟')) {
    duration = duration.slice(0, -1)
  }

  // 提取数字和单位
  const match = duration.match(/^(\d+)\s*([\u4e00-\u9fa5]+)$/)

  if (!match) {
    throw new Error('Invalid duration string: ' + duration)
  }

  const num = parseInt(match[1], 10)
  const unit = match[2]

  if (!(unit in timeMap)) {
    throw new Error('Unknown time unit: ' + unit)
  }

  return num * timeMap[unit]
}

export function formatDuration (duration) {
  const timeMap = {
    小时: 60 * 60,
    分钟: 60,
    秒钟: 1
  }

  const units = Object.keys(timeMap)
  let result = ''

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    const value = Math.floor(duration / timeMap[unit])

    if (value > 0) {
      result += value + unit
      duration -= value * timeMap[unit]
    }
  }

  return result || '0秒钟'
}

/**
 * 判断服务器所在地是否为中国
 * @returns {Promise<boolean>}
 */
export async function isCN () {
  if (await redis.get('CHATGPT:COUNTRY_CODE')) {
    return await redis.get('CHATGPT:COUNTRY_CODE') === 'CN'
  } else {
    try {
      let response = await fetch('https://ipinfo.io/country')
      let countryCode = (await response.text()).trim()
      await redis.set('CHATGPT:COUNTRY_CODE', countryCode, { EX: 3600 })
      return countryCode === 'CN'
    } catch (err) {
      console.warn(err)
      // 没拿到归属地默认CN
      return true
    }
  }
}

export function limitString (str, maxLength, addDots = true) {
  if (str.length <= maxLength) {
    return str
  } else {
    if (addDots) {
      return str.slice(0, maxLength) + '...'
    } else {
      return str.slice(0, maxLength)
    }
  }
}

/**
 * ```
 * var text = '你好，こんにちは，Hello！';
 * var wrappedText = wrapTextByLanguage(text);
 * console.log(wrappedText);
 * ```
 * @param text
 * @returns {string}
 */
export function wrapTextByLanguage (text) {
  // 根据标点符号分割句子
  const symbols = /([。！？，])/
  let sentences = text.split(symbols)
  sentences = sentences.reduce((acc, cur, index) => {
    if (symbols.test(cur)) {
      // 如果当前字符串是标点符号，则将其添加到前一个字符串的末尾
      acc[acc.length - 1] += cur
    } else {
      // 否则，将当前字符串添加到结果数组中
      acc.push(cur)
    }

    return acc
  }, [])
  let wrappedSentences = []
  for (let i = 0; i < sentences.length; i++) {
    let sentence = sentences[i]

    // 如果是标点符号，则跳过
    if (sentence === '。' || sentence === '！' || sentence === '？' || sentence === '，') {
      continue
    }
    const pattern = /[a-zA-Z]/g
    sentence = sentence.replace(pattern, '')
    // 判断这一句话是中文还是日语
    let isChinese = true
    let isJapanese = false
    for (let j = 0; j < sentence.length; j++) {
      let char = sentence.charAt(j)
      if (char.match(/[\u3040-\u309F\u30A0-\u30FF]/)) {
        isJapanese = true
        isChinese = false
        break
      }
    }

    // 包裹句子
    if (isChinese) {
      sentence = `[ZH]${sentence}[ZH]`
    } else if (isJapanese) {
      sentence = `[JA]${sentence}[JA]`
    }

    wrappedSentences.push(sentence)
  }

  const mergedSentences = wrappedSentences.reduce((acc, cur) => {
    if (cur === '') {
      // 如果当前字符串为空或者是标点符号，则直接将其添加到结果数组中
      acc.push(cur)
    } else {
      // 否则，判断前一个字符串和当前字符串是否为同种语言
      const prev = acc[acc.length - 1]
      let curPrefix = `${cur.slice(0, 4)}`
      if (prev && prev.startsWith(curPrefix)) {
        // 如果前一个字符串和当前字符串为同种语言，则将它们合并
        let a = (acc[acc.length - 1] + cur)
        a = lodash.replace(a, curPrefix + curPrefix, '')
        acc[acc.length - 1] = a
      } else {
        // 否则，将当前字符串添加到结果数组中
        acc.push(cur)
      }
    }

    return acc
  }, [])

  return mergedSentences.join('')
}

// console.log(wrapTextByLanguage('你好，这里是哈哈，こんにちは，Hello！'))

export function maskQQ (qq) {
  if (!qq) {
    return '未知'
  }
  let len = qq.length // QQ号长度
  let newqq = qq.slice(0, 3) + '*'.repeat(len - 7) + qq.slice(len - 3) // 替换中间3位为*
  return newqq
}

export function completeJSON (input) {
  let result = {}

  let inJson = false
  let inQuote = false
  let onStructure = false
  let isKey = true
  let tempKey = ''
  let tempValue = ''
  for (let i = 0; i < input.length; i++) {
    // 获取当前字符
    let char = input[i]
    // 获取到json头
    if (!inJson && char === '{') {
      inJson = true
      continue
    }
    // 如果不再json中，忽略当前字符
    if (!inJson) continue

    // 获取结构引号
    if (char === '"' && input[i - 1] != '\\') {
      inQuote = !inQuote
      // 如果是开始数据，则确保当前结构开放
      if (inQuote) onStructure = true
      continue
    }
    // 获取:切换kv
    if (!inQuote && onStructure && char === ':') {
      isKey = !isKey
      continue
    }
    // 将字符写入缓存
    if (inQuote && onStructure) {
      // 根据当前类型写入对应缓存
      if (isKey) {
        tempKey += char
      } else {
        tempValue += char
      }
    }
    // 结束结构追加数据
    if (!inQuote && onStructure && char === ',') {
      // 追加结构
      result[tempKey] = tempValue.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
      // 结束结构清除数据
      onStructure = false
      inQuote = false
      isKey = true
      tempKey = ''
      tempValue = ''
    }
  }
  // 处理截断的json数据
  if (onStructure && tempKey != '') {
    result[tempKey] = tempValue.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
  }
  return result
}

export async function isImage (link) {
  try {
    let response = await fetch(link)
    let body = await response.arrayBuffer()
    let buf = buffer.Buffer.from(body)
    let magic = buf.toString('hex', 0, 4)
    return ['ffd8', '8950', '4749'].includes(magic)
  } catch (error) {
    return false
  }
}

export async function getPublicIP () {
  try {
    if (localIP === '') {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      localIP = data.ip
    }
    return localIP
  } catch (err) {
    return '127.0.0.1'
  }
}

export async function getUserData (user) {
  const dir = 'resources/ChatGPTCache/user'
  const filename = `${user}.json`
  const filepath = path.join(dir, filename)
  try {
    let data = fs.readFileSync(filepath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return {
      user,
      passwd: '',
      chat: [],
      mode: '',
      cast: {
        api: '', // API设定
        bing: '', // 必应设定
        bing_resource: '', // 必应扩展资料
        slack: '' // Slack设定
      }
    }
  }
}

export function getVoicevoxRoleList () {
  return voxRoleList.map(item => item.name).join('、')
}

export function getAzureRoleList () {
  return azureRoleList.map(item => item.name).join('、')
}

export async function getVitsRoleList (e) {
  const [firstHalf, secondHalf] = [vitsRoleList.slice(0, Math.floor(vitsRoleList.length / 2)).join('、'), vitsRoleList.slice(Math.floor(vitsRoleList.length / 2)).join('、')]
  const [chunk1, chunk2] = [firstHalf.match(/[^、]+(?:、[^、]+){0,30}/g), secondHalf.match(/[^、]+(?:、[^、]+){0,30}/g)]
  const list = [await makeForwardMsg(e, chunk1, 'vits角色列表1'), await makeForwardMsg(e, chunk2, 'vits角色列表2')]
  return await makeForwardMsg(e, list, 'vits角色列表')
}

export async function getUserReplySetting (e) {
  let userSetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
  if (userSetting) {
    userSetting = JSON.parse(userSetting)
    if (Object.keys(userSetting).indexOf('useTTS') < 0) {
      userSetting.useTTS = Config.defaultUseTTS
    }
  } else {
    userSetting = getDefaultReplySetting()
  }
  return userSetting
}

export async function getImg (e) {
  // 取消息中的图片、at的头像、回复的图片，放入e.img
  if (e.at && !e.source) {
    e.img = [`https://q1.qlogo.cn/g?b=qq&s=0&nk=${e.at}`]
  }
  if (e.source) {
    let reply
    if (e.isGroup) {
      reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message
    } else {
      reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message
    }
    if (reply) {
      let i = []
      for (let val of reply) {
        if (val.type === 'image') {
          i.push(val.url)
        }
      }
      e.img = i
    }
  }
  return e.img
}

export async function getImageOcrText (e) {
  const img = await getImg(e)
  if (img) {
    try {
      let resultArr = []
      let eachImgRes = ''
      for (let i in img) {
        const imgOCR = await Bot.imageOcr(img[i])
        for (let text of imgOCR.wordslist) {
          eachImgRes += (`${text?.words}  \n`)
        }
        if (eachImgRes) resultArr.push(eachImgRes)
        eachImgRes = ''
      }
      // logger.warn('resultArr', resultArr)
      return resultArr
    } catch (err) {
      return false
      // logger.error(err)
    }
  } else {
    return false
  }
}
// 对原始黑白名单进行去重和去除无效群号处理，并处理通过锅巴面板添加错误配置时可能导致的问题
export function processList (whitelist, blacklist) {
  whitelist = Array.isArray(whitelist)
    ? whitelist
    : String(whitelist).split(/[,，]/)
  blacklist = !Array.isArray(blacklist)
    ? blacklist
    : String(blacklist).split(/[,，]/)
  whitelist = Array.from(new Set(whitelist)).filter(value => /^\^?[1-9]\d{5,9}$/.test(value))
  blacklist = Array.from(new Set(blacklist)).filter(value => /^\^?[1-9]\d{5,9}$/.test(value))
  return [whitelist, blacklist]
}
