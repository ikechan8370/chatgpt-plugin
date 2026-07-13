import { ChaiteStorage } from 'chaite'

/** LowDB variant for private MCP server connection settings. */
export class LowDBMcpServerStorage extends ChaiteStorage {
  constructor (storage) {
    super()
    this.collection = storage.collection('mcp_servers')
  }

  getName () { return 'LowDBMcpServerStorage' }
  async getItem (id) { return await this.collection.findOne({ id }) || null }
  async setItem (id, value) {
    if (await this.getItem(id)) {
      await this.collection.updateById(id, value)
      return id
    }
    const result = await this.collection.insert(value)
    return result.id
  }
  async removeItem (id) { await this.collection.deleteById(id) }
  async listItems () { return await this.collection.findAll() }
  async listItemsByEqFilter (filter) { return (await this.listItems()).filter(item => Object.entries(filter).every(([key, value]) => item[key] === value)) }
  async listItemsByInQuery (query) { return (await this.listItems()).filter(item => query.every(({ field, values }) => values.includes(item[field]))) }
}
