import { Tool } from 'langchain/agents'

export class JinyanTool extends Tool {
  name = 'jinyan'

  async _call (option) {
    const { input, e } = option
    try {
      let [groupId, qq, time = '600'] = input.trim().split(' ')
      groupId = parseInt(groupId.trim())
      if (groupId === 123456789 || groupId === 12345678) {
        groupId = e.group_id + ''
      }
      if (qq === '123456789') {
        qq = e.sender?.user_id + ''
      }
      console.log('ban', groupId, qq)
      let group = await Bot.pickGroup(groupId)
      time = parseInt(time.trim())
      if (qq.trim() === 'all') {
        await group.muteAll(time > 0)
      } else {
        qq = parseInt(qq.trim())
        await group.muteMember(qq, time)
      }
      return new Date().getTime() + ''
    } catch (error) {
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to ban someone. The input to this tool should be the group number, the qq number of the one who should be banned and the mute duration in seconds(at least 60, at most 180, the number should be an integer multiple of 60), these three number should be concated with a space. If you want to mute all, just replace the qq number with \'all\''
}
