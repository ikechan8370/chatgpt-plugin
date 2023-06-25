import {AbstractTool} from "./AbstractTool.js";

export class SendRPSTool extends AbstractTool {
  name = 'sendRPS'

  parameters = {
    num: {
      type: 'number',
      description: '石头剪刀布的代号'
    },
    groupId: {
      type: 'string',
      description: '群号或qq号，发送目标'
    },
    required: ['num', 'groupId']
  }

  func = async function (num, groupId) {
    let groupList = await Bot.getGroupList()
    if (groupList.get(groupId)) {
      let group = await Bot.pickGroup(groupId, true)
      await group.sendMsg(segment.rps(num))
    } else {
      let friend = await Bot.pickFriend(groupId)
      await friend.sendMsg(segment.rps(num))
    }
  }

  description = 'Use this tool if you want to play rock paper scissors. If you know the group number, use the group number instead of the qq number first. The input should be the number 1, 2 or 3 to represent rock-paper-scissors and the target group number or qq number，and they should be concat with a space'
}
