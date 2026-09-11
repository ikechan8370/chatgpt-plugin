import { ChaiteStorage, ProcessorDTO } from 'chaite'

/**
 * @extends {ChaiteStorage<import('chaite').Processor>}
 */
export class LowDBProcessorsStorage extends ChaiteStorage {
  getName () {
    return 'LowDBProcessorsStorage'
  }

  /**
   *
   * @param { LowDBStorage } storage
   */
  constructor (storage) {
    super()
    this.storage = storage
    /**
     * 集合
     * @type {LowDBCollection}
     */
    this.collection = this.storage.collection('processors')
  }

  /**
   *
   * @param {string} key
   * @returns {Promise<import('chaite').Processor>}
   */
  async getItem (key) {
    const obj = await this.collection.findOne({ id: key })
    if (!obj) {
      return null
    }
    return new ProcessorDTO(obj)
  }

  /**
   *
   * @param {string} id
   * @param {import('chaite').Processor} processor
   * @returns {Promise<string>}
   */
  async setItem (id, processor) {
    if (id && await this.getItem(id)) {
      await this.collection.updateById(id, processor)
      return id
    }
    const result = await this.collection.insert(processor)
    return result.id
  }

  /**
   *
   * @param {string} key
   * @returns {Promise<void>}
   */
  async removeItem (key) {
    await this.collection.deleteById(key)
  }

  /**
   *
   * @returns {Promise<import('chaite').Processor[]>}
   */
  async listItems () {
    const list = await this.collection.findAll()
    return list.map(item => new ProcessorDTO({}).fromString(JSON.stringify(item)))
  }

  /**
   *
   * @param {Record<string, unknown>} filter
   * @returns {Promise<import('chaite').Processor[]>}
   */
  async listItemsByEqFilter (filter) {
    const allList = await this.listItems()
    return allList.filter(item => {
      for (const key in filter) {
        if (item[key] !== filter[key]) {
          return false
        }
      }
      return true
    })
  }

  /**
   *
   * @param {Array<{
   *         field: string;
   *         values: unknown[];
   *     }>} query
   * @returns {Promise<import('chaite').Processor[]>}
   */
  async listItemsByInQuery (query) {
    const allList = await this.listItems()
    return allList.filter(item => {
      for (const { field, values } of query) {
        if (!values.includes(item[field])) {
          return false
        }
      }
      return true
    })
  }

  async clear () {
    await this.collection.deleteAll()
  }
}
