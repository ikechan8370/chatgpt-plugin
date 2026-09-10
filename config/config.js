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
   *   speakingMode: 'reply' | 'contextual',
   *   contextualPrompt: string,
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
    // 发言策略：reply 回复触发消息；contextual 结合群聊上下文自主发言
    speakingMode: 'reply',
    // contextual 模式下替代触发消息发送给模型的本轮指令
    contextualPrompt: '你现在不是在回复某一条特定消息，而是作为这个群里的一名普通群友自然参与当前聊天。请阅读前面的群聊上下文，选择一个自然的切入点发言，可以接续话题、补充信息、吐槽、提问或表达态度。不要解释任务，不要提及“上下文”“指令”“AI”或“机器人”，不要强行引用、@或逐句回答触发你的那条消息。直接输出一段适合发到群里的自然发言。',
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
    sendReasoning: false,
    // 伪人对话历史的保留天数，0 表示永久保留（默认）。
    // 伪人每次发言都会新建一个会话，并把当次的群聊上下文写进历史表用于审计，
    // 默认配置下一次约 22 行。不设保留期的话这张表只增不减（实测一年约 1.6M 行 /
    // 0.7 GiB）。这里只影响伪人产生的会话，正常对话历史不受影响。
    //
    // 默认为 0 是刻意的：删除不可逆，升级插件不该悄悄开始删用户的历史。
    // 想开启前建议先用 #chatgpt历史统计 看看会删掉多少。
    historyRetentionDays: 0
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
   *   retainDynamicContextHistory: boolean,
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
    // 是否在多轮普通对话中保留每轮动态上下文（群聊记录、时间、记忆）。
    // 关闭可显著减少 token；支持上下文缓存的渠道可改为开启。
    retainDynamicContextHistory: false,
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
    groupContextTemplateSuffix: '\n',
    // 图片下载的并发上限。群聊上下文里的图片以前是一张张串行下的，
    // 6 张图就要多等将近 1 秒。调大能更快，但同时在内存里的图片也更多
    // （峰值约等于 该值 × 单图大小），内存紧张可以调小到 1~2。
    imageFetchConcurrency: 6,
    // 预设前缀索引的缓存时间（秒），0 表示关闭。
    // 每条群消息都要判断一次是否命中预设前缀，不缓存的话每条消息都会把整张预设表
    // 读出来反序列化一遍。这里只缓存 {id, prefix}，不缓存预设本体，
    // 每个预设几十字节；预设增删改会自动失效。
    presetCacheTTL: 60,
    // 全部对话历史的保留天数，0 表示永久保留（默认）。
    // 伪人会话另有 bym.historyRetentionDays，通常设得更短；两个都会生效，
    // 也就是伪人按短的那个清，其余会话按这个清。
    historyRetentionDays: 0,
    // 群聊历史的缓存时间（秒），0 表示关闭（默认）。
    // 打开后同一个群在这段时间内的重复触发不会再走 QQ 网络拉历史，但缓存期内
    // 新到的消息不会进入上下文，而且会常驻最多 32 个群的消息对象。建议 <= 3。
    groupHistoryCacheTTL: 0
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
   *   port: number,
   *   publicBaseUrl: string}}
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
    // 管理面板自定义访问地址；NAT/反代场景可填完整地址，如 https://example.com
    publicBaseUrl: '',
    // 存储实现 sqlite lowdb
    storage: 'sqlite',
    // 操作日志最多保留的条数，设为 0 可禁用自动清理
    operationLogLimit: 50000,
    // 保留期清理之后是否自动 VACUUM 回收磁盘空间。
    // SQLite 删除数据后文件不会变小，空闲页要靠 VACUUM 才能还给文件系统
    // （incremental_vacuum 在 WAL 下几乎无效，实测过）。
    // VACUUM 很快——417 MiB 的历史库实测 1.0s——但会重写整个文件、期间独占写锁，
    // 并临时需要约等于库大小的额外磁盘空间。空闲页不够多时会自动跳过。
    // 默认关闭：重写整个数据库这种事应该由主人自己决定何时开始，
    // 也可以随时用 #chatgpt整理数据库 手动执行一次。
    autoVacuum: false,
    // 空闲页少于这个数就不做 VACUUM，避免每天为了几 MiB 重写整个库。
    // 默认 20000 页 ≈ 80 MiB（页大小 4KiB）
    autoVacuumMinFreePages: 20000
  }

  /**
   * 视觉/图片处理配置
   * @type {{
   *   nonVisionStrategy: 'tool' | 'ignore',
   *   visionChannelId: string,
   *   imageDescriptionModel: string,
   *   imageDescriptionSystemPrompt: string,
   *   defaultQuestion: string,
   *   maxImageSize: number,
   *   enableGroupContextImages: boolean,
   *   forceImageRefMimes: string[],
   *   imageRetentionPreset: 'forever' | '30d' | '7d' | '3d' | '1d' | 'custom',
   *   imageRetentionCustomHours: number
   * }}
   */
  vision = {
    // 非视觉模型策略：'tool' - 替换为引用文本 + ask_about_image 工具
    //                'ignore' - 仅替换为 [图片]
    nonVisionStrategy: 'tool',
    // 视觉模型渠道 ID（留空则自动查找第一个支持 visual 的渠道）
    visionChannelId: '',
    // 覆盖视觉模型（留空则使用渠道默认模型）
    imageDescriptionModel: '',
    // 图片描述时的系统提示词
    imageDescriptionSystemPrompt: 'You are an image analysis assistant. Answer questions about images accurately and thoroughly.',
    // 未指定 question 时的默认提问
    defaultQuestion: '请详细描述这张图片的内容，包括场景、人物、物体、文字、颜色等所有可见细节。',
    // 最大处理图片大小（bytes），默认 10MB
    maxImageSize: 10485760,
    // 是否将群聊上下文中的图片也存入历史（开启后图片会进入主干对话）
    enableGroupContextImages: true,
    // 即使视觉模型也无法直接查看的图片格式：这些格式不进入主干对话，
    // 而是保留 ref 文本，由模型调用 ask_about_image 交给识图渠道处理（识图渠道可配置支持 GIF 的模型）。
    forceImageRefMimes: ['image/gif'],
    // 图片缓存保留策略。默认永久保留，避免升级后意外删除已有图片。
    imageRetentionPreset: 'forever',
    // 自定义保留时间（小时），仅在 imageRetentionPreset 为 custom 时生效。
    imageRetentionCustomHours: 24
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

WHAT TO EXTRACT (high value):
- Personal facts about members (jobs, skills, life events, locations)
- Group events, plans, or decisions
- Shared knowledge or inside jokes the group has established
- Opinions or preferences that reveal something about a member's identity

DO NOT EXTRACT (low value):
- How members interact with a bot (commands, nicknames for bot, etc.)
- Mundane daily chatter without substance
- Greetings, thanks, or other pleasantries
- Anything that won't be relevant after a few hours

Return a JSON array. Each element must contain:
{
  "fact": 事实内容，必须完整包含事件的各个要素（谁参与了、做了什么事、背景是什么），尽可能整合而非拆分,
  "topic": 主题关键词，如 "活动"、"成员信息",
  "importance": 介于0和1之间的小数。重要事实(如人生大事、群决策)给0.8以上；普通趣事给0.4-0.6；琐碎信息给0.3以下或直接不提取,
  "source_message_ids": 原始消息ID数组,
  "source_messages": 对应原始消息的简要摘录,
  "involved_users": 出现或相关的用户ID数组
}

If nothing meaningful is found, return an empty array []. Quality over quantity.
Do not wrap the JSON array in code fences.`,
      extractionUserPrompt: `以下是群聊中的一些消息，请根据系统说明提取值得长期记忆的事实，以JSON数组形式返回。如果没有值得记忆的内容，返回[]。

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
      extractionSystemPrompt: `You are an assistant that extracts long-term personal memories about a user from their conversations with a bot.

CRITICAL RULES - Only extract memories that meet ALL of these criteria:
1. The information would remain true and useful weeks or months from now
2. The information has substance - it tells us something meaningful about the user's life, knowledge, preferences, or identity
3. The information would help the bot give better, more personalized responses in future conversations

DO NOT extract:
- How the user interacts with the bot (e.g., "likes to give commands", "calls the bot X", "interacts by asking for stories")
- Generic or trivial statements without information value
- Observations about the conversation itself rather than about the user
- Repetitive filler, small talk, or greetings

GOOD examples (high information value, extract these):
- "已顺利拿到博士学位"
- "具备大语言模型及嵌入模型的相关技术知识"
- "喜欢吃川菜，特别是麻辣火锅"
- "目前在字节跳动做后端开发"
- "养了一只叫汤圆的橘猫"

BAD examples (DO NOT extract):
- "习惯通过复读指令来与机器人互动" ← describes interaction pattern, not user knowledge
- "称呼机器人为'十四'" ← nickname for bot, not meaningful user info
- "要求机器人讲色情暴力故事" ← describes interaction, not user identity
- "今天问机器人天气怎么样" ← temporary, no lasting value

Quantity: Only extract memories when you find genuinely meaningful information. Extracting 0 memories is perfectly fine if nothing meets the criteria. Quality over quantity.

Return a JSON array of strings only, without any other characters including \`\`\` or \`\`\`json. Each string must be a short sentence (in the same language as the conversation) describing one piece of long-term memory.`,
      extractionUserPrompt: `下面是用户与机器人的对话，请根据系统提示提取可长期记忆的个人信息。如果没有值得记忆的内容，返回空数组[]。

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
    this._saveLastMtimeMs = 0

    // 监听文件变化
    this.watcher = fs.watchFile(this.configPath, (curr, prev) => {
      if (curr.mtimeMs !== prev.mtimeMs) {
        if (this._saveLastMtimeMs && Math.abs(curr.mtimeMs - this._saveLastMtimeMs) <= 1) {
          return
        }
        if (this._saveOrigin !== 'code') {
          this.loadFromFile()
        }
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

    const isEqual = (left, right) => {
      if (left === right) {
        return true
      }
      if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right)) {
          return false
        }
        if (left.length !== right.length) {
          return false
        }
        return left.every((item, index) => isEqual(item, right[index]))
      }
      if (left && right && typeof left === 'object' && typeof right === 'object') {
        const leftKeys = Object.keys(left)
        const rightKeys = Object.keys(right)
        if (leftKeys.length !== rightKeys.length) {
          return false
        }
        return leftKeys.every(key =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          isEqual(left[key], right[key])
        )
      }
      return false
    }

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
          if (targetValue === undefined || !isEqual(targetValue, sourceValue)) {
            changed = true
          }
          result[key] = Array.isArray(sourceValue)
            ? sourceValue.slice()
            : sourceValue
        }
      }
      return result
    }

    const sections = ['version', 'basic', 'bym', 'llm', 'management', 'chaite', 'vision', 'memory']
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
        vision: this.vision,
        memory: this.memory
      }

      const content = this.configPath.endsWith('.json')
        ? JSON.stringify(config, null, 2)
        : yaml.dump(config)

      fs.writeFileSync(this.configPath, content, 'utf8')
      this._saveLastMtimeMs = fs.statSync(this.configPath).mtimeMs
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
      vision: this.vision,
      memory: this.memory
    }
  }
}

export default new ChatGPTConfig()
