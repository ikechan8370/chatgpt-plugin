import { AbstractTool } from './AbstractTool.js'
import { Config } from '../config.js'

export class SerpTool extends AbstractTool {
  name = 'serp'

  parameters = {
    properties: {
      q: {
        type: 'string',
        description: 'search keyword'
      }
    },
    required: ['q']
  }

  func = async function (opts) {
    let { q } = opts
    let key = Config.azSerpKey

    let serpRes = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(q)}&mkt=zh-CN`, {
      headers: {
        'Ocp-Apim-Subscription-Key': key
      }
    })
    serpRes = await serpRes.json()

    let res = serpRes.webPages.value
    res.forEach(p => {
      delete p.displayUrl
      delete p.isFamilyFriendly
      delete p.thumbnailUrl
      delete p.id
      delete p.isNavigational
    })
    return `the search results are here in json format:\n${JSON.stringify(res)}`
  }

  description = 'Useful when you want to search something from the internet. If you don\'t know much about the user\'s question, just search about it! If you want to know details of a result, you can use website tool'
}
