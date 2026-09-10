import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.logger ??= { info () {}, warn () {}, error () {}, debug () {} }

const { default: ChatGPTConfig } = await import('../config/config.js')
const { getPresetPrefixIndex, invalidatePresetPrefixIndex } = await import('./presetCache.js')

function fakeManager (presets) {
  let calls = 0
  return {
    get calls () { return calls },
    async getAllPresets () {
      calls++
      return presets
    }
  }
}

const PRESETS = [
  { id: 'a', prefix: '#猫娘', sendMessageOption: { systemOverride: 'x'.repeat(4096) } },
  { id: 'b', prefix: '#助手', sendMessageOption: { systemOverride: 'y'.repeat(4096) } }
]

test.beforeEach(() => invalidatePresetPrefixIndex())

test('caches the prefix index within the TTL', async () => {
  ChatGPTConfig.llm.presetCacheTTL = 60
  const manager = fakeManager(PRESETS)

  const first = await getPresetPrefixIndex(manager)
  const second = await getPresetPrefixIndex(manager)

  assert.equal(manager.calls, 1, 'the second lookup is served from cache')
  assert.deepEqual(first, [{ id: 'a', prefix: '#猫娘' }, { id: 'b', prefix: '#助手' }])
  assert.equal(second, first)
})

test('only the id and prefix are retained, not the preset body', async () => {
  ChatGPTConfig.llm.presetCacheTTL = 60
  const entries = await getPresetPrefixIndex(fakeManager(PRESETS))
  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry).sort(), ['id', 'prefix'])
    assert.equal(entry.sendMessageOption, undefined)
  }
})

test('a TTL of 0 disables caching entirely', async () => {
  ChatGPTConfig.llm.presetCacheTTL = 0
  const manager = fakeManager(PRESETS)

  await getPresetPrefixIndex(manager)
  await getPresetPrefixIndex(manager)

  assert.equal(manager.calls, 2, 'every lookup goes to storage when disabled')
})

test('a write invalidates the cache', async () => {
  ChatGPTConfig.llm.presetCacheTTL = 60
  const manager = fakeManager(PRESETS)

  await getPresetPrefixIndex(manager)
  invalidatePresetPrefixIndex()
  await getPresetPrefixIndex(manager)

  assert.equal(manager.calls, 2, 'editing a preset must not wait out the TTL')
})

test('the TTL expires', async () => {
  ChatGPTConfig.llm.presetCacheTTL = 0.05
  const manager = fakeManager(PRESETS)

  await getPresetPrefixIndex(manager)
  await new Promise(resolve => setTimeout(resolve, 80))
  await getPresetPrefixIndex(manager)

  assert.equal(manager.calls, 2)
})

test('presets without a string prefix are skipped', async () => {
  ChatGPTConfig.llm.presetCacheTTL = 60
  const entries = await getPresetPrefixIndex(fakeManager([
    { id: 'a', prefix: '#x' },
    { id: 'b' },
    { id: 'c', prefix: null },
    null
  ]))
  assert.deepEqual(entries, [{ id: 'a', prefix: '#x' }])
})
