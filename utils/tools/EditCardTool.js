import { Tool } from 'langchain/agents'

export class EditCardTool extends Tool {
  name = 'editCard'

  async _call (input) {
    try {
      let [groupId, qq, card] = input.trim().split(' ', 3)
      groupId = parseInt(groupId.trim())
      qq = parseInt(qq.trim())
      let group = await Bot.pickGroup(groupId)
      await group.setCard(qq, card)
      return new Date().getTime() + ''
    } catch (error) {
      return "I don't know how to do that."
    }
  }

  description = '当你想要修改某个群员的群名片时有用。输入应该是群号、qq号和群名片，用空格隔开。'
}
