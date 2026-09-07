import { ChaiteStorage, Channel } from 'chaite'
import { openSQLiteDatabase } from './runtime.js'
import path from 'path'
import fs from 'fs'
import { generateId } from '../../../../utils/common.js'

/**
 * @extends {ChaiteStorage<import('chaite').Channel>}
 */
export class SQLiteChannelStorage extends ChaiteStorage {
  getName () {
    return 'SQLiteChannelStorage'
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
    this.tableName = 'channels'
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

        // 创建Channel表，将主要属性分列存储
        this.db.run('CREATE TABLE IF NOT EXISTS ' + this.tableName + ` (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          adapterType TEXT NOT NULL,
          type TEXT NOT NULL,
          weight INTEGER DEFAULT 1,
          priority INTEGER DEFAULT 0,
          status TEXT DEFAULT 'enabled',
          disabledReason TEXT,
          models TEXT,
          options TEXT,
          statistics TEXT,
          uploader TEXT,
          cloudId INTEGER,
          createdAt TEXT,
          updatedAt TEXT,
          md5 TEXT,
          embedded INTEGER DEFAULT 0,
          extra TEXT  -- 存储其他额外数据的JSON
        )`, (err) => {
          if (err) {
            return reject(err)
          }

          // 创建索引提高查询性能
          const promises = [
            // 按类型和状态索引
            new Promise((resolve, reject) => {
              this.db.run('CREATE INDEX IF NOT EXISTS idx_' + this.tableName + '_type ON ' + this.tableName + ' (type)', err => {
                if (err) reject(err)
                else resolve()
              })
            }),
            new Promise((resolve, reject) => {
              this.db.run('CREATE INDEX IF NOT EXISTS idx_' + this.tableName + '_status ON ' + this.tableName + ' (status)', err => {
                if (err) reject(err)
                else resolve()
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
   * 确保数据库已初始化
   */
  async ensureInitialized () {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * 将 Channel 对象转换为数据库记录
   * @param {import('chaite').Channel} channel
   * @returns {Object} 数据库记录
   */
  _channelToRecord (channel) {
    // 提取主要字段
    const {
      id, name, description, adapterType, type, weight, priority,
      status, disabledReason, models, options, statistics,
      uploader, cloudId, createdAt, updatedAt, md5, embedded, ...rest
    } = channel

    return {
      id: id || '',
      name: name || '',
      description: description || '',
      adapterType: adapterType || type || '',
      type: type || '',
      weight: weight || 1,
      priority: priority || 0,
      status: status || 'enabled',
      disabledReason: disabledReason || null,
      models: Array.isArray(models) ? JSON.stringify(models) : '[]',
      options: options ? JSON.stringify(options) : null,
      statistics: statistics ? JSON.stringify(statistics) : null,
      uploader: uploader ? JSON.stringify(uploader) : null,
      cloudId: cloudId || null,
      createdAt: createdAt || '',
      updatedAt: updatedAt || '',
      md5: md5 || '',
      embedded: embedded ? 1 : 0,
      extra: Object.keys(rest).length > 0 ? JSON.stringify(rest) : null
    }
  }

  /**
   * 将数据库记录转换为 Channel 对象
   * @param {Object} record 数据库记录
   * @returns {import('chaite').Channel} Channel 对象
   */
  _recordToChannel (record) {
    if (!record) return null

    // 解析JSON字段
    let models = []
    try {
      if (record.models) {
        models = JSON.parse(record.models)
      }
    } catch (e) {
      // 解析错误，使用空数组
    }

    let options = {}
    try {
      if (record.options) {
        options = JSON.parse(record.options)
      }
    } catch (e) {
      // 解析错误，使用空对象
    }

    let statistics = {}
    try {
      if (record.statistics) {
        statistics = JSON.parse(record.statistics)
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
      // 解析错误，使用null
    }

    let extra = {}
    try {
      if (record.extra) {
        extra = JSON.parse(record.extra)
      }
    } catch (e) {
      // 解析错误，使用空对象
    }

    // 构造Channel对象
    const channelData = {
      id: record.id,
      name: record.name,
      description: record.description,
      adapterType: record.adapterType,
      type: record.type,
      weight: Number(record.weight),
      priority: Number(record.priority),
      status: record.status,
      disabledReason: record.disabledReason,
      models,
      options,
      statistics,
      uploader,
      cloudId: record.cloudId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      md5: record.md5,
      embedded: Boolean(record.embedded),
      ...extra
    }

    return new Channel(channelData)
  }

  /**
   * 获取单个渠道
   * @param {string} key 渠道ID
   * @returns {Promise<import('chaite').Channel>}
   */
  async getItem (key) {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM ' + this.tableName + ' WHERE id = ?', [key], (err, row) => {
        if (err) {
          return reject(err)
        }

        const channel = this._recordToChannel(row)
        resolve(channel)
      })
    })
  }

  /**
   * 保存渠道
   * @param {string} id 渠道ID
   * @param {import('chaite').Channel} channel 渠道对象
   * @returns {Promise<string>}
   */
  async setItem (id, channel) {
    await this.ensureInitialized()
    if (!id) {
      id = generateId()
    }

    // 加上时间戳
    if (!channel.createdAt) {
      channel.createdAt = new Date().toISOString()
    }

    channel.updatedAt = new Date().toISOString()
    // 转换为数据库记录
    const record = this._channelToRecord(channel)
    record.id = id // 确保ID是指定的ID

    // 构建插入或更新SQL
    const fields = Object.keys(record)
    const placeholders = fields.map(() => '?').join(', ')
    const updates = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => record[field])
    const duplicateValues = [...values] // 用于ON CONFLICT时的更新

    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO ' + this.tableName + ' (' + fields.join(', ') + ')' + `
         VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates}`,
        [...values, ...duplicateValues],
        function (err) {
          if (err) {
            return reject(err)
          }
          resolve(id)
        }
      )
    })
  }

  /**
   * 删除渠道
   * @param {string} key 渠道ID
   * @returns {Promise<void>}
   */
  async removeItem (key) {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM ' + this.tableName + ' WHERE id = ?', [key], (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  /**
   * 查询所有渠道
   * @returns {Promise<import('chaite').Channel[]>}
   */
  async listItems () {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM ' + this.tableName, (err, rows) => {
        if (err) {
          return reject(err)
        }

        const channels = rows.map(row => this._recordToChannel(row)).filter(Boolean)
        resolve(channels)
      })
    })
  }

  /**
   * 根据条件筛选渠道
   * @param {Record<string, unknown>} filter 筛选条件
   * @returns {Promise<import('chaite').Channel[]>}
   */
  async listItemsByEqFilter (filter) {
    await this.ensureInitialized()

    // 如果没有筛选条件，返回所有
    if (!filter || Object.keys(filter).length === 0) {
      return this.listItems()
    }

    // 尝试使用SQL字段直接过滤
    const directFields = ['id', 'name', 'description', 'adapterType', 'type', 'status', 'cloudId']
    const numericFields = ['weight', 'priority']
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
      } else if (numericFields.includes(key)) {
        // 数值型字段
        sqlFilters.push(`${key} = ?`)
        sqlParams.push(Number(value))
      } else if (key === 'embedded') {
        // embedded 字段需要特殊处理为 0/1
        sqlFilters.push('embedded = ?')
        sqlParams.push(value ? 1 : 0)
      } else if (key === 'models' && typeof value === 'string') {
        // models字段需要特殊处理，判断是否包含某模型
        // 注意：这种方式仅适用于单个模型的查询，不适用于完全匹配数组
        sqlFilters.push('models LIKE ?')
        sqlParams.push(`%${value}%`)
      } else {
        // 其他字段需要在结果中进一步过滤
        extraFilters[key] = value
        hasExtraFilters = true
      }
    }

    // 构建SQL查询
    let sql = 'SELECT * FROM ' + this.tableName
    if (sqlFilters.length > 0) {
      sql += ` WHERE ${sqlFilters.join(' AND ')}`
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, sqlParams, (err, rows) => {
        if (err) {
          return reject(err)
        }

        let channels = rows.map(row => this._recordToChannel(row)).filter(Boolean)

        // 如果有需要在内存中过滤的额外���段
        if (hasExtraFilters) {
          channels = channels.filter(channel => {
            for (const key in extraFilters) {
              if (channel[key] !== extraFilters[key]) {
                return false
              }
            }
            return true
          })
        }

        resolve(channels)
      })
    })
  }

  /**
   * 根据IN条件筛选渠道
   * @param {Array<{ field: string; values: unknown[]; }>} query
   * @returns {Promise<import('chaite').Channel[]>}
   */
  async listItemsByInQuery (query) {
    await this.ensureInitialized()

    // 如果没有查询条件，返回所有
    if (!query || query.length === 0) {
      return this.listItems()
    }

    // 尝试使用SQL IN子句来优化查询
    const directFields = ['id', 'name', 'description', 'adapterType', 'type', 'status', 'cloudId']
    const numericFields = ['weight', 'priority']
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
      } else if (numericFields.includes(field)) {
        // 数值型字段
        const placeholders = values.map(() => '?').join(', ')
        sqlFilters.push(`${field} IN (${placeholders})`)
        sqlParams.push(...values.map(v => Number(v)))
      } else if (field === 'embedded') {
        // embedded 字段需要特殊处理
        const boolValues = values.map(v => v ? 1 : 0)
        const placeholders = boolValues.map(() => '?').join(', ')
        sqlFilters.push(`embedded IN (${placeholders})`)
        sqlParams.push(...boolValues)
      } else if (field === 'models') {
        // models字段需要特殊处理，判断是否包含某模型
        // 由于无法直接使用IN查询JSON字段，这里使用OR和LIKE的组合
        const modelFilters = values.map(() => 'models LIKE ?').join(' OR ')
        sqlFilters.push(`(${modelFilters})`)
        values.forEach(value => {
          sqlParams.push(`%${value}%`)
        })
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

        let channels = rows.map(row => this._recordToChannel(row)).filter(Boolean)

        // 如果有需要在内存中过滤的条件
        if (extraQueries.length > 0) {
          channels = channels.filter(channel => {
            for (const { field, values } of extraQueries) {
              if (!values.includes(channel[field])) {
                return false
              }
            }
            return true
          })
        }

        resolve(channels)
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
      this.db.run('DELETE FROM ' + this.tableName, (err) => {
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
