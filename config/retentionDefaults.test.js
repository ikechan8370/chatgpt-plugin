import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

globalThis.logger ??= { info () {}, warn () {}, error () {}, debug () {} }

const { default: ChatGPTConfig } = await import('./config.js')
const ConfigClass = ChatGPTConfig.constructor

function freshDir () {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'))
}

/** 起一个独立的配置实例，避免污染单例 */
function newConfig () {
  const config = new ConfigClass()
  // startSync 会装文件监听，测试里手动模拟它的路径选择逻辑即可
  return config
}

function syncInto (config, dir) {
  const jsonPath = path.join(dir, 'config.json')
  if (fs.existsSync(jsonPath)) {
    config.configPath = jsonPath
  } else {
    config.isFreshInstall = true
    config.configPath = jsonPath
    config.saveToFile()
  }
  config.loadFromFile()
  return jsonPath
}

test('a fresh install gets retention enabled', () => {
  const config = newConfig()
  const jsonPath = syncInto(config, freshDir())

  assert.equal(config.isFreshInstall, true)
  assert.equal(config.bym.historyRetentionDays, 30)
  assert.equal(config.chaite.autoVacuum, true)
  assert.equal(config.retentionUpgradeNotice, undefined, 'no upgrade notice on a fresh install')

  const written = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  assert.equal(written.bym.historyRetentionDays, 30)
  assert.equal(written.chaite.autoVacuum, true)
})

test('upgrading an old config keeps retention off and flags a notice', () => {
  const dir = freshDir()
  const jsonPath = path.join(dir, 'config.json')
  // 旧版本的配置：有 bym / chaite，但没有保留期相关的键
  fs.writeFileSync(jsonPath, JSON.stringify({
    version: '3.0.0',
    bym: { enable: true, probability: 0.02 },
    llm: { enableGroupContext: true },
    chaite: { storage: 'sqlite' }
  }, null, 2))

  const config = newConfig()
  syncInto(config, dir)

  assert.equal(config.isFreshInstall, undefined, 'existing config is not a fresh install')
  assert.equal(config.bym.historyRetentionDays, 0, 'must not start deleting on upgrade')
  assert.equal(config.chaite.autoVacuum, false)
  assert.equal(config.retentionUpgradeNotice, true, 'notice is flagged for startup')
  // 用户原有的设置不受影响
  assert.equal(config.bym.enable, true)
  assert.equal(config.bym.probability, 0.02)
})

test('the upgrade override is decided once, not on every reload', () => {
  const dir = freshDir()
  const jsonPath = path.join(dir, 'config.json')
  fs.writeFileSync(jsonPath, JSON.stringify({ bym: { enable: true }, chaite: {} }, null, 2))

  const first = newConfig()
  syncInto(first, dir)
  assert.equal(first.retentionUpgradeNotice, true)
  first.saveToFile()

  // 写回之后 historyRetentionDays 已经是 0（已定义），再次加载不该再判定为升级
  const second = newConfig()
  syncInto(second, dir)
  assert.equal(second.retentionUpgradeNotice, undefined, 'not re-flagged once persisted')
  assert.equal(second.bym.historyRetentionDays, 0, 'and stays off')
})

test('an explicit user setting survives reload', () => {
  const dir = freshDir()
  const jsonPath = path.join(dir, 'config.json')
  // 主人自己开启了保留期
  fs.writeFileSync(jsonPath, JSON.stringify({
    bym: { enable: true, historyRetentionDays: 7 },
    chaite: { autoVacuum: true }
  }, null, 2))

  const config = newConfig()
  syncInto(config, dir)

  assert.equal(config.bym.historyRetentionDays, 7, 'user value wins over the default')
  assert.equal(config.chaite.autoVacuum, true)
  assert.equal(config.retentionUpgradeNotice, undefined)
})

test('retention of 0 set by the user is respected, not treated as missing', () => {
  const dir = freshDir()
  const jsonPath = path.join(dir, 'config.json')
  fs.writeFileSync(jsonPath, JSON.stringify({
    bym: { enable: true, historyRetentionDays: 0 },
    chaite: { autoVacuum: true }
  }, null, 2))

  const config = newConfig()
  syncInto(config, dir)

  assert.equal(config.bym.historyRetentionDays, 0)
  // 0 是显式设置的，不该被当成"旧配置"从而把 autoVacuum 也一起关掉
  assert.equal(config.chaite.autoVacuum, true)
  assert.equal(config.retentionUpgradeNotice, undefined)
})
