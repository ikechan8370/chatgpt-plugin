import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

class ChatGPTConfig {
  /**
   * 版本号
   * @type {string}
   */
  version = '3.0.0'

  /**
   * 基本配置
   * @type {{
   *   toggleMode: 'at' | 'prefix',
   *   debug: boolean,
   * }}
   */
  basic = {
    // 触发方式，at触发或者前缀触发
    toggleMode: 'at',
    // 触发前缀，仅在前缀触发时有效
    togglePrefix: '#chat',
    // 是否开启调试模式
    debug: false,
    // 一般命令的开头
    commandPrefix: '#chatgpt'
  }

  /**
   * 伪人模式，基于框架实现，因此机器人开启前缀后依然需要带上前缀。
   * @type {{
   *   enable: boolean,
   *   hit: string[],
   *   probability: number,
   *   defaultPreset: string,
   *   presetPrefix?: string,
   *   presetMap: Array<{
   *     keywords: string[],
   *     presetId: string,
   *     priority: number,
   *     recall?: boolean
   *   }>,
   *   maxTokens: number,
   *   temperature: number,
   *   sendReasoning: boolean
   * }}
   * }}
   */
  bym = {
    // 开关
    enable: false,
    // 伪人必定触发词
    hit: ['bym'],
    // 不包含伪人必定触发词时的概率
    probability: 0.02,
    // 伪人模式的默认预设
    defaultPreset: '',
    // 伪人模式的预设前缀，会加在在所有其他预设前。例如此处可以用于配置通用的伪人发言风格（随意、模仿群友等），presetMap中专心配置角色设定即可
    presetPrefix: '',
    // 包含关键词与预设的对应关系。包含特定触发词使用特定的预设，按照优先级排序
    presetMap: [],
    // 如果大于0，会覆盖preset中的maxToken，用于控制伪人模式发言长度
    maxTokens: 0,
    // 如果大于等于0，会覆盖preset中的temperature，用于控制伪人模式发言随机性
    temperature: -1,
    // 是否发送思考内容
    sendReasoning: false
  }

  /**
   * 模型和对话相关配置
   * @type {{
   *   defaultModel: string,
   *   embeddingModel: string,
   *   defaultChatPresetId: string,
   *   enableCustomPreset: boolean,
   *   customPresetUserWhiteList: string[],
   *   customPresetUserBlackList: string[],
   *   promptBlockWords: string[],
   *   responseBlockWords: string[],
   *   blockStrategy: 'full' | 'mask',
   *   blockWordMask: string,
   *   enableGroupContext: boolean,
   *   groupContextLength: number,
   *   groupContextTemplatePrefix: string,
   *   groupContextTemplateMessage: string,
   *   groupContextTemplateSuffix: string
   * }}
   */
  llm = {
    // 默认模型，初始化构建预设使用
    defaultModel: '',
    // 嵌入模型
    embeddingModel: 'gemini-embedding-exp-03-07',
    // 嵌入结果维度，0表示自动
    dimensions: 0,
    // 默认对话预设ID
    defaultChatPresetId: '',
    // 是否启用允许其他人切换预设
    enableCustomPreset: false,
    // 允许切换预设的用户白名单
    customPresetUserWhiteList: [],
    // 禁止切换预设的用户黑名单
    customPresetUserBlackList: [],
    // 用户对话屏蔽词
    promptBlockWords: [],
    // 机器人回复屏蔽词
    responseBlockWords: [],
    // 触发屏蔽词的策略，完全屏蔽或仅屏蔽关键词
    blockStrategy: 'full',
    // 如果blockStrategy为mask，屏蔽词的替换字符
    blockWordMask: '***',
    // 是否开启群组上下文
    enableGroupContext: false,
    // 群组上下文长度
    groupContextLength: 20,
    // 用于组装群聊上下文提示词的模板前缀
    groupContextTemplatePrefix: '<settings>\n' +
      // eslint-disable-next-line no-template-curly-in-string
      'You are  a member of a chat group, whose name is ${group.name}, and the group id is ${group.id}.\n' +
      '</settings>Latest several messages in the group chat:\n' +
      '｜ 群名片 | 昵称 | qq号 | 群角色 | 群头衔 | 时间 | messageId | 消息内容 |\n' +
      '|---|---|---|---|---|---|---|---|',
    // 用于组装群聊上下文提示词的模板内容部分，每一条消息作为message，仿照示例填写
    // eslint-disable-next-line no-template-curly-in-string
    groupContextTemplateMessage: '| ${message.sender.card} | ${message.sender.nickname} | ${message.sender.user_id} | ${message.sender.role} | ${message.sender.title} | ${message.time} | ${message.messageId} | ${message.raw_message} |',
    // 用于组装群聊上下文提示词的模板后缀
    groupContextTemplateSuffix: '\n'

  }

  /**
   * 管理相关配置
   * @type {{
   *   blackGroups: number[],
   *   whiteGroups: number[],
   *   blackUsers: string[],
   *   whiteUsers: string[],
   *   defaultRateLimit: number
   * }}
   */
  management = {
    blackGroups: [],
    whiteGroups: [],
    blackUsers: [],
    whiteUsers: [],
    // 默认对话速率限制，0表示不限制，数字表示每分钟最多对话次数
    defaultRateLimit: 0
  }

  /**
   * chaite相关配置
   * @type {
   * {  dataDir: string,
   *   processorsDirPath: string,
   *   toolsDirPath: string,
   *   cloudBaseUrl: string,
   *   cloudApiKey: string,
   *   authKey: string,
   *   host: string,
   *   port: number}}
   */
  chaite = {
    // 数据目录，相对于插件下
    dataDir: 'data',
    // 处理器目录，相对于插件下
    processorsDirPath: 'utils/processors',
    // 触发器目录，相对于插件目录下
    triggersDir: 'utils/triggers',
    // 工具目录，相对于插件目录下
    toolsDirPath: 'utils/tools',
    // 云端API url
    cloudBaseUrl: 'https://api.chaite.cloud',
    // 云端API Key
    cloudApiKey: '',
    // jwt key，非必要勿修改，修改需重启
    authKey: '',
    // 管理面板监听地址
    host: '0.0.0.0',
    // 管理面板监听端口
    port: 48370,
    // 存储实现 sqlite lowdb
    storage: 'sqlite'
  }

  /**
   * 记忆系统配置
   * @type {{
   *   database: string,
   *   vectorDimensions: number,
   *   group: {
   *     enable: boolean,
   *     enabledGroups: string[],
   *     extractionModel: string,
   *     extractionPresetId: string,
   *     minMessageCount: number,
   *     maxMessageWindow: number,
   *     retrievalMode: 'vector' | 'keyword' | 'hybrid',
   *     hybridPrefer: 'vector-first' | 'keyword-first',
   *     historyPollInterval: number,
   *     historyBatchSize: number,
   *     promptHeader: string,
   *     promptItemTemplate: string,
   *     promptFooter: string,
   *     extractionSystemPrompt: string,
   *     extractionUserPrompt: string,
   *     vectorMaxDistance: number,
   *     textMaxBm25Score: number,
   *     maxFactsPerInjection: number,
   *     minImportanceForInjection: number
   *   },
   *   user: {
   *     enable: boolean,
   *     whitelist: string[],
   *     blacklist: string[],
   *     extractionModel: string,
   *     extractionPresetId: string,
   *     maxItemsPerInjection: number,
   *     maxRelevantItemsPerQuery: number,
   *     minImportanceForInjection: number,
   *     promptHeader: string,
   *     promptItemTemplate: string,
   *     promptFooter: string,
   *     extractionSystemPrompt: string,
   *     extractionUserPrompt: string
   *   },
   *   extensions: {
   *     simple: {
   *       enable: boolean,
   *       libraryPath: string,
   *       dictPath: string,
   *       useJieba: boolean
   *     }
   *   }
   * }}
   */
  memory = {
    database: 'data/memory.db',
    vectorDimensions: 1536,
    group: {
      enable: false,
      enabledGroups: [],
      extractionModel: '',
      extractionPresetId: '',
      minMessageCount: 80,
      maxMessageWindow: 300,
      retrievalMode: 'hybrid',
      hybridPrefer: 'vector-first',
      historyPollInterval: 300,
      historyBatchSize: 120,
      promptHeader: '# 以下是一些该群聊中可能相关的事实，你可以参考，但不要主动透露这些事实。',
      promptItemTemplate: '- ${fact}${topicSuffix}${timeSuffix}',
      promptFooter: '',
      extractionSystemPrompt: `You are a knowledge extraction assistant that specialises in summarising long-term facts from group chat transcripts.
Read the provided conversation and identify statements that should be stored as long-term knowledge for the group.
Return a JSON array. Each element must contain:
{
  "fact": 事实内容，必须完整包含事件的各个要素而不能是简单的短语（比如谁参与了事件、做了什么事情、背景时间是什么）（同一件事情尽可能整合为同一条而非拆分，以便利于检索）, 
  "topic": 主题关键词，字符串，如 "活动"、"成员信息",
  "importance": 一个介于0和1之间的小数，数值越大表示越重要,
  "source_message_ids": 原始消息ID数组,
  "source_messages": 对应原始消息的简要摘录或合并文本,
  "involved_users": 出现或相关的用户ID数组
}
Only include meaningful, verifiable group-specific information that is useful for future conversations. Do not record incomplete information. Do not include general knowledge or unrelated facts. Do not wrap the JSON array in code fences.`,
      extractionUserPrompt: `以下是群聊中的一些消息，请根据系统说明提取值得长期记忆的事实，以JSON数组形式返回，不要输出额外说明。

\${messages}`,
      vectorMaxDistance: 0,
      textMaxBm25Score: 0,
      maxFactsPerInjection: 5,
      minImportanceForInjection: 0.3
    },
    user: {
      enable: false,
      whitelist: [],
      blacklist: [],
      extractionModel: '',
      extractionPresetId: '',
      maxItemsPerInjection: 5,
      maxRelevantItemsPerQuery: 3,
      minImportanceForInjection: 0,
      promptHeader: '# 用户画像',
      promptItemTemplate: '- ${value}${timeSuffix}',
      promptFooter: '',
      extractionSystemPrompt: `You are an assistant that extracts long-term personal preferences or persona details about a user.
Given a conversation snippet between the user and the bot, identify durable information such as preferences, nicknames, roles, speaking style, habits, or other facts that remain valid over time.
Return a JSON array of **strings**, and nothing else, without any other characters including \`\`\` or \`\`\`json. Each string must be a short sentence (in the same language as the conversation) describing one piece of long-term memory. Do not include keys, JSON objects, or additional metadata. Ignore temporary topics or uncertain information.`,
      extractionUserPrompt: `下面是用户与机器人的对话，请根据系统提示提取可长期记忆的个人信息。

\${messages}`
    },
    extensions: {
      simple: {
        enable: false,
        libraryPath: '',
        dictPath: '',
        useJieba: false
      }
    }
  }

  constructor () {
    this.version = '3.0.0'
    this.watcher = null
    this.configPath = ''
  }

  /**
   * Start config file sync
   * call once!
   * @param {string} configDir Directory containing config files
   */
  startSync (configDir) {
    // 配置路径设置
    const jsonPath = path.join(configDir, 'config.json')
    const yamlPath = path.join(configDir, 'config.yaml')

    if (fs.existsSync(jsonPath)) {
      this.configPath = jsonPath
    } else if (fs.existsSync(yamlPath)) {
      this.configPath = yamlPath
    } else {
      this.configPath = jsonPath
      this.saveToFile()
    }

    // 加载初始配置
    this.loadFromFile()

    // 文件变更标志和保存定时器
    this._saveOrigin = null
    this._saveTimer = null

    // 监听文件变化
    this.watcher = fs.watchFile(this.configPath, (curr, prev) => {
      if (curr.mtime !== prev.mtime && this._saveOrigin !== 'code') {
        this.loadFromFile()
      }
    })

    // 处理所有嵌套对象
    return this._createProxyRecursively(this)
  }

  // 递归创建代理
  _createProxyRecursively (obj, path = []) {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
      return obj
    }

    // 处理数组和对象
    if (Array.isArray(obj)) {
      // 创建一个新数组，递归地处理每个元素
      const proxiedArray = [...obj].map((item, index) =>
        this._createProxyRecursively(item, [...path, index])
      )

      // 代理数组，捕获数组方法调用
      return new Proxy(proxiedArray, {
        set: (target, prop, value) => {
          // 处理数字属性（数组索引）和数组长度
          if (typeof prop !== 'symbol' &&
            ((!isNaN(prop) && prop !== 'length') ||
              prop === 'length')) {
            // 直接设置值
            target[prop] = value

            // 触发保存
            this._triggerSave('array')
          } else {
            target[prop] = value
          }
          return true
        },

        // 拦截数组方法调用
        get: (target, prop) => {
          const val = target[prop]

          // 处理数组修改方法
          if (typeof val === 'function' &&
            ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(prop)) {
            return function (...args) {
              const result = Array.prototype[prop].apply(target, args)

              // 方法调用后触发保存
              this._triggerSave('array-method')
              return result
            }.bind(this)
          }

          return val
        }
      })
    } else {
      // 对普通对象的处理
      const proxiedObj = {}

      // 处理所有属性
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // 跳过内部属性
          if (key === 'watcher' || key === 'configPath' ||
            key.startsWith('_save') || key === '_isSaving') {
            proxiedObj[key] = obj[key]
          } else {
            // 递归处理嵌套对象
            proxiedObj[key] = this._createProxyRecursively(
              obj[key], [...path, key]
            )
          }
        }
      }

      // 创建对象的代理
      return new Proxy(proxiedObj, {
        set: (target, prop, value) => {
          // 跳过内部属性的处理
          if (prop === 'watcher' || prop === 'configPath' ||
            prop.startsWith('_save') || prop === '_isSaving') {
            target[prop] = value
            return true
          }

          // 设置新值，如果是对象则递归创建代理
          if (value !== null && typeof value === 'object') {
            target[prop] = this._createProxyRecursively(
              value, [...path, prop]
            )
          } else {
            target[prop] = value
          }

          // 触发保存
          this._triggerSave('object')
          return true
        }
      })
    }
  }

  loadFromFile () {
    try {
      if (!fs.existsSync(this.configPath)) {
        // 如果文件不存在，直接返回
        return
      }

      const content = fs.readFileSync(this.configPath, 'utf8')
      const loadedConfig = this.configPath.endsWith('.json')
        ? JSON.parse(content)
        : yaml.load(content)

      // 处理加载的配置并和默认值合并
      if (loadedConfig) {
        const mergeResult = this._mergeConfig(loadedConfig)
        if (mergeResult.changed) {
          logger?.debug?.('[Config] merged new defaults into persisted config; scheduling save')
          this._triggerSave('code')
        }
      }

      logger.debug('Config loaded successfully')
    } catch (error) {
      logger.error('Failed to load config:', error)
    }
  }

  _mergeConfig (loadedConfig) {
    let changed = false

    const mergeInto = (target, source) => {
      if (!source || typeof source !== 'object') {
        return target
      }
      if (!target || typeof target !== 'object') {
        target = Array.isArray(source) ? [] : {}
      }
      const result = Array.isArray(source) ? [] : { ...target }

      if (Array.isArray(source)) {
        return source.slice()
      }

      const targetKeys = target && typeof target === 'object'
        ? Object.keys(target)
        : []
      for (const key of targetKeys) {
        if (!Object.prototype.hasOwnProperty.call(source, key)) {
          changed = true
        }
      }

      for (const key of Object.keys(source)) {
        const sourceValue = source[key]
        const targetValue = target[key]
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          result[key] = mergeInto(targetValue, sourceValue)
        } else {
          if (targetValue === undefined || targetValue !== sourceValue) {
            changed = true
          }
          result[key] = sourceValue
        }
      }
      return result
    }

    const sections = ['version', 'basic', 'bym', 'llm', 'management', 'chaite', 'memory']
    for (const key of sections) {
      const loadedValue = loadedConfig[key]
      if (loadedValue === undefined) {
        continue
      }
      if (typeof loadedValue === 'object' && loadedValue !== null) {
        const merged = mergeInto(this[key], loadedValue)
        if (merged !== this[key]) {
          this[key] = merged
        }
      } else {
        if (this[key] !== loadedValue) {
          changed = true
        }
        this[key] = loadedValue
      }
    }

    return { changed }
  }

  // 合并触发保存，防抖处理
  _triggerSave (origin) {
    // 清除之前的定时器
    if (this._saveTimer) {
      clearTimeout(this._saveTimer)
    }

    const originLabel = origin || 'code'
    this._saveOrigin = originLabel
    this._saveTimer = setTimeout(() => {
      this.saveToFile(originLabel)
      this._saveOrigin = null
    }, 200)
  }

  saveToFile (origin = 'code') {
    if (origin !== 'code') {
      this._saveOrigin = 'external'
    }
    logger.debug('Saving config to file...')
    try {
      const config = {
        version: this.version,
        basic: this.basic,
        bym: this.bym,
        llm: this.llm,
        management: this.management,
        chaite: this.chaite,
        memory: this.memory
      }

      const content = this.configPath.endsWith('.json')
        ? JSON.stringify(config, null, 2)
        : yaml.dump(config)

      fs.writeFileSync(this.configPath, content, 'utf8')
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  toJSON () {
    return {
      version: this.version,
      basic: this.basic,
      bym: this.bym,
      llm: this.llm,
      management: this.management,
      chaite: this.chaite,
      memory: this.memory
    }
  }
}

export default new ChatGPTConfig()
