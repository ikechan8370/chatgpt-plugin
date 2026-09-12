import { ChaiteStorage, ChatPreset } from 'chaite'
import { invalidatePresetPrefixIndex } from '../../../../utils/presetCache.js'

/**
 * @extends {ChaiteStorage<import('chaite').ChatPreset>}
 */
export class LowDBChatPresetsStorage extends ChaiteStorage {
  getName () {
    return 'LowDBChatPresetsStorage'
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
    this.collection = this.storage.collection('chat_presets')
  }

  /**
   *
   * @param key
   * @returns {Promise<import('chaite').ChatPreset>}
   */
  async getItem (key) {
    const obj = await this.collection.findOne({ id: key })
    if (!obj) {
      return null
    }
    return new ChatPreset(obj)
  }

  /**
   *
   * @param {string} id
   * @param {import('chaite').ChatPreset} preset
   * @returns {Promise<string>}
   */
  async setItem (id, preset) {
    // 预设前缀变了要让缓存的索引失效，否则改完预设最长要等一个 TTL 才生效
    invalidatePresetPrefixIndex()
    if (id && await this.getItem(id)) {
      await this.collection.updateById(id, preset)
      return id
    }
    const result = await this.collection.insert(preset)
    return result.id
  }

  /**
   *
   * @param {string} key
   * @returns {Promise<void>}
   */
  async removeItem (key) {
    invalidatePresetPrefixIndex()
    await this.collection.deleteById(key)
  }

  /**
   *
   * @returns {Promise<import('chaite').ChatPreset[]>}
   */
  async listItems () {
    const list = await this.collection.findAll()
    return list.map(item => new ChatPreset({}).fromString(JSON.stringify(item)))
  }

  /**
   *
   * @param {Record<string, unknown>} filter
   * @returns {Promise<import('chaite').ChatPreset[]>}
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
   * @returns {Promise<import('chaite').ChatPreset[]>}
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
