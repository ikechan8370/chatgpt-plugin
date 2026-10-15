import { limitImageContent } from './image_size.js'

const GUARD = Symbol.for('chatgpt-plugin.image-request-guard')

/** Clone only changed messages; never overwrite original history/cache images. */
export async function limitRequestImages (messages, maxImageSize, limitImage = limitImageContent) {
  let prepared = messages
  for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
    const message = messages[messageIndex]
    if (!Array.isArray(message?.content)) continue
    let content = message.content
    for (let contentIndex = 0; contentIndex < message.content.length; contentIndex++) {
      const item = message.content[contentIndex]
      if (item?.type !== 'image') continue
      let limited
      try {
        limited = await limitImage(item, maxImageSize)
      } catch (error) {
        throw new Error(`发送前图片处理失败 (messages.${messageIndex}.content.${contentIndex}): ${error.message}`, { cause: error })
      }
      if (limited !== item) {
        if (content === message.content) content = [...content]
        content[contentIndex] = limited
      }
    }
    if (content !== message.content) {
      if (prepared === messages) prepared = [...messages]
      prepared[messageIndex] = { ...message, content }
    }
  }
  return prepared
}

/**
 * Chaite 1.15 has no mandatory request hook. Guard the adapters' final entry
 * after history restoration and optional processors, including tool rounds and
 * sendMessageWithHistory. Errors propagate here instead of being swallowed by
 * Chaite's optional preprocessor loop.
 */
export function installImageRequestGuard (clientTypes, getMaxImageSize, limitImage = limitImageContent) {
  for (const Client of clientTypes) {
    const prototype = Client.prototype
    const original = prototype._sendMessage
    if (original[GUARD]) continue
    async function sendWithImageLimit (messages, ...args) {
      const prepared = await limitRequestImages(messages, getMaxImageSize(), limitImage)
      if (prepared !== messages) this.logger?.info?.('[Vision] 已在发送前处理超限图片/规范化图片内容')
      return original.call(this, prepared, ...args)
    }
    Object.defineProperty(sendWithImageLimit, GUARD, { value: true })
    prototype._sendMessage = sendWithImageLimit
  }
}
