import { ChaiteStorage, Channel } from 'chaite'

export class LowDBChannelStorage extends ChaiteStorage {
  getName () {
    return 'LowDBChannelStorage'
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
    this.collection = this.storage.collection('channel')
  }

  /**
   *
   * @param {string} key
   * @returns {Promise<import('chaite').Channel>}
   */
  async getItem (key) {
    const obj = await this.collection.findOne({ id: key })
    if (!obj) {
      return null
    }
    return new Channel(obj)
  }

  /**
   *
   * @param {string} id
   * @param {import('chaite').Channel} channel
   * @returns {Promise<string>}
   */
  async setItem (id, channel) {
    if (id && await this.getItem(id)) {
      await this.collection.updateById(id, channel)
      return id
    }
    const result = await this.collection.insert(channel)
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
   * @returns {Promise<import('chaite').Channel[]>}
   */
  async listItems () {
    const list = await this.collection.findAll()
    return list.map(item => new Channel({}).fromString(JSON.stringify(item)))
  }

  /**
   *
   * @param {Record<string, unknown>} filter
   * @returns {Promise<import('chaite').Channel[]>}
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
   * @returns {Promise<import('chaite').Channel[]>}
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
