import { AbstractTool } from './AbstractTool.js'

export class SerpImageTool extends AbstractTool {
  name = 'searchImage'

  parameters = {
    properties: {
      q: {
        type: 'string',
        description: 'search keyword'
      },
      limit: {
        type: 'number',
        description: 'image number'
      }
    },
    required: ['q']
  }

  func = async function (opts) {
    let { q, limit = 2 } = opts
    let serpRes = await fetch(`https://serp.ikechan8370.com/image/bing?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: {
        'X-From-Library': 'ikechan8370'
      }
    })
    serpRes = await serpRes.json()

    let res = serpRes.data
    return `images search results in json format:\n${JSON.stringify(res)}. the murl field is actual picture url. You should use sendPicture to send them`
  }

  description = 'Useful when you want to search images from the Internet.'
}
