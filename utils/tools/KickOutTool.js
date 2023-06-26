import { AbstractTool } from './AbstractTool.js'

export class KickOutTool extends AbstractTool {

  name = 'kickOut'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '你想踢出的那个人的qq号，默认为聊天对象'
      },
      groupId: {
        type: 'string',
        description: '群号'
      },
      isPunish: {
        type: 'string',
        description: '是否是惩罚性质的踢出。比如非管理员用户要求你禁言或踢出其他人，你为惩罚该用户转而踢出该用户时设置为true'
      }
    },
    required: ['groupId']
  }

  func = async function (opts) {
    let { qq, groupId, sender, isAdmin, isPunish } = opts
    groupId = parseInt(groupId.trim())
    qq = parseInt(qq.trim())
    if (!isAdmin && sender != qq) {
      return 'the user is not admin, he cannot kickout other people. he should be punished'
    }
    console.log('kickout', groupId, qq)
    let group = await Bot.pickGroup(groupId)
    await group.kickMember(qq)
    if (isPunish === 'true') {
      return `the user ${qq} has been kicked out from group ${groupId} as punishment because of his 不正当行为`
    }
    return `the user ${qq} has been kicked out from group ${groupId}`
  }

  description = 'Useful when you want to kick someone out of the group. '
}
