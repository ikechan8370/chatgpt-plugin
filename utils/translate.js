import md5 from 'md5'
import _ from 'lodash'
import { Config } from './config.js'
import { ChatGPTAPI } from './openai/chatgpt-api.js'
import { newFetch } from './proxy.js'
import { CustomGoogleGeminiClient } from '../client/CustomGoogleGeminiClient.js'
import XinghuoClient from './xinghuo/xinghuo.js'
import { QwenApi } from './alibaba/qwen-api.js'

// 代码参考：https://github.com/yeyang52/yenai-plugin/blob/b50b11338adfa5a4ef93912eefd2f1f704e8b990/model/api/funApi.js#L25
export const translateLangSupports = [
  { code: 'ar', label: '阿拉伯语', abbr: '阿', alphabet: 'A' },
  { code: 'de', label: '德语', abbr: '德', alphabet: 'D' },
  { code: 'ru', label: '俄语', abbr: '俄', alphabet: 'E' },
  { code: 'fr', label: '法语', abbr: '法', alphabet: 'F' },
  { code: 'ko', label: '韩语', abbr: '韩', alphabet: 'H' },
  { code: 'nl', label: '荷兰语', abbr: '荷', alphabet: 'H' },
  { code: 'pt', label: '葡萄牙语', abbr: '葡', alphabet: 'P' },
  { code: 'ja', label: '日语', abbr: '日', alphabet: 'R' },
  { code: 'th', label: '泰语', abbr: '泰', alphabet: 'T' },
  { code: 'es', label: '西班牙语', abbr: '西', alphabet: 'X' },
  { code: 'en', label: '英语', abbr: '英', alphabet: 'Y' },
  { code: 'it', label: '意大利语', abbr: '意', alphabet: 'Y' },
  { code: 'vi', label: '越南语', abbr: '越', alphabet: 'Y' },
  { code: 'id', label: '印度尼西亚语', abbr: '印', alphabet: 'Y' },
  { code: 'zh-CHS', label: '中文', abbr: '中', alphabet: 'Z' }
]
const API_ERROR = '出了点小问题，待会再试试吧'
export async function translateOld (msg, to = 'auto') {
  let from = 'auto'
  if (to !== 'auto') to = translateLangSupports.find(item => item.abbr == to)?.code
  if (!to) return `未找到翻译的语种，支持的语言为：\n${translateLangSupports.map(item => item.abbr).join('，')}\n`
  // 翻译结果为空的提示
  const RESULT_ERROR = '找不到翻译结果'
  // API 请求错误提示
  const API_ERROR = '翻译服务暂不可用，请稍后再试'
  const qs = (obj) => {
    let res = ''
    for (const [k, v] of Object.entries(obj)) { res += `${k}=${encodeURIComponent(v)}&` }
    return res.slice(0, res.length - 1)
  }
  const appVersion = '5.0 (Windows NT 10.0; Win64; x64) Chrome/98.0.4750.0'
  const payload = {
    from,
    to,
    bv: md5(appVersion),
    client: 'fanyideskweb',
    doctype: 'json',
    version: '2.1',
    keyfrom: 'fanyi.web',
    action: 'FY_BY_DEFAULT',
    smartresult: 'dict'
  }
  const headers = {
    Host: 'fanyi.youdao.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/98.0.4758.102',
    Referer: 'https://fanyi.youdao.com/',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Cookie: 'OUTFOX_SEARCH_USER_ID_NCOO=133190305.98519628; OUTFOX_SEARCH_USER_ID="2081065877@10.169.0.102";'
  }
  const api = 'https://fanyi.youdao.com/translate_o?smartresult=dict&smartresult=rule'
  const key = 'Ygy_4c=r#e#4EX^NUGUc5'

  try {
    if (Array.isArray(msg)) {
      const results = []
      for (let i = 0; i < msg.length; i++) {
        const item = msg[i]
        const lts = '' + new Date().getTime()
        const salt = lts + parseInt(String(10 * Math.random()), 10)
        const sign = md5(payload.client + item + salt + key)
        const postData = qs(Object.assign({ i: item, lts, sign, salt }, payload))
        let { errorCode, translateResult } = await fetch(api, {
          method: 'POST',
          body: postData,
          headers
        }).then(res => res.json()).catch(err => console.error(err))
        if (errorCode !== 0) return API_ERROR
        translateResult = _.flattenDeep(translateResult)?.map(item => item.tgt).join('\n')
        if (!translateResult) results.push(RESULT_ERROR)
        else results.push(translateResult)
      }
      return results
    } else {
      const i = msg // 翻译的内容
      const lts = '' + new Date().getTime()
      const salt = lts + parseInt(String(10 * Math.random()), 10)
      const sign = md5(payload.client + i + salt + key)
      const postData = qs(Object.assign({ i, lts, sign, salt }, payload))
      let { errorCode, translateResult } = await fetch(api, {
        method: 'POST',
        body: postData,
        headers
      }).then(res => res.json()).catch(err => console.error(err))
      if (errorCode !== 0) return API_ERROR
      translateResult = _.flattenDeep(translateResult)?.map(item => item.tgt).join('\n')
      if (!translateResult) return RESULT_ERROR
      return translateResult
    }
  } catch (err) {
    return API_ERROR
  }
}

/**
 *
 * @param msg 要翻译的
 * @param from 语种
 * @param to 语种
 * @param ai ai来源，支持openai, gemini, xh, qwen
 * @returns {Promise<*|string>}
 */
export async function translate (msg, to = 'auto', from = 'auto', ai = Config.translateSource) {
  try {
    let lang = '中'
    if (to !== 'auto') {
      lang = translateLangSupports.find(item => item.abbr == to)?.code
    }
    if (!lang) return `未找到翻译的语种，支持的语言为：\n${translateLangSupports.map(item => item.abbr).join('，')}\n`
    // if ai is not in the list, throw error
    if (!['openai', 'gemini', 'xh', 'qwen'].includes(ai)) throw new Error('ai来源错误')
    let system = `You will be provided with a sentence in the language with language code [${from}], and your task is to translate it into [${lang}]. Just print the result without any other words.`
    if (Array.isArray(msg)) {
      let result = []
      for (let i = 0; i < msg.length; i++) {
        let item = msg[i]
        let res = await translate(item, to, from, ai)
        result.push(res)
      }
      return result
    }
    switch (ai) {
      case 'openai': {
        let api = new ChatGPTAPI({
          apiBaseUrl: Config.openAiBaseUrl,
          apiKey: Config.apiKey,
          fetch: newFetch
        })
        const res = await api.sendMessage(msg, {
          systemMessage: system,
          completionParams: {
            model: 'gpt-3.5-turbo'
          }
        })
        return res.text
      }
      case 'gemini': {
        let client = new CustomGoogleGeminiClient({
          key: Config.geminiKey,
          model: Config.geminiModel,
          baseUrl: Config.geminiBaseUrl,
          debug: Config.debug
        })
        let option = {
          stream: false,
          onProgress: (data) => {
            if (Config.debug) {
              logger.info(data)
            }
          },
          system
        }
        let res = await client.sendMessage(msg, option)
        return res.text
      }
      case 'xh': {
        let client = new XinghuoClient({
          ssoSessionId: Config.xinghuoToken
        })
        let response = await client.sendMessage(msg, { system })
        return response.text
      }
      case 'qwen': {
        let completionParams = {
          parameters: {
            top_p: Config.qwenTopP || 0.5,
            top_k: Config.qwenTopK || 50,
            seed: Config.qwenSeed > 0 ? Config.qwenSeed : Math.floor(Math.random() * 114514),
            temperature: Config.qwenTemperature || 1,
            enable_search: !!Config.qwenEnableSearch
          }
        }
        if (Config.qwenModel) {
          completionParams.model = Config.qwenModel
        }
        let opts = {
          apiKey: Config.qwenApiKey,
          debug: false,
          systemMessage: system,
          completionParams,
          fetch: newFetch
        }
        let client = new QwenApi(opts)
        let option = {
          timeoutMs: 600000,
          completionParams
        }
        let result
        try {
          result = await client.sendMessage(msg, option)
        } catch (err) {
          logger.error(err)
          throw new Error(err)
        }
        return result.text
      }
    }
  } catch (e) {
    logger.error(e)
    logger.info('基于LLM的翻译失败，转用老版翻译')
    return await translateOld(msg, to)
  }
}
