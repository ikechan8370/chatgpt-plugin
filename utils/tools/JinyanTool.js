import { AbstractTool } from './AbstractTool.js'

export class JinyanTool extends AbstractTool {
  name = 'jinyan'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '你想禁言的那个人的qq号'
      },
      groupId: {
        type: 'string',
        description: '群号'
      },
      time: {
        type: 'string',
        description: '禁言时长，单位为秒'
      }
    },
    required: ['qq', 'groupId']
  }

  func = async function (opts) {
    let { qq, groupId, time = '600', sender, isAdmin } = opts
    let group = await Bot.pickGroup(groupId)
    time = parseInt(time.trim())
    if (time < 60) {
      time = 60
    }
    if (time > 86400 * 30) {
      time = 86400 * 30
    }
    if (isAdmin) {
      if (qq.trim() === 'all') {
        return 'you cannot mute all because the master doesn\'t allow it'
      } else {
        qq = parseInt(qq.trim())
        await group.muteMember(qq, time)
      }
    } else {
      if (qq.trim() === 'all') {
        return 'the user is not admin, he can\'t mute all. the user should be punished'
      } else if (qq == sender) {
        qq = parseInt(qq.trim())
        await group.muteMember(qq, time)
      } else {
        return 'the user is not admin, he can\'t mute other people. the user should be punished'
      }
    }
    return `the user ${qq} has been muted for ${time} seconds`
  }

  description = 'Useful when you want to ban someone. If you want to mute all, just replace the qq number with \'all\''
}
