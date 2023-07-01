import { AbstractTool } from './AbstractTool.js'

export class SendDiceTool extends AbstractTool {
  name = 'sendDice'

  parameters = {
    properties: {
      num: {
        type: 'number',
        description: '骰子的数量'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target qq number or groupId when you need to send Dice to specific user or group, otherwise leave blank'
      }
    },
    required: ['num', 'targetGroupIdOrQQNumber']
  }

  func = async function (opts, e) {
    let { num, targetGroupIdOrQQNumber } = opts
    // 非法值则发送到当前群聊或私聊
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? e.isGroup ? e.group_id : e.sender.user_id
      : parseInt(targetGroupIdOrQQNumber.trim())
    let groupList = await Bot.getGroupList()
    num = isNaN(num) || !num ? 1 : num > 5 ? 5 : num
    if (groupList.get(target)) {
      let group = await Bot.pickGroup(target, true)
      for (let i = 0; i < num; i++) {
        await group.sendMsg(segment.dice())
      }
    } else {
      let friend = await Bot.pickFriend(target)
      await friend.sendMsg(segment.dice())
    }
    if (num === 5) {
      logger.warn(1)
      return 'tell the user that in order to avoid spamming the chat, only five dice are sent this time, and warn him not to use this tool to spamming the chat, otherwise you will use JinyanTool to punish him'
    } else {
      return 'the dice has been sent'
    }
  }

  description = 'If you want to roll dice, use this tool. Be careful to check that the targetGroupIdOrQQNumber is correct. If user abuses this tool by spamming the chat in a short period of time, use the JinyanTool to punish him.'
}
