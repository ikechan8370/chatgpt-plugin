import { Tool } from 'langchain/agents'

export class SendPictureTool extends Tool {
  name = 'sendPicture'
  async _call (option) {
    const { input, e } = option
    try {
      let pictures = input.trim().split(' ')
      let groupId = parseInt(pictures[pictures.length - 1])
      pictures = pictures.slice(0, -1)
      pictures = pictures.map(img => segment.image(img))
      let groupList = await Bot.getGroupList()
      if (groupList.get(groupId)) {
        let group = await Bot.pickGroup(groupId)
        await group.sendMsg(pictures)
      } else {
        let user = await Bot.pickFriend(groupId)
        await user.sendMsg(pictures)
      }
      return new Date().getTime() + ''
    } catch (error) {
      console.error(error)
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to send some pictures. The input to this tool should be the url of the pictures and the group number or the user\'s qq number, each url and the group number or qq number should be concated with a space, and the group number or qq number should be the last. 如果是在群聊中，优先选择群号发送。'
}
