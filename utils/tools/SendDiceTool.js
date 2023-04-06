import { Tool } from 'langchain/agents'

export class SendDiceTool extends Tool {
  name = 'sendDice'
  async _call (input) {
    try {
      let [num, groupId] = input.trim().split(' ')
      num = parseInt(num.trim())
      groupId = parseInt(groupId.trim())
      console.log('sendDice', num, groupId)
      let groupList = await Bot.getGroupList()
      if (groupList.get(groupId)) {
        let group = await Bot.pickGroup(groupId, true)
        await group.sendMsg(segment.dice(num))
      } else {
        let friend = await Bot.pickFriend(groupId)
        await friend.sendMsg(segment.dice(num))
      }
      return 'success'
    } catch (error) {
      logger.error(error)
      return "I don't know how to do that."
    }
  }

  description = 'If you want to roll dice, use this tool. If you know the group number, use the group number instead of the qq number first. The input should be the number of dice to be cast (1-6) and the target group number or qq number，and they should be concat with a space'
}
