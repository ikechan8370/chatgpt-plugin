import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

const runtimes = new Map()

function log (level, message, ...args) {
  const target = globalThis.logger?.[level]
  if (typeof target === 'function') target.call(globalThis.logger, message, ...args)
}

function normalizeCallArgs (params, callback) {
  if (typeof params === 'function') return { params: [], callback: params }
  return { params: params ?? [], callback: typeof callback === 'function' ? callback : () => {} }
}

function openNativeDatabase (dbPath, busyTimeout) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    const db = new sqlite3.Database(dbPath, error => {
      if (error) return reject(error)
      db.configure('busyTimeout', busyTimeout)
      db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = ${busyTimeout};
      `, pragmaError => pragmaError ? reject(pragmaError) : resolve(db))
    })
  })
}

class DatabaseRuntime {
  constructor (dbPath, options = {}) {
    this.dbPath = path.resolve(dbPath)
    this.name = path.basename(this.dbPath)
    this.busyTimeout = options.busyTimeout ?? 5000
    this.slowQueryMs = options.slowQueryMs ?? 500
    this.refs = 0
    this.closing = false
    this.queues = { high: [], normal: [], low: [] }
    this.writerActive = false
    this.busyCount = 0
    this.writerReady = openNativeDatabase(this.dbPath, this.busyTimeout)
    this.readerReady = this.writerReady.then(() => openNativeDatabase(this.dbPath, this.busyTimeout))
    this.ready = Promise.all([this.writerReady, this.readerReady])
  }

  acquire () {
    if (this.closing) throw new Error(`SQLite runtime ${this.name} is closing`)
    this.refs++
    return new SQLiteDatabaseHandle(this)
  }

  enqueue (task, { priority = 'normal', label = 'write' } = {}) {
    const queuedAt = Date.now()
    return new Promise((resolve, reject) => {
      this.queues[priority]?.push({ task, label, queuedAt, resolve, reject }) ?? this.queues.normal.push({ task, label, queuedAt, resolve, reject })
      this.drain()
    })
  }

  async drain () {
    if (this.writerActive) return
    const item = this.queues.high.shift() || this.queues.normal.shift() || this.queues.low.shift()
    if (!item) return
    this.writerActive = true
    const waitMs = Date.now() - item.queuedAt
    if (waitMs >= this.slowQueryMs) log('warn', `[SQLite:${this.name}] writer wait ${waitMs}ms (${item.label}), queue=${this.queueDepth}`)
    const startedAt = Date.now()
    try {
      const db = await this.writerReady
      item.resolve(await item.task(db))
    } catch (error) {
      if (error?.code === 'SQLITE_BUSY') {
        this.busyCount++
        log('warn', `[SQLite:${this.name}] SQLITE_BUSY #${this.busyCount} (${item.label})`)
      }
      item.reject(error)
    } finally {
      const duration = Date.now() - startedAt
      if (duration >= this.slowQueryMs) log('warn', `[SQLite:${this.name}] slow write ${duration}ms (${item.label})`)
      this.writerActive = false
      queueMicrotask(() => this.drain())
    }
  }

  get queueDepth () {
    return this.queues.high.length + this.queues.normal.length + this.queues.low.length
  }

  async read (method, sql, params) {
    const db = await this.readerReady
    const startedAt = Date.now()
    try {
      return await new Promise((resolve, reject) => db[method](sql, params, (error, result) => error ? reject(error) : resolve(result)))
    } catch (error) {
      if (error?.code === 'SQLITE_BUSY') {
        this.busyCount++
        log('warn', `[SQLite:${this.name}] SQLITE_BUSY #${this.busyCount} (${method})`)
      }
      throw error
    } finally {
      const duration = Date.now() - startedAt
      if (duration >= this.slowQueryMs) log('warn', `[SQLite:${this.name}] slow ${method} ${duration}ms`)
    }
  }

  run (sql, params, options = {}) {
    return this.enqueue(db => new Promise((resolve, reject) => {
      db.run(sql, params, function (error) {
        if (error) reject(error)
        else resolve({ lastID: this.lastID, changes: this.changes })
      })
    }), { ...options, label: options.label || sql.trim().split(/\s+/, 2).join(' ') })
  }

  exec (sql, options = {}) {
    return this.enqueue(db => new Promise((resolve, reject) => db.exec(sql, error => error ? reject(error) : resolve())), options)
  }

  transaction (work, options = {}) {
    return this.enqueue(async db => {
      const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (error) {
        if (error) reject(error)
        else resolve({ lastID: this.lastID, changes: this.changes })
      }))
      const get = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)))
      const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)))
      await run('BEGIN IMMEDIATE')
      try {
        const result = await work({ run, get, all })
        await run('COMMIT')
        return result
      } catch (error) {
        try { await run('ROLLBACK') } catch (rollbackError) { log('warn', `[SQLite:${this.name}] rollback failed: ${rollbackError.message}`) }
        throw error
      }
    }, { ...options, label: options.label || 'transaction' })
  }

  fileSize () {
    let total = 0
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        total += fs.statSync(this.dbPath + suffix).size
      } catch {}
    }
    return total
  }

  /**
   * 回收删除后留下的空闲页。
   *
   * 只能用整库 VACUUM：即使把 auto_vacuum 设成 INCREMENTAL（而且必须设在
   * journal_mode=WAL 之前，否则会被静默忽略），实测 PRAGMA incremental_vacuum
   * 在 WAL 下几乎回收不到东西——2.3 万空闲页只还回 1 页。
   *
   * VACUUM 本身很快：实测 417 MiB 的历史库 1.0s 缩到 100 MiB。但它会重写整个
   * 数据库文件，期间独占写锁，而且临时需要约等于库大小的额外磁盘空间。
   *
   * @param {{minFreePages?: number}} [options]
   * @returns {Promise<object>}
   */
  async vacuum ({ minFreePages = 0 } = {}) {
    const before = this.fileSize()
    const row = await this.read('get', 'PRAGMA freelist_count', [])
    const freePages = row?.freelist_count || 0

    if (freePages < minFreePages) {
      return { name: this.name, path: this.dbPath, skipped: 'free-pages', freePages, before, after: before, ms: 0 }
    }

    // VACUUM 要把整个库重写一遍，磁盘剩余空间不够就别开始
    try {
      const stat = fs.statfsSync(path.dirname(this.dbPath))
      const available = stat.bavail * stat.bsize
      if (available < before * 2) {
        return { name: this.name, path: this.dbPath, skipped: 'disk-space', freePages, before, after: before, ms: 0, available }
      }
    } catch {}

    const startedAt = Date.now()
    // 写入走队列是串行的，但读取是直接打在 reader 连接上、绕过队列的，所以
    // VACUUM 期间来一次查询就可能拿不到独占锁而 SQLITE_BUSY。重试几次即可，
    // VACUUM 本身是幂等的。
    let attempt = 0
    while (true) {
      try {
        // low 优先级：排在实时对话的写入后面
        await this.enqueue(
          db => new Promise((resolve, reject) => db.exec('VACUUM', error => error ? reject(error) : resolve())),
          { priority: 'low', label: 'vacuum' }
        )
        break
      } catch (error) {
        const busy = error?.code === 'SQLITE_BUSY' || /database is locked/i.test(error?.message || '')
        if (!busy || ++attempt >= 3) throw error
        log('warn', `[SQLite:${this.name}] vacuum busy, retry ${attempt}/3`)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
      }
    }
    // checkpoint 只是顺手把 WAL 截短，失败不该把已经成功的 VACUUM 报成失败
    try {
      await this.enqueue(
        db => new Promise((resolve, reject) => db.exec('PRAGMA wal_checkpoint(TRUNCATE)', error => error ? reject(error) : resolve())),
        { priority: 'low', label: 'vacuum checkpoint' }
      )
    } catch (error) {
      log('warn', `[SQLite:${this.name}] post-vacuum checkpoint failed: ${error.message}`)
    }
    const after = this.fileSize()
    const ms = Date.now() - startedAt
    log('info', `[SQLite:${this.name}] vacuum reclaimed ${((before - after) / 1024 / 1024).toFixed(1)} MiB in ${ms}ms`)
    return { name: this.name, path: this.dbPath, freePages, before, after, ms }
  }

  async release () {
    this.refs = Math.max(0, this.refs - 1)
    if (this.refs > 0 || this.closing) return
    this.closing = true
    while (this.writerActive || this.queueDepth > 0) await new Promise(resolve => setTimeout(resolve, 10))
    const writer = await this.writerReady
    const reader = await this.readerReady
    const startedAt = Date.now()
    await new Promise((resolve, reject) => reader.close(error => error ? reject(error) : resolve()))
    await new Promise((resolve, reject) => writer.run('PRAGMA wal_checkpoint(PASSIVE)', error => error ? reject(error) : resolve()))
    await new Promise((resolve, reject) => writer.close(error => error ? reject(error) : resolve()))
    runtimes.delete(this.dbPath)
    log('debug', `[SQLite:${this.name}] closed after checkpoint (${Date.now() - startedAt}ms)`)
  }
}

class SQLiteDatabaseHandle {
  constructor (runtime) {
    this.runtime = runtime
    this.ready = runtime.ready
  }

  run (sql, params, callback) {
    const args = normalizeCallArgs(params, callback)
    this.runtime.run(sql, args.params).then(result => args.callback.call(result, null), error => args.callback(error))
    return this
  }

  get (sql, params, callback) {
    const args = normalizeCallArgs(params, callback)
    this.runtime.read('get', sql, args.params).then(row => args.callback(null, row), error => args.callback(error))
    return this
  }

  all (sql, params, callback) {
    const args = normalizeCallArgs(params, callback)
    this.runtime.read('all', sql, args.params).then(rows => args.callback(null, rows), error => args.callback(error))
    return this
  }

  exec (sql, callback = () => {}) {
    this.runtime.exec(sql).then(() => callback(null), error => callback(error))
    return this
  }

  runAsync (sql, params = [], options = {}) { return this.runtime.run(sql, params, options) }
  getAsync (sql, params = []) { return this.runtime.read('get', sql, params) }
  allAsync (sql, params = []) { return this.runtime.read('all', sql, params) }
  execAsync (sql, options = {}) { return this.runtime.exec(sql, options) }
  transaction (work, options = {}) { return this.runtime.transaction(work, options) }
  serialize (callback) { callback(); return this }
  close (callback = () => {}) { this.runtime.release().then(() => callback(null), error => callback(error)); return this }
}

export function openSQLiteDatabase (dbPath, callback) {
  const resolvedPath = path.resolve(dbPath)
  let runtime = runtimes.get(resolvedPath)
  if (!runtime) {
    runtime = new DatabaseRuntime(resolvedPath)
    runtimes.set(resolvedPath, runtime)
  }
  const handle = runtime.acquire()
  if (typeof callback === 'function') runtime.ready.then(() => callback(null), callback)
  return handle
}

/**
 * 对所有已打开的 SQLite 库执行 VACUUM。
 * @param {{minFreePages?: number}} [options]
 * @returns {Promise<object[]>}
 */
export async function vacuumSQLiteDatabases (options = {}) {
  const results = []
  for (const runtime of [...runtimes.values()]) {
    if (runtime.closing) continue
    try {
      results.push(await runtime.vacuum(options))
    } catch (error) {
      log('warn', `[SQLite:${runtime.name}] vacuum failed: ${error.message}`)
      results.push({ name: runtime.name, path: runtime.dbPath, error: error.message })
    }
  }
  return results
}

export async function closeAllSQLiteDatabases () {
  const active = [...runtimes.values()]
  for (const runtime of active) {
    runtime.refs = 1
    await runtime.release()
  }
}
