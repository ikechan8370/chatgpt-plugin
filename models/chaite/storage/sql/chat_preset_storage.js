import { ChatPreset } from 'chaite'
import { SqlKvStorage, parseJson, stringifyJson } from '../sql_storage.js'
import { invalidatePresetPrefixIndex } from '../../../../utils/presetCache.js'
import { stampTimestamps } from './channel_storage.js'

const spec = {
  table: 'chat_presets',
  columns: {
    id: { type: 'text', pk: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    prefix: { type: 'text', notNull: true },
    local: { type: 'bool', default: 1 },
    namespace: { type: 'text' },
    sendMessageOption: { type: 'json', notNull: true },
    cloudId: { type: 'int' },
    createdAt: { type: 'text' },
    updatedAt: { type: 'text' },
    md5: { type: 'text' },
    embedded: { type: 'bool', default: 0 },
    uploader: { type: 'json' },
    extraData: { type: 'json' }
  },
  indexes: [
    { columns: ['prefix'] },
    { columns: ['name'] }
  ],
  filterable: ['id', 'name', 'description', 'prefix', 'namespace', 'cloudId', 'local', 'embedded'],
  boolean: ['local', 'embedded'],
  toRecord (preset, id) {
    const {
      id: _ignored, name, description, prefix, local, namespace,
      sendMessageOption, cloudId, createdAt, updatedAt, md5,
      embedded, uploader, ...rest
    } = preset

    return {
      id,
      name: name || '',
      description: description || '',
      prefix: prefix || '',
      local: local === false ? 0 : 1,
      namespace: namespace || null,
      sendMessageOption: JSON.stringify(sendMessageOption || {}),
      cloudId: cloudId || null,
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      embedded: embedded ? 1 : 0,
      uploader: stringifyJson(uploader),
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  },
  fromRecord (record) {
    if (!record) return null
    return new ChatPreset({
      id: record.id,
      name: record.name,
      description: record.description,
      prefix: record.prefix,
      local: Boolean(record.local),
      namespace: record.namespace,
      sendMessageOption: parseJson(record.sendMessageOption, {}),
      cloudId: record.cloudId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      embedded: Boolean(record.embedded),
      uploader: parseJson(record.uploader, null),
      ...parseJson(record.extraData, {})
    })
  }
}

/**
 * @extends {SqlKvStorage<import('chaite').ChatPreset>}
 */
export class SqlChatPresetStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlChatPresetStorage' }

  async setItem (id, preset) {
    stampTimestamps(preset)
    const key = await super.setItem(id, preset)
    invalidatePresetPrefixIndex()
    return key
  }

  async removeItem (key) {
    await super.removeItem(key)
    invalidatePresetPrefixIndex()
  }

  async clear () {
    await super.clear()
    invalidatePresetPrefixIndex()
  }

  async getPresetByPrefix (prefix) {
    await this.ensureInitialized()
    const row = await this.driver.get(
      `SELECT * FROM ${this._q(this.table)} WHERE ${this._q('prefix')} = ?`,
      [prefix]
    )
    return row ? this.spec.fromRecord(row) : null
  }
}

export { spec as chatPresetSpec }
