import {Tool} from "langchain/agents";

export class SendAvatarTool extends Tool {
  name = 'sendAvatar'
  async _call (input) {
    try {
      let [qq, groupId] = input.trim().split(' ')
      let groupList = await Bot.getGroupList()
      groupId = parseInt(groupId.trim())
      console.log('sendAvatar', groupId, qq)
      if (groupList.get(groupId)) {
        let group = await Bot.pickGroup(groupId)
        await group.sendMsg(segment.image('https://q1.qlogo.cn/g?b=qq&s=0&nk=' + qq))
      }
      return new Date().getTime() + ''
    } catch (error) {
      console.error(error)
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to send the user avatar picture to the group. The input to this tool should be the user\'s qq number and the target group number, and they should be concated with a space. 如果是在群聊中，优先选择群号发送。'

}