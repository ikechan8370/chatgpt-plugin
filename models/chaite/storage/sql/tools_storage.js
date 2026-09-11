import { ToolDTO } from 'chaite'
import { SqlKvStorage, parseJson, stringifyJson } from '../sql_storage.js'
import { stampTimestamps } from './channel_storage.js'

const spec = {
  table: 'tools',
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
    extraData: { type: 'json' }
  },
  indexes: [
    { columns: ['name'], name: 'idx_tools_name' },
    { columns: ['status'], name: 'idx_tools_status' },
    { columns: ['permission'], name: 'idx_tools_permission' }
  ],
  filterable: ['id', 'name', 'description', 'modelType', 'cloudId', 'md5', 'status', 'permission', 'embedded'],
  boolean: ['embedded'],
  toRecord (tool, id) {
    const {
      id: _ignored, name, description, modelType, code, cloudId,
      embedded, uploader, createdAt, updatedAt, md5,
      status, permission, ...rest
    } = tool

    return {
      id,
      name: name || '',
      description: description || '',
      modelType: modelType || '',
      code: code || null,
      cloudId: cloudId || null,
      embedded: embedded ? 1 : 0,
      uploader: stringifyJson(uploader),
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      status: status || 'enabled',
      permission: permission || 'public',
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  },
  fromRecord (record) {
    if (!record) return null
    return new ToolDTO({
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
      ...parseJson(record.extraData, {})
    })
  }
}

/**
 * @extends {SqlKvStorage<import('chaite').ToolDTO>}
 */
export class SqlToolsStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlToolsStorage' }

  async setItem (id, tool) {
    stampTimestamps(tool)
    return super.setItem(id, tool)
  }
}

export { spec as toolsSpec }
