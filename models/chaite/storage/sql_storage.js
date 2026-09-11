import { ChaiteStorage } from 'chaite'
import { generateId } from '../../../utils/common.js'

/**
 * 九个 Chaite storage 的公共实现。
 *
 * 它们在关系型意义上其实都不是关系数据：一个 TEXT 主键、几个为了能下推过滤而
 * 提升出来的列、剩下的塞进 JSON 列，全仓 108 条 SELECT 里没有一个 JOIN。所以
 * 这里不引入 ORM，只把「键值表 + 提升列」这个形状抽出来共用一份。
 *
 * 子类只需要给出一份 spec（表名、列、索引、可下推的过滤列、两个序列化函数），
 * 七个 ChaiteStorage 方法由这里统一实现，SQL 一份，方言差异由 driver 兜住。
 *
 * @template T
 * @extends {ChaiteStorage<T>}
 */
export class SqlKvStorage extends ChaiteStorage {
  /**
   * @param {object} driver 来自 storage/driver
   * @param {object} spec
   * @param {string} spec.table 表名
   * @param {Record<string, object|string>} spec.columns 列定义，见 dialect.createTable
   * @param {string} [spec.keyColumn] 主键列，默认 'id'。user_states 用 userId 做业务主键
   * @param {Array<{columns: string[], unique?: boolean, name?: string}>} [spec.indexes]
   * @param {string[]} [spec.filterable] 可以下推到 SQL 的列；其余条件在内存里过滤
   * @param {string[]} [spec.numeric] 过滤时需要 Number() 归一的列
   * @param {string[]} [spec.boolean] 过滤时需要归一成 0/1 的列
   * @param {string} [spec.orderBy] listItems 的排序，如 'updatedAt DESC'
   * @param {(entity: T, id: string) => Record<string, unknown>} spec.toRecord
   * @param {(record: Record<string, unknown>) => T} spec.fromRecord
   */
  constructor (driver, spec) {
    super()
    this.driver = driver
    this.spec = spec
    this.table = spec.table
    this.keyColumn = spec.keyColumn || 'id'
    this.initialized = false
    this._initPromise = null
  }

  get dialect () { return this.driver.dialect }

  /** 建表与索引。重复调用是安全的。 */
  async initialize () {
    if (this.initialized) return
    if (this._initPromise) return this._initPromise

    this._initPromise = (async () => {
      const dialect = this.dialect
      await this.driver.exec(dialect.createTable(this.table, this.spec.columns))
      for (const index of this.spec.indexes || []) {
        await this.driver.exec(dialect.createIndex(this.table, index.columns, index))
      }
      this.initialized = true
    })().catch(error => {
      // 不要把失败的 promise 留在字段里，否则一次偶发失败会让这张表到重启为止
      // 都初始化不了
      this._initPromise = null
      throw error
    })

    return this._initPromise
  }

  async ensureInitialized () {
    if (!this.initialized) await this.initialize()
  }

  _q (name) { return this.dialect.quoteId(name) }

  _orderClause () {
    if (!this.spec.orderBy) return ''
    const [column, direction = 'ASC'] = this.spec.orderBy.split(/\s+/)
    const dir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
    return ` ORDER BY ${this._q(column)} ${dir}`
  }

  async getItem (key) {
    await this.ensureInitialized()
    const row = await this.driver.get(
      `SELECT * FROM ${this._q(this.table)} WHERE ${this._q(this.keyColumn)} = ?`,
      [key]
    )
    return row ? this.spec.fromRecord(row) : null
  }

  async setItem (id, value) {
    await this.ensureInitialized()
    const key = id || generateId()
    const record = this.spec.toRecord(value, key)
    record[this.keyColumn] = key

    const columns = Object.keys(record)
    const sql = this.dialect.upsert(this.table, columns, this.keyColumn, this.spec.immutableColumns || [])
    await this.driver.run(sql, columns.map(c => record[c]))
    return key
  }

  async removeItem (key) {
    await this.ensureInitialized()
    await this.driver.run(
      `DELETE FROM ${this._q(this.table)} WHERE ${this._q(this.keyColumn)} = ?`,
      [key]
    )
  }

  async listItems () {
    await this.ensureInitialized()
    const rows = await this.driver.all(`SELECT * FROM ${this._q(this.table)}${this._orderClause()}`, [])
    return rows.map(row => this.spec.fromRecord(row)).filter(Boolean)
  }

  /**
   * 能下推的条件走 SQL，其余在内存里过滤——和改造前各个 storage 的行为一致。
   */
  async listItemsByEqFilter (filter) {
    await this.ensureInitialized()
    if (!filter || Object.keys(filter).length === 0) return this.listItems()

    const { clauses, params, residual } = this._splitFilter(filter)
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
    const rows = await this.driver.all(
      `SELECT * FROM ${this._q(this.table)}${where}${this._orderClause()}`,
      params
    )
    const items = rows.map(row => this.spec.fromRecord(row)).filter(Boolean)
    return this._applyResidualEq(items, residual)
  }

  async listItemsByInQuery (query) {
    await this.ensureInitialized()
    if (!Array.isArray(query) || query.length === 0) return this.listItems()
    // 任何一组候选值为空，交集必然为空
    if (query.some(({ values }) => Array.isArray(values) && values.length === 0)) return []

    const clauses = []
    const params = []
    const residual = []

    for (const { field, values } of query) {
      if (!Array.isArray(values)) continue
      if (this._isFilterable(field)) {
        clauses.push(`${this._q(field)} IN (${values.map(() => '?').join(', ')})`)
        params.push(...values.map(value => this._normalize(field, value)))
      } else {
        residual.push({ field, values })
      }
    }

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
    const rows = await this.driver.all(
      `SELECT * FROM ${this._q(this.table)}${where}${this._orderClause()}`,
      params
    )
    let items = rows.map(row => this.spec.fromRecord(row)).filter(Boolean)
    for (const { field, values } of residual) {
      items = items.filter(item => values.includes(item[field]))
    }
    return items
  }

  async clear () {
    await this.ensureInitialized()
    await this.driver.run(`DELETE FROM ${this._q(this.table)}`, [])
  }

  /**
   * 故意什么都不做。
   *
   * 一个 driver 是被八个 storage 共用的（Postgres 下更是共用同一个连接池），
   * 任何一个 storage 关掉它，其余七个就全断了。连接的生命周期归 driver 注册表
   * 管，进程退出时由 closeDrivers() 统一关闭。
   *
   * 保留这个方法是因为改造前的 storage 有 close()，去掉会改变对外形状。
   */
  async close () {}

  _isFilterable (field) {
    return (this.spec.filterable || []).includes(field)
  }

  /** 过滤值归一：数值列用 Number，布尔列用 0/1，与建表时的存储表示对齐。 */
  _normalize (field, value) {
    if ((this.spec.numeric || []).includes(field)) return Number(value)
    if ((this.spec.boolean || []).includes(field)) return value ? 1 : 0
    return value
  }

  _splitFilter (filter) {
    const clauses = []
    const params = []
    const residual = {}

    for (const [field, value] of Object.entries(filter)) {
      if (this._isFilterable(field)) {
        clauses.push(`${this._q(field)} = ?`)
        params.push(this._normalize(field, value))
      } else {
        residual[field] = value
      }
    }
    return { clauses, params, residual }
  }

  _applyResidualEq (items, residual) {
    const entries = Object.entries(residual)
    if (entries.length === 0) return items
    return items.filter(item => entries.every(([key, value]) => item[key] === value))
  }
}

/** JSON 列的读写。存坏了就当空值，不要让一条脏数据把整个列表查询打挂。 */
export function parseJson (value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function stringifyJson (value) {
  if (value === null || value === undefined) return null
  return JSON.stringify(value)
}
