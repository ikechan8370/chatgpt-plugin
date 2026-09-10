// 需要 --experimental-test-module-mocks 才能替换 extractGroupFacts / memoryService。
// 运行：node --experimental-test-module-mocks --test "models/memory/*.test.js"
import assert from 'node:assert/strict'
import test, { mock } from 'node:test'

globalThis.logger ??= { info () {}, warn () {}, error () {}, debug () {} }

let extractImpl = async () => []
let saveImpl = async (groupId, facts) => facts

mock.module(new URL('./extractor.js', import.meta.url).href, {
  namedExports: {
    extractGroupFacts: (...args) => extractImpl(...args),
    extractUserMemories: async () => []
  }
})

mock.module(new URL('./service.js', import.meta.url).href, {
  namedExports: {
    memoryService: {
      isGroupMemoryEnabled: () => true,
      saveGroupFacts: (...args) => saveImpl(...args)
    }
  }
})

const { GroupMessageCollector } = await import('./collector.js')

function makeCollector (messages) {
  const collector = new GroupMessageCollector()
  collector.buffers.set('g1', { messages, lastFlushAt: 0 })
  return collector
}

const MESSAGES = [
  { message_id: '1', user_id: '10001', nickname: 'a', text: 'hello', timestamp: 1 },
  { message_id: '2', user_id: '10002', nickname: 'b', text: 'world', timestamp: 2 }
]

test('a failed extraction puts the messages back instead of dropping them', async () => {
  extractImpl = async () => { throw new Error('upstream 502') }
  const collector = makeCollector([...MESSAGES])

  await assert.rejects(() => collector.flush('g1'), /upstream 502/)

  const buffer = collector.buffers.get('g1')
  assert.deepEqual(buffer.messages.map(m => m.message_id), ['1', '2'])
  assert.ok(buffer.retryAfter > 0, 'a retry cooldown is set')
  assert.equal(collector.processing.has('g1'), false, 'the group is not left marked as processing')
})

test('restored messages keep their order ahead of newly buffered ones', async () => {
  extractImpl = async () => { throw new Error('boom') }
  const collector = makeCollector([...MESSAGES])

  const flushing = assert.rejects(() => collector.flush('g1'), /boom/)
  // 提取还在进行时新到的消息进的是那个已经被换空的缓冲区
  collector.buffers.get('g1').messages.push({ message_id: '3', user_id: '3', nickname: 'c', text: 'later', timestamp: 3 })
  await flushing

  assert.deepEqual(collector.buffers.get('g1').messages.map(m => m.message_id), ['1', '2', '3'])
})

test('the buffer stays bounded when extraction keeps failing', async () => {
  extractImpl = async () => { throw new Error('always down') }
  const collector = new GroupMessageCollector()
  const many = Array.from({ length: 1500 }, (_, i) => ({
    message_id: String(i), user_id: '1', nickname: 'a', text: `m${i}`, timestamp: i
  }))
  collector.buffers.set('g1', { messages: many, lastFlushAt: 0 })

  await assert.rejects(() => collector.flush('g1'))

  const buffer = collector.buffers.get('g1')
  assert.equal(buffer.messages.length, 1000)
  // 溢出时丢的是最老的
  assert.equal(buffer.messages[0].message_id, '500')
  assert.equal(buffer.messages.at(-1).message_id, '1499')
})

test('a successful extraction clears the buffer and the retry cooldown', async () => {
  extractImpl = async () => [{ content: 'a fact', source_message_ids: ['1'] }]
  const saved = []
  saveImpl = async (groupId, facts) => { saved.push(...facts); return facts }
  const collector = makeCollector([...MESSAGES])
  collector.buffers.get('g1').retryAfter = 1

  await collector.flush('g1')

  const buffer = collector.buffers.get('g1')
  assert.deepEqual(buffer.messages, [])
  assert.equal(buffer.retryAfter, undefined)
  assert.equal(saved.length, 1)
  assert.equal(saved[0].source_messages, 'hello', 'source text is resolved from the flushed batch')
})

test('an empty extraction result still drains the buffer', async () => {
  extractImpl = async () => []
  const collector = makeCollector([...MESSAGES])

  await collector.flush('g1')

  assert.deepEqual(collector.buffers.get('g1').messages, [])
})

test('tryTriggerFlush respects the retry cooldown', () => {
  const collector = new GroupMessageCollector()
  const flushed = []
  collector.flush = async groupId => { flushed.push(groupId) }

  const buffer = {
    messages: MESSAGES.map(m => ({ ...m })),
    lastFlushAt: 0,
    retryAfter: Math.floor(Date.now() / 1000) + 300
  }
  collector.tryTriggerFlush('g1', buffer)
  assert.deepEqual(flushed, [], 'still cooling down')

  buffer.retryAfter = Math.floor(Date.now() / 1000) - 1
  collector.tryTriggerFlush('g1', buffer)
  assert.deepEqual(flushed, ['g1'], 'flushes once the cooldown has passed')
})
