/**
 * Base LLM Chat Client \
 * All the Chat Models should extend this class
 *
 * @since 2023-10-26
 * @author ikechan8370
 */
export class BaseClient {
  /**
   * create a new client
   *
   * @param props required fields: e, getMessageById, upsertMessage
   */
  constructor (props = {}) {
    this.supportFunction = false
    this.maxToken = 4096
    /**
     * @type {Array<AbstractTool>}
     */
    this.tools = []
    const {
      e, getMessageById, upsertMessage, deleteMessageById, userId
    } = props
    this.e = e
    this.getMessageById = getMessageById
    this.upsertMessage = upsertMessage
    this.deleteMessageById = deleteMessageById || (() => {})
    this.userId = userId
  }

  /**
   * get a message according to the id. note that conversationId is not needed
   *
   * @type function
   * @param {string} id
   * @return {Promise<object>} message
   */
  getMessageById

  /**
   * insert or update a message with the id
   *
   * @type function
   * @param {object} message
   * @return {Promise<void>}
   */
  upsertMessage

  /**
   * delete a message with the id
   *
   * @type function
   * @param {string} id
   * @return {Promise<void>}
   */
  deleteMessageById

  /**
   * Send prompt message with history and return response message \
   * if function called, handled internally \
   * override this method to implement logic of sending and receiving message
   *
   * @param {string} msg
   * @param {{conversationId: string?, parentMessageId: string?, stream: boolean?, onProgress: function?}} opt other options, optional fields: [conversationId, parentMessageId], if not set, random uuid instead
   * @returns {Promise<{text, conversationId, parentMessageId, id}>} required fields: [text, conversationId, parentMessageId, id]
   */
  async sendMessage (msg, opt = {}) {
    throw new Error('not implemented in abstract client')
  }

  /**
   * Get chat history between user and assistant
   * override this method to implement logic of getting history
   * keyv with local file or redis recommended
   *
   * @param userId optional, such as qq number
   * @param parentMessageId if blank, no history
   * @param opt optional, other options
   * @returns {Promise<object[]>}
   */
  async getHistory (parentMessageId, userId = this.userId, opt = {}) {
    throw new Error('not implemented in abstract client')
  }

  /**
   * Destroy a chat history
   * @param conversationId conversationId of the chat history
   * @param opt other options
   * @returns {Promise<void>}
   */
  async destroyHistory (conversationId, opt = {}) {
    throw new Error('not implemented in abstract client')
  }

  /**
   * 增加tools
   * @param {[AbstractTool]} tools
   */
  addTools (tools) {
    if (!this.isSupportFunction) {
      throw new Error('function not supported')
    }
    if (!this.tools) {
      this.tools = []
    }
    this.tools.push(...tools)
  }

  getTools () {
    if (!this.isSupportFunction) {
      throw new Error('function not supported')
    }
    return this.tools || []
  }

  get isSupportFunction () {
    return this.supportFunction
  }
}
