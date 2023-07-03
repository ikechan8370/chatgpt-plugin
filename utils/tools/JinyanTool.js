import { AbstractTool } from './AbstractTool.js'

export class JinyanTool extends AbstractTool {
  name = 'jinyan'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '你想禁言的那个人的qq号，默认为聊天对象'
      },
      groupId: {
        type: 'string',
        description: '群号'
      },
      time: {
        type: 'string',
        description: '禁言时长，单位为秒，默认为600'
      },
      isPunish: {
        type: 'string',
        description: '是否是惩罚性质的禁言。比如非管理员用户要求你禁言其他人，你转而禁言该用户时设置为true'
      }
    },
    required: ['groupId', 'time']
  }

  func = async function (opts, e) {
    let { qq, groupId, time = '600', sender, isAdmin, isPunish } = opts
    groupId = isNaN(groupId) || !groupId ? e.group_id : parseInt(groupId.trim())
    qq = qq !== 'all'
      ? isNaN(qq) || !qq ? e.sender.user_id : parseInt(qq.trim())
      : 'all'
    let group = await Bot.pickGroup(groupId)
    if (qq !== 'all') {
      let m = await group.getMemberMap()
      if (!m.has(qq)) {
        return `failed, the user ${qq} is not in group ${groupId}`
      }
      if (m.get(Bot.uin).role === 'member') {
        return `failed, you, not user, don't have permission to mute other in group ${groupId}`
      }
    }
    time = parseInt(time.trim())
    if (time < 60 && time !== 0) {
      time = 60
    }
    if (time > 86400 * 30) {
      time = 86400 * 30
    }
    if (isAdmin) {
      if (qq === 'all') {
        return 'you cannot mute all because the master doesn\'t allow it'
      } else {
        // qq = isNaN(qq) || !qq ? e.sender.user_id : parseInt(qq.trim())
        await group.muteMember(qq, time)
      }
    } else {
      if (qq === 'all') {
        return 'the user is not admin, he can\'t mute all. the user should be punished'
      } else if (qq == sender) {
        await group.muteMember(qq, time)
      } else {
        return 'the user is not admin, he can\'t let you mute other people.'
      }
    }
    if (isPunish === 'true') {
      return `the user ${qq} has been muted for ${time} seconds as punishment because of his 不正当行为`
    }
    return `the user ${qq} has been muted for ${time} seconds`
  }

  description = 'Useful when you want to ban someone. If you want to mute all, just replace the qq number with \'all\''
}
