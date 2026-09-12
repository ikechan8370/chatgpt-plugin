import * as crypto from 'node:crypto'

/**
 * 默认的 UserState 实现。
 *
 * 纯数据类，和具体存储后端无关——之前放在 lowdb 的存储文件里，导致
 * apps/chat.js 无论配置哪个后端都要 import 一个 lowdb 路径。
 */
export class YunzaiUserState {
  constructor (userId, nickname, card, conversationId = crypto.randomUUID()) {
    this.userId = userId
    this.nickname = nickname
    this.card = card
    this.conversations = []
    this.settings = {}
    this.current = {
      conversationId,
      messageId: crypto.randomUUID()
    }
  }
}
