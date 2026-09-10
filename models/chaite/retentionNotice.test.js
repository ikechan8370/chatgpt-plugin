import assert from 'node:assert/strict'
import test from 'node:test'

const warnings = []
globalThis.logger = {
  info () {},
  error () {},
  debug (...a) { warnings.push(['debug', a.join(' ')]) },
  warn (...a) { warnings.push(['warn', a.join(' ')]) }
}

const { default: ChatGPTConfig } = await import('../../config/config.js')
const { reportRetentionOpportunity } = await import('./historyRetention.js')

function fakeManager (counts) {
  return {
    async countHistoryBefore ({ conversationPrefix }) {
      return conversationPrefix ? counts.bym : counts.all
    }
  }
}

function warnText () {
  return warnings.filter(([level]) => level === 'warn').map(([, text]) => text).join('\n')
}

test.beforeEach(() => {
  warnings.length = 0
  ChatGPTConfig.retentionUpgradeNotice = undefined
})

test('prints the banner with real counts when upgrading', async () => {
  ChatGPTConfig.retentionUpgradeNotice = true

  const printed = await reportRetentionOpportunity({
    historyManager: fakeManager({ bym: 157173, all: 174546 })
  })

  assert.equal(printed, true)
  const text = warnText()
  assert.match(text, /检测到可清理的历史记录/)
  assert.match(text, /157173/, 'reports the real bym count')
  assert.match(text, /174546/, 'reports the real total')
  assert.match(text, /bym\.historyRetentionDays = 30/, 'tells them exactly what to set')
  assert.match(text, /chaite\.autoVacuum = true/)
  assert.match(text, /历史统计/, 'points at the dry-run command')
})

test('is a one-shot: the flag is consumed', async () => {
  ChatGPTConfig.retentionUpgradeNotice = true
  const manager = fakeManager({ bym: 157173, all: 174546 })

  assert.equal(await reportRetentionOpportunity({ historyManager: manager }), true)
  warnings.length = 0
  assert.equal(await reportRetentionOpportunity({ historyManager: manager }), false,
    'a second call must not print again')
  assert.equal(warnText(), '')
})

test('stays quiet on an install that is not an upgrade', async () => {
  ChatGPTConfig.retentionUpgradeNotice = undefined

  const printed = await reportRetentionOpportunity({
    historyManager: fakeManager({ bym: 999999, all: 999999 })
  })

  assert.equal(printed, false)
  assert.equal(warnText(), '', 'no warning even with a huge history')
  // 但要留下 debug 痕迹，方便确认这个检查确实被调用到了
  assert.ok(warnings.some(([lvl, t]) => lvl === 'debug' && /not an upgrade/.test(t)))
})

test('stays quiet when there is barely anything to clean', async () => {
  ChatGPTConfig.retentionUpgradeNotice = true

  const printed = await reportRetentionOpportunity({
    historyManager: fakeManager({ bym: 10, all: 12 })
  })

  assert.equal(printed, false)
  assert.equal(warnText(), '', 'small installs are not spammed')
})

test('a storage backend without counting support is handled', async () => {
  ChatGPTConfig.retentionUpgradeNotice = true

  const printed = await reportRetentionOpportunity({ historyManager: {} })

  assert.equal(printed, false)
  assert.equal(warnText(), '')
})

test('a failing count does not throw into startup', async () => {
  ChatGPTConfig.retentionUpgradeNotice = true

  const printed = await reportRetentionOpportunity({
    historyManager: { async countHistoryBefore () { throw new Error('db locked') } }
  })

  assert.equal(printed, false)
  assert.ok(warnings.some(([lvl, t]) => lvl === 'debug' && /db locked/.test(t)))
})
