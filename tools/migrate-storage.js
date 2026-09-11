/**
 * 把 SQLite 里的数据整体搬到 Postgres。
 *
 * 换 chaite.db.dialect 不会自动带走数据——两边是各自独立的库，直接改配置重启
 * 等于从空库开始。这个脚本负责把老数据搬过去。
 *
 * 用法（在 Miao-Yunzai 根目录执行）：
 *
 *   node ./plugins/chatgpt-plugin/tools/migrate-storage.js            # 真正搬
 *   node ./plugins/chatgpt-plugin/tools/migrate-storage.js --dry-run  # 只看会搬多少
 *
 * 目标端的连接信息取自插件配置里的 chaite.db，所以先把那段填好（dialect 可以还
 * 是 sqlite，脚本只看连接参数）。
 *
 * 搬运是幂等的：走 upsert，中断之后重跑不会产生重复行。原来的 SQLite 文件不会
 * 被改动，确认无误之前可以随时切回去。
 */
import path from 'node:path'
import fs from 'node:fs'

// 这个脚本在 Bot 进程之外跑，logger 得自己造一个
globalThis.logger ??= {
  debug () {},
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  mark: (...args) => console.log(...args)
}

const DRY_RUN = process.argv.includes('--dry-run')

const { SqliteDriver, createPostgresDriver, migrateSqlStorage, getChaiteTables } = await import('chaite')
const { default: ChatGPTConfig } = await import('../config/config.js')

const dataDir = path.resolve('./plugins/chatgpt-plugin', ChatGPTConfig.chaite?.dataDir || 'data')
const db = ChatGPTConfig.chaite?.db || {}

if (!db.database) {
  console.error('缺少 chaite.db.database，请先在插件配置里填好 Postgres 连接信息')
  process.exit(1)
}

const SQLITE_FILES = { main: 'data.db', history: 'history.db', operation_logs: 'operation_logs.db' }

const sources = {}
for (const [name, file] of Object.entries(SQLITE_FILES)) {
  const filePath = path.join(dataDir, file)
  if (!fs.existsSync(filePath)) {
    console.log(`跳过 ${file}：文件不存在`)
    continue
  }
  const driver = new SqliteDriver(filePath)
  await driver.ready()
  sources[name] = driver
}

if (Object.keys(sources).length === 0) {
  console.error(`在 ${dataDir} 下没找到任何 SQLite 数据文件`)
  process.exit(1)
}

console.log(`源: ${dataDir}`)
console.log(`目标: postgres://${db.host || '127.0.0.1'}:${db.port || 5432}/${db.database}\n`)

if (DRY_RUN) {
  console.log('--dry-run：只统计行数，不写目标库\n')
  let total = 0
  for (const shape of getChaiteTables()) {
    const source = sources[shape.database]
    if (!source) continue
    const exists = await source.get(
      'SELECT name FROM sqlite_master WHERE type = \'table\' AND name = ?', [shape.table]
    )
    if (!exists) {
      console.log(`  ${shape.table.padEnd(18)} 源端无此表`)
      continue
    }
    const row = await source.get(`SELECT COUNT(*) AS c FROM "${shape.table}"`, [])
    const count = Number(row?.c || 0)
    total += count
    console.log(`  ${shape.table.padEnd(18)} ${String(count).padStart(9)} 行`)
  }
  console.log(`\n合计 ${total} 行待搬运`)
  await Promise.all(Object.values(sources).map(d => d.close()))
  process.exit(0)
}

const target = await createPostgresDriver({
  dialect: 'postgres',
  host: db.host,
  port: db.port,
  database: db.database,
  username: db.username,
  password: db.password,
  ssl: db.ssl,
  pool: db.pool
})
console.log('已连接目标库，开始搬运……\n')

const startedAt = Date.now()
const result = await migrateSqlStorage({
  from: name => sources[name],
  // 三个逻辑库在 Postgres 下共用一个连接
  to: () => target,
  onProgress: progress => {
    if (progress.skipped) console.log(`  ${progress.table.padEnd(18)} 跳过（${progress.reason}）`)
    else console.log(`  ${progress.table.padEnd(18)} ${String(progress.copied).padStart(9)} 行`)
  }
})

const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
console.log(`\n完成：共 ${result.total} 行，用时 ${seconds}s`)
console.log('\n接下来：')
console.log('  1. 把插件配置里的 chaite.db.dialect 改成 postgres')
console.log('  2. 重启 Bot，确认数据正常')
console.log(`  3. 原 SQLite 文件仍保留在 ${dataDir}，确认无误后再自行清理`)

await Promise.all([...Object.values(sources).map(d => d.close()), target.close()])
