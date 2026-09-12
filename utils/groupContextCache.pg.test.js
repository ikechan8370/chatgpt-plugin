import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.logger ??= { debug () {}, info () {}, warn () {}, error () {}, mark () {} }

/**
 * groupContextCache 在 Postgres 上的回归测试。
 *
 * 起因是一个真实故障：getSnapshot 里的 SQL 写的是裸标识符 `groupId`，而建表走
 * dialect.createTable 是带引号建的。Postgres 会把裸标识符折成小写，于是查的是
 * groupid、列却是 "groupId"，直接报 column "groupid" does not exist，把整个消息
 * 处理链打断——群聊彻底不可用。
 *
 * SQLite 标识符大小写不敏感，所以之前所有测试都是绿的，只有真跑到 Postgres 上
 * 才暴露。这组测试就是补上那段缺口：插件自己写的原始 SQL 也要在真 Postgres
 * 引擎上跑一遍。
 *
 * 用 PGlite（编译成 WASM 的 Postgres 本体），没装就跳过。
 */

let PGlite = null
let chaite = null
try {
  PGlite = (await import('@electric-sql/pglite')).PGlite
  chaite = await import('chaite')
} catch {
  PGlite = null
}

const suite = PGlite && chaite?.PostgresDriver ? test : test.skip

/** 把 PGlite 包成 chaite PostgresDriver 需要的 pg.Pool 形状 */
function poolFromPGlite (db) {
  const query = async (sql, params) => {
    const result = await db.query(sql, params)
    return { rows: result.rows || [], rowCount: result.affectedRows ?? (result.rows?.length ?? 0) }
  }
  return {
    query,
    connect: async () => ({ query, release: () => {} }),
    end: async () => db.close(),
    on: () => {}
  }
}

async function makeCache () {
  const db = new PGlite()
  await db.waitReady
  const driver = new chaite.PostgresDriver({ dialect: 'postgres', database: 'pglite' }, poolFromPGlite(db))

  // 让 groupContextCache 拿到这个 driver。它是从 chaite 的 drivers 注册表取的，
  // 这里用 register 注入测试用 driver。
  chaite.drivers.register('main', driver)

  // 每个用例都要一个全新的模块实例（它内部缓存了 db 和 initialized）
  const mod = await import(`./groupContextCache.js?t=${Date.now()}-${Math.random()}`)
  return { cache: mod.groupContextCache, driver }
}

suite('saveSnapshot / getSnapshot 在 Postgres 上能对上', async () => {
  const { cache, driver } = await makeCache()
  const messages = [
    { id: '1', text: '今天天气很好' },
    { id: '2', text: '要不要出去走走' }
  ]

  await cache.saveSnapshot('559567232', messages)
  // 修复前这一行就会抛 column "groupid" does not exist
  const back = await cache.getSnapshot('559567232')
  assert.deepEqual(back, messages)

  assert.equal(await cache.getSnapshot('不存在的群'), null)
  await driver.close()
})

suite('建出来的列名保留驼峰（这正是踩坑的地方）', async () => {
  const { cache, driver } = await makeCache()
  await cache.saveSnapshot('1', [{ id: 'a', text: 'x' }])

  const cols = await driver.all(
    'SELECT column_name FROM information_schema.columns WHERE table_name = ?',
    ['group_context_cache']
  )
  const names = cols.map(c => c.column_name).sort()
  // 是 "groupId"/"updatedAt" 而不是 groupid/updatedat —— 所以查询必须带引号
  assert.deepEqual(names, ['groupId', 'snapshot', 'updatedAt'])
  await driver.close()
})

suite('saveSnapshot 重复写入是 upsert，不会堆行', async () => {
  const { cache, driver } = await makeCache()
  await cache.saveSnapshot('1', [{ id: 'a', text: '第一版' }])
  await cache.saveSnapshot('1', [{ id: 'b', text: '第二版' }])

  const rows = await driver.all('SELECT * FROM "group_context_cache"', [])
  assert.equal(rows.length, 1, '同一个群只应该有一行')
  assert.equal((await cache.getSnapshot('1'))[0].text, '第二版')
  await driver.close()
})

suite('cleanup 按 updatedAt 删除过期快照', async () => {
  const { cache, driver } = await makeCache()
  await cache.saveSnapshot('1', [{ id: 'a', text: 'x' }])
  assert.ok(await cache.getSnapshot('1'))

  // maxAgeMs=0 表示「比现在更早的全删」，修复前这里会报 updatedat 不存在
  await cache.cleanup(0)
  assert.equal(await cache.getSnapshot('1'), null)
  await driver.close()
})

suite('快照内容坏掉时降级为 null，而不是抛异常', async () => {
  const { cache, driver } = await makeCache()
  await cache.saveSnapshot('1', [{ id: 'a', text: 'x' }])
  // 手工塞一段非法 JSON
  await driver.run('UPDATE "group_context_cache" SET "snapshot" = ? WHERE "groupId" = ?', ['{不是 json', '1'])
  assert.equal(await cache.getSnapshot('1'), null)
  await driver.close()
})
