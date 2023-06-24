import fetch from 'node-fetch'

import { formatDate, mkdirs } from '../common.js'
import fs from 'fs'
import { AbstractTool } from './AbstractTool.js'
export class SearchVideoTool extends AbstractTool {
  name = 'searchVideo'

  parameters = {
    properties: {
      keyword: {
        type: 'string',
        description: '要搜索的视频的标题或关键词'
      }
    },
    required: ['keyword']
  }

  func = async function (opts) {
    let { keyword } = opts
    try {
      return await searchBilibili(keyword)
    } catch (err) {
      logger.error(err)
      return `fail to search video, error: ${err.toString()}`
    }
  }

  description = 'Useful when you want to search a video by keywords. you should remember the id of the video if you want to share it'
}

export async function searchBilibili (name) {
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
    let response = await fetch(`https://api.bilibili.com/x/web-interface/search/type?keyword=${name}&search_type=video`,
      {
        headers
      })
    let json = await response.json()
    if (json.data?.numResults > 0) {
      let result = json.data.result.map(r => {
        return `id: ${r.bvid}，标题：${r.title}，作者：${r.author}，播放量：${r.play}，发布日期：${formatDate(new Date(r.pubdate * 1000))}`
      }).slice(0, Math.min(json.data?.numResults, 5)).join('\n')
      return `这些是关键词“${name}”的搜索结果：\n${result}`
    } else {
      return `没有找到关键词“${name}”的搜索结果`
    }
  }

  return {}
}
