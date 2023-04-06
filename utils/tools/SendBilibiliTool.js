import fetch from 'node-fetch'
import { Tool } from 'langchain/agents'
import { mkdirs } from '../common.js'
import fs from 'fs'
export class SendVideoTool extends Tool {
  name = 'sendVideo'

  async _call (input) {
    try {
      let groupId = input.match(/^\d+/)[0]
      let keyword = input.replace(groupId, '').trim()
      console.log(keyword)
      groupId = parseInt(groupId.trim())
      let { arcurl, title, pic, description, videoUrl, headers, bvid } = await searchBilibili(keyword)
      let group = await Bot.pickGroup(groupId)
      console.log({ arcurl, title, pic, description, videoUrl })
      let msg = []
      msg.push(title.replace(/(<([^>]+)>)/ig, '') + '\n')
      msg.push(arcurl + '\n')
      msg.push(segment.image('https:' + pic))
      msg.push('\n' + description)
      await group.sendMsg(msg)
      const videoResponse = await fetch(videoUrl, { headers })
      const fileType = videoResponse.headers.get('Content-Type').split('/')[1]
      let fileLoc = `data/chatgpt/videos/${bvid}.${fileType}`
      mkdirs('data/chatgpt/videos')
      const blob = await videoResponse.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await fs.writeFileSync(fileLoc, buffer)
      await group.sendMsg(segment.video(fileLoc))
      return new Date().getTime() + ''
    } catch (error) {
      logger.error()
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to share a video. The input should be the group number and the keywords that can find the video, connected with a space. If you want to send a specific video, you can give more detailed keywords'
}

async function searchBilibili (name) {
  let biliRes = await fetch('https://www.bilibili.com',
    {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'sec-ch-ua': '"Chromium";v="112", "Microsoft Edge";v="112", "Not:A-Brand";v="99"',
        'sec-ch-ua-arch': '"x86"',
        'sec-ch-ua-bitness': '"64"',
        'sec-ch-ua-full-version': '"112.0.1722.7"',
        'sec-ch-ua-full-version-list': '"Chromium";v="112.0.5615.20", "Microsoft Edge";v="112.0.1722.7", "Not:A-Brand";v="99.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"15.0.0"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        Referer: 'https://www.bilibili.com',
        'Referrer-Policy': 'origin-when-cross-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
      }
    })
  const headers = biliRes.headers.raw()
  const setCookieHeaders = headers['set-cookie']
  if (setCookieHeaders) {
    const cookies = []
    setCookieHeaders.forEach(header => {
      const cookie = header.split(';')[0]
      cookies.push(cookie)
    })
    const cookieHeader = cookies.join('; ')
    let headers = {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'sec-ch-ua': '"Chromium";v="112", "Microsoft Edge";v="112", "Not:A-Brand";v="99"',
      'sec-ch-ua-arch': '"x86"',
      'sec-ch-ua-bitness': '"64"',
      'sec-ch-ua-full-version': '"112.0.1722.7"',
      'sec-ch-ua-full-version-list': '"Chromium";v="112.0.5615.20", "Microsoft Edge";v="112.0.1722.7", "Not:A-Brand";v="99.0.0.0"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '',
      'sec-ch-ua-platform': '"Windows"',
      'sec-ch-ua-platform-version': '"15.0.0"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      Referer: 'https://www.bilibili.com',
      'Referrer-Policy': 'origin-when-cross-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      cookie: cookieHeader
    }
    let response = await fetch(`https://api.bilibili.com/x/web-interface/search/type?keyword=${name}&search_type=video`,
      {
        headers
      })
    let json = await response.json()
    if (json.data?.numResults > 0) {
      let { arcurl, title, pic, description, bvid } = json.data.result[0]
      let videoInfo = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
        headers
      })
      videoInfo = await videoInfo.json()
      let cid = videoInfo.data.cid
      let downloadInfo = await fetch(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}`, { headers })
      let videoUrl = (await downloadInfo.json()).data.durl[0].url
      return {
        arcurl, title, pic, description, videoUrl, headers, bvid
      }
    }
  }

  return {}
}

// searchBilibili('茶叶蛋').then(res => {
//   console.log(res)
// }).catch(err => {
//   console.error(err)
// })
