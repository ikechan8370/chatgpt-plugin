import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

globalThis.logger ??= { info () {}, warn () {}, error () {}, debug () {} }

const { openSQLiteDatabase, vacuumSQLiteDatabases } = await import('./runtime.js')

function tempDb (name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vacuum-'))
  return path.join(dir, name)
}

/** 与 runtime 的 fileSize() 一致：主库 + WAL + shm 的总占用 */
function totalSize (dbPath) {
  let total = 0
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      total += fs.statSync(dbPath + suffix).size
    } catch {}
  }
  return total
}

/** 建一张表，写入再删掉大部分，制造大量空闲页 */
async function makeBloatedDb (rows = 40000) {
  const dbPath = tempDb('bloat.db')
  const db = openSQLiteDatabase(dbPath)
  await db.ready
  await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, d TEXT)')
  await db.runAsync(
    `INSERT INTO t(d) WITH RECURSIVE s(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM s WHERE i<${rows - 1})
     SELECT hex(randomblob(300)) FROM s`)
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)')
  await db.runAsync('DELETE FROM t WHERE id % 5 != 0')
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)')
  return { db, dbPath }
}

test('vacuum reclaims space and keeps the data intact', async () => {
  const { db, dbPath } = await makeBloatedDb()
  const before = totalSize(dbPath)
  const rowsBefore = (await db.getAsync('SELECT COUNT(*) AS c FROM t')).c

  const [result] = await vacuumSQLiteDatabases({ minFreePages: 0 })

  assert.equal(result.error, undefined)
  assert.equal(result.skipped, undefined)
  const after = totalSize(dbPath)
  assert.ok(after < before, `expected shrink, ${before} → ${after}`)
  assert.equal(result.before, before, 'reported size covers db + wal + shm')
  assert.equal(result.after, after)
  assert.ok(result.ms >= 0)

  const rowsAfter = (await db.getAsync('SELECT COUNT(*) AS c FROM t')).c
  assert.equal(rowsAfter, rowsBefore, 'no rows lost')
  await db.close()
})

test('skips when there are not enough free pages', async () => {
  const dbPath = tempDb('small.db')
  const db = openSQLiteDatabase(dbPath)
  await db.ready
  await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY)')
  await db.runAsync('INSERT INTO t(id) VALUES (1)')

  const [result] = await vacuumSQLiteDatabases({ minFreePages: 20000 })

  assert.equal(result.skipped, 'free-pages')
  assert.equal(result.before, result.after, 'nothing was rewritten')
  assert.equal(result.ms, 0)
  await db.close()
})

test('the database is still usable for reads and writes afterwards', async () => {
  const { db } = await makeBloatedDb(5000)
  await vacuumSQLiteDatabases({ minFreePages: 0 })

  await db.runAsync('INSERT INTO t(d) VALUES (?)', ['after vacuum'])
  const row = await db.getAsync('SELECT d FROM t WHERE d = ?', ['after vacuum'])
  assert.equal(row.d, 'after vacuum', 'writes still work on both connections')
  await db.close()
})

test('a write queued during vacuum is not lost', async () => {
  const { db } = await makeBloatedDb(20000)
  const countBefore = (await db.getAsync('SELECT COUNT(*) AS c FROM t')).c

  // VACUUM 走 low 优先级，这条 normal 优先级的写入应该照常完成
  const [, ...writes] = await Promise.all([
    vacuumSQLiteDatabases({ minFreePages: 0 }),
    db.runAsync('INSERT INTO t(d) VALUES (?)', ['concurrent-a']),
    db.runAsync('INSERT INTO t(d) VALUES (?)', ['concurrent-b'])
  ])

  assert.equal(writes.length, 2)
  const countAfter = (await db.getAsync('SELECT COUNT(*) AS c FROM t')).c
  assert.equal(countAfter, countBefore + 2)
  await db.close()
})
