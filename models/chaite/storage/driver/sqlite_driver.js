import path from 'path'
import { openSQLiteDatabase } from '../sqlite/runtime.js'
import { createDialect } from './dialect.js'

/**
 * SQLite driver：在现有 runtime.js 之上套一层统一接口。
 *
 * runtime.js 本身不动——单写者优先级队列、独立 reader 连接、SQLITE_BUSY 重试、
 * WAL checkpoint、VACUUM 那套都是为 SQLite 量身写的，换成别的库反而是退步。
 * 这里只负责把它的方法名对齐到 driver 契约上。
 */
export class SqliteDriver {
  /**
   * @param {string} dbPath
   */
  constructor (dbPath) {
    this.dialect = createDialect('sqlite')
    this.dbPath = path.resolve(dbPath)
    this.handle = openSQLiteDatabase(this.dbPath)
    this.closed = false
  }

  get name () { return `sqlite:${path.basename(this.dbPath)}` }

  async ready () {
    await this.handle.ready
  }

  get (sql, params = []) {
    return this.handle.getAsync(sql, params)
  }

  all (sql, params = []) {
    return this.handle.allAsync(sql, params)
  }

  /**
   * @returns {Promise<{changes: number, lastID?: number|string}>}
   */
  run (sql, params = [], options = {}) {
    return this.handle.runAsync(sql, params, options)
  }

  exec (sql, options = {}) {
    return this.handle.execAsync(sql, options)
  }

  /**
   * work 收到 {get, all, run}，与顶层方法同形。
   */
  transaction (work, options = {}) {
    return this.handle.transaction(async tx => work({
      get: (sql, params = []) => tx.get(sql, params),
      all: (sql, params = []) => tx.all(sql, params),
      run: (sql, params = []) => tx.run(sql, params)
    }), options)
  }

  async close () {
    if (this.closed) return
    this.closed = true
    await new Promise((resolve, reject) => this.handle.close(error => error ? reject(error) : resolve()))
  }
}
