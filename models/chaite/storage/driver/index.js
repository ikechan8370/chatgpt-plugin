import path from 'path'
import { SqliteDriver } from './sqlite_driver.js'
import { createPgDriver } from './pg_driver.js'

/**
 * driver 注册表。
 *
 * 插件在逻辑上有三个库：main（渠道、预设、工具等）、history（对话历史）、
 * operation_logs（操作日志）。SQLite 下它们是三个文件——历史库会长到几百 MB，
 * 拆开是为了让 VACUUM 只重写真正需要的那个；Postgres 下它们共用一个连接池，
 * 靠表名区分就够了。
 *
 * 调用方只认 'main' / 'history' / 'operation_logs' 这三个逻辑名，不关心背后
 * 是文件还是连接池。
 */

export const DB_MAIN = 'main'
export const DB_HISTORY = 'history'
export const DB_OPERATION_LOGS = 'operation_logs'

const SQLITE_FILES = {
  [DB_MAIN]: 'data.db',
  [DB_HISTORY]: 'history.db',
  [DB_OPERATION_LOGS]: 'operation_logs.db'
}

/** @type {Map<string, object>} */
const drivers = new Map()
let initialized = false
let sharedPgDriver = null

/**
 * 启动时调用一次。
 *
 * @param {object} options
 * @param {'sqlite'|'postgres'} options.dialect
 * @param {string} options.dataDir SQLite 的数据目录
 * @param {object} [options.connection] Postgres 连接配置
 */
export async function initDrivers (options) {
  if (initialized) return
  const dialect = options.dialect || 'sqlite'

  if (dialect === 'sqlite') {
    for (const [name, file] of Object.entries(SQLITE_FILES)) {
      const driver = new SqliteDriver(path.join(options.dataDir, file))
      await driver.ready()
      drivers.set(name, driver)
    }
  } else if (dialect === 'postgres') {
    // 三个逻辑库共用一个连接池：表名本身已经不重合，再开三个池只是浪费连接数
    sharedPgDriver = await createPgDriver(options.connection || {})
    for (const name of Object.keys(SQLITE_FILES)) {
      drivers.set(name, sharedPgDriver)
    }
  } else {
    throw new Error(`不支持的数据库方言 chaite.db.dialect=${dialect}，可选值：sqlite、postgres`)
  }

  initialized = true
}

/**
 * @param {string} name DB_MAIN / DB_HISTORY / DB_OPERATION_LOGS
 * @returns {object} driver
 */
export function getDriver (name) {
  const driver = drivers.get(name)
  if (!driver) {
    throw new Error(`driver '${name}' 尚未初始化，请先调用 initDrivers()`)
  }
  return driver
}

export function isInitialized () {
  return initialized
}

export async function closeDrivers () {
  const closed = new Set()
  for (const driver of drivers.values()) {
    if (closed.has(driver)) continue
    closed.add(driver)
    await driver.close()
  }
  drivers.clear()
  sharedPgDriver = null
  initialized = false
}

/**
 * 仅供测试：注入一个现成的 driver。
 */
export function registerDriverForTest (name, driver) {
  drivers.set(name, driver)
  initialized = true
}

export { SqliteDriver }
