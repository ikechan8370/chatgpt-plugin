import { ChaiteStorage } from 'chaite'

/**
 * @extends {ChaiteStorage<import('chaite').UserState>}
 */
export class LowDBUserStateStorage extends ChaiteStorage {
  getName () {
    return 'LowDBUserStateStorage'
  }

  /**
   *
   * @param {LowDBStorage} storage
   */
  constructor (storage) {
    super()
    this.storage = storage
    /**
     * 集合
     * @type {LowDBCollection}
     */
    this.collection = this.storage.collection('user_states')
  }

  /**
   *
   * @param {string} key
   * @returns {Promise<import('chaite').UserState>}
   */
  async getItem (key) {
    return this.collection.findOne({ id: key })
  }

  /**
   *
   * @param {string} id
   * @param {import('chaite').UserState} state
   * @returns {Promise<string>}
   */
  async setItem (id, state) {
    if (id && await this.getItem(id)) {
      await this.collection.updateById(id, state)
      return id
    }
    state.id = id
    const result = await this.collection.insert(state)
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
   * @returns {Promise<import('chaite').UserState[]>}
   */
  async listItems () {
    return this.collection.findAll()
  }

  /**
   *
   * @param {Record<string, unknown>} filter
   * @returns {Promise<import('chaite').UserState[]>}
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
   * @param {Array<{field: string, values: unknown[]}>} query
   * @returns {Promise<import('chaite').UserState[]>}
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
