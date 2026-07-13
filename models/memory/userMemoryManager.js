import * as crypto from 'node:crypto'
import { extractUserMemories } from './extractor.js'
import { memoryService } from './service.js'

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

function getEventUserId (e) {
  const userId = e?.user_id ?? e?.sender?.user_id
  if (userId === null || userId === undefined) {
    return ''
  }
  return String(userId).trim()
}

export async function processUserMemory ({ event, userMessage, userText, assistantContents, assistantMessageId }) {
  const e = event
  const userId = getEventUserId(e)
  if (!userId || !memoryService.isUserMemoryEnabled(userId)) {
    return
  }
  const snippets = []
  const userMessageId = e.message_id || e.seq || userMessage?.id || crypto.randomUUID()
  const senderName = e.sender?.card || e.sender?.nickname || userId

  // Only extract personal memory from the actual user turn. The chat pipeline
  // injects memory prompts and group context as role=user messages for model
  // caching; reading them back from history would attribute other members'
  // messages to the current user.
  if (userText) {
    snippets.push({
      role: 'user',
      text: userText,
      nickname: senderName,
      message_id: userMessageId
    })
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

  if (snippets.length === 0) {
    return
  }

  const existingRecords = await memoryService.listUserMemories(userId, e.isGroup ? e.group_id : null, 50)
  const existingTexts = existingRecords.map(record => record.value).filter(Boolean)
  const memories = await extractUserMemories(snippets, existingTexts)
  if (!memories || memories.length === 0) {
    return
  }

  const enriched = normaliseMemoriesInput(memories, userMessageId)
  await memoryService.upsertUserMemories(
    userId,
    e.isGroup ? e.group_id : null,
    enriched
  )
}
