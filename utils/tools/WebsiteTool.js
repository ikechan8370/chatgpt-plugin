import { AbstractTool } from './AbstractTool.js'

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
    let res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    })
    let text = await res.text()
    text = text.slice(0, Math.min(text.length, 4000))
    return `this is part of the content of website:\n ${text}`
  }

  description = 'Useful when you want to browse a website by url'
}
