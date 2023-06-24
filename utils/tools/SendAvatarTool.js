import { AbstractTool } from './AbstractTool.js'

export class SendAvatarTool extends AbstractTool {
  name = 'sendAvatar'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '要发头像的人的qq号'
      },
      groupId: {
        type: 'string',
        description: '群号或qq号，发送目标'
      }
    },
    required: ['qq', 'groupId']
  }

  func = async function (opts) {
    let { qq, groupId } = opts
    let groupList = await Bot.getGroupList()
    groupId = parseInt(groupId.trim())
    console.log('sendAvatar', groupId, qq)
    if (groupList.get(groupId)) {
      let group = await Bot.pickGroup(groupId)
      await group.sendMsg(segment.image('https://q1.qlogo.cn/g?b=qq&s=0&nk=' + qq))
    }
    return `the user ${qq}'s avatar has been sent to group ${groupId}`
  }

  description = 'Useful when you want to send the user avatar picture to the group. The input to this tool should be the user\'s qq number and the target group number, and they should be concated with a space. 如果是在群聊中，优先选择群号发送。'
}
