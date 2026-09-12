import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import sqlite3 from 'sqlite3'

globalThis.logger ??= { debug () {}, info () {}, warn () {}, error () {}, mark () {} }

const require = createRequire(import.meta.url)

/**
 * 向量表分区化的回归测试。
 *
 * 这里刻意不经过 database.js / groupMemoryStore.js，而是直接对着 sqlite-vec
 * 验证两件事——它们是分区改造能成立的全部前提，也是改造前实际踩到的两个坑：
 *
 *  1. 不带分区的 KNN 必须先全库取 top-k 再过滤群号，小群会被大群挤掉；
 *     带 PARTITION KEY 之后只在本群分区里找，结果完全正确。
 *  2. rowid 只能用 Number 绑定。BigInt 在 node-sqlite3 里会被当成 NULL，
 *     INSERT 拿到自动分配的 rowid、DELETE 一条都删不掉，而且都不报错。
 *
 * 没装 sqlite-vec 时整组跳过——它是可选依赖，小机器上本来就可能没有。
 */

let sqliteVec = null
try {
  sqliteVec = require('sqlite-vec')
} catch {
  sqliteVec = null
}

const DIM = 8

function tempDb () {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vecpart-')), 'memory.db')
}

async function openDb () {
  const db = new sqlite3.Database(tempDb())
  await new Promise(resolve => db.serialize(resolve))
  sqliteVec.load(db)
  return {
    exec: sql => new Promise((res, rej) => db.exec(sql, e => e ? rej(e) : res())),
    run: (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this) })),
    all: (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r))),
    close: () => new Promise(res => db.close(res))
  }
}

/** 单位向量，便于构造可预测的距离 */
function vec (seed) {
  const a = new Float32Array(DIM)
  a[0] = Math.cos(seed)
  a[1] = Math.sin(seed)
  return Buffer.from(a.buffer)
}

const suite = sqliteVec ? test : test.skip

suite('不分区时，小群会被大群挤出 top-k', async () => {
  const db = await openDb()
  await db.exec('CREATE TABLE group_facts (id INTEGER PRIMARY KEY, group_id TEXT, fact TEXT)')
  await db.exec(`CREATE VIRTUAL TABLE vec_old USING vec0(embedding float[${DIM}])`)

  // 模拟生产分布：大群的向量都挤在查询附近，小群的离得远。
  // 这正是真实情况——某个群占了 67% 的向量，另一个只占 0.5%。
  let id = 1
  for (let i = 0; i < 200; i++, id++) {
    await db.run('INSERT INTO group_facts VALUES (?,?,?)', [id, 'big', 'b' + i])
    await db.run('INSERT INTO vec_old(rowid, embedding) VALUES (?,?)', [id, vec(0.001 * i)])
  }
  const smallIds = []
  for (let i = 0; i < 3; i++, id++) {
    await db.run('INSERT INTO group_facts VALUES (?,?,?)', [id, 'small', 's' + i])
    await db.run('INSERT INTO vec_old(rowid, embedding) VALUES (?,?)', [id, vec(2 + 0.1 * i)])
    smallIds.push(id)
  }

  // 旧查询：全库 top-5，再 JOIN 过滤群号
  const rows = await db.all(`
    SELECT gf.id FROM vec_old
    JOIN group_facts gf ON gf.id = vec_old.rowid
    WHERE gf.group_id = 'small' AND vec_old.embedding MATCH ? AND vec_old.k = 5
    ORDER BY distance
  `, [vec(0)])
  // 全库 top-5 全被大群占满，过滤群号之后一条不剩
  assert.equal(rows.length, 0,
    `旧写法下小群应当召回不到任何向量，实际返回 ${rows.length} 条`)
  await db.close()
})

suite('分区之后，小群能完整召回自己的向量', async () => {
  const db = await openDb()
  await db.exec('CREATE TABLE group_facts (id INTEGER PRIMARY KEY, group_id TEXT, fact TEXT)')
  await db.exec(`CREATE VIRTUAL TABLE vec_new USING vec0(group_id TEXT PARTITION KEY, embedding float[${DIM}])`)

  let id = 1
  for (let i = 0; i < 200; i++, id++) {
    await db.run('INSERT INTO group_facts VALUES (?,?,?)', [id, 'big', 'b' + i])
    await db.run('INSERT INTO vec_new(rowid, group_id, embedding) VALUES (?,?,?)', [id, 'big', vec(0.001 * i)])
  }
  const smallIds = []
  for (let i = 0; i < 3; i++, id++) {
    await db.run('INSERT INTO group_facts VALUES (?,?,?)', [id, 'small', 's' + i])
    await db.run('INSERT INTO vec_new(rowid, group_id, embedding) VALUES (?,?,?)', [id, 'small', vec(2 + 0.1 * i)])
    smallIds.push(id)
  }

  const rows = await db.all(`
    SELECT gf.id FROM vec_new
    JOIN group_facts gf ON gf.id = vec_new.rowid
    WHERE vec_new.group_id = ? AND vec_new.embedding MATCH ? AND vec_new.k = 5
    ORDER BY distance
  `, ['small', vec(0)])

  assert.equal(rows.length, smallIds.length, '小群的三条向量都应该被召回')
  assert.deepEqual(rows.map(r => r.id).sort((a, b) => a - b), smallIds)
  await db.close()
})

suite('rowid 用 BigInt 绑定会静默出错，用 Number 才正确', async () => {
  const db = await openDb()
  await db.exec(`CREATE VIRTUAL TABLE v USING vec0(group_id TEXT PARTITION KEY, embedding float[${DIM}])`)

  // BigInt：插入拿到的不是指定的 rowid，删除也匹配不到，两者都不抛错
  await db.run('INSERT INTO v(rowid, group_id, embedding) VALUES (?,?,?)', [BigInt(12345), 'g1', vec(0)])
  const afterBigInt = await db.all('SELECT rowid FROM v')
  assert.notEqual(afterBigInt[0].rowid, 12345, 'BigInt 绑定后 rowid 不应等于指定值（这正是 bug）')
  const del = await db.run('DELETE FROM v WHERE rowid = ? AND group_id = ?', [BigInt(12345), 'g1'])
  assert.equal(del.changes, 0, 'BigInt 删除应当一条都匹配不到')

  // Number：两者都正确
  await db.exec('DELETE FROM v')
  await db.run('INSERT INTO v(rowid, group_id, embedding) VALUES (?,?,?)', [12345, 'g1', vec(0)])
  const afterNumber = await db.all('SELECT rowid FROM v')
  assert.equal(afterNumber[0].rowid, 12345)
  const del2 = await db.run('DELETE FROM v WHERE rowid = ? AND group_id = ?', [12345, 'g1'])
  assert.equal(del2.changes, 1)
  await db.close()
})

suite('迁移：老表的向量能原样搬进分区表，不需要重新生成', async () => {
  const db = await openDb()
  await db.exec('CREATE TABLE group_facts (id INTEGER PRIMARY KEY, group_id TEXT, fact TEXT)')
  await db.exec(`CREATE VIRTUAL TABLE vec_group_facts USING vec0(embedding float[${DIM}])`)

  const planted = [[10, 'g1'], [20, 'g2'], [30, 'g1']]
  for (const [id, g] of planted) {
    await db.run('INSERT INTO group_facts VALUES (?,?,?)', [id, g, 'f' + id])
    await db.run('INSERT INTO vec_group_facts(rowid, embedding) VALUES (?,?)', [id, vec(id / 100)])
  }
  // 再放一条对不上 fact 的孤儿向量，迁移时应当被丢掉
  await db.run('INSERT INTO vec_group_facts(rowid, embedding) VALUES (?,?)', [999, vec(9)])

  // 复刻 database.js 里的迁移步骤
  await db.exec('CREATE TABLE tmp (rowid INTEGER PRIMARY KEY, group_id TEXT, embedding BLOB)')
  const staged = await db.run(`
    INSERT INTO tmp(rowid, group_id, embedding)
    SELECT v.rowid, g.group_id, v.embedding
    FROM vec_group_facts v JOIN group_facts g ON g.id = v.rowid
  `)
  assert.equal(staged.changes, planted.length, '只搬能对上 fact 的向量')

  await db.exec('DROP TABLE vec_group_facts')
  await db.exec(`CREATE VIRTUAL TABLE vec_group_facts USING vec0(group_id TEXT PARTITION KEY, embedding float[${DIM}])`)
  const restored = await db.run(`
    INSERT INTO vec_group_facts(rowid, group_id, embedding)
    SELECT rowid, group_id, embedding FROM tmp
  `)
  assert.equal(restored.changes, planted.length)
  await db.exec('DROP TABLE tmp')

  // 分区查询要能命中，且 rowid 与 fact id 仍然对应
  const hits = await db.all(`
    SELECT rowid, distance FROM vec_group_facts
    WHERE group_id = ? AND embedding MATCH ? AND k = 5 ORDER BY distance
  `, ['g1', vec(0.1)])
  assert.deepEqual(hits.map(h => h.rowid).sort((a, b) => a - b), [10, 30])
  assert.equal(hits[0].distance, 0, '搬过来的向量应当与原值逐位一致')
  await db.close()
})

suite('迁移检测：只认没有 PARTITION KEY 的老表', async () => {
  const db = await openDb()
  await db.exec(`CREATE VIRTUAL TABLE old_shape USING vec0(embedding float[${DIM}])`)
  await db.exec(`CREATE VIRTUAL TABLE new_shape USING vec0(group_id TEXT PARTITION KEY, embedding float[${DIM}])`)

  const sqlOf = async name => (await db.all(
    'SELECT sql FROM sqlite_master WHERE type = ? AND name = ?', ['table', name]))[0]?.sql || ''

  assert.ok(!/partition\s+key/i.test(await sqlOf('old_shape')), '老表不该被判定为已分区')
  assert.ok(/partition\s+key/i.test(await sqlOf('new_shape')), '新表应当被判定为已分区')
  await db.close()
})
