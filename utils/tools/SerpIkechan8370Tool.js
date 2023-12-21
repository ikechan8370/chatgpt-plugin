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
    if (!source || !['google', 'bing', 'baidu'].includes(source)) {
      source = 'bing'
    }
    let serpRes = await fetch(`https://serp.ikechan8370.com/${source}?q=${encodeURIComponent(q)}&lang=zh-CN&limit=5`, {
      headers: {
        'X-From-Library': 'ikechan8370'
      }
    })
    serpRes = await serpRes.json()

    let res = serpRes.data
    res?.forEach(r => {
      delete r?.rank
    })
    return `the search results are here in json format:\n${JSON.stringify(res)}`
  }

  description = 'Useful when you want to search something from the Internet. If you don\'t know much about the user\'s question, prefer to search about it! If you want to know further details of a result, you can use website tool'
}
