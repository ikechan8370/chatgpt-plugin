import {Tool} from "langchain/agents";

export class JinyanTool extends Tool {
  name = 'jinyan'

  async _call (input) {
    try {
      let [groupId, qq, time = '600'] = input.trim().split(' ')
      groupId = parseInt(groupId.trim())
      qq = parseInt(qq.trim())
      time = parseInt(time.trim())
      console.log('ban', groupId, qq)
      let group = await Bot.pickGroup(groupId)
      await group.muteMember(qq, time)
      return new Date().getTime() + ''
    } catch (error) {
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to ban someone. The input to this tool should be the group number, the qq number of the one who should be banned and the mute duration in seconds(at least 60, at most 180, the number should be an integer multiple of 60), these three number should be concated with a space. '
}