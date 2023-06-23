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
    let { qq, groupId } = opts
    groupId = parseInt(groupId.trim())
    qq = parseInt(qq.trim())
    console.log('kickout', groupId, qq)
    let group = await Bot.pickGroup(groupId)
    await group.kickMember(qq)
    return `the user ${qq} has been kicked out from group ${groupId}`
  }

  description = 'Useful when you want to kick someone out of the group. '
}
