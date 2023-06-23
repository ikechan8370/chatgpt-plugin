import { AbstractTool } from './AbstractTool.js'
import { ChatGPTAPI } from '../openai/chatgpt-api.js'
import { Config } from '../config.js'
import fetch from 'node-fetch'
import proxy from 'https-proxy-agent'
import { getMaxModelTokens } from '../common.js'
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
    let { url } = opts
    try {
      let res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        }
      })
      let text = await res.text()
      let maxModelTokens = getMaxModelTokens(Config.model)
      text = text.slice(0, Math.min(text.length, maxModelTokens - 1600))
      let api = new ChatGPTAPI({
        apiBaseUrl: Config.openAiBaseUrl,
        apiKey: Config.apiKey,
        debug: false,
        completionParams: {
          model: Config.model
        },
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
      const htmlContentSummaryRes = await api.sendMessage(`这是一个网页html的内容，请你从中提取出其中的主体内容告诉我。${text}`)
      let htmlContentSummary = htmlContentSummaryRes.text
      return `this is the main content of website:\n ${htmlContentSummary}`
    } catch (err) {
      return `failed to visit the website, error: ${err.toString()}`
    }
  }

  description = 'Useful when you want to browse a website by url'
}
