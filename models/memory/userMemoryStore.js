import { getMemoryDatabase, getUserMemoryFtsConfig, sanitiseFtsQueryInput } from './database.js'
import { md5 } from '../../utils/common.js'

function normaliseId (value) {
  if (value === null || value === undefined) {
    return null
  }
  const str = String(value).trim()
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return null
  }
  return str
}

function toMemoryPayload (entry) {
  if (entry === null || entry === undefined) {
    return null
  }
  if (typeof entry === 'string') {
    const text = entry.trim()
    return text ? { value: text, importance: 0.5 } : null
  }
  if (typeof entry === 'object') {
    const rawValue = entry.value ?? entry.text ?? entry.fact ?? ''
    const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue || '').trim()
    if (!value) {
      return null
    }
    const importance = typeof entry.importance === 'number' ? entry.importance : 0.5
    const sourceId = entry.source_message_id ? String(entry.source_message_id) : null
    const providedKey = entry.key ? String(entry.key).trim() : ''
    return {
      value,
      importance,
      source_message_id: sourceId,
      providedKey
    }
  }
  const value = String(entry).trim()
  return value ? { value, importance: 0.5 } : null
}

function deriveKey (value, providedKey = '') {
  const trimmedProvided = providedKey?.trim?.() || ''
  if (trimmedProvided) {
    return trimmedProvided
  }
  if (!value) {
    return null
  }
  return `fact:${md5(String(value))}`
}

function stripKey (row) {
  if (!row || typeof row !== 'object') {
    return row
  }
  const { key, ...rest } = row
  return rest
}

function appendRows (target, rows, seen) {
  if (!Array.isArray(rows)) {
    return
  }
  for (const row of rows) {
    if (!row || seen.has(row.id)) {
      continue
    }
    target.push(stripKey(row))
    seen.add(row.id)
  }
}

export class UserMemoryStore {
  constructor (db = getMemoryDatabase()) {
    this.resetDatabase(db)
  }

  resetDatabase (db = getMemoryDatabase()) {
    this.db = db
    this.upsertStmt = this.db.prepare(`
      INSERT INTO user_memory (user_id, group_id, key, value, importance, source_message_id, created_at, updated_at)
      VALUES (@user_id, @group_id, @key, @value, @importance, @source_message_id, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, coalesce(group_id, ''), key) DO UPDATE SET
        value = excluded.value,
        importance = excluded.importance,
        source_message_id = excluded.source_message_id,
        updated_at = datetime('now')
    `)
  }

  ensureDb () {
    if (!this.db || this.db.open === false) {
      logger?.debug?.('[Memory] refreshing user memory database connection')
      this.resetDatabase()
    }
    return this.db
  }

  upsertMemories (userId, groupId, memories) {
    if (!memories || memories.length === 0) {
      return 0
    }
    this.ensureDb()
    const normUserId = normaliseId(userId)
    const normGroupId = normaliseId(groupId)
    const prepared = (memories || [])
      .map(toMemoryPayload)
      .filter(item => item && item.value)
      .map(item => {
        const key = deriveKey(item.value, item.providedKey)
        if (!key) {
          return null
        }
        return {
          user_id: normUserId,
          group_id: normGroupId,
          key,
          value: String(item.value),
          importance: typeof item.importance === 'number' ? item.importance : 0.5,
          source_message_id: item.source_message_id ? String(item.source_message_id) : null
        }
      })
      .filter(Boolean)
    if (!prepared.length) {
      return 0
    }
    const transaction = this.db.transaction(items => {
      let changes = 0
      for (const item of items) {
        const info = this.upsertStmt.run(item)
        changes += info.changes
      }
      return changes
    })
    return transaction(prepared)
  }

  listUserMemories (userId = null, groupId = null, limit = 50, offset = 0) {
    this.ensureDb()
    const normUserId = normaliseId(userId)
    const normGroupId = normaliseId(groupId)
    const params = []
    let query = `
      SELECT * FROM user_memory
      WHERE 1 = 1
    `
    if (normUserId) {
      query += ' AND user_id = ?'
      params.push(normUserId)
    }
    if (normGroupId) {
      if (normUserId) {
        query += ' AND (group_id = ? OR group_id IS NULL)'
      } else {
        query += ' AND group_id = ?'
      }
      params.push(normGroupId)
    }
    query += `
      ORDER BY importance DESC, updated_at DESC
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)
    const rows = this.db.prepare(query).all(...params)
    return rows.map(stripKey)
  }

  deleteMemoryById (memoryId, userId = null) {
    this.ensureDb()
    if (userId) {
      const result = this.db.prepare('DELETE FROM user_memory WHERE id = ? AND user_id = ?').run(memoryId, normaliseId(userId))
      return result.changes > 0
    }
    const result = this.db.prepare('DELETE FROM user_memory WHERE id = ?').run(memoryId)
    return result.changes > 0
  }

  listRecentMemories (userId, groupId = null, limit = 50, excludeIds = [], minImportance = 0) {
    this.ensureDb()
    const normUserId = normaliseId(userId)
    const normGroupId = normaliseId(groupId)
    const filteredExclude = (excludeIds || []).filter(Boolean)
    const params = [normUserId]
    let query = `
      SELECT * FROM user_memory
      WHERE user_id = ?
        AND importance >= ?
    `
    params.push(minImportance)
    if (normGroupId) {
      query += ' AND (group_id = ? OR group_id IS NULL)'
      params.push(normGroupId)
    }
    if (filteredExclude.length) {
      query += ` AND id NOT IN (${filteredExclude.map(() => '?').join(',')})`
      params.push(...filteredExclude)
    }
    query += `
      ORDER BY updated_at DESC
      LIMIT ?
    `
    params.push(limit)
    return this.db.prepare(query).all(...params).map(stripKey)
  }

  textSearch (userId, groupId = null, queryText, limit = 5, excludeIds = []) {
    if (!queryText || !queryText.trim()) {
      return []
    }
    this.ensureDb()
    const normUserId = normaliseId(userId)
    const normGroupId = normaliseId(groupId)
    const filteredExclude = (excludeIds || []).filter(Boolean)
    const originalQuery = queryText.trim()
    const ftsConfig = getUserMemoryFtsConfig()
    const matchQueryParam = sanitiseFtsQueryInput(originalQuery, ftsConfig)
    const results = []
    const seen = new Set(filteredExclude)
    if (matchQueryParam) {
      const matchExpression = ftsConfig.matchQuery ? `${ftsConfig.matchQuery}(?)` : '?'
      const params = [normUserId, matchQueryParam]
      let query = `
        SELECT um.*, bm25(user_memory_fts) AS bm25_score
        FROM user_memory_fts
        JOIN user_memory um ON um.id = user_memory_fts.rowid
        WHERE um.user_id = ?
          AND user_memory_fts MATCH ${matchExpression}
      `
      if (normGroupId) {
        query += ' AND (um.group_id = ? OR um.group_id IS NULL)'
        params.push(normGroupId)
      }
      if (filteredExclude.length) {
        query += ` AND um.id NOT IN (${filteredExclude.map(() => '?').join(',')})`
        params.push(...filteredExclude)
      }
      query += `
        ORDER BY bm25_score ASC, um.updated_at DESC
        LIMIT ?
      `
      params.push(limit)
      try {
        const ftsRows = this.db.prepare(query).all(...params)
        appendRows(results, ftsRows, seen)
      } catch (err) {
        logger?.warn?.('User memory text search failed:', err)
      }
    } else {
      logger?.debug?.('[Memory] user memory text search skipped MATCH due to empty query after sanitisation')
    }

    if (results.length < limit) {
      const likeParams = [normUserId, originalQuery]
      let likeQuery = `
        SELECT um.*
        FROM user_memory um
        WHERE um.user_id = ?
          AND instr(um.value, ?) > 0
      `
      if (normGroupId) {
        likeQuery += ' AND (um.group_id = ? OR um.group_id IS NULL)'
        likeParams.push(normGroupId)
      }
      if (filteredExclude.length) {
        likeQuery += ` AND um.id NOT IN (${filteredExclude.map(() => '?').join(',')})`
        likeParams.push(...filteredExclude)
      }
      likeQuery += `
        ORDER BY um.importance DESC, um.updated_at DESC
        LIMIT ?
      `
      likeParams.push(Math.max(limit * 2, limit))
      try {
        const likeRows = this.db.prepare(likeQuery).all(...likeParams)
        appendRows(results, likeRows, seen)
      } catch (err) {
        logger?.warn?.('User memory LIKE search failed:', err)
      }
    }

    return results.slice(0, limit)
  }

  queryMemories (userId, groupId = null, queryText = '', options = {}) {
    const normUserId = normaliseId(userId)
    if (!normUserId) {
      return []
    }
    this.ensureDb()
    const {
      limit = 3,
      fallbackLimit,
      minImportance = 0
    } = options
    const totalLimit = Math.max(0, fallbackLimit ?? limit ?? 0)
    if (totalLimit === 0) {
      return []
    }
    const searchLimit = limit > 0 ? Math.min(limit, totalLimit) : totalLimit
    const results = []
    const seen = new Set()
    const append = rows => {
      for (const row of rows || []) {
        if (!row || seen.has(row.id)) {
          continue
        }
        results.push(row)
        seen.add(row.id)
        if (results.length >= totalLimit) {
          break
        }
      }
    }

    if (queryText && searchLimit > 0) {
      const searched = this.textSearch(userId, groupId, queryText, searchLimit)
      append(searched)
    }

    if (results.length < totalLimit) {
      const recent = this.listRecentMemories(
        userId,
        groupId,
        Math.max(totalLimit * 2, totalLimit),
        Array.from(seen),
        minImportance
      )
      append(recent)
    }

    return results.slice(0, totalLimit)
  }
}
