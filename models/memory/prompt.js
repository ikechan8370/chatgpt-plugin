import ChatGPTConfig from '../../config/config.js'
import { memoryService } from './service.js'

function renderTemplate (template, context = {}) {
  if (!template) {
    return ''
  }
  return template.replace(/\$\{(\w+)\}/g, (_, key) => {
    const value = context[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

function formatUserMemories (memories, config) {
  if (!memories.length) {
    return ''
  }
  const headerTemplate = config.promptHeader ?? '# 用户画像'
  const itemTemplate = config.promptItemTemplate ?? '- ${value}'
  const footerTemplate = config.promptFooter ?? ''
  const segments = []
  const header = renderTemplate(headerTemplate, { count: memories.length })
  if (header) {
    segments.push(header)
  }
  memories.forEach((item, index) => {
    const timestamp = item.updated_at || item.created_at || ''
    const timeSuffix = timestamp ? `（记录时间：${timestamp}）` : ''
    const context = {
      index,
      order: index + 1,
      value: item.value || '',
      importance: item.importance ?? '',
      sourceMessageId: item.source_message_id || '',
      sourceId: item.source_message_id || '',
      groupId: item.group_id || '',
      createdAt: item.created_at || '',
      updatedAt: item.updated_at || '',
      timestamp,
      time: timestamp,
      timeSuffix
    }
    const line = renderTemplate(itemTemplate, context)
    if (line) {
      segments.push(line)
    }
  })
  const footer = renderTemplate(footerTemplate, { count: memories.length })
  if (footer) {
    segments.push(footer)
  }
  return segments.join('\n')
}

function formatGroupFacts (facts, config) {
  if (!facts.length) {
    return ''
  }
  const headerTemplate = config.promptHeader ?? '# 群聊长期记忆'
  const itemTemplate = config.promptItemTemplate ?? '- ${fact}${topicSuffix}'
  const footerTemplate = config.promptFooter ?? ''
  const segments = []
  const header = renderTemplate(headerTemplate, { count: facts.length })
  if (header) {
    segments.push(header)
  }
  facts.forEach((item, index) => {
    const topicSuffix = item.topic ? `（${item.topic}）` : ''
    const timestamp = item.updated_at || item.created_at || ''
    const timeSuffix = timestamp ? `（记录时间：${timestamp}）` : ''
    const context = {
      index,
      order: index + 1,
      fact: item.fact || '',
      topic: item.topic || '',
      topicSuffix,
      importance: item.importance ?? '',
      createdAt: item.created_at || '',
      updatedAt: item.updated_at || '',
      timestamp,
      time: timestamp,
      timeSuffix,
      distance: item.distance ?? '',
      bm25: item.bm25_score ?? '',
      sourceMessages: item.source_messages || '',
      sourceMessageIds: item.source_message_ids || ''
    }
    const line = renderTemplate(itemTemplate, context)
    if (line) {
      segments.push(line)
    }
  })
  const footer = renderTemplate(footerTemplate, { count: facts.length })
  if (footer) {
    segments.push(footer)
  }
  return segments.join('\n')
}

export async function buildMemoryPrompt ({ userId, groupId, queryText }) {
  const segments = []
  const userConfig = ChatGPTConfig.memory?.user || {}
  const groupConfig = ChatGPTConfig.memory?.group || {}
  if (memoryService.isUserMemoryEnabled(userId)) {
    const totalLimit = userConfig.maxItemsPerInjection || 5
    const searchLimit = Math.min(userConfig.maxRelevantItemsPerQuery || totalLimit, totalLimit)
    const userMemories = memoryService.queryUserMemories(userId, groupId, queryText, {
      totalLimit,
      searchLimit,
      minImportance: userConfig.minImportanceForInjection ?? 0
    })
    const userSegment = formatUserMemories(userMemories, userConfig)
    if (userSegment) {
      segments.push(userSegment)
    }
  }
  if (groupId && memoryService.isGroupMemoryEnabled(groupId)) {
    const facts = await memoryService.queryGroupFacts(groupId, queryText, {
      limit: groupConfig.maxFactsPerInjection || 5,
      minImportance: groupConfig.minImportanceForInjection || 0
    })
    const groupSegment = formatGroupFacts(facts, groupConfig)
    if (groupSegment) {
      segments.push(groupSegment)
    }
  }
  return segments.join('\n\n').trim()
}
