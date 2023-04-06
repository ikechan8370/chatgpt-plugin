import { Tool } from 'langchain/agents'
import { convertFaces } from '../face.js'
import { Config } from '../config.js'

export class SendMessageTool extends Tool {
  name = 'send'
  async _call (input) {
    try {
      let groupId = input.match(/\d+$/)[0]
      const text = input.replace(groupId, '')
      groupId = parseInt(groupId.trim())
      console.log('send', text, groupId)
      let groupList = await Bot.getGroupList()
      if (groupList.get(groupId)) {
        let group = await Bot.pickGroup(groupId, true)
        await group.sendMsg(await convertFaces(text, Config.enableRobotAt))
      } else {
        let friend = await Bot.pickFriend(groupId)
        await friend.sendMsg(await convertFaces(text, Config.enableRobotAt))
      }
      return 'success'
    } catch (error) {
      logger.error(error)
      return "I don't know how to do that."
    }
  }

  description = 'Use this tool if you want to send a text message to a group chat or private chat with someone. If you know the group number, use the group number instead of the qq number first. The input should be the text content to be sent and the target group number or qq number，and they should be concat with a space'
}
