import { AbstractTool } from './AbstractTool.js'

export class SetTitleTool extends AbstractTool {
  name = 'setTitle'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '你想给予群头衔的那个人的qq号，默认为聊天对象'
      },
      title: {
        type: 'string',
        description: '群头衔'
      },
      groupId: {
        type: 'string',
        description: 'group number'
      }
    },
    required: ['title', 'groupId']
  }

  description = 'Useful when you want to give someone a title in the group(群头衔)'

  func = async function (opts, e) {
    let { qq, title, groupId } = opts
    qq = isNaN(qq) || !qq ? e.sender.user_id : parseInt(qq.trim())
    groupId = isNaN(groupId) || !groupId ? e.group_id : parseInt(groupId.trim())

    let group = await Bot.pickGroup(groupId)
    let mm = await group.getMemberMap()
    if (!mm.has(qq)) {
      return `failed, the user ${qq} is not in group ${groupId}`
    }
    if (mm.get(Bot.uin).role !== 'owner') {
      return 'on group owner can give title'
    }
    logger.info('edit card: ', groupId, qq)
    let result = await group.setTitle(qq, title)
    if (result) {
      return `the user ${qq}'s title has been changed into ${title}`
    } else {
      return 'failed'
    }
  }
}
