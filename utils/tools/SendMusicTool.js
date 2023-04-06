import fetch from 'node-fetch'
import { Tool } from 'langchain/agents'

export class SendMusicTool extends Tool {
  name = 'sendMusic'

  async _call (input) {
    try {
      let groupId = input.match(/^\d+/)[0]
      let keyword = input.replace(groupId, '').trim()
      console.log(keyword)
      groupId = parseInt(groupId.trim())
      let id = await searchMusic163(keyword)
      let group = await Bot.pickGroup(groupId)
      await group.shareMusic('163', id)
      return new Date().getTime() + ''
    } catch (error) {
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to share music. The input should be the group number and the name of the music to be sent or the keywords that can find the music, connected with a space'
}

async function searchMusic163 (name) {
  let response = await fetch(`http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s={${name}&type=1&offset=0&total=true&limit=20`)
  let json = await response.json()
  if (json.result?.songCount > 0) {
    let id = json.result.songs[0].id
    return id
  }
  return null
}


