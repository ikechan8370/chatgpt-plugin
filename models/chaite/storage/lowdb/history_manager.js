import { AbstractHistoryManager } from 'chaite'

export class LowDBHistoryManager extends AbstractHistoryManager {
  /**
   *
   * @param { LowDBStorage } storage
   */
  constructor (storage) {
    super()
    this.storage = storage
    /**
     * 集合
     * @type {LowDBCollection}
     */
    this.collection = this.storage.collection('history')
  }

  async saveHistory (message, conversationId) {
    const historyObj = { ...message, conversationId }
    if (message.id) {
      await this.collection.updateById(message.id, historyObj)
    }
    await this.collection.insert(historyObj)
  }

  /**
   *
   * @param messageId
   * @param conversationId
   * @returns {Promise<import('chaite').HistoryMessage[]>}
   */
  async getHistory (messageId, conversationId) {
    if (messageId) {
      const messages = []
      let currentId = messageId
      while (currentId) {
        const message = await this.collection.findOne({ id: currentId })
        if (!message) break
        messages.unshift(message)
        currentId = message.parentId
      }
      return messages
    } else if (conversationId) {
      return this.collection.find({ conversationId })
    }
    return []
  }

  async deleteConversation (conversationId) {
    await this.collection.delete({ conversationId })
  }

  async removeHistory (messageId, conversationId) {
    const target = await this.collection.findOne({ id: messageId, conversationId })
    if (!target) return
    const children = await this.collection.find({ conversationId, parentId: messageId })
    for (const child of children) {
      await this.collection.updateById(child.id, { parentId: target.parentId })
    }
    await this.collection.deleteById(messageId)
  }

  async getOneHistory (messageId, conversationId) {
    return this.collection.findOne({ id: messageId, conversationId })
  }
}
