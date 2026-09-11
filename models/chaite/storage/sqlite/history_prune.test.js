import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import crypto from 'node:crypto'

globalThis.logger ??= { info () {}, warn () {}, error () {}, debug () {} }

const { SQLiteHistoryManager } = await import('./history_manager.js')

const DAY = 24 * 60 * 60 * 1000

async function makeManager () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-prune-'))
  const manager = new SQLiteHistoryManager(path.join(dir, 'history.db'), path.join(dir, 'images'))
  await manager.ensureInitialized()
  return { manager, dir }
}

/** 直接写库，绕过 saveHistory 以便控制 createdAt */
async function seed (manager, rows) {
  for (const { conversationId, ageDays } of rows) {
    await manager.db.runAsync(
      'INSERT INTO history (id, parentId, conversationId, role, messageData, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), null, conversationId, 'user', '{"content":[]}',
        new Date(Date.now() - ageDays * DAY).toISOString()]
    )
  }
}

async function countAll (manager) {
  const row = await manager.db.getAsync('SELECT COUNT(*) AS c FROM history')
  return row.c
}

async function countByPrefix (manager, prefix) {
  const row = await manager.db.getAsync(
    'SELECT COUNT(*) AS c FROM history WHERE conversationId LIKE ?', [prefix + '%'])
  return row.c
}

test('prunes only bym conversations when a prefix is given', async () => {
  const { manager } = await makeManager()
  await seed(manager, [
    { conversationId: 'bym10001700', ageDays: 120 },
    { conversationId: 'bym10001701', ageDays: 120 },
    { conversationId: 'bym10001702', ageDays: 10 },
    { conversationId: 'c9f2-user-conversation', ageDays: 120 },
    { conversationId: 'anything-else', ageDays: 400 }
  ])

  const { deleted } = await manager.pruneHistory({
    before: new Date(Date.now() - 90 * DAY).toISOString(),
    conversationPrefix: 'bym'
  })

  assert.equal(deleted, 2, 'only the two aged bym rows go')
  assert.equal(await countByPrefix(manager, 'bym'), 1, 'the recent bym row survives')
  assert.equal(await countAll(manager), 3, 'non-bym conversations are untouched')
})

test('the prefix range does not spill into neighbouring ids', async () => {
  const { manager } = await makeManager()
  // 'byn'/'byl' 与 'bym' 相邻，范围比较不能把它们扫进去
  await seed(manager, [
    { conversationId: 'bym1', ageDays: 100 },
    { conversationId: 'byn1', ageDays: 100 },
    { conversationId: 'byl1', ageDays: 100 },
    { conversationId: 'by1', ageDays: 100 },
    { conversationId: 'bymzzz', ageDays: 100 }
  ])

  const { deleted } = await manager.pruneHistory({
    before: new Date().toISOString(),
    conversationPrefix: 'bym'
  })

  assert.equal(deleted, 2, 'bym1 and bymzzz only')
  const remaining = await manager.db.allAsync('SELECT conversationId FROM history ORDER BY conversationId')
  assert.deepEqual(remaining.map(r => r.conversationId), ['by1', 'byl1', 'byn1'])
})

test('an empty prefix prunes every conversation', async () => {
  const { manager } = await makeManager()
  await seed(manager, [
    { conversationId: 'bym1', ageDays: 100 },
    { conversationId: 'user-1', ageDays: 100 },
    { conversationId: 'user-2', ageDays: 1 }
  ])

  const { deleted } = await manager.pruneHistory({
    before: new Date(Date.now() - 30 * DAY).toISOString()
  })

  assert.equal(deleted, 2)
  assert.equal(await countAll(manager), 1)
})

test('deletes in batches and reports when work remains', async () => {
  const { manager } = await makeManager()
  await seed(manager, Array.from({ length: 25 }, (_, i) => ({ conversationId: `bym${i}`, ageDays: 100 })))

  const first = await manager.pruneHistory({
    before: new Date().toISOString(),
    conversationPrefix: 'bym',
    batchSize: 10,
    maxBatches: 2
  })
  assert.equal(first.deleted, 20)
  assert.equal(first.truncated, true, 'signals that a further pass is needed')
  assert.equal(await countAll(manager), 5)

  const second = await manager.pruneHistory({
    before: new Date().toISOString(),
    conversationPrefix: 'bym',
    batchSize: 10
  })
  assert.equal(second.deleted, 5)
  assert.equal(second.truncated, false)
  assert.equal(await countAll(manager), 0)
})

test('countHistoryBefore matches what pruning would remove', async () => {
  const { manager } = await makeManager()
  await seed(manager, [
    { conversationId: 'bym1', ageDays: 100 },
    { conversationId: 'bym2', ageDays: 100 },
    { conversationId: 'bym3', ageDays: 5 }
  ])
  const filter = { before: new Date(Date.now() - 30 * DAY).toISOString(), conversationPrefix: 'bym' }

  const predicted = await manager.countHistoryBefore(filter)
  const { deleted } = await manager.pruneHistory(filter)

  assert.equal(predicted, 2)
  assert.equal(deleted, predicted, 'the dry-run count is what actually gets deleted')
})

test('a missing cutoff is a no-op rather than deleting everything', async () => {
  const { manager } = await makeManager()
  await seed(manager, [{ conversationId: 'bym1', ageDays: 999 }])

  assert.deepEqual(await manager.pruneHistory({}), { deleted: 0, truncated: false })
  assert.deepEqual(await manager.pruneHistory({ before: '' }), { deleted: 0, truncated: false })
  assert.equal(await manager.countHistoryBefore({ before: '' }), 0)
  assert.equal(await countAll(manager), 1, 'nothing was deleted')
})

test('the createdAt index is built in the background and used by pruning', async () => {
  const { manager } = await makeManager()
  // 建索引不阻塞 initialize，所以这里要等后台那一步跑完
  assert.ok(manager.createdAtIndexReady instanceof Promise, 'index build is exposed as a promise')
  await manager.createdAtIndexReady

  const plan = await manager.db.allAsync(
    'EXPLAIN QUERY PLAN SELECT id FROM history WHERE createdAt < ?', ['2026-01-01T00:00:00.000Z'])
  const detail = plan.map(row => row.detail).join(' ')
  assert.match(detail, /USING INDEX idx_history_created/, `expected an index scan, got: ${detail}`)
})

test('initialize resolves without waiting for the index build', async () => {
  const { manager } = await makeManager()
  // ensureInitialized 已经返回了，但索引可能还没建好 —— 此时查询仍必须正确
  await seed(manager, [
    { conversationId: 'bym1', ageDays: 100 },
    { conversationId: 'bym2', ageDays: 1 }
  ])
  const count = await manager.countHistoryBefore({
    before: new Date(Date.now() - 30 * DAY).toISOString(),
    conversationPrefix: 'bym'
  })
  assert.equal(count, 1, 'correctness does not depend on the index existing yet')
  await manager.createdAtIndexReady
})
