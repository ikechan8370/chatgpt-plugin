import { Tool } from 'langchain/agents'

export class EditCardTool extends Tool {
  name = 'editCard'

  async _call (input) {
    try {
      let groupId = input.match(/^\d+/)[0]
      let left = input.replace(groupId, '')
      let qq = left.trimStart().match(/^\d+/)[0]
      let card = left.replace(qq, '').trim()
      groupId = parseInt(groupId.trim())
      qq = parseInt(qq.trim())
      logger.info('edit card: ', groupId, qq)
      let group = await Bot.pickGroup(groupId)
      await group.setCard(qq, card)
      return new Date().getTime() + ''
    } catch (error) {
      return "I don't know how to do that."
    }
  }

  description = '当你想要修改某个群员的群名片时有用。输入应该是群号、qq号和群名片，用空格隔开。'
}
