import { AbstractTool } from './AbstractTool.js'

export class SendRPSTool extends AbstractTool {
  name = 'sendRPS'

  parameters = {
    num: {
      type: 'number',
      description: '石头剪刀布的代号'
    },
    targetGroupIdOrQQNumber: {
      type: 'string',
      description: 'Fill in the target user_id or groupId when you need to send RPS to specific group or user'
    },
    required: ['num', 'targetGroupIdOrUserQQNumber']
  }

  func = async function (num, targetGroupIdOrQQNumber, e) {
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === Bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)
    let groupList = await Bot.getGroupList()
    if (groupList.get(target)) {
      let group = await Bot.pickGroup(target, true)
      await group.sendMsg(segment.rps(num))
    } else {
      let friend = await Bot.pickFriend(target)
      await friend.sendMsg(segment.rps(num))
    }
  }

  description = 'Use this tool if you want to play rock paper scissors. If you know the group number, use the group number instead of the qq number first. The input should be the number 1, 2 or 3 to represent rock-paper-scissors and the target group number or qq number，and they should be concat with a space'
}
