import { AbstractHistoryManager } from 'chaite'
import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

export class SQLiteHistoryManager extends AbstractHistoryManager {
  /**
   *
   * @param {string} dbPath 数据库文件路径
   * @param {string} imagesDir 图片存储目录，默认为数据库同级的 images 目录
   */
  constructor (dbPath, imagesDir) {
    super()
    this.dbPath = dbPath
    this.imagesDir = imagesDir || path.join(path.dirname(dbPath), 'images')
    this.db = null
    this.initialized = false
    this.tableName = 'history'
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

      // 确保图片目录存在
      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true })
      }

      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          return reject(err)
        }

        // 创建 history 表
        this.db.run(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id TEXT PRIMARY KEY,
            parentId TEXT,
            conversationId TEXT,
            role TEXT,
            messageData TEXT,
            createdAt TEXT
          )`, (err) => {
          if (err) {
            return reject(err)
          }

          // 创建索引，加速查询
          this.db.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_conversation ON ${this.tableName} (conversationId)`, (err) => {
            if (err) {
              return reject(err)
            }

            this.db.run(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_parent ON ${this.tableName} (parentId)`, (err) => {
              if (err) {
                return reject(err)
              }

              this.initialized = true
              resolve()
            })
          })
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
   * 计算文本的md5值
   * @param {string} text
   * @returns {string}
   */
  _getMd5 (text) {
    return crypto.createHash('md5').update(text).digest('hex')
  }

  /**
   * 是否为base64编码的图片
   * @param {string} str
   * @returns {boolean}
   */
  _isBase64Image (str) {
    if (!str || typeof str !== 'string') {
      return false
    }

    // 处理带前缀的 base64 格式
    if (str.startsWith('data:image/')) {
      return true
    }

    // 处理纯 base64 字符串
    // base64 编码只会包含字母、数字、+、/，以及末尾可能有 = 或 == 用于填充
    return /^[A-Za-z0-9+/]+={0,2}$/.test(str)
  }

  /**
   * 从base64提取图片的mime类型，或使用默认类型
   * @param {string} base64
   * @param {string} defaultMimeType 默认 MIME 类型
   * @returns {string}
   */
  _getMimeTypeFromBase64 (base64, defaultMimeType = 'image/jpeg') {
    if (base64 && base64.startsWith('data:image/')) {
      const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/)
      if (match) {
        return match[1]
      }
    }
    return defaultMimeType // 对于纯 base64 字符串，使用默认类型
  }

  /**
   * 获取图片扩展名
   * @param {string} mimeType
   * @returns {string}
   */
  _getExtensionFromMimeType (mimeType) {
    const map = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    }
    return map[mimeType] || '.png'
  }

  /**
   * 处理消息中的图片内容，将base64图片保存到本地文件
   * @param {object} message
   * @returns {object} 处理后的消息对象
   */
  _processMessageImages (message) {
    if (!message.content || !Array.isArray(message.content)) {
      return message
    }

    // 深拷贝避免修改原对象
    const processedMessage = JSON.parse(JSON.stringify(message))

    processedMessage.content = processedMessage.content.map(item => {
      if (item.type === 'image' && item.image) {
        // 检查是否是base64图片数据
        if (this._isBase64Image(item.image)) {
          let base64Data = item.image
          let mimeType = item.mimeType || 'image/jpeg' // 使用项目指定的 MIME 类型或默认值

          // 如果是data:image格式，提取纯base64部分
          if (base64Data.startsWith('data:')) {
            const parts = base64Data.split(',')
            if (parts.length > 1) {
              base64Data = parts[1]
              // 更新 MIME 类型
              mimeType = this._getMimeTypeFromBase64(item.image, mimeType)
            }
          }

          try {
            // 计算MD5
            const md5 = this._getMd5(base64Data)
            const ext = this._getExtensionFromMimeType(mimeType)
            const filePath = path.join(this.imagesDir, `${md5}${ext}`)

            // 如果文件不存在，则保存
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
            }

            // 替换为引用格式: $image:md5:ext
            item.image = `$image:${md5}:${ext}`
            item._type = mimeType // 保存原始类型
          } catch (error) {
            console.error('保存图片失败:', error)
          }
        }
      }
      return item
    })

    return processedMessage
  }

  /**
   * 恢复消息中的图片引用，转换回base64
   * @param {object} message
   * @returns {object} 处理后的消息对象
   */
  _restoreMessageImages (message) {
    if (!message || !message.content || !Array.isArray(message.content)) {
      return message
    }

    // 深拷贝避免修改原对象
    const restoredMessage = JSON.parse(JSON.stringify(message))

    // 标记是否需要添加[图片]文本
    let needImageText = true
    let hasRemovedImage = false

    restoredMessage.content = restoredMessage.content.filter((item, index) => {
      if (item.type === 'image' && item.image && typeof item.image === 'string') {
        // 检查是否是图片引用格式
        const match = item.image.match(/^\$image:([a-f0-9]+):(\.[a-z]+)$/)
        if (match) {
          // eslint-disable-next-line no-unused-vars
          const [_, md5, ext] = match
          const filePath = path.join(this.imagesDir, `${md5}${ext}`)

          // 检查文件是否存在
          if (fs.existsSync(filePath)) {
            try {
              // 读取文件并转换为base64
              const imageBuffer = fs.readFileSync(filePath)
              item.image = imageBuffer.toString('base64')
              return true
            } catch (error) {
              console.error('读取图片文件失败:', filePath, error)
              hasRemovedImage = true
              return false
            }
          } else {
            // 文件不存在，删除这个image元素
            hasRemovedImage = true
            return false
          }
        }
      }
      if (item.type === 'text') {
        needImageText = false
      }
      return true
    })

    // 如果移除了图片且没有文本内容，添加[图片]提示
    if (hasRemovedImage) {
      if (restoredMessage.content.length === 0) {
        restoredMessage.content.push({
          type: 'text',
          text: '[图片]'
        })
      } else if (needImageText) {
        // 查找第一个文本元素
        const textIndex = restoredMessage.content.findIndex(item => item.type === 'text')
        if (textIndex !== -1) {
          restoredMessage.content[textIndex].text = `[图片] ${restoredMessage.content[textIndex].text}`
        } else {
          // 如果没有文本元素，添加一个
          restoredMessage.content.unshift({
            type: 'text',
            text: '[图片]'
          })
        }
      }
    }

    return restoredMessage
  }

  /**
   * 将消息对象转换为数据库记录
   * @param {import('chaite').HistoryMessage} message
   * @param {string} conversationId
   * @returns {Object} 数据库记录
   */
  _messageToRecord (message, conversationId) {
    // 处理图片，将base64图片保存到本地文件
    const processedMessage = this._processMessageImages(message)

    // 将 content 和 toolCalls 等转为 JSON
    const { id, parentId, role } = processedMessage
    const messageData = JSON.stringify(processedMessage)

    return {
      id: id || '',
      parentId: parentId || null,
      conversationId: conversationId || '',
      role: role || '',
      messageData,
      createdAt: new Date().toISOString()
    }
  }

  /**
   * 将数据库记录转换为消息对象
   * @param {Object} record 数据库记录
   * @returns {import('chaite').HistoryMessage} 消息对象
   */
  _recordToMessage (record) {
    if (!record) return null

    try {
      // 解析存储的消息数据
      const message = JSON.parse(record.messageData)

      // 恢复图片引用为base64
      return this._restoreMessageImages(message)
    } catch (e) {
      // 解析失败，尝试构造最小结构
      return {
        id: record.id,
        parentId: record.parentId,
        role: record.role,
        conversationId: record.conversationId,
        content: []
      }
    }
  }

  /**
   * 保存历史消息
   * @param {import('chaite').HistoryMessage} message 消息对象
   * @param {string} conversationId 会话ID
   * @returns {Promise<void>}
   */
  async saveHistory (message, conversationId) {
    await this.ensureInitialized()

    const record = this._messageToRecord(message, conversationId)

    return new Promise((resolve, reject) => {
      if (record.id) {
        this._upsertMessage(record, resolve, reject)
      } else {
        this._insertMessage(record, resolve, reject)
      }
    })
  }

  /**
   * 批量保存历史消息，使用单个事务避免多条消息逐条 autocommit。
   * @param {import('chaite').HistoryMessage[]} messages
   * @param {string} conversationId
   * @returns {Promise<void>}
   */
  async saveHistories (messages, conversationId) {
    await this.ensureInitialized()

    if (!messages || messages.length === 0) {
      return
    }

    const records = messages.map(message => this._messageToRecord(message, conversationId))

    if (records.some(record => !record.id)) {
      for (const message of messages) {
        await this.saveHistory(message, conversationId)
      }
      return
    }

    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (err) => {
        if (settled) return
        settled = true
        if (err) reject(err)
        else resolve()
      }
      const rollback = (err) => {
        this.db.run('ROLLBACK', () => finish(err))
      }

      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) return finish(err)

          const sql = this._upsertSql(records[0])
          const fields = Object.keys(records[0])
          const stmt = this.db.prepare(sql, (err) => {
            if (err) return rollback(err)

            let index = 0
            const runNext = () => {
              if (index >= records.length) {
                return stmt.finalize((err) => {
                  if (err) return rollback(err)
                  this.db.run('COMMIT', finish)
                })
              }

              const record = records[index]
              const values = fields.map(field => record[field])
              stmt.run(values, (err) => {
                if (err) return rollback(err)
                index++
                runNext()
              })
            }

            runNext()
          })
        })
      })
    })
  }

  /**
   * 内部方法：插入消息记录
   * @private
   */
  _insertMessage (record, resolve, reject) {
    const fields = Object.keys(record)
    const placeholders = fields.map(() => '?').join(', ')
    const values = fields.map(field => record[field])

    this.db.run(
      `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
      values,
      function (err) {
        if (err) {
          return reject(err)
        }
        resolve()
      }
    )
  }

  _upsertSql (record) {
    const fields = Object.keys(record)
    const placeholders = fields.map(() => '?').join(', ')
    const updates = fields
      .filter(field => field !== 'id')
      .map(field => field + ' = excluded.' + field)
      .join(', ')
    return 'INSERT INTO ' + this.tableName + ' (' + fields.join(', ') + ') VALUES (' + placeholders + ') ON CONFLICT(id) DO UPDATE SET ' + updates
  }

  _upsertMessage (record, resolve, reject) {
    const values = Object.keys(record).map(field => record[field])
    this.db.run(this._upsertSql(record), values, function (err) {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  }

  /**
   * 获取历史消息
   * @param {string} messageId 消息ID
   * @param {string} conversationId 会话ID
   * @returns {Promise<import('chaite').HistoryMessage[]>}
   */
  async getHistory (messageId, conversationId) {
    await this.ensureInitialized()

    if (messageId) {
      return this._getMessageChain(messageId)
    } else if (conversationId) {
      return this._getConversationMessages(conversationId)
    }
    return []
  }

  /**
   * 获取消息链（从指定消息追溯到根消息）
   * @private
   */
  async _getMessageChain (messageId) {
    return new Promise((resolve, reject) => {
      const messages = []
      const getMessageById = (id) => {
        if (!id) {
          resolve(messages)
          return
        }

        this.db.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id], (err, row) => {
          if (err) {
            return reject(err)
          }

          if (!row) {
            resolve(messages)
            return
          }

          const message = this._recordToMessage(row)
          messages.unshift(message) // 将消息添加到数组开头

          getMessageById(row.parentId) // 递归获取父消息
        })
      }

      getMessageById(messageId)
    })
  }

  /**
   * 获取会话中的所有消息
   * @private
   */
  async _getConversationMessages (conversationId) {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM ${this.tableName} WHERE conversationId = ? ORDER BY createdAt`, [conversationId], (err, rows) => {
        if (err) {
          return reject(err)
        }

        const messages = rows.map(row => this._recordToMessage(row)).filter(Boolean)
        resolve(messages)
      })
    })
  }

  /**
   * 删除会话
   * @param {string} conversationId 会话ID
   * @returns {Promise<void>}
   */
  async deleteConversation (conversationId) {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM ${this.tableName} WHERE conversationId = ?`, [conversationId], (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  /**
   * Remove one message without breaking the parent chain. Direct children are
   * reparented to the removed message's parent first.
   */
  async removeHistory (messageId, conversationId) {
    await this.ensureInitialized()
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (beginError) => {
          if (beginError) return reject(beginError)
          this.db.get(
            `SELECT parentId FROM ${this.tableName} WHERE id = ? AND conversationId = ?`,
            [messageId, conversationId],
            (getError, row) => {
              if (getError) return this.db.run('ROLLBACK', () => reject(getError))
              if (!row) return this.db.run('COMMIT', () => resolve())
              this.db.run(
                `UPDATE ${this.tableName} SET parentId = ? WHERE conversationId = ? AND parentId = ?`,
                [row.parentId || null, conversationId, messageId],
                (updateError) => {
                  if (updateError) return this.db.run('ROLLBACK', () => reject(updateError))
                  this.db.run(
                    `DELETE FROM ${this.tableName} WHERE id = ? AND conversationId = ?`,
                    [messageId, conversationId],
                    (deleteError) => {
                      if (deleteError) return this.db.run('ROLLBACK', () => reject(deleteError))
                      this.db.run('COMMIT', (commitError) => commitError ? reject(commitError) : resolve())
                    }
                  )
                }
              )
            }
          )
        })
      })
    })
  }

  /**
   * 获取单条历史消息
   * @param {string} messageId 消息ID
   * @param {string} conversationId 会话ID
   * @returns {Promise<import('chaite').HistoryMessage | null>}
   */
  async getOneHistory (messageId, conversationId) {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const conditions = []
      const params = []

      if (messageId) {
        conditions.push('id = ?')
        params.push(messageId)
      }

      if (conversationId) {
        conditions.push('conversationId = ?')
        params.push(conversationId)
      }

      if (conditions.length === 0) {
        return resolve(null)
      }

      const whereClause = conditions.join(' AND ')

      this.db.get(`SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`, params, (err, row) => {
        if (err) {
          return reject(err)
        }

        resolve(this._recordToMessage(row))
      })
    })
  }

  /**
   * 清理未引用的图片文件
   * @returns {Promise<{deleted: number, total: number}>}
   */
  async cleanupUnusedImages () {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      // 获取所有消息数据
      this.db.all(`SELECT messageData FROM ${this.tableName}`, async (err, rows) => {
        if (err) {
          return reject(err)
        }

        try {
          // 从数据库中提取所有图片引用
          const usedImageRefs = new Set()
          rows.forEach(row => {
            try {
              const message = JSON.parse(row.messageData)
              if (message.content && Array.isArray(message.content)) {
                message.content.forEach(item => {
                  if (item.type === 'image' && typeof item.image === 'string') {
                    const match = item.image.match(/^\$image:([a-f0-9]+):(\.[a-z]+)$/)
                    if (match) {
                      usedImageRefs.add(`${match[1]}${match[2]}`)
                    }
                  }
                })
              }
            } catch (e) {
              // 忽略解析错误
            }
          })

          // 获取图片目录中的所有文件
          const files = fs.readdirSync(this.imagesDir)

          // 删除未引用的图片
          let deletedCount = 0
          for (const file of files) {
            if (!usedImageRefs.has(file)) {
              fs.unlinkSync(path.join(this.imagesDir, file))
              deletedCount++
            }
          }

          resolve({
            deleted: deletedCount,
            total: files.length
          })
        } catch (error) {
          reject(error)
        }
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
