import { AbstractTool } from './AbstractTool.js'
import { ChatGPTAPI } from '../openai/chatgpt-api.js'
import { Config } from '../config.js'
import fetch from 'node-fetch'
import proxy from 'https-proxy-agent'
import { getMaxModelTokens } from '../common.js'
import { ChatGPTPuppeteer } from '../browser.js'
import { CustomGoogleGeminiClient } from '../../client/CustomGoogleGeminiClient.js'
export class WebsiteTool extends AbstractTool {
  name = 'website'

  parameters = {
    properties: {
      url: {
        type: 'string',
        description: '要访问的网站网址'
      }
    },
    required: ['url']
  }

  func = async function (opts) {
    let { url, mode, e } = opts
    try {
      // let res = await fetch(url, {
      //   headers: {
      //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      //   }
      // })
      // let text = await res.text()
      let origin = false
      if (!Config.headless) {
        Config.headless = true
        origin = true
      }
      let ppt = new ChatGPTPuppeteer()
      let browser = await ppt.getBrowser()
      let page = await browser.newPage()
      await page.goto(url, {
        waitUntil: 'networkidle2'
      })
      let text = await page.content()
      await page.close()
      if (origin) {
        Config.headless = false
      }
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
        .replace(/<figure\b[^<]*(?:(?!<\/figure>)<[^<]*)*<\/figure>/gi, '')
        .replace(/<path\b[^<]*(?:(?!<\/path>)<[^<]*)*<\/path>/gi, '')
        .replace(/<video\b[^<]*(?:(?!<\/video>)<[^<]*)*<\/video>/gi, '')
        .replace(/<audio\b[^<]*(?:(?!<\/audio>)<[^<]*)*<\/audio>/gi, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/<!--[\s\S]*?-->/gi, '') // 去除注释
        .replace(/<(?!\/?(title|ul|li|td|tr|thead|tbody|blockquote|h[1-6]|H[1-6])[^>]*)\w+\s+[^>]*>/gi, '') // 去除常见语音标签外的含属性标签
        .replace(/<(\w+)(\s[^>]*)?>/gi, '<$1>') // 进一步去除剩余标签的属性
        .replace(/<\/(?!\/?(title|ul|li|td|tr|thead|tbody|blockquote|h[1-6]|H[1-6])[^>]*)[a-z][a-z0-9]*>/gi, '') // 去除常见语音标签外的含属性结束标签
        .replace(/[\n\r]/gi, '') // 去除回车换行
        .replace(/\s{2}/g, '') // 多个空格只保留一个空格
        .replace('<!DOCTYPE html>', '') // 去除<!DOCTYPE>声明

      if (mode === 'gemini') {
        let client = new CustomGoogleGeminiClient({
          e,
          userId: e?.sender?.user_id,
          key: Config.geminiKey,
          model: Config.geminiModel,
          baseUrl: Config.geminiBaseUrl,
          debug: Config.debug
        })
        const htmlContentSummaryRes = await client.sendMessage(`去除与主体内容无关的部分，从中整理出主体内容并转换成md格式，不需要主观描述性的语言与冗余的空白行。${text}`)
        let htmlContentSummary = htmlContentSummaryRes.text
        return `this is the main content of website:\n ${htmlContentSummary}`
      } else {
        let maxModelTokens = getMaxModelTokens(Config.model)
        text = text.slice(0, Math.min(text.length, maxModelTokens - 1600))
        let completionParams = {
          // model: Config.model
          model: 'gpt-3.5-turbo-16k'
        }
        let api = new ChatGPTAPI({
          apiBaseUrl: Config.openAiBaseUrl,
          apiKey: Config.apiKey,
          debug: false,
          completionParams,
          fetch: (url, options = {}) => {
            const defaultOptions = Config.proxy
              ? {
                  agent: proxy(Config.proxy)
                }
              : {}
            const mergedOptions = {
              ...defaultOptions,
              ...options
            }
            return fetch(url, mergedOptions)
          },
          maxModelTokens
        })
        const htmlContentSummaryRes = await api.sendMessage(`去除与主体内容无关的部分，从中整理出主体内容并转换成md格式，不需要主观描述性的语言与冗余的空白行。${text}`, { completionParams })
        let htmlContentSummary = htmlContentSummaryRes.text
        return `this is the main content of website:\n ${htmlContentSummary}`
      }
    } catch (err) {
      return `failed to visit the website, error: ${err.toString()}`
    }
  }

  description = 'Useful when you want to browse a website by url'
}
