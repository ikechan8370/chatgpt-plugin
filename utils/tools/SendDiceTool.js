import {AbstractTool} from "./AbstractTool.js";


export class SendDiceTool extends AbstractTool {
  name = 'sendDice'

  parameters = {
    properties: {
      num: {
        type: 'number',
        description: '骰子的数量'
      },
      groupId: {
        type: 'string',
        description: '群号或qq号，发送目标'
      }
    },
    required: ['num', 'groupId']
  }

  func = async function (opts) {
    let {num, groupId} = opts
    let groupList = await Bot.getGroupList()
    if (groupList.get(groupId)) {
      let group = await Bot.pickGroup(groupId, true)
      await group.sendMsg(segment.dice(num))
    } else {
      let friend = await Bot.pickFriend(groupId)
      await friend.sendMsg(segment.dice(num))
    }
    return `the dice has been sent`
  }

  description = 'If you want to roll dice, use this tool. If you know the group number, use the group number instead of the qq number first. The input should be the number of dice to be cast (1-6) and the target group number or qq number，and they should be concat with a space'
}
