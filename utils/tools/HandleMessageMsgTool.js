import { AbstractTool } from './AbstractTool.js'

export class HandleMessageMsgTool extends AbstractTool {
  name = 'handleMsg'

  parameters = {
    properties: {
      type: {
        type: 'string',
        enum: ['recall', 'essence', 'un-essence'],
        description: 'what do you want to do with the message'
      },
      messageId: {
        type: 'string',
        description: 'which message, current one by default'
      }
    },
    required: ['type']
  }

  func = async function (opts, e) {
    let { type = 'recall', messageId = e.message_id } = opts
    try {
      switch (type) {
        case 'recall': {
          await e.group.recallMsg(messageId)
          break
        }
        case 'essence': {
          await Bot.setEssenceMessage(messageId)
          break
        }
        case 'un-essence': {
          await Bot.removeEssenceMessage(messageId)
          break
        }
      }
      return 'success!'
    } catch (err) {
      logger.error(err)
      return 'operation failed: ' + err.message
    }
  }

  description = '用来撤回消息或将消息设为精华'
}
