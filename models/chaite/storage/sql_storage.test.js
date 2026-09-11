import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

globalThis.logger ??= { debug () {}, info () {}, warn () {}, error () {}, mark () {} }

const { toDollarPlaceholders, countPlaceholders } = await import('./driver/placeholders.js')
const { createDialect } = await import('./driver/dialect.js')
const { SqliteDriver } = await import('./driver/sqlite_driver.js')
const { SqlKvStorage, parseJson, stringifyJson } = await import('./sql_storage.js')

test('placeholders are numbered in order', () => {
  assert.equal(
    toDollarPlaceholders('SELECT * FROM t WHERE a = ? AND b = ?'),
    'SELECT * FROM t WHERE a = $1 AND b = $2'
  )
})

test('placeholders inside string literals are left alone', () => {
  assert.equal(
    toDollarPlaceholders("SELECT * FROM t WHERE a = ? AND b = 'why?'"),
    "SELECT * FROM t WHERE a = $1 AND b = 'why?'"
  )
  // '' 是转义的单引号，不能被当成字符串结束
  assert.equal(
    toDollarPlaceholders("SELECT 'it''s a ?' , ?"),
    "SELECT 'it''s a ?' , $1"
  )
})

test('placeholders inside quoted identifiers and comments are left alone', () => {
  assert.equal(
    toDollarPlaceholders('SELECT "we?rd" FROM t WHERE a = ? -- trailing ?\n'),
    'SELECT "we?rd" FROM t WHERE a = $1 -- trailing ?\n'
  )
  assert.equal(
    toDollarPlaceholders('SELECT /* ? */ a FROM t WHERE b = ?'),
    'SELECT /* ? */ a FROM t WHERE b = $1'
  )
})

test('countPlaceholders matches the translated parameter count', () => {
  assert.equal(countPlaceholders('SELECT ?, ?, ?'), 3)
  assert.equal(countPlaceholders("SELECT 'no ? here'"), 0)
})

test('upsert updates every column except the conflict key', () => {
  const pg = createDialect('postgres')
  const sql = pg.upsert('channels', ['id', 'name', 'weight'], 'id')
  assert.match(sql, /ON CONFLICT\("id"\) DO UPDATE SET/)
  assert.match(sql, /"name" = EXCLUDED\."name"/)
  assert.match(sql, /"weight" = EXCLUDED\."weight"/)
  assert.doesNotMatch(sql, /"id" = EXCLUDED\."id"/)
})

test('a single-column table degrades to DO NOTHING', () => {
  const sqlite = createDialect('sqlite')
  assert.match(sqlite.upsert('t', ['id'], 'id'), /DO NOTHING/)
})

test('both dialects emit the same upsert shape', () => {
  const columns = ['id', 'name']
  assert.equal(
    createDialect('sqlite').upsert('t', columns, 'id'),
    createDialect('postgres').upsert('t', columns, 'id')
  )
})

test('autoincrement differs per dialect', () => {
  assert.match(createDialect('sqlite').autoIncrementPk(), /AUTOINCREMENT/)
  assert.match(createDialect('postgres').autoIncrementPk(), /BIGSERIAL/)
})

test('unsafe identifiers are rejected', () => {
  const dialect = createDialect('sqlite')
  assert.throws(() => dialect.quoteId('a"; DROP TABLE t; --'), /unsafe identifier/)
})

test('json helpers tolerate garbage', () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 })
  assert.equal(parseJson('not json', null), null)
  assert.deepEqual(parseJson('not json', {}), {})
  assert.equal(parseJson(null), null)
  assert.equal(stringifyJson(undefined), null)
})

function tempDbPath () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlkv-'))
  return path.join(dir, 'test.db')
}

/** 一份最小 spec，覆盖提升列、数值列、布尔列和 JSON 列四种形态 */
function widgetSpec () {
  return {
    table: 'widgets',
    columns: {
      id: { type: 'text', pk: true },
      name: { type: 'text', notNull: true },
      kind: { type: 'text' },
      weight: { type: 'int', default: 1 },
      enabled: { type: 'bool', default: 0 },
      payload: { type: 'json' }
    },
    indexes: [{ columns: ['kind'] }],
    filterable: ['id', 'name', 'kind', 'weight', 'enabled'],
    numeric: ['weight'],
    boolean: ['enabled'],
    toRecord: (entity, id) => ({
      id,
      name: entity.name,
      kind: entity.kind,
      weight: entity.weight ?? 1,
      enabled: entity.enabled ? 1 : 0,
      payload: stringifyJson(entity.payload)
    }),
    fromRecord: record => ({
      id: record.id,
      name: record.name,
      kind: record.kind,
      weight: Number(record.weight),
      enabled: Boolean(record.enabled),
      payload: parseJson(record.payload, {})
    })
  }
}

async function makeStorage () {
  const driver = new SqliteDriver(tempDbPath())
  await driver.ready()
  const storage = new SqlKvStorage(driver, widgetSpec())
  await storage.initialize()
  return storage
}

test('round-trips an item through the generic CRUD', async () => {
  const storage = await makeStorage()
  const id = await storage.setItem('w1', { name: 'first', kind: 'a', weight: 5, enabled: true, payload: { deep: [1, 2] } })
  assert.equal(id, 'w1')

  const loaded = await storage.getItem('w1')
  assert.equal(loaded.name, 'first')
  assert.equal(loaded.weight, 5)
  assert.equal(loaded.enabled, true)
  assert.deepEqual(loaded.payload, { deep: [1, 2] })

  assert.equal(await storage.getItem('missing'), null)
  await storage.driver.close()
})

test('setItem upserts rather than duplicating', async () => {
  const storage = await makeStorage()
  await storage.setItem('w1', { name: 'first', kind: 'a' })
  await storage.setItem('w1', { name: 'renamed', kind: 'b' })

  const all = await storage.listItems()
  assert.equal(all.length, 1)
  assert.equal(all[0].name, 'renamed')
  assert.equal(all[0].kind, 'b')
  await storage.driver.close()
})

test('setItem generates an id when none is given', async () => {
  const storage = await makeStorage()
  const id = await storage.setItem(null, { name: 'anon', kind: 'a' })
  assert.ok(id, 'expected a generated id')
  assert.equal((await storage.getItem(id)).name, 'anon')
  await storage.driver.close()
})

test('eq filter pushes known columns down and filters the rest in memory', async () => {
  const storage = await makeStorage()
  await storage.setItem('w1', { name: 'a', kind: 'x', weight: 1, payload: { tag: 'keep' } })
  await storage.setItem('w2', { name: 'b', kind: 'x', weight: 2, payload: { tag: 'drop' } })
  await storage.setItem('w3', { name: 'c', kind: 'y', weight: 1, payload: { tag: 'keep' } })

  const byKind = await storage.listItemsByEqFilter({ kind: 'x' })
  assert.deepEqual(byKind.map(i => i.id).sort(), ['w1', 'w2'])

  // weight 是数值列：传字符串也应该匹配得上
  const byWeight = await storage.listItemsByEqFilter({ weight: '1' })
  assert.deepEqual(byWeight.map(i => i.id).sort(), ['w1', 'w3'])

  // payload 不在 filterable 里，只能在内存里比，对象不等值所以匹配不到
  const residual = await storage.listItemsByEqFilter({ kind: 'x', nope: 'zzz' })
  assert.equal(residual.length, 0)

  assert.equal((await storage.listItemsByEqFilter({})).length, 3)
  await storage.driver.close()
})

test('boolean columns normalise to 0/1 on the way into the query', async () => {
  const storage = await makeStorage()
  await storage.setItem('on', { name: 'on', enabled: true })
  await storage.setItem('off', { name: 'off', enabled: false })

  assert.deepEqual((await storage.listItemsByEqFilter({ enabled: true })).map(i => i.id), ['on'])
  assert.deepEqual((await storage.listItemsByEqFilter({ enabled: false })).map(i => i.id), ['off'])
  await storage.driver.close()
})

test('in-query intersects across fields and short-circuits on an empty set', async () => {
  const storage = await makeStorage()
  await storage.setItem('w1', { name: 'a', kind: 'x' })
  await storage.setItem('w2', { name: 'b', kind: 'y' })
  await storage.setItem('w3', { name: 'c', kind: 'x' })

  const hits = await storage.listItemsByInQuery([
    { field: 'kind', values: ['x'] },
    { field: 'name', values: ['a', 'c'] }
  ])
  assert.deepEqual(hits.map(i => i.id).sort(), ['w1', 'w3'])

  assert.deepEqual(await storage.listItemsByInQuery([{ field: 'kind', values: [] }]), [])
  assert.equal((await storage.listItemsByInQuery([])).length, 3)
  await storage.driver.close()
})

test('removeItem and clear do what they say', async () => {
  const storage = await makeStorage()
  await storage.setItem('w1', { name: 'a' })
  await storage.setItem('w2', { name: 'b' })

  await storage.removeItem('w1')
  assert.equal((await storage.listItems()).length, 1)

  await storage.clear()
  assert.equal((await storage.listItems()).length, 0)
  await storage.driver.close()
})

test('initialize is idempotent and safe to race', async () => {
  const driver = new SqliteDriver(tempDbPath())
  await driver.ready()
  const storage = new SqlKvStorage(driver, widgetSpec())
  await Promise.all([storage.initialize(), storage.initialize(), storage.initialize()])
  await storage.setItem('w1', { name: 'a' })
  assert.equal((await storage.listItems()).length, 1)
  await storage.driver.close()
})

test('orderBy is applied to list queries', async () => {
  const driver = new SqliteDriver(tempDbPath())
  await driver.ready()
  const storage = new SqlKvStorage(driver, { ...widgetSpec(), orderBy: 'weight DESC' })
  await storage.initialize()
  await storage.setItem('low', { name: 'low', weight: 1 })
  await storage.setItem('high', { name: 'high', weight: 9 })
  await storage.setItem('mid', { name: 'mid', weight: 5 })

  assert.deepEqual((await storage.listItems()).map(i => i.id), ['high', 'mid', 'low'])
  await storage.driver.close()
})
