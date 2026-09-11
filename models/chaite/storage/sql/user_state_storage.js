import * as crypto from 'node:crypto'
import { SqlKvStorage, parseJson } from '../sql_storage.js'

/**
 * user_states 的业务主键是 userId，不是 id——id 只是个随机 UUID 代理键。
 * 所以 keyColumn 指到 userId，并把 id 标成不可覆盖：同一个用户反复写入时
 * 代理键不应该跟着变。
 */
const spec = {
  table: 'user_states',
  keyColumn: 'userId',
  immutableColumns: ['id'],
  columns: {
    id: { type: 'text', pk: true },
    userId: { type: 'text', notNull: true },
    nickname: { type: 'text' },
    card: { type: 'text' },
    conversations: { type: 'json', notNull: true },
    settings: { type: 'json', notNull: true },
    current: { type: 'json', notNull: true },
    updatedAt: { type: 'bigint' }
  },
  indexes: [
    { columns: ['userId'], name: 'idx_user_states_userId' }
  ],
  filterable: ['userId', 'nickname', 'card'],
  toRecord (userState, userId) {
    const { nickname, card, conversations, settings, current } = userState
    return {
      // 新行才会用到；已存在的行由 immutableColumns 保住原值
      id: crypto.randomUUID(),
      userId,
      nickname: nickname ?? null,
      card: card ?? null,
      conversations: JSON.stringify(conversations || []),
      settings: JSON.stringify(settings || {}),
      current: JSON.stringify(current || {}),
      updatedAt: Date.now()
    }
  },
  fromRecord (record) {
    if (!record) return null
    return {
      userId: record.userId,
      nickname: record.nickname,
      card: record.card,
      conversations: parseJson(record.conversations, []),
      settings: parseJson(record.settings, {}),
      current: parseJson(record.current, {})
    }
  }
}

/**
 * @extends {SqlKvStorage<import('chaite').UserState>}
 */
export class SqlUserStateStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlUserStateStorage' }

  /**
   * 在基类建表之外，还要保证 userId 上有唯一索引——ON CONFLICT(userId) 依赖它。
   *
   * 老库只有一个普通索引，而且改造前的写入是「先 SELECT 再 INSERT/UPDATE」，
   * 两个并发请求给同一个新用户写状态时可以各插一行。所以建唯一索引之前先去重，
   * 每个 userId 只留 updatedAt 最新的那行。
   */
  async initialize () {
    if (this.initialized) return
    await super.initialize()
    await this._dedupeUserIds()
    await this.driver.exec(
      this.dialect.createIndex(this.table, ['userId'], { name: 'uniq_user_states_userId', unique: true })
    )
  }

  async _dedupeUserIds () {
    const table = this._q(this.table)
    const duplicates = await this.driver.all(
      `SELECT ${this._q('userId')} AS "userId", COUNT(*) AS "count"
       FROM ${table} GROUP BY ${this._q('userId')} HAVING COUNT(*) > 1`,
      []
    )
    if (duplicates.length === 0) return

    const total = duplicates.reduce((sum, row) => sum + Number(row.count) - 1, 0)
    globalThis.logger?.warn?.(
      `[Storage] user_states 有 ${duplicates.length} 个 userId 存在重复行，` +
      `清理 ${total} 行后建立唯一索引（保留 updatedAt 最新的一行）`
    )

    // COALESCE 是为了绕开 NULL 排序差异：SQLite 的 DESC 把 NULL 放最后，
    // Postgres 默认放最前
    await this.driver.run(
      `DELETE FROM ${table} WHERE ${this._q('id')} NOT IN (
         SELECT ${this._q('id')} FROM (
           SELECT ${this._q('id')},
                  ROW_NUMBER() OVER (
                    PARTITION BY ${this._q('userId')}
                    ORDER BY COALESCE(${this._q('updatedAt')}, 0) DESC, ${this._q('id')} DESC
                  ) AS rn
           FROM ${table}
         ) ranked WHERE rn = 1
       )`,
      []
    )
  }
}

export { spec as userStateSpec }
