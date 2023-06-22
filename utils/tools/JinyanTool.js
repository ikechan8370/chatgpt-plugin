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
    let { qq, groupId, time = '600' } = opts
    if (time < 60) {
      time = 60
    }
    if (time > 86400 * 30) {
      time = 86400 * 30
    }
    let group = await Bot.pickGroup(groupId)
    time = parseInt(time.trim())
    if (qq.trim() === 'all') {
      await group.sendMsg('[日志]试图开启全员禁言')
      // await group.muteAll(time > 0)
    } else {
      qq = parseInt(qq.trim())
      await group.muteMember(qq, time)
    }
    return `the user ${qq} has been muted for ${time} seconds`
  }

  description = 'Useful when you want to ban someone. The input to this tool should be the group number, the qq number of the one who should be banned and the mute duration in seconds(at least 60, at most 180, the number should be an integer multiple of 60), these three number should be concated with a space. If you want to mute all, just replace the qq number with \'all\''
}
