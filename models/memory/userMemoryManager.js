import { Chaite } from 'chaite'
import * as crypto from 'node:crypto'
import { extractUserMemories } from './extractor.js'
import { memoryService } from './service.js'

const USER_MEMORY_CONTEXT_LIMIT = 6

export function extractTextFromContents (contents) {
  if (!Array.isArray(contents)) {
    return ''
  }
  return contents
    .filter(item => item && item.type === 'text')
    .map(item => item.text || '')
    .join('\n')
    .trim()
}

export function extractTextFromUserMessage (userMessage) {
  if (!userMessage?.content) {
    return ''
  }
  return userMessage.content
    .filter(item => item.type === 'text')
    .map(item => item.text || '')
    .join('\n')
    .trim()
}

function normaliseMemoriesInput (memories, sourceId) {
  return (memories || []).map(mem => {
    if (typeof mem === 'string') {
      return {
        value: mem,
        source_message_id: sourceId
      }
    }
  if (mem && typeof mem === 'object') {
    const cloned = { ...mem }
    if (!cloned.source_message_id && sourceId) {
      cloned.source_message_id = sourceId
    }
    if (!cloned.value && cloned.fact) {
      cloned.value = cloned.fact
    }
    if (!cloned.value && cloned.text) {
      cloned.value = cloned.text
    }
    return cloned
  }
    return {
      value: String(mem),
      source_message_id: sourceId
    }
  })
}

export async function processUserMemory ({ event, userMessage, userText, conversationId, assistantContents, assistantMessageId }) {
  const e = event
  if (!memoryService.isUserMemoryEnabled(e.sender.user_id)) {
    return
  }
  const snippets = []
  const userMessageId = e.message_id || e.seq || userMessage?.id || crypto.randomUUID()
  const senderName = e.sender?.card || e.sender?.nickname || String(e.sender?.user_id || '')

  try {
    const historyManager = Chaite.getInstance()?.getHistoryManager?.()
    if (historyManager && conversationId) {
      const history = await historyManager.getHistory(null, conversationId)
      const filtered = (history || [])
        .filter(msg => ['user', 'assistant'].includes(msg.role))
        .map(msg => ({
          role: msg.role,
          text: extractTextFromContents(msg.content),
          nickname: msg.role === 'user' ? senderName : '机器人',
          message_id: msg.id
        }))
        .filter(item => item.text)
      if (filtered.length > 0) {
        const limited = filtered.slice(-USER_MEMORY_CONTEXT_LIMIT * 2)
        snippets.push(...limited)
      }
    }
  } catch (err) {
    logger.warn('Failed to collect user memory context:', err)
  }

  if (assistantContents) {
    const assistantText = extractTextFromContents(assistantContents)
    if (assistantText) {
      snippets.push({
        role: 'assistant',
        text: assistantText,
        nickname: '机器人',
        message_id: assistantMessageId || crypto.randomUUID()
      })
    }
  }

  if (userText && !snippets.some(item => item.message_id === userMessageId)) {
    snippets.push({
      role: 'user',
      text: userText,
      nickname: senderName,
      message_id: userMessageId
    })
  }

  if (snippets.length === 0) {
    return
  }

  const existingRecords = memoryService.listUserMemories(e.sender.user_id, e.isGroup ? e.group_id : null, 50)
  const existingTexts = existingRecords.map(record => record.value).filter(Boolean)
  const memories = await extractUserMemories(snippets, existingTexts)
  if (!memories || memories.length === 0) {
    return
  }

  const enriched = normaliseMemoriesInput(memories, userMessageId)
  memoryService.upsertUserMemories(
    e.sender.user_id,
    e.isGroup ? e.group_id : null,
    enriched
  )
}

export { USER_MEMORY_CONTEXT_LIMIT }
