import { Tool } from 'langchain/agents'

export class KickOutTool extends Tool {
  name = 'kickOut'
  async _call (option) {
    const { input, e } = option
    try {
      let [groupId, qq] = input.trim().split(' ')
      groupId = parseInt(groupId.trim())
      qq = parseInt(qq.trim())
      console.log('kickout', groupId, qq)
      let group = await Bot.pickGroup(groupId)
      await group.kickMember(qq)
      return new Date().getTime() + ''
    } catch (error) {
      return "I don't know how to do that."
    }
  }

  description = 'Useful when you want to kick someone out of the group. The input to this tool should be the group number, the qq number of the one who should be kicked out, these two number should be concated with a space. '
}
