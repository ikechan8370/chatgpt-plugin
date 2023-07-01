import { AbstractTool } from './AbstractTool.js'
import { convertFaces } from '../face.js'

export class SendMessageToSpecificGroupOrUserTool extends AbstractTool {
  name = 'sendMessageToSpecificGroupOrUser'

  parameters = {
    properties: {
      msg: {
        type: 'string',
        description: 'Message text to be sent'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target user\'s qq number or groupId when you need to send specific message to specific user or group, otherwise leave blank'
      }
    },
    required: ['msg', 'msgType', 'targetGroupIdOrQQNumber']
  }

  func = async function (opt, e) {
    let { msg, targetGroupIdOrQQNumber } = opt
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? e.isGroup ? e.group_id : e.sender.user_id
      : parseInt(targetGroupIdOrQQNumber.trim())

    let groupList = await Bot.getGroupList()
    try {
      if (groupList.get(target)) {
        let group = await Bot.pickGroup(target)
        await group.sendMsg(await convertFaces(msg, true, e))
        return 'msg has been sent to group' + target
      } else {
        let user = await Bot.pickFriend(target)
        await user.sendMsg(msg)
        return 'msg has been sent to user' + target
      }
    } catch (err) {
      return `failed to send msg, error: ${JSON.stringify(err)}`
    }
  }

  description = 'Useful when you want to send a text message to specific user or group'
}
