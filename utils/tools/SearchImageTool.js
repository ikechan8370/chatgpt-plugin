import { AbstractTool } from './AbstractTool.js'

export class SerpImageTool extends AbstractTool {
  name = 'searchImage'

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
    let serpRes = await fetch(`https://serp.ikechan8370.com/image/bing?q=${encodeURIComponent(q)}`, {
      headers: {
        'X-From-Library': 'ikechan8370'
      }
    })
    serpRes = await serpRes.json()

    let res = serpRes.data
    return `the images search results are here in json format:\n${JSON.stringify(res)}. the murl field is real picture url. You should use sendPicture to send them`
  }

  description = 'Useful when you want to search images from the internet.  '
}
