import { AbstractTool } from './AbstractTool.js'

export class SendAvatarTool extends AbstractTool {
  name = 'sendAvatar'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: 'if you need to send avatar of a user, input his qq.If there are multiple qq, separate them with a space'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target user\'s qq number or groupId when you need to send avatar to specific user or group, otherwise leave blank'
      }
    },
    required: ['qq', 'targetGroupIdOrQQNumber']
  }

  func = async function (opts, e) {
    let { qq, targetGroupIdOrQQNumber } = opts
    const pictures = qq.split(/[,，\s]/).filter(qq => !isNaN(qq.trim()) && qq.trim()).map(qq => segment.image('https://q1.qlogo.cn/g?b=qq&s=0&nk=' + parseInt(qq.trim())))
    if (!pictures.length) {
      return 'there is no valid qq'
    }
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? e.isGroup ? e.group_id : e.sender.user_id
      : parseInt(targetGroupIdOrQQNumber.trim())

    let groupList = await Bot.getGroupList()
    console.log('sendAvatar', target, pictures)
    if (groupList.get(target)) {
      let group = await Bot.pickGroup(target)
      await group.sendMsg(pictures)
    }
    return `the ${pictures.length > 1 ? 'user' + qq + '\'s avatar' : 'avatars'} has been sent to group ${target}`
  }

  description = 'Useful when you want to send the user avatar to the group. The input to this tool should be the user\'s qq number and the target group number, and they should be concated with a space. 如果是在群聊中，优先选择群号发送。'
}
