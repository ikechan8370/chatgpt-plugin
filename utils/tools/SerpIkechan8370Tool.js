import { AbstractTool } from './AbstractTool.js'

export class SerpIkechan8370Tool extends AbstractTool {
  name = 'search'

  parameters = {
    properties: {
      q: {
        type: 'string',
        description: 'search keyword'
      },
      source: {
        type: 'string',
        enum: ['google', 'bing', 'baidu']
      }
    },
    required: ['q']
  }

  func = async function (opts) {
    let { q, source } = opts
    if (!source) {
      source = 'google'
    }
    let serpRes = await fetch(`https://serp.ikechan8370.com/${source}?q=${encodeURIComponent(q)}&lang=zh-CN&limit=10`, {
      headers: {
        'X-From-Library': 'ikechan8370'
      }
    })
    serpRes = await serpRes.json()

    let res = serpRes.data
    return `the search results are here in json format:\n${JSON.stringify(res)}`
  }

  description = 'Useful when you want to search something from the internet. If you don\'t know much about the user\'s question, just search about it! If you want to know details of a result, you can use website tool'
}
