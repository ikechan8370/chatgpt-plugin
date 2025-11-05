import { getMemoryDatabase } from './database.js'

function normaliseGroupId (groupId) {
  if (groupId === null || groupId === undefined) {
    return null
  }
  const str = String(groupId).trim()
  return str || null
}

export class GroupHistoryCursorStore {
  constructor (db = getMemoryDatabase()) {
    this.resetDatabase(db)
  }

  resetDatabase (db = getMemoryDatabase()) {
    this.db = db
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

  ensureDb () {
    if (!this.db || this.db.open === false) {
      logger?.debug?.('[Memory] refreshing group history cursor database connection')
      this.resetDatabase()
    }
    return this.db
  }

  getCursor (groupId) {
    const gid = normaliseGroupId(groupId)
    if (!gid) return null
    this.ensureDb()
    return this.selectStmt.get(gid) || null
  }

  updateCursor (groupId, { lastMessageId = null, lastTimestamp = null } = {}) {
    const gid = normaliseGroupId(groupId)
    if (!gid) return false
    this.ensureDb()
    const payload = {
      group_id: gid,
      last_message_id: lastMessageId ? String(lastMessageId) : null,
      last_timestamp: (typeof lastTimestamp === 'number' && Number.isFinite(lastTimestamp)) ? Math.floor(lastTimestamp) : null
    }
    this.upsertStmt.run(payload)
    return true
  }
}

export const groupHistoryCursorStore = new GroupHistoryCursorStore()
