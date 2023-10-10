import { Tool } from 'langchain/agents'

export class EditCardTool extends Tool {
  name = 'editCard'

  async _call (option) {
    const { input, e } = option
    try {
      let groupId
      let matches = input.match(/\d+$/)
      if (matches && matches.length > 0) {
        groupId = matches[0]
      } else {
        groupId = e.group_id + ''
      }
      if (groupId === '123456789') {
        groupId = e.group_id + ''
      }
      let left = input.replace(groupId, '')

      let qq
      matches = input.match(/\d+$/)
      if (matches && matches.length > 0) {
        qq = matches[0]
      } else {
        qq = e.sender.user_id + ''
      }
      if (qq === '123456789') {
        qq = e.sender.user_id + ''
      }

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
