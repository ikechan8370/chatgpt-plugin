import fetch from 'node-fetch'
import {AbstractTool} from "./AbstractTool.js";

export class SendMusicTool extends AbstractTool {
  name = 'sendMusic'

  parameters = {
    properties: {
      keyword: {
        type: 'string',
        description: '音乐的标题或关键词'
      },
      groupId: {
        type: 'string',
        description: '群号或qq号，发送目标'
      }
    },
    required: ['keyword', 'groupId']
  }

  func = async function (opts) {
    let { keyword, groupId } = opts
    groupId = parseInt(groupId.trim())
    try {
      let { id, name } = await searchMusic163(keyword)
      let group = await Bot.pickGroup(groupId)
      await group.shareMusic('163', id)
      return `the music ${name} has been shared to ${groupId}`
    } catch (e) {
      return `music share failed: ${e}`
    }
  }

  description = 'Useful when you want to share music. The input should be the group number and the name of the music to be sent or the keywords that can find the music, connected with a space'
}

export async function searchMusic163 (name) {
  let response = await fetch(`http://music.163.com/api/search/get/web?s=${name}&type=1&offset=0&total=true&limit=20`)
  let json = await response.json()
  if (json.result?.songCount > 0) {
    let id = json.result.songs[0].id
    let name = json.result.songs[0].name
    return { id, name }
  }
  return null
}
