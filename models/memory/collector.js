import * as crypto from 'node:crypto'
import ChatGPTConfig from '../../config/config.js'
import { extractGroupFacts } from './extractor.js'
import { memoryService } from './service.js'
import { getBotFramework } from '../../utils/bot.js'
import { ICQQGroupContextCollector, TRSSGroupContextCollector } from '../../utils/group.js'
import { groupHistoryCursorStore } from './groupHistoryCursorStore.js'

const DEFAULT_MAX_WINDOW = 300 // seconds
const DEFAULT_HISTORY_BATCH = 120
const MAX_RECENT_IDS = 200

function nowSeconds () {
  return Math.floor(Date.now() / 1000)
}

function normaliseGroupId (groupId) {
  return groupId === null || groupId === undefined ? null : String(groupId)
}

function shouldIgnoreMessage (e) {
  if (!e || !e.message) {
    return true
  }
  if (e.sender?.user_id && e.sender.user_id === e.bot?.uin) {
    return true
  }
  if (e.isPrivate) {
    return true
  }
  const text = e.msg?.trim()
  if (!text) {
    return true
  }
  if (text.startsWith('#')) {
    return true
  }
  const prefix = ChatGPTConfig.basic?.togglePrefix
  if (prefix && text.startsWith(prefix)) {
    return true
  }
  return false
}

function extractPlainText (e) {
  if (e.msg) {
    return e.msg.trim()
  }
  if (Array.isArray(e.message)) {
    return e.message
      .filter(item => item.type === 'text')
      .map(item => item.text || '')
      .join('')
      .trim()
  }
  return ''
}

function extractHistoryText (chat) {
  if (!chat) {
    return ''
  }
  if (typeof chat.raw_message === 'string') {
    const trimmed = chat.raw_message.trim()
    if (trimmed) {
      return trimmed
    }
  }
  if (typeof chat.msg === 'string') {
    const trimmed = chat.msg.trim()
    if (trimmed) {
      return trimmed
    }
  }
  if (Array.isArray(chat.message)) {
    const merged = chat.message
      .filter(item => item && item.type === 'text')
      .map(item => item.text || '')
      .join('')
      .trim()
    if (merged) {
      return merged
    }
  }
  if (typeof chat.text === 'string') {
    const trimmed = chat.text.trim()
    if (trimmed) {
      return trimmed
    }
  }
  return ''
}

function toPositiveInt (value, fallback = 0) {
  const num = Number(value)
  if (Number.isFinite(num) && num > 0) {
    return Math.floor(num)
  }
  return fallback
}

function normalizeTimestamp (value) {
  if (value === null || value === undefined) {
    return 0
  }
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) {
    return 0
  }
  if (num > 1e12) {
    return Math.floor(num)
  }
  return Math.floor(num * 1000)
}

function resolveMessageIdCandidate (source) {
  if (!source) {
    return ''
  }
  const candidates = [
    source.message_id,
    source.messageId,
    source.msg_id,
    source.seq,
    source.messageSeq,
    source.id
  ]
  for (const candidate of candidates) {
    if (candidate || candidate === 0) {
      const str = String(candidate).trim()
      if (str) {
        return str
      }
    }
  }
  return ''
}

function resolveUserId (source) {
  if (!source) {
    return ''
  }
  const candidates = [
    source.user_id,
    source.uid,
    source.userId,
    source.uin,
    source.id,
    source.qq
  ]
  for (const candidate of candidates) {
    if (candidate || candidate === 0) {
      const str = String(candidate).trim()
      if (str) {
        return str
      }
    }
  }
  return ''
}

function resolveNickname (source) {
  if (!source) {
    return ''
  }
  const candidates = [
    source.card,
    source.nickname,
    source.name,
    source.remark
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      if (trimmed) {
        return trimmed
      }
    }
  }
  return ''
}

export class GroupMessageCollector {
  constructor () {
    this.buffers = new Map()
    this.processing = new Set()
    this.groupStates = new Map()
    this.lastPollAt = 0
    this.polling = false
    this.selfIds = null
  }

  get groupConfig () {
    return ChatGPTConfig.memory?.group || {}
  }

  get historyBatchSize () {
    const config = this.groupConfig
    const configured = toPositiveInt(config.historyBatchSize, 0)
    if (configured > 0) {
      return configured
    }
    const minCount = toPositiveInt(config.minMessageCount, 80)
    return Math.max(minCount, DEFAULT_HISTORY_BATCH)
  }

  get historyPollIntervalMs () {
    const config = this.groupConfig
    const configured = Number(config.historyPollInterval)
    if (Number.isFinite(configured) && configured > 0) {
      return Math.floor(configured) * 1000
    }
    if (configured === 0) {
      return 0
    }
    const fallbackSeconds = Math.max(toPositiveInt(config.maxMessageWindow, DEFAULT_MAX_WINDOW), DEFAULT_MAX_WINDOW)
    return fallbackSeconds * 1000
  }

  async tickHistoryPolling (force = false) {
    const intervalMs = this.historyPollIntervalMs
    if (intervalMs <= 0) {
      return
    }
    if (!force) {
      const now = Date.now()
      if (this.lastPollAt && (now - this.lastPollAt) < intervalMs) {
        return
      }
    } else {
      this.refreshSelfIds()
    }
    await this.runHistoryPoll()
  }

  async runHistoryPoll () {
    if (this.polling) {
      return
    }
    this.polling = true
    try {
      logger.info('[Memory] start group history poll')
      await this.pollGroupHistories()
    } catch (err) {
      logger.error('[Memory] group history poll execution failed:', err)
    } finally {
      this.lastPollAt = Date.now()
      this.polling = false
    }
  }

  async pollGroupHistories () {
    const config = this.groupConfig
    if (!config.enable) {
      return
    }
    const groupIds = (config.enabledGroups || [])
      .map(normaliseGroupId)
      .filter(Boolean)
    if (groupIds.length === 0) {
      return
    }
    this.refreshSelfIds()
    const framework = getBotFramework()
    for (const groupId of groupIds) {
      if (!memoryService.isGroupMemoryEnabled(groupId)) {
        continue
      }
      const collector = framework === 'trss'
        ? new TRSSGroupContextCollector()
        : new ICQQGroupContextCollector()
      try {
        const added = await this.collectHistoryForGroup(collector, groupId)
        if (added > 0) {
          logger.debug(`[Memory] history poll buffered ${added} messages, group=${groupId}`)
        }
      } catch (err) {
        logger.warn(`[Memory] failed to poll history for group=${groupId}:`, err)
      }
    }
  }

  async collectHistoryForGroup (collector, groupId) {
    const limit = this.historyBatchSize
    if (!limit) {
      return 0
    }
    let chats = []
    try {
      chats = await collector.collect(undefined, groupId, 0, limit)
    } catch (err) {
      logger.warn(`[Memory] failed to collect history for group=${groupId}:`, err)
      return 0
    }
    if (!Array.isArray(chats) || chats.length === 0) {
      return 0
    }
    const messages = []
    for (const chat of chats) {
      const payload = this.transformHistoryMessage(groupId, chat)
      if (payload) {
        messages.push(payload)
      }
    }
    if (!messages.length) {
      return 0
    }
    messages.sort((a, b) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp))
    let queued = 0
    for (const payload of messages) {
      if (this.queueMessage(groupId, payload)) {
        queued++
      }
    }
    return queued
  }

  transformHistoryMessage (groupId, chat) {
    const text = extractHistoryText(chat)
    if (!text) {
      return null
    }
    if (text.startsWith('#')) {
      return null
    }
    const prefix = ChatGPTConfig.basic?.togglePrefix
    if (prefix && text.startsWith(prefix)) {
      return null
    }
    const sender = chat?.sender || {}
    const userId = resolveUserId(sender) || resolveUserId(chat)
    if (this.isBotSelfId(userId)) {
      return null
    }
    return {
      message_id: resolveMessageIdCandidate(chat),
      user_id: userId,
      nickname: resolveNickname(sender) || resolveNickname(chat),
      text,
      timestamp: chat?.time ?? chat?.timestamp ?? chat?.message_time ?? Date.now()
    }
  }

  queueMessage (groupId, rawPayload) {
    if (!rawPayload || !rawPayload.text) {
      return false
    }
    const state = this.getGroupState(groupId)
    const messageId = this.ensureMessageId(rawPayload)
    const timestampMs = normalizeTimestamp(rawPayload.timestamp)
    const buffer = this.getBuffer(groupId)
    const payload = {
      message_id: messageId,
      user_id: rawPayload.user_id ? String(rawPayload.user_id) : '',
      nickname: rawPayload.nickname ? String(rawPayload.nickname) : '',
      text: rawPayload.text,
      timestamp: timestampMs || Date.now()
    }
    const messageKey = this.resolveMessageKey(payload, messageId, timestampMs)
    if (this.shouldSkipMessage(state, timestampMs, messageKey, payload.message_id)) {
      return false
    }
    this.updateGroupState(groupId, state, timestampMs, messageKey, payload.message_id)
    buffer.messages.push(payload)
    logger.debug(`[Memory] buffered group message, group=${groupId}, buffer=${buffer.messages.length}`)
    this.tryTriggerFlush(groupId, buffer)
    return true
  }

  ensureMessageId (payload) {
    const direct = payload?.message_id ? String(payload.message_id).trim() : ''
    if (direct) {
      return direct
    }
    const fallback = resolveMessageIdCandidate(payload)
    if (fallback) {
      return fallback
    }
    return crypto.randomUUID()
  }

  resolveMessageKey (payload, messageId, timestampMs) {
    if (messageId) {
      return messageId
    }
    const parts = [
      timestampMs || '',
      payload?.user_id || '',
      (payload?.text || '').slice(0, 32)
    ]
    return parts.filter(Boolean).join(':')
  }

  getGroupState (groupId) {
    let state = this.groupStates.get(groupId)
    if (!state) {
      const cursor = groupHistoryCursorStore.getCursor(groupId)
      const lastTimestamp = Number(cursor?.last_timestamp) || 0
      const lastMessageId = cursor?.last_message_id || null
      state = {
        lastTimestamp,
        lastMessageId,
        recentIds: new Set()
      }
      if (lastMessageId) {
        state.recentIds.add(lastMessageId)
      }
      this.groupStates.set(groupId, state)
    }
    return state
  }

  shouldSkipMessage (state, timestampMs, messageKey, messageId) {
    if (!state) {
      return false
    }
    if (messageId && state.lastMessageId && messageId === state.lastMessageId) {
      return true
    }
    if (timestampMs && timestampMs < state.lastTimestamp) {
      return true
    }
    if (timestampMs && timestampMs === state.lastTimestamp && messageKey && state.recentIds.has(messageKey)) {
      return true
    }
    if (!timestampMs && messageKey && state.recentIds.has(messageKey)) {
      return true
    }
    return false
  }

  updateGroupState (groupId, state, timestampMs, messageKey, messageId) {
    const hasTimestamp = Number.isFinite(timestampMs) && timestampMs > 0
    if (!hasTimestamp) {
      if (messageKey) {
        state.recentIds.add(messageKey)
        if (state.recentIds.size > MAX_RECENT_IDS) {
          const ids = Array.from(state.recentIds).slice(-MAX_RECENT_IDS)
          state.recentIds = new Set(ids)
        }
      }
      if (messageId) {
        state.lastMessageId = String(messageId)
        groupHistoryCursorStore.updateCursor(groupId, {
          lastMessageId: state.lastMessageId,
          lastTimestamp: state.lastTimestamp || null
        })
      }
      return
    }

    if (timestampMs > state.lastTimestamp) {
      state.lastTimestamp = timestampMs
      state.recentIds = messageKey ? new Set([messageKey]) : new Set()
    } else if (timestampMs === state.lastTimestamp && messageKey) {
      state.recentIds.add(messageKey)
      if (state.recentIds.size > MAX_RECENT_IDS) {
        const ids = Array.from(state.recentIds).slice(-MAX_RECENT_IDS)
        state.recentIds = new Set(ids)
      }
    }

    if (messageId) {
      state.lastMessageId = String(messageId)
    }

    groupHistoryCursorStore.updateCursor(groupId, {
      lastMessageId: state.lastMessageId || null,
      lastTimestamp: state.lastTimestamp || timestampMs
    })
  }

  getBuffer (groupId) {
    let buffer = this.buffers.get(groupId)
    if (!buffer) {
      buffer = {
        messages: [],
        lastFlushAt: nowSeconds()
      }
      this.buffers.set(groupId, buffer)
    }
    return buffer
  }

  tryTriggerFlush (groupId, buffer) {
    const config = this.groupConfig
    const minCount = config.minMessageCount || 50
    const maxWindow = config.maxMessageWindow || DEFAULT_MAX_WINDOW
    const shouldFlushByCount = buffer.messages.length >= minCount
    const shouldFlushByTime = buffer.messages.length > 0 && (nowSeconds() - buffer.lastFlushAt) >= maxWindow
    logger.debug(`[Memory] try trigger flush, group=${groupId}, count=${buffer.messages.length}, lastFlushAt=${buffer.lastFlushAt}, shouldFlushByCount=${shouldFlushByCount}, shouldFlushByTime=${shouldFlushByTime}`)
    if (shouldFlushByCount || shouldFlushByTime) {
      logger.info(`[Memory] trigger group fact extraction, group=${groupId}, count=${buffer.messages.length}, reason=${shouldFlushByCount ? 'count' : 'timeout'}`)
      this.flush(groupId).catch(err => logger.error('Failed to flush group memory:', err))
    }
  }

  push (e) {
    const groupId = normaliseGroupId(e.group_id || e.group?.group_id)
    if (!memoryService.isGroupMemoryEnabled(groupId)) {
      return
    }
    if (shouldIgnoreMessage(e)) {
      return
    }
    const text = extractPlainText(e)
    if (!text) {
      return
    }
    this.addSelfId(e.bot?.uin)
    const messageId = e.message_id || e.seq || crypto.randomUUID()
    logger.debug(`[Memory] collect group message, group=${groupId}, user=${e.sender?.user_id}, buffer=${(this.buffers.get(groupId)?.messages.length || 0) + 1}`)
    this.queueMessage(groupId, {
      message_id: messageId,
      user_id: String(e.sender?.user_id || ''),
      nickname: e.sender?.card || e.sender?.nickname || '',
      text,
      timestamp: e.time || Date.now()
    })
  }

  async flush (groupId) {
    if (this.processing.has(groupId)) {
      return
    }
    const buffer = this.buffers.get(groupId)
    if (!buffer || buffer.messages.length === 0) {
      return
    }
    this.processing.add(groupId)
    try {
      const messages = buffer.messages
      this.buffers.set(groupId, {
        messages: [],
        lastFlushAt: nowSeconds()
      })
      logger.debug(`[Memory] flushing group buffer, group=${groupId}, messages=${messages.length}`)
      const simplified = messages.map(msg => ({
        message_id: msg.message_id,
        user_id: msg.user_id,
        nickname: msg.nickname,
        text: msg.text
      }))
      const factCandidates = await extractGroupFacts(simplified)
      if (factCandidates.length === 0) {
        logger.debug(`[Memory] group fact extraction returned empty, group=${groupId}`)
        return
      }
      const messageMap = new Map(messages.map(msg => [msg.message_id, msg.text]))
      const enrichedFacts = factCandidates.map(fact => {
        if (!fact.source_message_ids && fact.sourceMessages) {
          fact.source_message_ids = fact.sourceMessages
        }
        let ids = []
        if (Array.isArray(fact.source_message_ids)) {
          ids = fact.source_message_ids.map(id => String(id))
        } else if (typeof fact.source_message_ids === 'string') {
          ids = fact.source_message_ids.split(',').map(id => id.trim()).filter(Boolean)
        }
        if (!fact.source_messages && ids.length > 0) {
          const summary = ids
            .map(id => messageMap.get(id) || '')
            .filter(Boolean)
            .join('\n')
          fact.source_messages = summary
        }
        fact.source_message_ids = ids
        if (!fact.involved_users || !Array.isArray(fact.involved_users)) {
          fact.involved_users = []
        } else {
          fact.involved_users = fact.involved_users.map(id => String(id))
        }
        return fact
      })
      const saved = await memoryService.saveGroupFacts(groupId, enrichedFacts)
      logger.info(`[Memory] saved ${saved.length} group facts for group=${groupId}`)
    } finally {
      this.processing.delete(groupId)
    }
  }

  addSelfId (uin) {
    if (uin === null || uin === undefined) {
      return
    }
    const str = String(uin)
    if (!str) {
      return
    }
    if (!this.selfIds) {
      this.selfIds = new Set()
    }
    this.selfIds.add(str)
  }

  refreshSelfIds () {
    this.selfIds = this.collectSelfIds()
  }

  collectSelfIds () {
    const ids = new Set()
    try {
      const botGlobal = global.Bot
      if (botGlobal?.bots && typeof botGlobal.bots === 'object') {
        for (const bot of Object.values(botGlobal.bots)) {
          if (bot?.uin) {
            ids.add(String(bot.uin))
          }
        }
      }
      if (botGlobal?.uin) {
        ids.add(String(botGlobal.uin))
      }
    } catch (err) {
      logger?.debug?.('[Memory] failed to collect bot self ids: %o', err)
    }
    return ids
  }

  isBotSelfId (userId) {
    if (userId === null || userId === undefined) {
      return false
    }
    const str = String(userId)
    if (!str) {
      return false
    }
    if (!this.selfIds || this.selfIds.size === 0) {
      this.refreshSelfIds()
    }
    return this.selfIds?.has(str) || false
  }
}
