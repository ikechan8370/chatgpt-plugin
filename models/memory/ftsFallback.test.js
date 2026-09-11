import assert from 'node:assert/strict'
import test from 'node:test'
import sqlite3 from 'sqlite3'

globalThis.logger ??= { info () {}, warn () {}, error () {}, debug () {} }

const { escapeLikePattern, needsLikeFallback } = await import('./database.js')

test('trigram needs a LIKE fallback only for short queries', () => {
  const trigram = { tokenizer: 'trigram', matchQuery: null }
  assert.equal(needsLikeFallback('天气', trigram), true, '2 个字要走 LIKE')
  assert.equal(needsLikeFallback('猫', trigram), true)
  assert.equal(needsLikeFallback('天气很好', trigram), false, '3 个字以上走 FTS')
  assert.equal(needsLikeFallback('abc', trigram), false)
})

test('jieba and unicode61 never take the LIKE path', () => {
  // jieba 可用时分词是准的，不需要兜底
  assert.equal(needsLikeFallback('天气', { tokenizer: 'simple_jieba', matchQuery: 'jieba_query' }), false)
  assert.equal(needsLikeFallback('天气', { tokenizer: 'simple', matchQuery: 'simple_query' }), false)
  // unicode61 保持既有行为，不引入新的扫描
  assert.equal(needsLikeFallback('天气', { tokenizer: 'unicode61', matchQuery: null }), false)
})

test('escapeLikePattern neutralises LIKE wildcards', () => {
  assert.equal(escapeLikePattern('100%'), '100\\%')
  assert.equal(escapeLikePattern('a_b'), 'a\\_b')
  assert.equal(escapeLikePattern('c:\\path'), 'c:\\\\path')
  assert.equal(escapeLikePattern(null), '')
})

test('a user query of % does not match everything', async () => {
  const db = new sqlite3.Database(':memory:')
  const run = (s, p = []) => new Promise((r, j) => db.run(s, p, e => e ? j(e) : r()))
  const all = (s, p = []) => new Promise((r, j) => db.all(s, p, (e, x) => e ? j(e) : r(x)))

  await run('CREATE TABLE m (value TEXT)')
  await run("INSERT INTO m(value) VALUES ('喜欢吃火锅'), ('讨厌下雨'), ('折扣 50% off')")

  const escaped = await all("SELECT value FROM m WHERE value LIKE ? ESCAPE '\\'", [`%${escapeLikePattern('%')}%`])
  assert.equal(escaped.length, 1, '只应命中真正含有 % 的那条')
  assert.match(escaped[0].value, /50%/)

  const unescaped = await all('SELECT value FROM m WHERE value LIKE ?', ['%%%'])
  assert.equal(unescaped.length, 3, '不转义的话 % 会匹配全部（这正是要避免的）')
  db.close()
})

test('trigram really finds Chinese substrings that unicode61 misses', async () => {
  const db = new sqlite3.Database(':memory:')
  const run = (s, p = []) => new Promise((r, j) => db.run(s, p, e => e ? j(e) : r()))
  const all = (s, p = []) => new Promise((r, j) => db.all(s, p, (e, x) => e ? j(e) : r(x)))
  const sentence = '今天天气很好我们去公园玩'

  await run("CREATE VIRTUAL TABLE u USING fts5(c, tokenize=unicode61)")
  await run('INSERT INTO u(c) VALUES (?)', [sentence])
  assert.equal((await all("SELECT c FROM u WHERE u MATCH '天气很好'")).length, 0,
    'unicode61 把整串中文当一个词，子串搜不到')

  await run("CREATE VIRTUAL TABLE t USING fts5(c, tokenize='trigram')")
  await run('INSERT INTO t(c) VALUES (?)', [sentence])
  assert.equal((await all("SELECT c FROM t WHERE t MATCH '天气很好'")).length, 1,
    'trigram 能搜到 3 字以上的子串')
  assert.equal((await all("SELECT c FROM t WHERE t MATCH '去公园玩'")).length, 1)
  assert.equal((await all("SELECT c FROM t WHERE t MATCH '完全没有的'")).length, 0)
  db.close()
})
