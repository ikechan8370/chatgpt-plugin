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
    let group = await Bot.pickGroup(groupId)
    time = parseInt(time.trim())
    if (time < 60) {
      time = 60
    }
    if (time > 86400 * 30) {
      time = 86400 * 30
    }
    if (qq.trim() === 'all') {
      if (time > 0) {
        await group.sendMsg('[日志]试图开启全员禁言，但被系统阻止了')
        return 'error: you are not allowed to mute all in this group'
      } else {
        await group.muteAll(false)
        return '该群的全体禁言已经被解除'
      }
    } else {
      qq = parseInt(qq.trim())
      await group.muteMember(qq, time)
    }
    return `the user ${qq} has been muted for ${time} seconds`
  }

  description = 'Useful when you want to ban someone. If you want to mute all, just replace the qq number with \'all\''
}
