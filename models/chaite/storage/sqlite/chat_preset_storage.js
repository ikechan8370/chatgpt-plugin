import { ChaiteStorage, ChatPreset } from 'chaite'
import { openSQLiteDatabase } from './runtime.js'
import path from 'path'
import fs from 'fs'
import { generateId } from '../../../../utils/common.js'
import { invalidatePresetPrefixIndex } from '../../../../utils/presetCache.js'

/**
 * @extends {ChaiteStorage<import('chaite').ChatPreset>}
 */
export class SQLiteChatPresetStorage extends ChaiteStorage {
  getName () {
    return 'SQLiteChatPresetStorage'
  }

  /**
   *
   * @param {string} dbPath 数据库文件路径
   */
  constructor (dbPath) {
    super()
    this.dbPath = dbPath
    this.db = null
    this.initialized = false
    this.tableName = 'chat_presets'
  }

  /**
   * 初始化数据库连接和表结构
   * @returns {Promise<void>}
   */
  async initialize () {
    if (this.initialized) return

    return new Promise((resolve, reject) => {
      // 确保目录存在
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      this.db = openSQLiteDatabase(this.dbPath, async (err) => {
        if (err) {
          return reject(err)
        }

        // 创建 ChatPreset 表，将主要属性分列存储
        this.db.run(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
                                                                      id TEXT PRIMARY KEY,
                                                                      name TEXT NOT NULL,
                                                                      description TEXT,
                                                                      prefix TEXT NOT NULL,
                                                                      local INTEGER DEFAULT 1,
                                                                      namespace TEXT,
                                                                      sendMessageOption TEXT NOT NULL,
                                                                      cloudId INTEGER,
                                                                      createdAt TEXT,
                                                                      updatedAt TEXT,
                                                                      md5 TEXT,
                                                                      embedded INTEGER DEFAULT 0,
                                                                      uploader TEXT,
                                                                      extraData TEXT
                     )`, (err) => {
          if (err) {
            return reject(err)
          }

          // 创建索引提高查询性能
          const promises = [
            new Promise((resolve, reject) => {
              this.db.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_prefix ON ${this.tableName} (prefix)`, (err) => {
                if (err) {
                  reject(err)
                } else {
                  resolve()
                }
              })
            }),
            new Promise((resolve, reject) => {
              this.db.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name ON ${this.tableName} (name)`, (err) => {
                if (err) {
                  reject(err)
                } else {
                  resolve()
                }
              })
            })
          ]

          Promise.all(promises)
            .then(() => {
              this.initialized = true
              resolve()
            })
            .catch(reject)
        })
      })
    })
  }

  /**
   * 确保���据库已初始化
   */
  async ensureInitialized () {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * 将 ChatPreset 对象转换为数据库记录
   * @param {import('chaite').ChatPreset} preset
   * @returns {Object} 数据库记录
   */
  _presetToRecord (preset) {
    // 提取主要字段
    const {
      id, name, description, prefix, local, namespace,
      sendMessageOption, cloudId, createdAt, updatedAt, md5,
      embedded, uploader, ...rest
    } = preset

    return {
      id: id || '',
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
      uploader: uploader ? JSON.stringify(uploader) : null,
      extraData: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  }

  /**
   * 将数���库记录转换为 ChatPreset 对象
   * @param {Object} record 数据库记录
   * @returns {import('chaite').ChatPreset} ChatPreset 对象
   */
  _recordToPreset (record) {
    if (!record) return null

    // 解析 JSON 字��
    let sendMessageOption = {}
    try {
      if (record.sendMessageOption) {
        sendMessageOption = JSON.parse(record.sendMessageOption)
      }
    } catch (e) {
      // 解析错误，使用空对象
    }

    let uploader = null
    try {
      if (record.uploader) {
        uploader = JSON.parse(record.uploader)
      }
    } catch (e) {
      // 解析错误，使用 null
    }

    let extraData = {}
    try {
      if (record.extraData) {
        extraData = JSON.parse(record.extraData)
      }
    } catch (e) {
      // 解析错误，使用空对象
    }

    // 构造 ChatPreset 对象
    const presetData = {
      id: record.id,
      name: record.name,
      description: record.description,
      prefix: record.prefix,
      local: Boolean(record.local),
      namespace: record.namespace,
      sendMessageOption,
      cloudId: record.cloudId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      embedded: Boolean(record.embedded),
      uploader,
      ...extraData
    }

    return new ChatPreset(presetData)
  }

  /**
   * 获取单个聊天预设
   * @param {string} key 预设ID
   * @returns {Promise<import('chaite').ChatPreset>}
   */
  async getItem (key) {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [key], (err, row) => {
        if (err) {
          return reject(err)
        }

        const preset = this._recordToPreset(row)
        resolve(preset)
      })
    })
  }

  /**
   * 保存聊天预设
   * @param {string} id 预设ID
   * @param {import('chaite').ChatPreset} preset 预设对象
   * @returns {Promise<string>}
   */
  async setItem (id, preset) {
    await this.ensureInitialized()
    if (!id) {
      id = generateId()
    }

    // 加上时间戳
    if (!preset.createdAt) {
      preset.createdAt = new Date().toISOString()
    }

    preset.updatedAt = new Date().toISOString()
    // 转换为数据库记录
    const record = this._presetToRecord(preset)
    record.id = id // 确保ID是指定的ID

    // 构建插入或更新SQL
    const fields = Object.keys(record)
    const placeholders = fields.map(() => '?').join(', ')
    const updates = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => record[field])
    const duplicateValues = [...values] // 用于ON CONFLICT时的更新

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO ${this.tableName} (${fields.join(', ')})
         VALUES (${placeholders})
             ON CONFLICT(id) DO UPDATE SET ${updates}`,
        [...values, ...duplicateValues],
        function (err) {
          if (err) {
            return reject(err)
          }
          // 预设前缀变了要让缓存的索引失效，否则改完预设最长要等一个 TTL 才生效
          invalidatePresetPrefixIndex()
          resolve(id)
        }
      )
    })
  }

  /**
   * 删除聊天预设
   * @param {string} key 预设ID
   * @returns {Promise<void>}
   */
  async removeItem (key) {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [key], (err) => {
        if (err) {
          return reject(err)
        }
        invalidatePresetPrefixIndex()
        resolve()
      })
    })
  }

  /**
   * 查询所有聊天预设
   * @returns {Promise<import('chaite').ChatPreset[]>}
   */
  async listItems () {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM ${this.tableName}`, (err, rows) => {
        if (err) {
          return reject(err)
        }

        const presets = rows.map(row => this._recordToPreset(row)).filter(Boolean)
        resolve(presets)
      })
    })
  }

  /**
   * 根据条件筛选聊天预设
   * @param {Record<string, unknown>} filter 筛选条件
   * @returns {Promise<import('chaite').ChatPreset[]>}
   */
  async listItemsByEqFilter (filter) {
    await this.ensureInitialized()

    // 如果没有筛选条件，返回所有
    if (!filter || Object.keys(filter).length === 0) {
      return this.listItems()
    }

    // 尝试使用SQL字段直接过滤
    const directFields = ['id', 'name', 'description', 'prefix', 'namespace', 'cloudId']
    const sqlFilters = []
    const sqlParams = []
    const extraFilters = {}
    let hasExtraFilters = false

    // 区分数据库字段和额外字段
    for (const key in filter) {
      const value = filter[key]

      // 如果是直接支持的字段，构建SQL条件
      if (directFields.includes(key)) {
        sqlFilters.push(`${key} = ?`)
        sqlParams.push(value)
      } else if (key === 'local') {
        // local 字段需要特殊处理为 0/1
        sqlFilters.push('local = ?')
        sqlParams.push(value ? 1 : 0)
      } else if (key === 'embedded') {
        // embedded 字段需要特殊处理为 0/1
        sqlFilters.push('embedded = ?')
        sqlParams.push(value ? 1 : 0)
      } else {
        // 其他字段需要在结果中进一步过滤
        extraFilters[key] = value
        hasExtraFilters = true
      }
    }

    // 构建SQL查询
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, sqlParams, (err, rows) => {
        if (err) {
          return reject(err)
        }

        let presets = rows.map(row => this._recordToPreset(row)).filter(Boolean)

        // 如果有需要在内存中过滤的额外字段
        if (hasExtraFilters) {
          presets = presets.filter(preset => {
            for (const key in extraFilters) {
              const filterValue = extraFilters[key]

              // 处理 sendMessageOption 字段的深层过滤
              if (key.startsWith('sendMessageOption.')) {
                const optionKey = key.split('.')[1]
                if (preset.sendMessageOption && preset.sendMessageOption[optionKey] !== filterValue) {
                  return false
                }
              } else if (preset[key] !== filterValue) {
                // 其他字段直接比较
                return false
              }
            }
            return true
          })
        }

        resolve(presets)
      })
    })
  }

  /**
   * 根据IN条件筛选聊天预设
   * @param {Array<{ field: string; values: unknown[]; }>} query
   * @returns {Promise<import('chaite').ChatPreset[]>}
   */
  async listItemsByInQuery (query) {
    await this.ensureInitialized()

    // 如果没有查询条件，返回所有
    if (!query || query.length === 0) {
      return this.listItems()
    }

    // 尝试使用SQL IN子句来优化查询
    const directFields = ['id', 'name', 'description', 'prefix', 'namespace', 'cloudId']
    const sqlFilters = []
    const sqlParams = []
    const extraQueries = []

    // 处理每个查询条件
    for (const { field, values } of query) {
      if (values.length === 0) continue

      // 如果是直接支持的字段，使用SQL IN子句
      if (directFields.includes(field)) {
        const placeholders = values.map(() => '?').join(', ')
        sqlFilters.push(`${field} IN (${placeholders})`)
        sqlParams.push(...values)
      } else if (field === 'local') {
        // local 字段需要特殊处理
        const boolValues = values.map(v => v ? 1 : 0)
        const placeholders = boolValues.map(() => '?').join(', ')
        sqlFilters.push(`local IN (${placeholders})`)
        sqlParams.push(...boolValues)
      } else if (field === 'embedded') {
        // embedded 字段需要特殊处理
        const boolValues = values.map(v => v ? 1 : 0)
        const placeholders = boolValues.map(() => '?').join(', ')
        sqlFilters.push(`embedded IN (${placeholders})`)
        sqlParams.push(...boolValues)
      } else {
        // 其他字段在内存中过滤
        extraQueries.push({ field, values })
      }
    }

    // 构建SQL查询
    let sql = `SELECT * FROM ${this.tableName}`
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, sqlParams, (err, rows) => {
        if (err) {
          return reject(err)
        }

        let presets = rows.map(row => this._recordToPreset(row)).filter(Boolean)

        // 如果有需要在内存中过滤的条件
        if (extraQueries.length > 0) {
          presets = presets.filter(preset => {
            for (const { field, values } of extraQueries) {
              // 处��� sendMessageOption 字段的深层过滤
              if (field.startsWith('sendMessageOption.')) {
                const optionKey = field.split('.')[1]
                const presetValue = preset.sendMessageOption?.[optionKey]
                if (!values.includes(presetValue)) {
                  return false
                }
              } else if (!values.includes(preset[field])) {
                // 其他字段直接比较
                return false
              }
            }
            return true
          })
        }

        resolve(presets)
      })
    })
  }

  /**
   * 根据前缀获取聊天预设
   * @param {string} prefix 前缀
   * @returns {Promise<import('chaite').ChatPreset | null>}
   */
  async getPresetByPrefix (prefix) {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM ${this.tableName} WHERE prefix = ?`, [prefix], (err, row) => {
        if (err) {
          return reject(err)
        }

        const preset = this._recordToPreset(row)
        resolve(preset)
      })
    })
  }

  /**
   * 清空表中所有数据
   * @returns {Promise<void>}
   */
  async clear () {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM ${this.tableName}`, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  /**
   * 关闭数据库连接
   * @returns {Promise<void>}
   */
  async close () {
    if (!this.db) return Promise.resolve()

    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) {
          reject(err)
        } else {
          this.initialized = false
          this.db = null
          resolve()
        }
      })
    })
  }
}
