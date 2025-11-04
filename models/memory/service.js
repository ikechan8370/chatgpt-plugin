import ChatGPTConfig from '../../config/config.js'
import { getMemoryDatabase } from './database.js'
import { GroupMemoryStore } from './groupMemoryStore.js'
import { UserMemoryStore } from './userMemoryStore.js'

function normaliseId (id) {
  if (id === null || id === undefined) {
    return ''
  }
  return String(id)
}

function formatEntry (entry) {
  let str = ''
  try {
    str = JSON.stringify(entry)
  } catch (err) {
    str = String(entry)
  }
  const limit = 200
  return str.length > limit ? str.slice(0, limit) + '…' : str
}

function normalisePersonalMemory (entry) {
  if (!entry) return null
  let text = ''
  let importance = typeof entry?.importance === 'number' ? entry.importance : 0.6
  let sourceId = entry?.source_message_id ? String(entry.source_message_id) : null
  if (typeof entry === 'string') {
    text = entry.trim()
  } else if (typeof entry === 'object') {
    const value = entry.value || entry.text || entry.fact || entry.sentence
    if (Array.isArray(value)) {
      text = value.join(', ').trim()
    } else if (value) {
      text = String(value).trim()
    }
    if (entry.importance !== undefined) {
      importance = Number(entry.importance)
    }
    if (entry.source_message_id) {
      sourceId = String(entry.source_message_id)
    }
  }
  if (!text) {
    return null
  }
  if (Number.isNaN(importance) || importance <= 0) {
    importance = 0.6
  }
  return { text, importance, sourceId }
}

class MemoryService {
  constructor () {
    const db = getMemoryDatabase()
    this.groupStore = new GroupMemoryStore(db)
    this.userStore = new UserMemoryStore(db)
  }

  isGroupMemoryEnabled (groupId) {
    const config = ChatGPTConfig.memory?.group
    if (!config?.enable) {
      return false
    }
    const enabledGroups = (config.enabledGroups || []).map(normaliseId)
    if (enabledGroups.length === 0) {
      return false
    }
    return enabledGroups.includes(normaliseId(groupId))
  }

  isUserMemoryEnabled (userId) {
    const config = ChatGPTConfig.memory?.user
    if (!config?.enable) {
      return false
    }
    const uid = normaliseId(userId)
    const whitelist = (config.whitelist || []).map(normaliseId).filter(Boolean)
    const blacklist = (config.blacklist || []).map(normaliseId).filter(Boolean)
    if (whitelist.length > 0) {
      return whitelist.includes(uid)
    }
    if (blacklist.length > 0) {
      return !blacklist.includes(uid)
    }
    return true
  }

  async saveGroupFacts (groupId, facts) {
    if (!this.isGroupMemoryEnabled(groupId)) {
      return []
    }
    try {
      const saved = await this.groupStore.saveFacts(groupId, facts)
      if (saved.length > 0) {
        logger.info(`[Memory] group=${groupId} stored ${saved.length} facts`)
        saved.slice(0, 10).forEach((item, idx) => {
          logger.debug(`[Memory] group stored fact[${idx}] ${formatEntry(item)}`)
        })
      }
      return saved
    } catch (err) {
      logger.error('Failed to save group facts:', err)
      return []
    }
  }

  async queryGroupFacts (groupId, queryText, options = {}) {
    if (!this.isGroupMemoryEnabled(groupId)) {
      return []
    }
    const { maxFactsPerInjection = 5, minImportanceForInjection = 0 } = ChatGPTConfig.memory?.group || {}
    const limit = options.limit || maxFactsPerInjection
    const minImportance = options.minImportance ?? minImportanceForInjection
    try {
      return await this.groupStore.queryRelevantFacts(groupId, queryText, { limit, minImportance })
    } catch (err) {
      logger.error('Failed to query group memory:', err)
      return []
    }
  }

  listGroupFacts (groupId, limit = 50, offset = 0) {
    return this.groupStore.listFacts(groupId, limit, offset)
  }

  deleteGroupFact (groupId, factId) {
    return this.groupStore.deleteFact(groupId, factId)
  }

  upsertUserMemories (userId, groupId, memories) {
    if (!this.isUserMemoryEnabled(userId)) {
      return 0
    }
    try {
      const prepared = (memories || [])
        .map(normalisePersonalMemory)
        .filter(item => item && item.text)
        .map(item => ({
          value: item.text,
          importance: item.importance,
          source_message_id: item.sourceId
        }))
      if (prepared.length === 0) {
        return 0
      }
      const changed = this.userStore.upsertMemories(userId, groupId, prepared)
      if (changed > 0) {
        logger.info(`[Memory] user=${userId} updated ${changed} personal memories${groupId ? ` in group=${groupId}` : ''}`)
        prepared.slice(0, 10).forEach((item, idx) => {
          logger.debug(`[Memory] user memory upsert[${idx}] ${formatEntry(item)}`)
        })
      }
      return changed
    } catch (err) {
      logger.error('Failed to upsert user memories:', err)
      return 0
    }
  }

  queryUserMemories (userId, groupId = null, queryText = '', options = {}) {
    if (!this.isUserMemoryEnabled(userId)) {
      return []
    }
    const userConfig = ChatGPTConfig.memory?.user || {}
    const totalLimit = options.totalLimit ?? userConfig.maxItemsPerInjection ?? 5
    const searchLimit = options.searchLimit ?? userConfig.maxRelevantItemsPerQuery ?? totalLimit
    const minImportance = options.minImportance ?? userConfig.minImportanceForInjection ?? 0
    if (!totalLimit || totalLimit <= 0) {
      return []
    }
    try {
      return this.userStore.queryMemories(userId, groupId, queryText, {
        limit: searchLimit,
        fallbackLimit: totalLimit,
        minImportance
      })
    } catch (err) {
      logger.error('Failed to query user memories:', err)
      return []
    }
  }

  listUserMemories (userId, groupId = null, limit = 50, offset = 0) {
    return this.userStore.listUserMemories(userId, groupId, limit, offset)
  }

  deleteUserMemory (memoryId, userId = null) {
    return this.userStore.deleteMemoryById(memoryId, userId)
  }
}

export const memoryService = new MemoryService()
