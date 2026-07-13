import { getMemoryDatabase } from './database.js'

function normaliseGroupId (groupId) {
  if (groupId === null || groupId === undefined) {
    return null
  }
  const str = String(groupId).trim()
  return str || null
}

export class GroupHistoryCursorStore {
  constructor (db = null) {
    this.resetDatabase(db)
  }

  resetDatabase (db = null) {
    this.db = db
    if (!this.db) {
      this.selectStmt = null
      this.upsertStmt = null
      return
    }
    this.selectStmt = this.db.prepare(`
      SELECT last_message_id, last_timestamp
      FROM group_history_cursor
      WHERE group_id = ?
    `)
    this.upsertStmt = this.db.prepare(`
      INSERT INTO group_history_cursor (group_id, last_message_id, last_timestamp)
      VALUES (@group_id, @last_message_id, @last_timestamp)
      ON CONFLICT(group_id) DO UPDATE SET
        last_message_id = excluded.last_message_id,
        last_timestamp = excluded.last_timestamp
    `)
  }

  async ensureDb () {
    if (!this.db || this.db.open === false) {
      logger?.debug?.('[Memory] refreshing group history cursor database connection')
      this.resetDatabase(await getMemoryDatabase())
    }
    return this.db
  }

  async getCursor (groupId) {
    const gid = normaliseGroupId(groupId)
    if (!gid) return null
    try {
      await this.ensureDb()
      return await this.selectStmt.get(gid) || null
    } catch (err) {
      logger?.warn?.('[Memory] group history cursor unavailable:', err?.message || err)
      return null
    }
  }

  async updateCursor (groupId, { lastMessageId = null, lastTimestamp = null } = {}) {
    const gid = normaliseGroupId(groupId)
    if (!gid) return false
    try {
      await this.ensureDb()
      const payload = {
        group_id: gid,
        last_message_id: lastMessageId ? String(lastMessageId) : null,
        last_timestamp: (typeof lastTimestamp === 'number' && Number.isFinite(lastTimestamp)) ? Math.floor(lastTimestamp) : null
      }
      await this.upsertStmt.run(payload)
      return true
    } catch (err) {
      logger?.warn?.('[Memory] failed to update group history cursor:', err?.message || err)
      return false
    }
  }
}

export const groupHistoryCursorStore = new GroupHistoryCursorStore()
