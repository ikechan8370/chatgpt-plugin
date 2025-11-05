import { getMemoryDatabase, getVectorDimension, getGroupMemoryFtsConfig, resetVectorTableDimension, sanitiseFtsQueryInput } from './database.js'
import ChatGPTConfig from '../../config/config.js'
import { embedTexts } from '../chaite/vectorizer.js'

function toJSONString (value) {
  if (!value) {
    return '[]'
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function toVectorBuffer (vector) {
  if (!vector) {
    return null
  }
  if (vector instanceof Float32Array) {
    return Buffer.from(vector.buffer)
  }
  if (ArrayBuffer.isView(vector)) {
    return Buffer.from(new Float32Array(vector).buffer)
  }
  return Buffer.from(new Float32Array(vector).buffer)
}

function normaliseEmbeddingVector (vector) {
  if (!vector) {
    return null
  }
  if (Array.isArray(vector)) {
    return vector
  }
  if (ArrayBuffer.isView(vector)) {
    return Array.from(vector)
  }
  if (typeof vector === 'object') {
    if (Array.isArray(vector.embedding)) {
      return vector.embedding
    }
    if (ArrayBuffer.isView(vector.embedding)) {
      return Array.from(vector.embedding)
    }
    if (Array.isArray(vector.vector)) {
      return vector.vector
    }
    if (ArrayBuffer.isView(vector.vector)) {
      return Array.from(vector.vector)
    }
  }
  return null
}

function normaliseGroupId (groupId) {
  return groupId === null || groupId === undefined ? null : String(groupId)
}

export class GroupMemoryStore {
  constructor (db = getMemoryDatabase()) {
    this.resetDatabase(db)
  }

  resetDatabase (db = getMemoryDatabase()) {
    this.db = db
    this.insertFactStmt = this.db.prepare(`
      INSERT INTO group_facts (group_id, fact, topic, importance, source_message_ids, source_messages, involved_users)
      VALUES (@group_id, @fact, @topic, @importance, @source_message_ids, @source_messages, @involved_users)
      ON CONFLICT(group_id, fact) DO UPDATE SET
        topic = excluded.topic,
        importance = excluded.importance,
        source_message_ids = excluded.source_message_ids,
        source_messages = excluded.source_messages,
        involved_users = excluded.involved_users,
        created_at = CASE
          WHEN excluded.importance > group_facts.importance THEN datetime('now')
          ELSE group_facts.created_at
        END
    `)
    this.prepareVectorStatements()
    this.loadFactByIdStmt = this.db.prepare('SELECT * FROM group_facts WHERE id = ?')
  }

  prepareVectorStatements () {
    try {
      this.deleteVecStmt = this.db.prepare('DELETE FROM vec_group_facts WHERE rowid = ?')
      this.insertVecStmt = this.db.prepare('INSERT INTO vec_group_facts(rowid, embedding) VALUES (?, ?)')
    } catch (err) {
      this.deleteVecStmt = null
      this.insertVecStmt = null
      logger?.debug?.('[Memory] vector table not ready, postpone statement preparation')
    }
  }

  ensureDb () {
    if (!this.db || this.db.open === false) {
      logger?.debug?.('[Memory] refreshing group memory database connection')
      this.resetDatabase()
    }
    return this.db
  }

  get embeddingModel () {
    return ChatGPTConfig.llm?.embeddingModel || ''
  }

  get retrievalMode () {
    const mode = ChatGPTConfig.memory?.group?.retrievalMode || 'hybrid'
    const lowered = String(mode).toLowerCase()
    if (['vector', 'keyword', 'hybrid'].includes(lowered)) {
      return lowered
    }
    return 'hybrid'
  }

  get hybridPrefer () {
    const prefer = ChatGPTConfig.memory?.group?.hybridPrefer || 'vector-first'
    return prefer === 'keyword-first' ? 'keyword-first' : 'vector-first'
  }

  isVectorEnabled () {
    return Boolean(this.embeddingModel)
  }

  get vectorDistanceThreshold () {
    const value = Number(ChatGPTConfig.memory?.group?.vectorMaxDistance)
    if (Number.isFinite(value) && value > 0) {
      return value
    }
    return null
  }

  get bm25Threshold () {
    const value = Number(ChatGPTConfig.memory?.group?.textMaxBm25Score)
    if (Number.isFinite(value) && value > 0) {
      return value
    }
    return null
  }

  async saveFacts (groupId, facts) {
    if (!facts || facts.length === 0) {
      return []
    }
    this.ensureDb()
    const normGroupId = normaliseGroupId(groupId)
    const filteredFacts = facts
      .map(f => {
        const rawFact = typeof f.fact === 'string' ? f.fact : (Array.isArray(f.fact) ? f.fact.join(' ') : String(f.fact || ''))
        const rawTopic = typeof f.topic === 'string' ? f.topic : (f.topic === undefined || f.topic === null ? '' : String(f.topic))
        const rawSourceMessages = f.source_messages ?? f.sourceMessages ?? ''
        const sourceMessages = Array.isArray(rawSourceMessages)
          ? rawSourceMessages.map(item => (item === null || item === undefined) ? '' : String(item)).filter(Boolean).join('\n')
          : (typeof rawSourceMessages === 'string' ? rawSourceMessages : String(rawSourceMessages || ''))
        return {
          fact: rawFact.trim(),
          topic: rawTopic.trim(),
          importance: typeof f.importance === 'number' ? f.importance : Number(f.importance) || 0.5,
          source_message_ids: toJSONString(f.source_message_ids || f.sourceMessages),
          source_messages: sourceMessages,
          involved_users: toJSONString(f.involved_users || f.involvedUsers || [])
        }
      })
      .filter(item => item.fact)

    if (filteredFacts.length === 0) {
      return []
    }

    let vectors = []
    let tableDimension = getVectorDimension() || 0
    const configuredDimension = Number(ChatGPTConfig.llm?.dimensions || 0)
    if (this.isVectorEnabled()) {
      try {
        const preferredDimension = configuredDimension > 0
          ? configuredDimension
          : (tableDimension > 0 ? tableDimension : undefined)
        vectors = await embedTexts(filteredFacts.map(f => f.fact), this.embeddingModel, preferredDimension)
        vectors = vectors.map(normaliseEmbeddingVector)
        const mismatchVector = vectors.find(vec => {
          if (!vec) return false
          if (Array.isArray(vec)) return vec.length > 0
          if (ArrayBuffer.isView(vec) && typeof vec.length === 'number') {
            return vec.length > 0
          }
          return false
        })
        const actualDimension = mismatchVector ? mismatchVector.length : 0
        if (actualDimension && actualDimension !== tableDimension) {
          const expectedDimension = tableDimension || preferredDimension || configuredDimension || 'unknown'
          logger.warn(`[Memory] embedding dimension mismatch, expected=${expectedDimension}, actual=${actualDimension}. Recreating vector table.`)
          try {
            resetVectorTableDimension(actualDimension)
            this.prepareVectorStatements()
            tableDimension = actualDimension
          } catch (resetErr) {
            logger.error('Failed to reset vector table dimension:', resetErr)
            vectors = []
          }
        } else if (actualDimension && tableDimension <= 0) {
          try {
            resetVectorTableDimension(actualDimension)
            this.prepareVectorStatements()
            tableDimension = actualDimension
          } catch (resetErr) {
            logger.error('Failed to initialise vector table dimension:', resetErr)
            vectors = []
          }
        }
      } catch (err) {
        logger.error('Failed to embed group facts:', err)
        vectors = []
      }
    }

    const transaction = this.db.transaction((items, vectorList) => {
      const saved = []
      for (let i = 0; i < items.length; i++) {
        const payload = {
          group_id: normGroupId,
          ...items[i]
        }
        const info = this.insertFactStmt.run(payload)
        let factId = Number(info.lastInsertRowid)
        if (!factId) {
          const existing = this.db.prepare('SELECT id FROM group_facts WHERE group_id = ? AND fact = ?').get(normGroupId, payload.fact)
          factId = existing?.id
        }
        factId = Number.parseInt(String(factId ?? ''), 10)
        if (!Number.isSafeInteger(factId)) {
          logger.warn('[Memory] skip fact vector upsert due to invalid fact id', factId)
          continue
        }
        if (!factId) {
          continue
        }
        if (Array.isArray(vectorList) && vectorList[i]) {
          if (!this.deleteVecStmt || !this.insertVecStmt) {
            this.prepareVectorStatements()
          }
          if (!this.deleteVecStmt || !this.insertVecStmt) {
            logger.warn('[Memory] vector table unavailable, skip vector upsert')
            continue
          }
          try {
            const vector = normaliseEmbeddingVector(vectorList[i])
            if (!vector) {
              continue
            }
            let embeddingArray
            if (ArrayBuffer.isView(vector)) {
              if (vector instanceof Float32Array) {
                embeddingArray = vector
              } else {
                embeddingArray = new Float32Array(vector.length)
                for (let idx = 0; idx < vector.length; idx++) {
                  embeddingArray[idx] = Number(vector[idx])
                }
              }
            } else {
              embeddingArray = Float32Array.from(vector)
            }
            const rowId = BigInt(factId)
            logger.debug(`[Memory] upserting vector for fact ${factId}, rowIdType=${typeof rowId}`)
            this.deleteVecStmt.run(rowId)
            this.insertVecStmt.run(rowId, embeddingArray)
          } catch (error) {
            logger.error(`Failed to upsert vector for fact ${factId}:`, error)
          }
        }
        saved.push(this.loadFactByIdStmt.get(factId))
      }
      return saved
    })

    return transaction(filteredFacts, vectors)
  }

  listFacts (groupId, limit = 50, offset = 0) {
    return this.db.prepare(`
      SELECT * FROM group_facts
      WHERE group_id = ?
      ORDER BY importance DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(normaliseGroupId(groupId), limit, offset)
  }

  deleteFact (groupId, factId) {
    this.ensureDb()
    const normGroupId = normaliseGroupId(groupId)
    const fact = this.db.prepare('SELECT id FROM group_facts WHERE id = ? AND group_id = ?').get(factId, normGroupId)
    if (!fact) {
      return false
    }
    this.db.prepare('DELETE FROM group_facts WHERE id = ?').run(factId)
    try {
      this.deleteVecStmt.run(BigInt(factId))
    } catch (err) {
      logger?.warn?.(`[Memory] failed to delete vector for fact ${factId}:`, err)
    }
    return true
  }

  async vectorSearch (groupId, queryText, limit) {
    this.ensureDb()
    if (!this.isVectorEnabled()) {
      return []
    }
    try {
      let tableDimension = getVectorDimension() || 0
      if (!tableDimension || tableDimension <= 0) {
        logger.debug('[Memory] vector table dimension unavailable, attempting to infer from embedding')
      }
      const requestedDimension = tableDimension > 0 ? tableDimension : undefined
      const [embedding] = await embedTexts([queryText], this.embeddingModel, requestedDimension)
      if (!embedding) {
        return []
      }
      const embeddingVector = ArrayBuffer.isView(embedding) ? embedding : Float32Array.from(embedding)
      const actualDimension = embeddingVector.length
      if (!actualDimension) {
        logger.debug('[Memory] vector search skipped: empty embedding returned')
        return []
      }
      if (tableDimension > 0 && actualDimension !== tableDimension) {
        logger.warn(`[Memory] vector dimension mismatch detected during search, table=${tableDimension}, embedding=${actualDimension}. Rebuilding vector table.`)
        try {
          resetVectorTableDimension(actualDimension)
          this.prepareVectorStatements()
          tableDimension = actualDimension
        } catch (resetErr) {
          logger.error('Failed to reset vector table dimension during search:', resetErr)
          return []
        }
        logger.info('[Memory] vector table rebuilt; old vectors must be regenerated before vector search can return results')
        return []
      } else if (tableDimension <= 0 && actualDimension > 0) {
        try {
          resetVectorTableDimension(actualDimension)
          this.prepareVectorStatements()
          tableDimension = actualDimension
        } catch (resetErr) {
          logger.error('Failed to initialise vector table dimension during search:', resetErr)
          return []
        }
      }
      const rows = this.db.prepare(`
        SELECT gf.*, vec_group_facts.distance AS distance
        FROM vec_group_facts
        JOIN group_facts gf ON gf.id = vec_group_facts.rowid
        WHERE gf.group_id = ?
          AND vec_group_facts.embedding MATCH ?
          AND vec_group_facts.k = ${limit}
        ORDER BY distance ASC
      `).all(groupId, embeddingVector)
      const threshold = this.vectorDistanceThreshold
      if (!threshold) {
        return rows
      }
      return rows.filter(row => typeof row?.distance === 'number' && row.distance <= threshold)
    } catch (err) {
      logger.warn('Vector search failed for group memory:', err)
      return []
    }
  }

  textSearch (groupId, queryText, limit) {
    this.ensureDb()
    if (!queryText || !queryText.trim()) {
      return []
    }
    const originalQuery = queryText.trim()
    const ftsConfig = getGroupMemoryFtsConfig()
    const matchQueryParam = sanitiseFtsQueryInput(originalQuery, ftsConfig)
    const results = []
    const seen = new Set()
    if (matchQueryParam) {
      const matchExpression = ftsConfig.matchQuery ? `${ftsConfig.matchQuery}(?)` : '?'
      try {
        const rows = this.db.prepare(`
          SELECT gf.*, bm25(group_facts_fts) AS bm25_score
          FROM group_facts_fts
          JOIN group_facts gf ON gf.id = group_facts_fts.rowid
          WHERE gf.group_id = ?
            AND group_facts_fts MATCH ${matchExpression}
          ORDER BY bm25_score ASC
          LIMIT ?
        `).all(groupId, matchQueryParam, limit)
        for (const row of rows) {
          const bm25Threshold = this.bm25Threshold
          if (bm25Threshold) {
            const score = Number(row?.bm25_score)
            if (!Number.isFinite(score) || score > bm25Threshold) {
              continue
            }
            row.bm25_score = score
          }
          if (row && !seen.has(row.id)) {
            results.push(row)
            seen.add(row.id)
          }
        }
      } catch (err) {
        logger.warn('Text search failed for group memory:', err)
      }
    } else {
      logger.debug('[Memory] group memory text search skipped MATCH due to empty query after sanitisation')
    }

    if (results.length < limit) {
      try {
        const likeRows = this.db.prepare(`
          SELECT *
          FROM group_facts
          WHERE group_id = ?
            AND instr(fact, ?) > 0
          ORDER BY importance DESC, created_at DESC
          LIMIT ?
        `).all(groupId, originalQuery, Math.max(limit * 2, limit))
        for (const row of likeRows) {
          if (row && !seen.has(row.id)) {
            results.push(row)
            seen.add(row.id)
            if (results.length >= limit) {
              break
            }
          }
        }
      } catch (err) {
        logger.warn('LIKE fallback failed for group memory:', err)
      }
    }

    return results.slice(0, limit)
  }

  importanceFallback (groupId, limit, minImportance, excludeIds = []) {
    this.ensureDb()
    const ids = excludeIds.filter(Boolean)
    const notInClause = ids.length ? `AND id NOT IN (${ids.map(() => '?').join(',')})` : ''
    const stmt = this.db.prepare(`
      SELECT * FROM group_facts
      WHERE group_id = ?
        AND importance >= ?
        ${notInClause}
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `)
    const params = [groupId, minImportance]
    if (ids.length) {
      params.push(...ids)
    }
    params.push(limit)
    return stmt.all(...params)
  }

  /**
   * 获取相关群记忆，支持向量/文本/混合检索
   * @param {string} groupId
   * @param {string} queryText
   * @param {{ limit?: number, minImportance?: number }} options
   * @returns {Promise<Array<{fact: string, topic: string, importance: number, created_at: string}>>}
   */
  async queryRelevantFacts (groupId, queryText, options = {}) {
    const { limit = 5, minImportance = 0 } = options
    const normGroupId = normaliseGroupId(groupId)
    if (!queryText) {
      return this.listFacts(normGroupId, limit)
    }

    const mode = this.retrievalMode
    const combined = []
    const seen = new Set()
    const append = rows => {
      for (const row of rows) {
        if (!row || seen.has(row.id)) {
          continue
        }
        combined.push(row)
        seen.add(row.id)
        if (combined.length >= limit) {
          break
        }
      }
    }

    const preferVector = this.hybridPrefer !== 'keyword-first'

    if (mode === 'vector' || mode === 'hybrid') {
      const vectorRows = await this.vectorSearch(normGroupId, queryText, limit)
      if (mode === 'vector') {
        append(vectorRows)
      } else if (preferVector) {
        append(vectorRows)
        if (combined.length < limit) {
          append(this.textSearch(normGroupId, queryText, limit))
        }
      } else {
        append(this.textSearch(normGroupId, queryText, limit))
        if (combined.length < limit) {
          append(vectorRows)
        }
      }
    } else if (mode === 'keyword') {
      append(this.textSearch(normGroupId, queryText, limit))
    }

    if (combined.length < limit) {
      const fallback = this.importanceFallback(normGroupId, limit - combined.length, minImportance, Array.from(seen))
      append(fallback)
    }

    return combined.slice(0, limit)
  }
}
