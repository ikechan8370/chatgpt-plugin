import { AbstractTool } from './AbstractTool.js'

export class SendMusicTool extends AbstractTool {
  name = 'sendMusic'

  parameters = {
    properties: {
      id: {
        type: 'string',
        description: '音乐的id'
      },
      groupId: {
        type: 'string',
        description: '群号或qq号，发送目标'
      }
    },
    required: ['keyword', 'groupId']
  }

  func = async function (opts) {
    let { id, groupId } = opts
    groupId = parseInt(groupId.trim())
    try {
      let group = await Bot.pickGroup(groupId)
      await group.shareMusic('163', id)
      return `the music has been shared to ${groupId}`
    } catch (e) {
      return `music share failed: ${e}`
    }
  }

  description = 'Useful when you want to share music. You must use searchMusic first to get the music id'
}
