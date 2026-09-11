import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

globalThis.logger ??= { debug () {}, info () {}, warn () {}, error () {}, mark () {} }

const {
  SqliteDriver,
  SqlChannelStorage,
  SqlChatPresetStorage,
  SqlToolsStorage,
  SqlTriggerStorage,
  SqlProcessorsStorage,
  SqlToolsGroupStorage,
  SqlUserStateStorage,
  SqlMcpServerStorage,
  SqlHistoryManager
} = await import('chaite')

/**
 * 老数据兼容性。
 *
 * 存储层搬到 chaite 之后，插件里那份实现连同它的 parity 测试一起删掉了。但要保证的
 * 东西没变：**升级后必须能读懂升级前写下的 data.db**。
 *
 * 所以这里不再拿新旧两份实现对比，而是直接按 3.1.x 的建表语句手工建表、按当时的
 * 编码方式插入数据，再用 chaite 的 storage 读。这样断言的是真实的磁盘格式，比对比
 * 两份 JS 实现更接近要保护的东西——就算两份实现一起改错了，这个测试也会挂。
 *
 * 下面每段 DDL 都是从 3.1.x 的 models/chaite/storage/sqlite/*.js 里原样抄来的。
 */

const LEGACY_SCHEMA = {
  channels: `CREATE TABLE channels (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    adapterType TEXT NOT NULL, type TEXT NOT NULL,
    weight INTEGER DEFAULT 1, priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'enabled', disabledReason TEXT,
    models TEXT, options TEXT, statistics TEXT, uploader TEXT,
    cloudId INTEGER, createdAt TEXT, updatedAt TEXT, md5 TEXT,
    embedded INTEGER DEFAULT 0, extra TEXT
  )`,
  chat_presets: `CREATE TABLE chat_presets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    prefix TEXT NOT NULL, local INTEGER DEFAULT 1, namespace TEXT,
    sendMessageOption TEXT NOT NULL, cloudId INTEGER,
    createdAt TEXT, updatedAt TEXT, md5 TEXT,
    embedded INTEGER DEFAULT 0, uploader TEXT, extraData TEXT
  )`,
  tools: `CREATE TABLE tools (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    modelType TEXT, code TEXT, cloudId INTEGER, embedded INTEGER,
    uploader TEXT, createdAt TEXT, updatedAt TEXT, md5 TEXT,
    status TEXT, permission TEXT, extraData TEXT
  )`,
  triggers: `CREATE TABLE triggers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    modelType TEXT, code TEXT, cloudId INTEGER, embedded INTEGER,
    uploader TEXT, createdAt TEXT, updatedAt TEXT, md5 TEXT,
    status TEXT, permission TEXT, isOneTime INTEGER, extraData TEXT
  )`,
  processors: `CREATE TABLE processors (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    type TEXT NOT NULL, code TEXT, cloudId INTEGER,
    createdAt TEXT, updatedAt TEXT, md5 TEXT,
    embedded INTEGER DEFAULT 0, uploader TEXT, extraData TEXT
  )`,
  tools_groups: `CREATE TABLE tools_groups (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    toolIds TEXT NOT NULL, isDefault INTEGER DEFAULT 0,
    createdAt TEXT, updatedAt TEXT
  )`,
  user_states: `CREATE TABLE user_states (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, nickname TEXT, card TEXT,
    conversations TEXT NOT NULL, settings TEXT NOT NULL, current TEXT NOT NULL,
    updatedAt INTEGER
  )`,
  mcp_servers: `CREATE TABLE mcp_servers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
    updatedAt INTEGER NOT NULL, payload TEXT NOT NULL
  )`,
  history: `CREATE TABLE history (
    id TEXT PRIMARY KEY, parentId TEXT, conversationId TEXT,
    role TEXT, messageData TEXT, createdAt TEXT
  )`
}

function tempDir (prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

/** 造一个 3.1.x 格式的库，表结构和数据都按当年的样子写进去。 */
async function legacyDatabase (tables) {
  const driver = new SqliteDriver(path.join(tempDir('legacy-'), 'data.db'))
  await driver.ready()
  for (const table of tables) {
    await driver.exec(LEGACY_SCHEMA[table])
  }
  return driver
}

test('channels: 老行能被读成完整的 Channel', async () => {
  const driver = await legacyDatabase(['channels'])
  await driver.run(
    `INSERT INTO channels (id, name, description, adapterType, type, weight, priority, status,
      disabledReason, models, options, statistics, uploader, cloudId, createdAt, updatedAt, md5, embedded, extra)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      'c1', '老渠道', '描述', 'openai', 'openai', 3, 7, 'enabled', null,
      JSON.stringify([{ name: 'gpt-4', features: ['chat', 'tool'] }]),
      JSON.stringify({ apiKey: 'sk-legacy', baseUrl: 'https://example.com' }),
      JSON.stringify({ callTimes: 12, useToken: 345 }),
      null, 42, '2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z', 'abc123', 1, null
    ]
  )

  const storage = new SqlChannelStorage(driver)
  await storage.initialize()
  const channel = await storage.getItem('c1')

  assert.equal(channel.name, '老渠道')
  assert.equal(channel.adapterType, 'openai')
  assert.equal(channel.weight, 3)
  assert.equal(channel.priority, 7)
  assert.equal(channel.embedded, true)
  assert.equal(channel.models[0].name, 'gpt-4')
  assert.equal(channel.options.apiKey, 'sk-legacy')
  assert.equal(channel.statistics.callTimes, 12)
  assert.equal(channel.createdAt, '2024-01-01T00:00:00.000Z')
  await driver.close()
})

test('channels: initialize 对已存在的老表是幂等的，不会动数据', async () => {
  const driver = await legacyDatabase(['channels'])
  await driver.run(
    'INSERT INTO channels (id, name, adapterType, type, models) VALUES (?,?,?,?,?)',
    ['c1', 'keep me', 'openai', 'openai', '[]']
  )

  // CREATE TABLE IF NOT EXISTS 遇到老表应该直接跳过
  const storage = new SqlChannelStorage(driver)
  await storage.initialize()
  await storage.initialize()

  assert.equal((await storage.listItems()).length, 1)
  assert.equal((await storage.getItem('c1')).name, 'keep me')
  await driver.close()
})

test('chat_presets: local/embedded 的 0/1 编码保持原义', async () => {
  const driver = await legacyDatabase(['chat_presets'])
  await driver.run(
    `INSERT INTO chat_presets (id, name, description, prefix, local, namespace,
       sendMessageOption, cloudId, createdAt, updatedAt, md5, embedded, uploader, extraData)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['p1', '预设', '描述', '#chat', 0, 'ns', JSON.stringify({ model: 'gpt-4', temperature: 0.7 }),
      null, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'md5', 1, null, null]
  )

  const storage = new SqlChatPresetStorage(driver)
  await storage.initialize()
  const preset = await storage.getItem('p1')

  assert.equal(preset.prefix, '#chat')
  assert.equal(preset.local, false, 'local=0 应该读成 false')
  assert.equal(preset.embedded, true, 'embedded=1 应该读成 true')
  assert.equal(preset.sendMessageOption.temperature, 0.7)
  assert.equal((await storage.getPresetByPrefix('#chat')).id, 'p1')
  await driver.close()
})

test('tools 与 triggers: 提升列原样读回，extraData 保持原有行为', async () => {
  const driver = await legacyDatabase(['tools', 'triggers'])
  await driver.run(
    `INSERT INTO tools (id, name, description, modelType, code, cloudId, embedded,
       uploader, createdAt, updatedAt, md5, status, permission, extraData)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['t1', '工具', '描述', 'executable', 'export default 1', null, 0,
      JSON.stringify({ id: 9, name: 'someone' }), '2024-01-01T00:00:00.000Z',
      '2024-01-01T00:00:00.000Z', 'md5', 'enabled', 'public',
      JSON.stringify({ customField: '自定义' })]
  )
  await driver.run(
    `INSERT INTO triggers (id, name, description, modelType, code, cloudId, embedded,
       uploader, createdAt, updatedAt, md5, status, permission, isOneTime, extraData)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['tr1', '触发器', '描述', 'executable', 'export default 1', null, 0, null,
      '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'md5', 'enabled', 'public', 1, null]
  )

  const tools = new SqlToolsStorage(driver)
  const triggers = new SqlTriggerStorage(driver)
  await tools.initialize()
  await triggers.initialize()

  const tool = await tools.getItem('t1')
  assert.equal(tool.name, '工具')
  assert.equal(tool.permission, 'public')
  assert.equal(tool.uploader.name, 'someone')

  // extraData 里的未知字段读出来会被丢掉：DTO 的构造函数（AbstractShareable）
  // 只搬它认识的字段。这是 3.1.x 就有的行为——老代码同样写了 ...extraData，
  // 同样不生效——这里固定住，免得当成本次改造引入的回归。
  assert.equal(tool.customField, undefined, 'extraData 的未知字段不会摊回实体，与改造前一致')
  // 但列本身没被动过
  const row = await driver.get('SELECT extraData FROM tools WHERE id = ?', ['t1'])
  assert.equal(JSON.parse(row.extraData).customField, '自定义', 'extraData 列本身应保持不变')

  const trigger = await triggers.getItem('tr1')
  assert.equal(trigger.isOneTime, true)
  await driver.close()
})

test('processors: pre/post 类型原样读回', async () => {
  const driver = await legacyDatabase(['processors'])
  await driver.run(
    `INSERT INTO processors (id, name, description, type, code, cloudId,
       createdAt, updatedAt, md5, embedded, uploader, extraData)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['pr1', '处理器', '描述', 'pre', 'export default 1', null,
      '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'md5', 0, null, null]
  )

  const storage = new SqlProcessorsStorage(driver)
  await storage.initialize()
  const processor = await storage.getItem('pr1')
  assert.equal(processor.type, 'pre')
  assert.equal(processor.code, 'export default 1')
  await driver.close()
})

test('tools_groups: toolIds 的 JSON 数组能读回', async () => {
  const driver = await legacyDatabase(['tools_groups'])
  await driver.run(
    'INSERT INTO tools_groups (id, name, description, toolIds, isDefault, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)',
    ['g1', '工具组', '描述', JSON.stringify(['t1', 't2']), 1, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z']
  )

  const storage = new SqlToolsGroupStorage(driver)
  await storage.initialize()
  const group = await storage.getItem('g1')
  assert.deepEqual(group.toolIds, ['t1', 't2'])
  assert.equal(group.isDefault, true)
  await driver.close()
})

test('user_states: 按 userId 读，代理主键 id 不受影响', async () => {
  const driver = await legacyDatabase(['user_states'])
  await driver.run(
    `INSERT INTO user_states (id, userId, nickname, card, conversations, settings, current, updatedAt)
     VALUES (?,?,?,?,?,?,?,?)`,
    ['legacy-uuid', '10001', '昵称', '群名片',
      JSON.stringify([{ id: 'c1', name: '会话', lastMessageId: 'm1' }]),
      JSON.stringify({ preset: 'p1', temperature: 0.5 }),
      JSON.stringify({ conversationId: 'c1', messageId: 'm1' }), 1700000000000]
  )

  const storage = new SqlUserStateStorage(driver)
  await storage.initialize()

  const state = await storage.getItem('10001')
  assert.equal(state.nickname, '昵称')
  assert.equal(state.conversations[0].id, 'c1')
  assert.equal(state.settings.temperature, 0.5)

  // 写回之后代理主键必须还是老的那个
  await storage.setItem('10001', { ...state, nickname: '新昵称' })
  const row = await driver.get('SELECT id, nickname FROM user_states WHERE userId = ?', ['10001'])
  assert.equal(row.id, 'legacy-uuid', '升级不应该换掉已有行的代理主键')
  assert.equal(row.nickname, '新昵称')
  await driver.close()
})

test('mcp_servers: payload 就是整条记录', async () => {
  const driver = await legacyDatabase(['mcp_servers'])
  const payload = { id: 'm1', name: 'server', enabled: true, updatedAt: 1700000000000, transport: 'stdio', command: 'node' }
  await driver.run(
    'INSERT INTO mcp_servers (id, name, enabled, updatedAt, payload) VALUES (?,?,?,?,?)',
    ['m1', 'server', 1, 1700000000000, JSON.stringify(payload)]
  )

  const storage = new SqlMcpServerStorage(driver)
  await storage.initialize()
  assert.deepEqual(await storage.getItem('m1'), payload)
  await driver.close()
})

test('history: 老消息链和图片引用都能读回', async () => {
  const driver = await legacyDatabase(['history'])
  const imagesDir = tempDir('legacy-img-')
  // 老格式：messageData 里存的是 $image:md5:ext 引用，图片本体在 images 目录
  const md5 = 'd41d8cd98f00b204e9800998ecf8427e'
  fs.writeFileSync(path.join(imagesDir, `${md5}.jpg`), Buffer.from('fake image bytes'))

  await driver.run(
    'INSERT INTO history (id, parentId, conversationId, role, messageData, createdAt) VALUES (?,?,?,?,?,?)',
    ['m1', null, 'conv1', 'user',
      JSON.stringify({ id: 'm1', parentId: null, role: 'user', content: [{ type: 'text', text: '你好' }] }),
      '2024-01-01T00:00:00.000Z']
  )
  await driver.run(
    'INSERT INTO history (id, parentId, conversationId, role, messageData, createdAt) VALUES (?,?,?,?,?,?)',
    ['m2', 'm1', 'conv1', 'assistant',
      JSON.stringify({ id: 'm2', parentId: 'm1', role: 'assistant', content: [{ type: 'image', image: `$image:${md5}:.jpg` }] }),
      '2024-01-01T00:00:01.000Z']
  )

  const manager = new SqlHistoryManager(driver, imagesDir)
  await manager.initialize()

  const chain = await manager.getHistory('m2')
  assert.deepEqual(chain.map(m => m.id), ['m1', 'm2'], '老的 parentId 链应该还能走通')
  assert.equal(chain[0].content[0].text, '你好')
  // 图片引用应该被还原成 base64
  assert.equal(chain[1].content[0].image, Buffer.from('fake image bytes').toString('base64'))
  await driver.close()
})

test('所有表的建表语句对老库都是 IF NOT EXISTS，不会重建', async () => {
  const driver = await legacyDatabase(Object.keys(LEGACY_SCHEMA))
  // 老库里每张表塞一行，initialize 之后必须都还在
  await driver.run('INSERT INTO channels (id, name, adapterType, type, models) VALUES (?,?,?,?,?)', ['c1', 'n', 'openai', 'openai', '[]'])
  await driver.run('INSERT INTO tools_groups (id, name, toolIds) VALUES (?,?,?)', ['g1', 'n', '[]'])

  for (const Storage of [SqlChannelStorage, SqlChatPresetStorage, SqlToolsStorage, SqlTriggerStorage,
    SqlProcessorsStorage, SqlToolsGroupStorage, SqlUserStateStorage, SqlMcpServerStorage]) {
    const storage = new Storage(driver)
    await storage.initialize()
  }

  assert.equal((await driver.all('SELECT id FROM channels', [])).length, 1)
  assert.equal((await driver.all('SELECT id FROM tools_groups', [])).length, 1)
  await driver.close()
})
