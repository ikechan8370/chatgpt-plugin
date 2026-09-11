import fs from 'fs'
import path from 'path'
import { SqliteDriver } from 'chaite'

const MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS _sqlite_migrations (
    name TEXT PRIMARY KEY,
    completedAt TEXT NOT NULL,
    sourceRowId INTEGER NOT NULL DEFAULT 0
  )
`

const SPLIT_TABLES = [
  {
    name: 'history',
    marker: 'split-history-from-data-v1',
    columns: ['id', 'parentId', 'conversationId', 'role', 'messageData', 'createdAt'],
    schema: `
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        parentId TEXT,
        conversationId TEXT,
        role TEXT,
        messageData TEXT,
        createdAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_history_conversation ON history(conversationId);
      CREATE INDEX IF NOT EXISTS idx_history_parent ON history(parentId);
    `
  },
  {
    name: 'operation_logs',
    marker: 'split-operation-logs-from-data-v1',
    columns: ['id', 'timestamp', 'type', 'level', 'userId', 'groupId', 'channelId', 'model', 'presetId', 'payload'],
    defaults: { timestamp: '0', type: "'unknown'", level: "'info'", payload: "'{}'" },
    schema: `
      CREATE TABLE IF NOT EXISTS operation_logs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        level TEXT NOT NULL,
        userId TEXT,
        groupId TEXT,
        channelId TEXT,
        model TEXT,
        presetId TEXT,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_operation_logs_time ON operation_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_operation_logs_user ON operation_logs(userId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_operation_logs_group ON operation_logs(groupId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_operation_logs_channel ON operation_logs(channelId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_operation_logs_type ON operation_logs(type, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_operation_logs_retention ON operation_logs(timestamp ASC, id ASC);
    `
  }
]

async function close (driver) {
  await driver.close()
}

async function migrateTable (source, target, definition, batchSize) {
  await target.exec(`${definition.schema};${MIGRATION_TABLE_SQL}`, { label: `initialize ${definition.name} migration` })
  const migrationColumns = await target.all('PRAGMA table_info(_sqlite_migrations)')
  if (!migrationColumns.some(column => column.name === 'sourceRowId')) {
    await target.run('ALTER TABLE _sqlite_migrations ADD COLUMN sourceRowId INTEGER NOT NULL DEFAULT 0')
  }
  const completed = await target.get('SELECT sourceRowId FROM _sqlite_migrations WHERE name = ?', [definition.marker])

  const exists = await source.get('SELECT 1 FROM sqlite_master WHERE type = \'table\' AND name = ?', [definition.name])
  if (!exists) {
    await target.run('INSERT OR REPLACE INTO _sqlite_migrations(name, completedAt, sourceRowId) VALUES (?, ?, ?)', [definition.marker, new Date().toISOString(), 0])
    return 0
  }

  const quotedColumns = definition.columns.map(column => `"${column}"`).join(', ')
  const sourceColumns = new Set((await source.all(`PRAGMA table_info("${definition.name}")`)).map(column => column.name))
  const sourceSelect = definition.columns.map(column => sourceColumns.has(column)
    ? `"${column}"`
    : `${definition.defaults?.[column] || 'NULL'} AS "${column}"`).join(', ')
  const placeholders = definition.columns.map(() => '?').join(', ')
  let cursor = Number(completed?.sourceRowId || 0)
  const sourceState = await source.get(`SELECT MAX(rowid) AS maxRowId FROM "${definition.name}"`)
  if (Number(sourceState?.maxRowId || 0) < cursor) cursor = 0
  const pendingState = await source.get(`SELECT COUNT(*) AS count FROM "${definition.name}" WHERE rowid > ?`, [cursor])
  const pendingRows = Number(pendingState?.count || 0)
  if (pendingRows === 0) {
    await target.run('INSERT OR REPLACE INTO _sqlite_migrations(name, completedAt, sourceRowId) VALUES (?, ?, ?)', [definition.marker, new Date().toISOString(), cursor])
    return 0
  }
  globalThis.logger?.info?.(`[SQLite migration] migrating ${definition.name}: ${pendingRows} rows pending, batchSize=${batchSize}`)
  let copied = 0
  let lastInfoAt = Date.now()
  let nextInfoRows = Math.min(10000, pendingRows)
  while (true) {
    const rows = await source.all(
      `SELECT rowid AS _migrationRowId, ${sourceSelect} FROM "${definition.name}" WHERE rowid > ? ORDER BY rowid LIMIT ?`,
      [cursor, batchSize]
    )
    if (rows.length === 0) break
    await target.transaction(async transaction => {
      for (const row of rows) {
        await transaction.run(
          `INSERT OR IGNORE INTO "${definition.name}" (${quotedColumns}) VALUES (${placeholders})`,
          definition.columns.map(column => row[column])
        )
      }
      await transaction.run(
        'INSERT OR REPLACE INTO _sqlite_migrations(name, completedAt, sourceRowId) VALUES (?, ?, ?)',
        [definition.marker, new Date().toISOString(), rows.at(-1)._migrationRowId]
      )
    }, { priority: 'low', label: `migrate ${definition.name} batch` })
    cursor = rows.at(-1)._migrationRowId
    copied += rows.length
    globalThis.logger?.debug?.(`[SQLite migration] copied ${copied} legacy ${definition.name} rows`)
    const now = Date.now()
    if (copied >= nextInfoRows || copied >= pendingRows || now - lastInfoAt >= 5000) {
      const percent = Math.min(100, Math.floor(copied / pendingRows * 100))
      globalThis.logger?.info?.(`[SQLite migration] ${definition.name}: ${copied}/${pendingRows} rows (${percent}%)`)
      lastInfoAt = now
      nextInfoRows = Math.min(pendingRows, copied + 10000)
    }
    await new Promise(resolve => setImmediate(resolve))
  }

  await target.run('INSERT OR REPLACE INTO _sqlite_migrations(name, completedAt, sourceRowId) VALUES (?, ?, ?)', [definition.marker, new Date().toISOString(), cursor])
  globalThis.logger?.info?.(`[SQLite migration] ${definition.name} migration completed: ${copied} rows copied`)
  return copied
}

/**
 * Idempotently copy legacy high-write tables out of data.db. Legacy tables are
 * intentionally retained as a rollback-compatible backup.
 */
export async function migrateSplitSQLiteDatabases (dataDirectory, { batchSize = 500 } = {}) {
  const corePath = path.join(dataDirectory, 'data.db')
  if (!fs.existsSync(corePath)) return { history: 0, operation_logs: 0 }

  // 这里刻意自己开连接而不用 driver 注册表：拆库必须在注册表打开这些文件之前
  // 完成，跑完就地关掉。
  const source = new SqliteDriver(corePath)
  const targets = {
    history: new SqliteDriver(path.join(dataDirectory, 'history.db')),
    operation_logs: new SqliteDriver(path.join(dataDirectory, 'operation_logs.db'))
  }
  await Promise.all([source.ready(), ...Object.values(targets).map(target => target.ready())])
  const result = {}
  try {
    for (const definition of SPLIT_TABLES) {
      result[definition.name] = await migrateTable(source, targets[definition.name], definition, batchSize)
    }
  } finally {
    await Promise.allSettled([close(source), ...Object.values(targets).map(close)])
  }
  if (result.history || result.operation_logs) {
    globalThis.logger?.info?.(`[SQLite migration] split completed: history=${result.history}, operation_logs=${result.operation_logs}; legacy tables retained in data.db`)
  }
  return result
}
