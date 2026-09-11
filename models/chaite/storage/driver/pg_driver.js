import { createDialect } from './dialect.js'
import { toDollarPlaceholders } from './placeholders.js'

function log (level, message) {
  const target = globalThis.logger?.[level]
  if (typeof target === 'function') target.call(globalThis.logger, message)
}

/**
 * Postgres driver。
 *
 * 和 SQLite 那边最大的不同：这里不需要写者队列。SQLite 全库只有一个写锁，所以
 * runtime.js 要自己把写入串起来；Postgres 有 MVCC 和真正的连接池，串行化反而会
 * 白白限制吞吐。所以并发控制整个交给 pg.Pool。
 *
 * SQL 仍按 `?` 书写，在这里统一翻译成 $1..$n，storage 层不用关心方言。
 */
export class PgDriver {
  /**
   * @param {object} options 见 config/config.js 的 chaite.db
   * @param {import('pg').Pool} pool
   */
  constructor (options, pool) {
    this.dialect = createDialect('postgres')
    this.options = options
    this.pool = pool
    this.slowQueryMs = options.slowQueryMs ?? 500
    this.closed = false
  }

  get name () { return `postgres:${this.options.database}` }

  async ready () {
    const client = await this.pool.connect()
    client.release()
  }

  async _query (sql, params) {
    const startedAt = Date.now()
    try {
      return await this.pool.query(toDollarPlaceholders(sql), params)
    } finally {
      const duration = Date.now() - startedAt
      if (duration >= this.slowQueryMs) {
        log('warn', `[pg] slow query ${duration}ms: ${sql.trim().slice(0, 120)}`)
      }
    }
  }

  async get (sql, params = []) {
    const result = await this._query(sql, params)
    return result.rows[0]
  }

  async all (sql, params = []) {
    const result = await this._query(sql, params)
    return result.rows
  }

  /**
   * lastID 只在显式写了 RETURNING id 时才有值。SQLite 的 this.lastID 在
   * Postgres 没有对应物，调用方不该依赖它——目前也确实没有依赖。
   * @returns {Promise<{changes: number, lastID?: number|string}>}
   */
  async run (sql, params = []) {
    const result = await this._query(sql, params)
    return {
      changes: result.rowCount ?? 0,
      lastID: result.rows?.[0]?.id
    }
  }

  async exec (sql) {
    // exec 用于跑建表之类的多语句脚本，本身不带参数，所以不翻译占位符
    await this.pool.query(sql)
  }

  async transaction (work) {
    const client = await this.pool.connect()
    const run = async (sql, params = []) => {
      const result = await client.query(toDollarPlaceholders(sql), params)
      return { changes: result.rowCount ?? 0, lastID: result.rows?.[0]?.id }
    }
    const get = async (sql, params = []) => (await client.query(toDollarPlaceholders(sql), params)).rows[0]
    const all = async (sql, params = []) => (await client.query(toDollarPlaceholders(sql), params)).rows
    try {
      await client.query('BEGIN')
      const result = await work({ get, all, run })
      await client.query('COMMIT')
      return result
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        log('warn', `[pg] rollback failed: ${rollbackError.message}`)
      }
      throw error
    } finally {
      client.release()
    }
  }

  async close () {
    if (this.closed) return
    this.closed = true
    await this.pool.end()
  }
}

/**
 * pg 是可选依赖，只有真的选了 postgres 才需要装。
 */
export async function createPgDriver (options) {
  let pg
  try {
    pg = (await import('pg')).default
  } catch (error) {
    throw new Error(
      '使用 postgres 存储需要先安装 pg：pnpm add pg\n' +
      `原始错误：${error.message}`
    )
  }
  const pool = new pg.Pool({
    host: options.host || '127.0.0.1',
    port: options.port || 5432,
    database: options.database,
    user: options.username,
    password: options.password,
    max: options.pool?.max ?? 10,
    idleTimeoutMillis: options.pool?.idle ?? 10000,
    connectionTimeoutMillis: options.pool?.acquire ?? 30000,
    ssl: options.ssl || false
  })
  pool.on('error', error => log('error', `[pg] idle client error: ${error.message}`))
  const driver = new PgDriver(options, pool)
  await driver.ready()
  return driver
}
