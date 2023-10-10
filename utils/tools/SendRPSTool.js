import { Tool } from 'langchain/agents'

export class SendRPSTool extends Tool {
  name = 'sendRPS'
  async _call (option) {
    const { input, e } = option
    try {
      let [num, groupId] = input.trim().split(' ')
      num = parseInt(num.trim())
      groupId = parseInt(groupId.trim())
      console.log('sendRPS', num, groupId)
      let groupList = await Bot.getGroupList()
      if (groupList.get(groupId)) {
        let group = await Bot.pickGroup(groupId, true)
        await group.sendMsg(segment.rps(num))
      } else {
        let friend = await Bot.pickFriend(groupId)
        await friend.sendMsg(segment.rps(num))
      }
      return 'success'
    } catch (error) {
      logger.error(error)
      return "I don't know how to do that."
    }
  }

  description = 'Use this tool if you want to play rock paper scissors. If you know the group number, use the group number instead of the qq number first. The input should be the number 1, 2 or 3 to represent rock-paper-scissors and the target group number or qq number，and they should be concat with a space'
}
