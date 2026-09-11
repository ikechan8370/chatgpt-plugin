import { SqlKvStorage, parseJson } from '../sql_storage.js'

const spec = {
  table: 'mcp_servers',
  columns: {
    id: { type: 'text', pk: true },
    name: { type: 'text', notNull: true },
    enabled: { type: 'bool', notNull: true, default: 1 },
    updatedAt: { type: 'bigint', notNull: true },
    payload: { type: 'json', notNull: true }
  },
  indexes: [
    { columns: ['name'], name: 'idx_mcp_servers_name' }
  ],
  filterable: ['id', 'name', 'enabled'],
  boolean: ['enabled'],
  orderBy: 'updatedAt DESC',
  toRecord (value, id) {
    return {
      id,
      name: value.name,
      enabled: value.enabled ? 1 : 0,
      updatedAt: value.updatedAt || Date.now(),
      payload: JSON.stringify(value)
    }
  },
  fromRecord (record) {
    if (!record) return null
    return parseJson(record.payload, null)
  }
}

/**
 * MCP 连接配置。里面有凭据，所以这张表跟着主库走，不上传云端。
 * @extends {SqlKvStorage<object>}
 */
export class SqlMcpServerStorage extends SqlKvStorage {
  constructor (driver) {
    super(driver, spec)
  }

  getName () { return 'SqlMcpServerStorage' }
}

export { spec as mcpServerSpec }
