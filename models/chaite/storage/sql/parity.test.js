import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

globalThis.logger ??= { debug () {}, info () {}, warn () {}, error () {}, mark () {} }

const { SqliteDriver } = await import('../driver/sqlite_driver.js')

const { SQLiteChannelStorage } = await import('../sqlite/channel_storage.js')
const { SQLiteChatPresetStorage } = await import('../sqlite/chat_preset_storage.js')
const { SQLiteToolsStorage } = await import('../sqlite/tools_storage.js')
const { SQLiteProcessorsStorage } = await import('../sqlite/processors_storage.js')
const { SQLiteToolsGroupStorage } = await import('../sqlite/tool_groups_storage.js')
const { SQLiteUserStateStorage } = await import('../sqlite/user_state_storage.js')
const { SQLiteMcpServerStorage } = await import('../sqlite/mcp_server_storage.js')
const SQLiteTriggerStorage = (await import('../sqlite/trigger_storage.js')).default

const { SqlChannelStorage } = await import('./channel_storage.js')
const { SqlChatPresetStorage } = await import('./chat_preset_storage.js')
const { SqlToolsStorage } = await import('./tools_storage.js')
const { SqlProcessorsStorage } = await import('./processors_storage.js')
const { SqlToolsGroupStorage } = await import('./tool_groups_storage.js')
const { SqlUserStateStorage } = await import('./user_state_storage.js')
const { SqlMcpServerStorage } = await import('./mcp_server_storage.js')
const SqlTriggerStorage = (await import('./trigger_storage.js')).default

function tempDbPath () {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'parity-')), 'data.db')
}

/**
 * 每个 storage 一组：旧类、新类，以及一个样本实体和要比对的字段。
 *
 * 这组测试是这次重构的核心证据——新类必须能读旧类写的数据，旧类也必须能读新类
 * 写的数据。两个方向都通过，才说明表结构和序列化完全没变，老用户的 data.db
 * 可以原地继续用。
 */
const CASES = [
  {
    name: 'channels',
    Old: SQLiteChannelStorage,
    New: SqlChannelStorage,
    id: 'ch1',
    sample: {
      name: 'my channel',
      description: 'desc',
      adapterType: 'openai',
      type: 'openai',
      weight: 3,
      priority: 7,
      status: 'enabled',
      models: ['gpt-4', 'gpt-5'],
      options: { apiKey: 'sk-test', nested: { a: 1 } },
      statistics: { calls: 12 },
      embedded: true,
      customExtraField: 'kept-in-extra'
    },
    check: item => ({
      name: item.name,
      adapterType: item.adapterType,
      weight: item.weight,
      priority: item.priority,
      status: item.status,
      models: item.models,
      options: item.options,
      statistics: item.statistics,
      embedded: item.embedded,
      customExtraField: item.customExtraField
    })
  },
  {
    name: 'chat_presets',
    Old: SQLiteChatPresetStorage,
    New: SqlChatPresetStorage,
    id: 'p1',
    sample: {
      name: 'preset',
      description: 'desc',
      prefix: '#chat',
      local: true,
      namespace: 'ns',
      sendMessageOption: { model: 'gpt-5', temperature: 0.7 },
      embedded: false,
      extraBit: 'x'
    },
    check: item => ({
      name: item.name,
      prefix: item.prefix,
      local: item.local,
      namespace: item.namespace,
      sendMessageOption: item.sendMessageOption,
      embedded: item.embedded,
      extraBit: item.extraBit
    })
  },
  {
    name: 'tools',
    Old: SQLiteToolsStorage,
    New: SqlToolsStorage,
    id: 't1',
    sample: {
      name: 'a tool',
      description: 'desc',
      modelType: 'function',
      code: 'export default 1',
      status: 'enabled',
      permission: 'public',
      embedded: false,
      uploader: { id: 9, name: 'someone' },
      extraBit: 'y'
    },
    check: item => ({
      name: item.name,
      modelType: item.modelType,
      code: item.code,
      status: item.status,
      permission: item.permission,
      embedded: item.embedded,
      uploader: item.uploader,
      extraBit: item.extraBit
    })
  },
  {
    name: 'triggers',
    Old: SQLiteTriggerStorage,
    New: SqlTriggerStorage,
    id: 'tr1',
    sample: {
      name: 'a trigger',
      description: 'desc',
      modelType: 'executable',
      code: 'export default 1',
      status: 'enabled',
      permission: 'public',
      isOneTime: true,
      embedded: false
    },
    check: item => ({
      name: item.name,
      modelType: item.modelType,
      code: item.code,
      status: item.status,
      permission: item.permission,
      isOneTime: item.isOneTime,
      embedded: item.embedded
    })
  },
  {
    name: 'processors',
    Old: SQLiteProcessorsStorage,
    New: SqlProcessorsStorage,
    id: 'pr1',
    sample: {
      name: 'a processor',
      description: 'desc',
      type: 'pre',
      code: 'export default 1',
      embedded: false,
      uploader: { id: 3 }
    },
    check: item => ({
      name: item.name,
      type: item.type,
      code: item.code,
      embedded: item.embedded,
      uploader: item.uploader
    })
  },
  {
    name: 'tools_groups',
    Old: SQLiteToolsGroupStorage,
    New: SqlToolsGroupStorage,
    id: 'g1',
    sample: {
      name: 'group',
      description: 'desc',
      toolIds: ['t1', 't2'],
      isDefault: true
    },
    check: item => ({
      name: item.name,
      description: item.description,
      toolIds: item.toolIds,
      isDefault: item.isDefault
    })
  },
  {
    name: 'mcp_servers',
    Old: SQLiteMcpServerStorage,
    New: SqlMcpServerStorage,
    id: 'm1',
    sample: {
      id: 'm1',
      name: 'server',
      enabled: true,
      updatedAt: 1700000000000,
      transport: 'stdio',
      command: 'node'
    },
    check: item => ({
      name: item.name,
      enabled: item.enabled,
      transport: item.transport,
      command: item.command
    })
  },
  {
    name: 'user_states',
    Old: SQLiteUserStateStorage,
    New: SqlUserStateStorage,
    id: '10001',
    sample: {
      nickname: 'nick',
      card: 'card',
      conversations: [{ id: 'c1', name: 'chat', lastMessageId: 'm1' }],
      settings: { preset: 'p', temperature: 0.5 },
      current: { conversationId: 'c1', messageId: 'm1' }
    },
    check: item => ({
      nickname: item.nickname,
      card: item.card,
      conversations: item.conversations,
      settings: item.settings,
      current: item.current
    })
  }
]

/**
 * chaite 的 DTO 构造函数会做归一化（比如 Channel 会把 models 里的字符串展开成
 * 对象，并丢掉它不认识的字段），所以「读出来的东西」本来就不等于「写进去的
 * 东西」——新旧实现都一样。
 *
 * 因此基准不是原始样本，而是「旧实现写、旧实现读」的结果：新实现的四种组合都
 * 必须和它一致。这才是真正要证明的东西——两个实现对同一份数据的行为无差别。
 */
function normalize (item) {
  if (!item) return item
  // 时间戳每次写入都不同，不参与比对
  const { createdAt, updatedAt, ...rest } = JSON.parse(JSON.stringify(item))
  return rest
}

async function baseline (Old, dbPath, id, sample) {
  const storage = new Old(dbPath)
  await storage.initialize()
  await storage.setItem(id, structuredClone(sample))
  return normalize(await storage.getItem(id))
}

for (const { name, Old, New, id, sample, check } of CASES) {
  test(`${name}: the new storage reads what the old one wrote`, async () => {
    const dbPath = tempDbPath()
    const expected = await baseline(Old, dbPath, id, sample)

    const driver = new SqliteDriver(dbPath)
    await driver.ready()
    const newStorage = new New(driver)
    await newStorage.initialize()

    const loaded = await newStorage.getItem(id)
    assert.ok(loaded, `${name}: expected to read back the row written by the old storage`)
    assert.deepEqual(normalize(loaded), expected)
    assert.equal((await newStorage.listItems()).length, 1)
  })

  test(`${name}: the old storage reads what the new one wrote`, async () => {
    const expected = await baseline(Old, tempDbPath(), id, sample)

    const dbPath = tempDbPath()
    const driver = new SqliteDriver(dbPath)
    await driver.ready()
    const newStorage = new New(driver)
    await newStorage.initialize()
    await newStorage.setItem(id, structuredClone(sample))

    const oldStorage = new Old(dbPath)
    await oldStorage.initialize()

    const loaded = await oldStorage.getItem(id)
    assert.ok(loaded, `${name}: expected the old storage to read the row written by the new one`)
    assert.deepEqual(normalize(loaded), expected)
  })

  test(`${name}: the new storage agrees with the old one on its own writes`, async () => {
    const expected = await baseline(Old, tempDbPath(), id, sample)

    const driver = new SqliteDriver(tempDbPath())
    await driver.ready()
    const storage = new New(driver)
    await storage.initialize()
    await storage.setItem(id, structuredClone(sample))
    assert.deepEqual(normalize(await storage.getItem(id)), expected)
  })

  test(`${name}: setItem upserts, removeItem removes`, async () => {
    const driver = new SqliteDriver(tempDbPath())
    await driver.ready()
    const storage = new New(driver)
    await storage.initialize()

    // 二次写入必须是更新而不是插入
    await storage.setItem(id, structuredClone(sample))
    await storage.setItem(id, structuredClone(sample))
    assert.equal((await storage.listItems()).length, 1)

    // 抽一个提升列出来，确认更新确实落库了
    const [field, value] = Object.entries(check(structuredClone(sample)))
      .find(([, v]) => typeof v === 'string') || []
    if (field) {
      const changed = structuredClone(sample)
      changed[field] = `${value}-changed`
      await storage.setItem(id, changed)
      assert.equal((await storage.getItem(id))[field], `${value}-changed`)
      assert.equal((await storage.listItems()).length, 1)
    }

    await storage.removeItem(id)
    assert.equal(await storage.getItem(id), null)
    assert.equal((await storage.listItems()).length, 0)
  })
}

test('user_states: duplicate userIds are collapsed before the unique index goes on', async () => {
  const dbPath = tempDbPath()
  // 用旧类建表，然后手工插入两行同 userId，模拟老库里并发写出来的重复
  const oldStorage = new SQLiteUserStateStorage(dbPath)
  await oldStorage.initialize()

  const driver = new SqliteDriver(dbPath)
  await driver.ready()
  const insert = `INSERT INTO user_states (id, userId, nickname, card, conversations, settings, current, updatedAt)
                  VALUES (?, ?, ?, ?, '[]', '{}', '{}', ?)`
  await driver.run(insert, ['uuid-old', '555', 'stale', null, 1000])
  await driver.run(insert, ['uuid-new', '555', 'fresh', null, 2000])
  assert.equal((await driver.all('SELECT * FROM user_states', [])).length, 2)

  const storage = new SqlUserStateStorage(driver)
  await storage.initialize()

  const rows = await driver.all('SELECT * FROM user_states', [])
  assert.equal(rows.length, 1, 'expected the stale duplicate to be removed')
  assert.equal(rows[0].nickname, 'fresh', 'expected the most recently updated row to survive')

  // 唯一索引装上之后，重复写入只会更新那一行
  await storage.setItem('555', { nickname: 'updated', conversations: [], settings: {}, current: {} })
  const after = await driver.all('SELECT * FROM user_states', [])
  assert.equal(after.length, 1)
  assert.equal(after[0].nickname, 'updated')
  assert.equal(after[0].id, 'uuid-new', 'expected the surrogate id to stay put across updates')
})

test('channels: listItemsByModel still matches on a serialised model list', async () => {
  const driver = new SqliteDriver(tempDbPath())
  await driver.ready()
  const storage = new SqlChannelStorage(driver)
  await storage.initialize()

  await storage.setItem('c1', { name: 'a', adapterType: 'openai', type: 'openai', models: ['gpt-4', 'gpt-5'] })
  await storage.setItem('c2', { name: 'b', adapterType: 'claude', type: 'claude', models: ['claude-opus'] })

  assert.deepEqual((await storage.listItemsByModel('gpt-5')).map(c => c.id), ['c1'])
  assert.deepEqual((await storage.listItemsByModel('claude-opus')).map(c => c.id), ['c2'])
  assert.equal((await storage.listItemsByModel('nope')).length, 0)
})

test('chat_presets: getPresetByPrefix finds the preset', async () => {
  const driver = new SqliteDriver(tempDbPath())
  await driver.ready()
  const storage = new SqlChatPresetStorage(driver)
  await storage.initialize()

  await storage.setItem('p1', { name: 'x', prefix: '#chat', sendMessageOption: {} })
  assert.equal((await storage.getPresetByPrefix('#chat')).id, 'p1')
  assert.equal(await storage.getPresetByPrefix('#missing'), null)
})
