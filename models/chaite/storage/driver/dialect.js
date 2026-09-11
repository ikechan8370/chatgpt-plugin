/**
 * 方言差异。
 *
 * 九个 Chaite storage 的 SQL 其实高度一致——都是「TEXT 主键 + 几个用于过滤的
 * 提升列 + 若干 JSON 列」的键值表，没有任何 JOIN。真正随数据库变化的只有三件
 * 事：占位符写法、upsert 语法、建表时的类型名。这里把这三件事收敛掉，其余
 * SQL 由 sql_storage.js 共用一份。
 */

/** 逻辑类型 → 各方言的实际列类型 */
const TYPES = {
  sqlite: {
    text: 'TEXT',
    int: 'INTEGER',
    bigint: 'INTEGER',
    // SQLite 没有布尔类型，历史数据里存的是 0/1；Postgres 这边也继续用整数，
    // 免得同一份 toRecord/fromRecord 要为两种表示分叉。
    bool: 'INTEGER',
    json: 'TEXT',
    blob: 'BLOB'
  },
  postgres: {
    text: 'TEXT',
    int: 'INTEGER',
    bigint: 'BIGINT',
    bool: 'INTEGER',
    json: 'TEXT',
    blob: 'BYTEA'
  }
}

class Dialect {
  constructor (name) {
    this.name = name
    this.types = TYPES[name]
    if (!this.types) throw new Error(`unknown dialect: ${name}`)
  }

  get isSqlite () { return this.name === 'sqlite' }
  get isPostgres () { return this.name === 'postgres' }

  columnType (logicalType) {
    const type = this.types[logicalType]
    if (!type) throw new Error(`unknown column type: ${logicalType}`)
    return type
  }

  /** 标识符引用。两种方言都用双引号，但保留这层以便以后加 MySQL（反引号）。 */
  quoteId (name) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`unsafe identifier: ${name}`)
    }
    return `"${name}"`
  }

  /**
   * 自增主键。只有 operation_logs 之类的表用得上。
   */
  autoIncrementPk () {
    return this.isPostgres ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'
  }

  /**
   * upsert。两种方言的 ON CONFLICT 写法一致，差别在 SQLite 还允许
   * INSERT OR REPLACE——统一成 ON CONFLICT，这样两边共用一份。
   *
   * @param {string} table
   * @param {string[]} columns
   * @param {string} conflictColumn
   * @param {string[]} [immutable] 冲突时不覆盖的列，例如代理主键 id
   */
  upsert (table, columns, conflictColumn = 'id', immutable = []) {
    const cols = columns.map(c => this.quoteId(c)).join(', ')
    const placeholders = columns.map(() => '?').join(', ')
    const updates = columns
      .filter(c => c !== conflictColumn && !immutable.includes(c))
      .map(c => `${this.quoteId(c)} = EXCLUDED.${this.quoteId(c)}`)
      .join(', ')
    const table_ = this.quoteId(table)
    const conflict = this.quoteId(conflictColumn)
    // 只有主键一列时没有可更新的字段，退化成 DO NOTHING
    if (!updates) {
      return `INSERT INTO ${table_} (${cols}) VALUES (${placeholders}) ON CONFLICT(${conflict}) DO NOTHING`
    }
    return `INSERT INTO ${table_} (${cols}) VALUES (${placeholders}) ON CONFLICT(${conflict}) DO UPDATE SET ${updates}`
  }

  /**
   * 建表。columns 是 {列名: 逻辑类型或 {type, notNull, default, pk}} 。
   */
  createTable (table, columns) {
    const defs = Object.entries(columns).map(([name, spec]) => {
      const opts = typeof spec === 'string' ? { type: spec } : spec
      let def = `${this.quoteId(name)} ${opts.autoIncrement ? this.autoIncrementPk() : this.columnType(opts.type)}`
      if (opts.pk && !opts.autoIncrement) def += ' PRIMARY KEY'
      if (opts.notNull) def += ' NOT NULL'
      if (opts.default !== undefined) def += ` DEFAULT ${formatDefault(opts.default)}`
      return def
    })
    return `CREATE TABLE IF NOT EXISTS ${this.quoteId(table)} (${defs.join(', ')})`
  }

  createIndex (table, columns, { name, unique = false, order = '' } = {}) {
    const indexName = name || `idx_${table}_${columns.join('_')}`
    const cols = columns.map(c => `${this.quoteId(c)}${order ? ` ${order}` : ''}`).join(', ')
    return `CREATE${unique ? ' UNIQUE' : ''} INDEX IF NOT EXISTS ${this.quoteId(indexName)} ON ${this.quoteId(table)} (${cols})`
  }
}

function formatDefault (value) {
  if (typeof value === 'number') return String(value)
  if (value === null) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

export function createDialect (name) {
  return new Dialect(name)
}

export { Dialect }
