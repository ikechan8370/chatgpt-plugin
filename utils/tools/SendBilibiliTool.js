import fetch from 'node-fetch'

import { formatDate, mkdirs } from '../common.js'
import fs from 'fs'
import { AbstractTool } from './AbstractTool.js'
export class SendVideoTool extends AbstractTool {
  name = 'sendVideo'

  parameters = {
    properties: {
      id: {
        type: 'string',
        description: '要发的视频的id'
      },
      groupId: {
        type: 'string',
        description: '群号或qq号，发送目标，为空则发送到当前聊天'
      }
    },
    required: ['id']
  }

  func = async function (opts) {
    let { id, groupId } = opts
    groupId = parseInt(groupId.trim())
    let msg = []
    try {
      let { arcurl, title, pic, description, videoUrl, headers, bvid, author, play, pubdate, like, honor } = await getBilibili(id)
      let group = await Bot.pickGroup(groupId)
      msg.push(title.replace(/(<([^>]+)>)/ig, '') + '\n')
      msg.push(`UP主：${author} 发布日期：${formatDate(new Date(pubdate * 1000))} 播放量：${play} 点赞：${like}\n`)
      msg.push(arcurl + '\n')
      msg.push(segment.image(pic))
      msg.push('\n' + description)
      if (honor) {
        msg.push(`本视频曾获得过${honor}称号`)
      }
      msg.push('\n视频在路上啦！')
      await group.sendMsg(msg)
      const videoResponse = await fetch(videoUrl, { headers })
      const fileType = videoResponse.headers.get('Content-Type').split('/')[1]
      let fileLoc = `data/chatgpt/videos/${bvid}.${fileType}`
      mkdirs('data/chatgpt/videos')
      videoResponse.blob().then(async blob => {
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await fs.writeFileSync(fileLoc, buffer)
        await group.sendMsg(segment.video(fileLoc))
      })
      return `the video ${title.replace(/(<([^>]+)>)/ig, '')} was shared to ${groupId}. the video information: ${msg}`
    } catch (err) {
      logger.error(err)
      if (msg.length > 0) {
        return `fail to share video, but the video msg is found: ${msg}, you can just tell the information of this video`
      } else {
        return `fail to share video, error: ${err.toString()}`
      }
    }
  }

  description = 'Useful when you want to share a video. You must use searchVideo to get search result and choose one video and get its id'
}

export async function getBilibili (bvid) {
  let biliRes = await fetch('https://www.bilibili.com',
    {
      // headers: {
      // accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      // Accept: '*/*',
      // 'Accept-Encoding': 'gzip, deflate, br',
      // 'accept-language': 'en-US,en;q=0.9',
      // Connection: 'keep-alive',
      // 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
      // }
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
      Referer: 'https://www.bilibili.com',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      cookie: cookieHeader
    }
    let videoInfo = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers
    })
    videoInfo = await videoInfo.json()
    let cid = videoInfo.data.cid
    let arcurl = `http://www.bilibili.com/video/av${videoInfo.data.aid}`
    let title = videoInfo.data.title
    let pic = videoInfo.data.pic
    let description = videoInfo.data.desc
    let author = videoInfo.data.owner.name
    let play = videoInfo.data.stat.view
    let pubdate = videoInfo.data.pubdate
    let like = videoInfo.data.stat.like
    let honor = videoInfo.data.honor_reply?.honor?.map(h => h.desc)?.join('、')
    let downloadInfo = await fetch(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}`, {headers})
    let videoUrl = (await downloadInfo.json()).data.durl[0].url
    return {
      arcurl, title, pic, description, videoUrl, headers, bvid, author, play, pubdate, like, honor
    }
  } else {
    return {}
  }
}

function randomIndex () {
  // Define weights for each index
  const weights = [5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1]

  // Compute the total weight
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  // Generate a random number between 0 and the total weight
  const randomNumber = Math.floor(Math.random() * totalWeight)

  // Choose the index based on the random number and weights
  let weightSum = 0
  for (let i = 0; i < weights.length; i++) {
    weightSum += weights[i]
    if (randomNumber < weightSum) {
      return i
    }
  }
}

console.log('send bilibili')
