import { Channel } from 'chaite'
import { SqlKvStorage, parseJson, stringifyJson } from '../sql_storage.js'

const spec = {
  table: 'channels',
  columns: {
    id: { type: 'text', pk: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    adapterType: { type: 'text', notNull: true },
    type: { type: 'text', notNull: true },
    weight: { type: 'int', default: 1 },
    priority: { type: 'int', default: 0 },
    status: { type: 'text', default: 'enabled' },
    disabledReason: { type: 'text' },
    models: { type: 'json' },
    options: { type: 'json' },
    statistics: { type: 'json' },
    uploader: { type: 'json' },
    cloudId: { type: 'int' },
    createdAt: { type: 'text' },
    updatedAt: { type: 'text' },
    md5: { type: 'text' },
    embedded: { type: 'bool', default: 0 },
    extra: { type: 'json' }
  },
  indexes: [
    { columns: ['type'] },
    { columns: ['status'] }
  ],
  filterable: ['id', 'name', 'description', 'adapterType', 'type', 'status', 'cloudId', 'weight', 'priority', 'embedded'],
  numeric: ['weight', 'priority'],
  boolean: ['embedded'],
  toRecord (channel, id) {
    const {
      id: _ignored, name, description, adapterType, type, weight, priority,
      status, disabledReason, models, options, statistics,
      uploader, cloudId, createdAt, updatedAt, md5, embedded, ...rest
    } = channel

    return {
      id,
      name: name || '',
      description: description || '',
      adapterType: adapterType || type || '',
      type: type || '',
      weight: weight || 1,
      priority: priority || 0,
      status: status || 'enabled',
      disabledReason: disabledReason || null,
      models: Array.isArray(models) ? JSON.stringify(models) : '[]',
      options: stringifyJson(options),
      statistics: stringifyJson(statistics),
      uploader: stringifyJson(uploader),
      cloudId: cloudId || null,
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      embedded: embedded ? 1 : 0,
      extra: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  },
  fromRecord (record) {
    if (!record) return null
    return new Channel({
      id: record.id,
      name: record.name,
      description: record.description,
      adapterType: record.adapterType,
      type: record.type,
      weight: Number(record.weight),
      priority: Number(record.priority),
      status: record.status,
      disabledReason: record.disabledReason,
      models: parseJson(record.models, []),
      options: parseJson(record.options, {}),
      statistics: parseJson(record.statistics, {}),
      uploader: parseJson(record.uploader, null),
      cloudId: record.cloudId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      embedded: Boolean(record.embedded),
      ...parseJson(record.extra, {})
    })
  }
}

/**
 * @extends {SqlKvStorage<import('chaite').Channel>}
 */
export class SqlChannelStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlChannelStorage' }

  async setItem (id, channel) {
    stampTimestamps(channel)
    return super.setItem(id, channel)
  }

  /**
   * models 存的是 JSON 数组，按子串匹配单个模型名。
   * 改造前 listItemsByEqFilter 里对 models 做了 LIKE 特判，这里保留成显式方法：
   * 藏在等值过滤里会让「等值」这个语义名不副实。
   */
  async listItemsByModel (model) {
    await this.ensureInitialized()
    const rows = await this.driver.all(
      `SELECT * FROM ${this._q(this.table)} WHERE ${this._q('models')} LIKE ?`,
      [`%${model}%`]
    )
    return rows.map(row => this.spec.fromRecord(row)).filter(Boolean)
  }
}

export function stampTimestamps (entity) {
  if (!entity.createdAt) entity.createdAt = new Date().toISOString()
  entity.updatedAt = new Date().toISOString()
  return entity
}

export { spec as channelSpec }
