import { AbstractTool } from './AbstractTool.js'

export class KickOutTool extends AbstractTool {

  name = 'kickOut'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '你想踢出的那个人的qq号'
      },
      groupId: {
        type: 'string',
        description: '群号'
      }
    },
    required: ['qq', 'groupId']
  }

  func = async function (opts) {
    let { qq, groupId, sender, isAdmin } = opts
    groupId = parseInt(groupId.trim())
    qq = parseInt(qq.trim())
    if (!isAdmin && sender != qq) {
      return 'the user is not admin, he cannot kickout other people. he should be punished'
    }
    console.log('kickout', groupId, qq)
    let group = await Bot.pickGroup(groupId)
    await group.kickMember(qq)
    return `the user ${qq} has been kicked out from group ${groupId}`
  }

  description = 'Useful when you want to kick someone out of the group. '
}
