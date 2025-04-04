import { AbstractTool } from './AbstractTool.js'
import https from 'https'

export class SendMusicTool extends AbstractTool {
  name = 'sendMusic'

  parameters = {
    properties: {
      id: {
        type: 'string',
        description: '音乐的id'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target user_id or groupId when you need to send music to specific group or user, otherwise leave blank'
      }
    },
    required: ['id']
  }

  // 获取歌曲详情
  getSongDetail(id) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'music.163.com',
        path: `/api/song/detail/?id=${id}&ids=[${id}]`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://music.163.com/',
          'Origin': 'https://music.163.com'
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            const result = JSON.parse(data)
            if (result.code === 200 && result.songs && result.songs[0]) {
              const song = result.songs[0]
              resolve({
                name: song.name,
                artist: song.artists[0].name,
                album: song.album.name,
                picUrl: song.album.picUrl,
                duration: Math.floor(song.duration / 1000), // 转换为秒
                quality: {
                  sq: song.sqMusic ? '无损' : null,
                  hq: song.hMusic ? '高品质' : null,
                  lq: song.lMusic ? '标准' : null
                }
              })
            } else {
              resolve(null)
            }
          } catch (e) {
            console.error('解析歌曲详情失败:', e)
            resolve(null)
          }
        })
      })

      req.on('error', (e) => {
        console.error('获取歌曲详情失败:', e)
        resolve(null)
      })

      req.end()
    })
  }

  func = async function (opts, e) {
    let { id, targetGroupIdOrQQNumber } = opts
    // 非法值则发送到当前群聊
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)

    try {
      let group = await e.bot.pickGroup(target)
      
      // 检查是否支持 shareMusic 方法
      if (typeof group.shareMusic === 'function' && e.adapter_name === 'icqq') {
        await group.shareMusic('163', id)
      } else {
        // 获取歌曲详情
        const songDetail = await this.getSongDetail(id)
        
        // 构建音乐分享消息
        let musicMsg
        if (e.adapter_name === 'OneBotv11') {
          // 适配onebotv11协议
          musicMsg = [{
            type: 'music',
            data: {
              type: 'custom',
              url: `https://music.163.com/#/song?id=${id}`,
              audio: `http://music.163.com/song/media/outer/url?id=${id}.mp3`,
              title: songDetail ? `${songDetail.name} - ${songDetail.artist}` : '网易云音乐',
              image: songDetail?.picUrl || 'https://p1.music.126.net/tBTNafgjNnTL1KlZMt7lVA==/18885211718935735.jpg'
            }
          }]
        } else {
          // 原有格式
          musicMsg = {
            type: 'music',
            data: {
              type: '163',
              id: id,
              jumpUrl: `https://music.163.com/#/song?id=${id}`
            }
          }
        }
        await e.reply(musicMsg)
      }
      return `the music has been shared to ${target}`
    } catch (e) {
      return `music share failed: ${e}`
    }
  }

  description = 'Useful when you want to share music. You must use searchMusic first to get the music id.  If no extra description needed, just reply <EMPTY> at the next turn'
}