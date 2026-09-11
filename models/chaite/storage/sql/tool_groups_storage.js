import { SqlKvStorage, parseJson } from '../sql_storage.js'
import { stampTimestamps } from './channel_storage.js'

const spec = {
  table: 'tools_groups',
  columns: {
    id: { type: 'text', pk: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    toolIds: { type: 'json', notNull: true },
    isDefault: { type: 'bool', default: 0 },
    createdAt: { type: 'text' },
    updatedAt: { type: 'text' }
  },
  indexes: [
    { columns: ['name'], name: 'idx_tools_groups_name' }
  ],
  filterable: ['id', 'name', 'description', 'isDefault'],
  boolean: ['isDefault'],
  toRecord (group, id) {
    const { name, description, toolIds, isDefault, createdAt, updatedAt } = group
    return {
      id,
      name: name || '',
      description: description || '',
      toolIds: JSON.stringify(toolIds || []),
      isDefault: isDefault ? 1 : 0,
      createdAt: createdAt || '',
      updatedAt: updatedAt || ''
    }
  },
  fromRecord (record) {
    if (!record) return null
    return {
      ...record,
      toolIds: parseJson(record.toolIds, []),
      isDefault: Boolean(record.isDefault)
    }
  }
}

/**
 * @extends {SqlKvStorage<import('chaite').ToolsGroupDTO>}
 */
export class SqlToolsGroupStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlToolsGroupStorage' }

  async setItem (id, group) {
    stampTimestamps(group)
    return super.setItem(id, group)
  }
}

export { spec as toolsGroupSpec }
