import { TriggerDTO } from 'chaite'
import { SqlKvStorage, parseJson, stringifyJson } from '../sql_storage.js'
import { stampTimestamps } from './channel_storage.js'

const spec = {
  table: 'triggers',
  columns: {
    id: { type: 'text', pk: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    modelType: { type: 'text' },
    code: { type: 'text' },
    cloudId: { type: 'int' },
    embedded: { type: 'bool' },
    uploader: { type: 'json' },
    createdAt: { type: 'text' },
    updatedAt: { type: 'text' },
    md5: { type: 'text' },
    status: { type: 'text' },
    permission: { type: 'text' },
    isOneTime: { type: 'bool' },
    extraData: { type: 'json' }
  },
  indexes: [
    { columns: ['name'], name: 'idx_triggers_name' },
    { columns: ['status'], name: 'idx_triggers_status' }
  ],
  filterable: ['id', 'name', 'description', 'modelType', 'cloudId', 'md5', 'status', 'permission', 'embedded', 'isOneTime'],
  boolean: ['embedded', 'isOneTime'],
  toRecord (trigger, id) {
    const {
      id: _ignored, name, description, modelType, code, cloudId,
      embedded, uploader, createdAt, updatedAt, md5,
      status, permission, isOneTime, ...rest
    } = trigger

    return {
      id,
      name: name || '',
      description: description || '',
      modelType: modelType || 'executable',
      code: code || null,
      cloudId: cloudId || null,
      embedded: embedded ? 1 : 0,
      uploader: stringifyJson(uploader),
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      status: status || 'enabled',
      permission: permission || 'public',
      isOneTime: isOneTime ? 1 : 0,
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  },
  fromRecord (record) {
    if (!record) return null
    return new TriggerDTO({
      id: record.id,
      name: record.name,
      description: record.description,
      modelType: record.modelType,
      code: record.code,
      cloudId: record.cloudId,
      embedded: Boolean(record.embedded),
      uploader: parseJson(record.uploader, null),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      status: record.status,
      permission: record.permission,
      isOneTime: Boolean(record.isOneTime),
      ...parseJson(record.extraData, {})
    })
  }
}

/**
 * @extends {SqlKvStorage<import('chaite').TriggerDTO>}
 */
export class SqlTriggerStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlTriggerStorage' }

  async setItem (id, trigger) {
    stampTimestamps(trigger)
    return super.setItem(id, trigger)
  }
}

export default SqlTriggerStorage
export { spec as triggerSpec }
