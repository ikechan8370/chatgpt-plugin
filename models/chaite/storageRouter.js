import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import {
  ChaiteResponse,
  createPostgresDriver,
  drivers,
  getChaiteTables,
  migrateSqlStorage
} from 'chaite'
import ChatGPTConfig from '../../config/config.js'
import {
  getMemoryDatabase,
  getMemoryOptionalDependencyState,
  getVectorDimension,
  resolvePluginPath
} from '../memory/database.js'

export const StorageRouter = express.Router()

const LOGICAL_DATABASES = ['main', 'history', 'operation_logs']
const MEMORY_TABLES = [
  { name: 'group_facts', label: '群聊事实' },
  { name: 'user_memory', label: '用户记忆' },
  { name: 'vec_group_facts', label: '向量索引' }
]

let migrationJob = null

function safeError (error, secrets = []) {
  let message = error?.message || String(error || '未知错误')
  for (const secret of secrets) {
    if (secret) message = message.replaceAll(String(secret), '******')
  }
  return message
}

function fileSize (filePath) {
  try {
    return fs.statSync(filePath).size
  } catch {
    return 0
  }
}

function sqliteFileSize (filePath) {
  return fileSize(filePath) + fileSize(`${filePath}-wal`) + fileSize(`${filePath}-shm`)
}

function getActiveDrivers () {
  const result = {}
  for (const name of LOGICAL_DATABASES) {
    try {
      result[name] = drivers.get(name)
    } catch {
      // lowdb 模式或尚未初始化时没有 SQL driver
    }
  }
  return result
}

async function countTable (driver, table) {
  if (!driver) return { count: 0, available: false }
  try {
    const row = await driver.get(`SELECT COUNT(*) AS count FROM ${driver.dialect.quoteId(table)}`)
    return { count: Number(row?.count || 0), available: true }
  } catch {
    return { count: 0, available: false }
  }
}

async function collectTableStats (driverMap) {
  const tables = []
  for (const shape of getChaiteTables()) {
    const result = await countTable(driverMap[shape.database], shape.table)
    tables.push({
      database: shape.database,
      table: shape.table,
      count: result.count,
      available: result.available
    })
  }
  return tables
}

async function collectMainStatus () {
  const activeDrivers = getActiveDrivers()
  const main = activeDrivers.main
  const configuredDialect = ChatGPTConfig.chaite?.db?.dialect || 'sqlite'
  const activeDialect = main?.dialect?.name || (ChatGPTConfig.chaite?.storage === 'lowdb' ? 'lowdb' : 'unknown')
  const tables = await collectTableStats(activeDrivers)
  const totalRows = tables.reduce((sum, item) => sum + item.count, 0)
  let size = 0
  let version = ''
  let location = ''

  if (activeDialect === 'sqlite') {
    const paths = [...new Set(Object.values(activeDrivers).map(driver => driver?.dbPath).filter(Boolean))]
    size = paths.reduce((sum, filePath) => sum + sqliteFileSize(filePath), 0)
    location = paths.join('\n')
    try {
      const row = await main.get('SELECT sqlite_version() AS version')
      version = row?.version || ''
    } catch {}
  } else if (activeDialect === 'postgres') {
    try {
      const row = await main.get('SELECT version() AS version, current_database() AS database, pg_database_size(current_database()) AS size')
      version = row?.version || ''
      size = Number(row?.size || 0)
      location = `${ChatGPTConfig.chaite.db?.host || '127.0.0.1'}:${ChatGPTConfig.chaite.db?.port || 5432}/${row?.database || ChatGPTConfig.chaite.db?.database || ''}`
    } catch {}
  }

  return {
    storage: ChatGPTConfig.chaite?.storage || 'sql',
    configuredDialect,
    activeDialect,
    restartRequired: configuredDialect !== activeDialect && activeDialect !== 'unknown' && activeDialect !== 'lowdb',
    healthy: Boolean(main) || activeDialect === 'lowdb',
    version,
    location,
    size,
    totalRows,
    tables
  }
}

async function collectMemoryStatus () {
  const databasePath = resolvePluginPath(ChatGPTConfig.memory?.database || 'data/memory.db')
  const tables = []
  let dimension = ChatGPTConfig.memory?.vectorDimensions || ChatGPTConfig.llm?.dimensions || 1536
  let error = null

  try {
    const db = await getMemoryDatabase()
    for (const table of MEMORY_TABLES) {
      try {
        const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${table.name}`).get()
        tables.push({ ...table, count: Number(row?.count || 0), available: true })
      } catch {
        tables.push({ ...table, count: 0, available: false })
      }
    }
    try {
      dimension = await getVectorDimension()
    } catch {}
  } catch (cause) {
    error = safeError(cause)
    for (const table of MEMORY_TABLES) tables.push({ ...table, count: 0, available: false })
  }

  const latestOptional = getMemoryOptionalDependencyState()
  return {
    engine: 'sqlite',
    databasePath,
    size: sqliteFileSize(databasePath),
    healthy: !error && latestOptional.databaseAvailable,
    error: error || latestOptional.databaseError,
    vectorAvailable: latestOptional.vectorAvailable,
    vectorError: latestOptional.vectorError,
    vectorDimension: dimension,
    tables
  }
}

function normalizePostgresConfig (input = {}) {
  const configured = ChatGPTConfig.chaite?.db || {}
  const pool = { ...(configured.pool || {}), ...(input.pool || {}) }
  return {
    dialect: 'postgres',
    host: input.host ?? configured.host ?? '127.0.0.1',
    port: Number(input.port ?? configured.port ?? 5432),
    database: input.database ?? configured.database ?? '',
    username: input.username ?? configured.username ?? '',
    password: input.password ?? configured.password ?? '',
    ssl: input.ssl ?? configured.ssl ?? false,
    pool
  }
}

function validatePostgresConfig (config) {
  if (!config.database) throw new Error('请填写 Postgres 数据库名')
  if (!config.username) throw new Error('请填写 Postgres 用户名')
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Postgres 端口无效')
}

async function withPostgres (rawConfig, work) {
  const config = normalizePostgresConfig(rawConfig)
  validatePostgresConfig(config)
  const target = await createPostgresDriver(config)
  try {
    await target.ready()
    return await work(target, config)
  } finally {
    await target.close().catch(() => {})
  }
}

function publicJob () {
  if (!migrationJob) return null
  const { targetConfig, ...job } = migrationJob
  return {
    ...job,
    target: targetConfig
      ? `${targetConfig.host}:${targetConfig.port}/${targetConfig.database}`
      : ''
  }
}

async function runMigration (job, targetConfig) {
  let target
  try {
    job.status = 'connecting'
    job.message = '正在连接目标 Postgres'
    target = await createPostgresDriver(targetConfig)
    await target.ready()

    const sourceDrivers = getActiveDrivers()
    const sourceTables = await collectTableStats(sourceDrivers)
    job.totalRows = sourceTables.reduce((sum, item) => sum + item.count, 0)
    job.tables = sourceTables.map(item => ({ ...item, copied: 0, status: item.available ? 'pending' : 'skipped' }))
    job.status = 'running'
    job.message = '正在复制数据'

    const result = await migrateSqlStorage({
      from: database => sourceDrivers[database],
      to: () => target,
      onProgress: progress => {
        const row = job.tables.find(item => item.table === progress.table)
        if (row) {
          row.copied = progress.copied
          row.status = progress.skipped ? 'skipped' : 'done'
          row.reason = progress.reason || ''
        }
        job.completedTables += 1
        job.copiedRows += progress.copied
      }
    })

    const targetMap = { main: target, history: target, operation_logs: target }
    const targetTables = await collectTableStats(targetMap)
    const shortTables = sourceTables.filter(source => {
      const targetRow = targetTables.find(item => item.table === source.table)
      return source.available && (!targetRow?.available || targetRow.count < source.count)
    })
    job.status = shortTables.length ? 'warning' : 'success'
    job.message = shortTables.length
      ? `复制完成，但有 ${shortTables.length} 张表的目标行数偏少`
      : `迁移完成，共处理 ${result.total} 行`
    job.targetTables = targetTables
  } catch (error) {
    job.status = 'failed'
    job.message = safeError(error, [targetConfig.password])
    logger.error('[Storage] migration failed:', error)
  } finally {
    job.finishedAt = new Date().toISOString()
    await target?.close().catch(() => {})
  }
}

StorageRouter.get('/status', async (req, res) => {
  try {
    const [main, memory] = await Promise.all([collectMainStatus(), collectMemoryStatus()])
    res.status(200).json(ChaiteResponse.ok({ main, memory }))
  } catch (error) {
    logger.error('[Storage] failed to collect status:', error)
    res.status(500).json(ChaiteResponse.fail(null, safeError(error)))
  }
})

StorageRouter.post('/test', async (req, res) => {
  try {
    const dialect = req.body?.dialect || 'postgres'
    if (dialect === 'sqlite') {
      const driver = getActiveDrivers().main
      if (!driver || driver.dialect.name !== 'sqlite') throw new Error('当前运行的不是 SQLite，请保存配置并重启后再检查')
      const row = await driver.get('SELECT sqlite_version() AS version')
      res.status(200).json(ChaiteResponse.ok({ dialect, version: row?.version || '' }))
      return
    }
    const result = await withPostgres(req.body?.db, async driver => {
      const row = await driver.get('SELECT version() AS version, current_database() AS database')
      return { dialect: 'postgres', version: row?.version || '', database: row?.database || '' }
    })
    res.status(200).json(ChaiteResponse.ok(result))
  } catch (error) {
    const password = req.body?.db?.password
    res.status(400).json(ChaiteResponse.fail(null, safeError(error, [password])))
  }
})

StorageRouter.post('/migration/preview', async (req, res) => {
  try {
    const sourceDrivers = getActiveDrivers()
    if (sourceDrivers.main?.dialect?.name !== 'sqlite') throw new Error('只能从当前正在运行的 SQLite 迁移到 Postgres')
    const sourceTables = await collectTableStats(sourceDrivers)
    const target = await withPostgres(req.body?.db, async driver => {
      const tableMap = { main: driver, history: driver, operation_logs: driver }
      return await collectTableStats(tableMap)
    })
    res.status(200).json(ChaiteResponse.ok({
      source: sourceTables,
      target,
      totalRows: sourceTables.reduce((sum, item) => sum + item.count, 0)
    }))
  } catch (error) {
    res.status(400).json(ChaiteResponse.fail(null, safeError(error, [req.body?.db?.password])))
  }
})

StorageRouter.get('/migration', (req, res) => {
  res.status(200).json(ChaiteResponse.ok(publicJob()))
})

StorageRouter.post('/migration/start', async (req, res) => {
  try {
    const sourceDrivers = getActiveDrivers()
    if (sourceDrivers.main?.dialect?.name !== 'sqlite') throw new Error('只能从当前正在运行的 SQLite 迁移到 Postgres')
    if (migrationJob && ['connecting', 'running'].includes(migrationJob.status)) throw new Error('已有迁移任务在运行')
    if (req.body?.acceptLiveWriteRisk !== true) throw new Error('请先确认迁移期间应暂停对话写入')
    const targetConfig = normalizePostgresConfig(req.body?.db)
    validatePostgresConfig(targetConfig)
    migrationJob = {
      id: `${Date.now()}`,
      status: 'queued',
      message: '等待开始',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      completedTables: 0,
      copiedRows: 0,
      totalRows: 0,
      tables: [],
      targetTables: [],
      targetConfig
    }
    void runMigration(migrationJob, targetConfig)
    // Chaite 前端的统一请求层当前只把 200 视为业务成功。
    res.status(200).json(ChaiteResponse.ok(publicJob()))
  } catch (error) {
    res.status(400).json(ChaiteResponse.fail(null, safeError(error, [req.body?.db?.password])))
  }
})
