import {
  Chaite,
  ChannelsManager,
  ChatPresetManager,
  DefaultChannelLoadBalancer,
  ProcessorsManager,
  RAGManager,
  ToolManager,
  ToolsGroupManager,
  TriggerManager
  , OperationLogManager, McpServerManager, SkillRegistry
} from 'chaite'
import ChatGPTConfig from '../../config/config.js'
import { LowDBChannelStorage } from './storage/lowdb/channel_storage.js'
import { LowDBChatPresetsStorage } from './storage/lowdb/chat_preset_storage.js'
import { LowDBToolsStorage } from './storage/lowdb/tools_storage.js'
import { LowDBProcessorsStorage } from './storage/lowdb/processors_storage.js'
import { ChatGPTUserModeSelector } from './user_mode_selector.js'
import { LowDBUserStateStorage } from './storage/lowdb/user_state_storage.js'
import { LowDBToolsGroupDTOsStorage } from './storage/lowdb/tool_groups_storage.js'
import { LowDBHistoryManager } from './storage/lowdb/history_manager.js'
import { VectraVectorDatabase } from './vector_database.js'
import path from 'path'
import fs from 'fs'
import { migrateDatabase } from '../../utils/initDB.js'
import { dataDir } from '../../utils/common.js'
import { initDrivers, getDriver, DB_MAIN } from './storage/driver/index.js'
import { SqlChannelStorage } from './storage/sql/channel_storage.js'
import { SqlChatPresetStorage } from './storage/sql/chat_preset_storage.js'
import { SqlToolsStorage } from './storage/sql/tools_storage.js'
import { SqlProcessorsStorage } from './storage/sql/processors_storage.js'
import { SqlUserStateStorage } from './storage/sql/user_state_storage.js'
import { SqlToolsGroupStorage } from './storage/sql/tool_groups_storage.js'
import { SqlMcpServerStorage } from './storage/sql/mcp_server_storage.js'
import SqlTriggerStorage from './storage/sql/trigger_storage.js'
import { checkMigrate } from './storage/sqlite/migrate.js'
import { SQLiteHistoryManager } from './storage/sqlite/history_manager.js'
import LowDBTriggerStorage from './storage/lowdb/trigger_storage,.js'
import { createChaiteVectorizer } from './vectorizer.js'
import { MemoryRouter, authenticateMemoryRequest } from '../memory/router.js'
import { SQLiteOperationLogStorage } from './storage/sqlite/operation_log_storage.js'
import { LowDBMcpServerStorage } from './storage/lowdb/mcp_server_storage.js'
import { createDebugSanitizingLogger } from '../../utils/log.js'
import { migrateSplitSQLiteDatabases } from './storage/sqlite/split_migrate.js'

/**
 * 认证，以便共享上传
 * @param apiKey
 * @returns {Promise<import('chaite').User | null>}
 */
export async function authCloud (apiKey = ChatGPTConfig.chaite.cloudApiKey) {
  try {
    await Chaite.getInstance().auth(apiKey)
    return Chaite.getInstance().getToolsManager().cloudService.getUser()
  } catch (err) {
    logger.error(err)
    return null
  }
}

/**
 * 初始化RAG管理器
 * @param {string} model
 * @param {number} dimensions
 */
export async function initRagManager (model, dimensions) {
  const vectorizer = createChaiteVectorizer(model, dimensions)
  const vectorDBPath = path.resolve('./plugins/chatgpt-plugin', ChatGPTConfig.chaite.dataDir, 'vector_index')
  if (!fs.existsSync(vectorDBPath)) {
    fs.mkdirSync(vectorDBPath, { recursive: true })
  }
  const vectorDB = new VectraVectorDatabase(vectorDBPath)
  await vectorDB.init()
  const ragManager = new RAGManager(vectorDB, vectorizer)
  return Chaite.getInstance().setRAGManager(ragManager)
}

export async function initChaite () {
  const chaiteLogger = createDebugSanitizingLogger(logger)
  const storage = ChatGPTConfig.chaite.storage
  let channelsStorage, chatPresetsStorage, toolsStorage, processorsStorage, userStateStorage, historyStorage, toolsGroupStorage, triggerStorage, operationLogStorage, mcpServerStorage
  switch (storage) {
    case 'sqlite': {
      const historyDbPath = path.join(dataDir, 'history.db')
      await migrateSplitSQLiteDatabases(dataDir)

      // 九个 storage 现在共用 sql_storage.js 那一份实现，方言差异由 driver 兜住。
      // 这里拿到的是哪种 driver 由 chaite.db.dialect 决定，调用方不需要知道。
      const dialect = ChatGPTConfig.chaite.db?.dialect || 'sqlite'
      if (dialect !== 'sqlite') {
        // driver 层本身支持 postgres，但历史记录和操作日志还直连 SQLite。现在放行
        // 只会把数据劈到两个引擎上，比不支持更糟，所以先明确拦住。
        throw new Error(
          `chaite.db.dialect=${dialect} 暂不可用：对话历史与操作日志尚未迁移到 driver 层，` +
          '现在切换会导致数据分散在两个数据库。请暂时使用 sqlite。'
        )
      }
      await initDrivers({ dialect, dataDir, connection: ChatGPTConfig.chaite.db })
      const mainDriver = getDriver(DB_MAIN)

      channelsStorage = new SqlChannelStorage(mainDriver)
      await channelsStorage.initialize()
      chatPresetsStorage = new SqlChatPresetStorage(mainDriver)
      await chatPresetsStorage.initialize()
      toolsStorage = new SqlToolsStorage(mainDriver)
      await toolsStorage.initialize()
      processorsStorage = new SqlProcessorsStorage(mainDriver)
      await processorsStorage.initialize()
      userStateStorage = new SqlUserStateStorage(mainDriver)
      await userStateStorage.initialize()
      toolsGroupStorage = new SqlToolsGroupStorage(mainDriver)
      await toolsGroupStorage.initialize()
      triggerStorage = new SqlTriggerStorage(mainDriver)
      await triggerStorage.initialize()
      mcpServerStorage = new SqlMcpServerStorage(mainDriver)
      await mcpServerStorage.initialize()

      // 历史记录还没迁到 driver 层（它实现的是 AbstractHistoryManager，不是
      // ChaiteStorage，而且还要管图片落盘），暂时仍直连 SQLite
      historyStorage = new SQLiteHistoryManager(historyDbPath, path.join(dataDir, 'images'))
      await checkMigrate()
      break
    }
    case 'lowdb': {
      // 相对路径：'storage/lowdb/storage.js' 是裸说明符，既没有对应的包也没有
      // imports 映射，选到 lowdb 就会 ERR_MODULE_NOT_FOUND
      const { default: ChatGPTStorage, ChatGPTHistoryStorage } = await import('./storage/lowdb/storage.js')
      await ChatGPTStorage.init()
      channelsStorage = new LowDBChannelStorage(ChatGPTStorage)
      chatPresetsStorage = new LowDBChatPresetsStorage(ChatGPTStorage)
      toolsStorage = new LowDBToolsStorage(ChatGPTStorage)
      processorsStorage = new LowDBProcessorsStorage(ChatGPTStorage)
      userStateStorage = new LowDBUserStateStorage(ChatGPTStorage)
      toolsGroupStorage = new LowDBToolsGroupDTOsStorage(ChatGPTStorage)
      triggerStorage = new LowDBTriggerStorage(ChatGPTStorage)
      mcpServerStorage = new LowDBMcpServerStorage(ChatGPTStorage)
      await ChatGPTHistoryStorage.init()
      historyStorage = new LowDBHistoryManager(ChatGPTHistoryStorage)
      break
    }
    default:
      throw new Error(`未知的存储实现 chaite.storage=${storage}，可选值：sqlite、lowdb`)
  }
  const channelsManager = await ChannelsManager.init(channelsStorage, new DefaultChannelLoadBalancer())
  const toolsDir = path.resolve('./plugins/chatgpt-plugin', ChatGPTConfig.chaite.toolsDirPath)
  if (!fs.existsSync(toolsDir)) {
    fs.mkdirSync(toolsDir, { recursive: true })
  }
  const toolsManager = await ToolManager.init(toolsDir, toolsStorage)
  const processorsDir = path.resolve('./plugins/chatgpt-plugin', ChatGPTConfig.chaite.processorsDirPath)
  if (!fs.existsSync(processorsDir)) {
    fs.mkdirSync(processorsDir, { recursive: true })
  }
  const processorsManager = await ProcessorsManager.init(processorsDir, processorsStorage)
  const chatPresetManager = await ChatPresetManager.init(chatPresetsStorage)
  const toolsGroupManager = await ToolsGroupManager.init(toolsGroupStorage)
  const triggersDir = path.resolve('./plugins/chatgpt-plugin', ChatGPTConfig.chaite.triggersDir)
  if (!fs.existsSync(triggersDir)) {
    fs.mkdirSync(triggersDir, { recursive: true })
  }
  const triggerManager = new TriggerManager(triggersDir, triggerStorage)
  await triggerManager.initialize()
  const userModeSelector = new ChatGPTUserModeSelector()
  let chaite = Chaite.init(channelsManager, toolsManager, processorsManager, chatPresetManager, toolsGroupManager, triggerManager,
    userModeSelector, userStateStorage, historyStorage, chaiteLogger)
  // 操作日志是高频写入、保留量按万条计的数据，lowdb 会把整个集合常驻内存并
  // 整文件重写，不适合做持久化后端。所以 lowdb 下只挂内存版 manager：
  // 管理面板的日志页面照常可用，只是重启后不保留。
  if (storage === 'sqlite') {
    operationLogStorage = new SQLiteOperationLogStorage(path.join(dataDir, 'operation_logs.db'), ChatGPTConfig.chaite.operationLogLimit)
    await operationLogStorage.initialize()
  }
  chaite.setOperationLogManager(new OperationLogManager(operationLogStorage))
  chaite.setMcpServerManager(new McpServerManager(mcpServerStorage))
  chaite.setMcpManagementGuard(context => Boolean(context.getEvent()?.isMaster))
  const skillsDir = path.join(dataDir, 'skills')
  if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true })
  const skillRegistry = new SkillRegistry(skillsDir)
  await skillRegistry.load()
  chaite.setSkillRegistry(skillRegistry)
  logger.info('Chaite 初始化完成')
  chaite.setCloudService(ChatGPTConfig.chaite.cloudBaseUrl)
  logger.info('Chaite.Cloud 初始化完成')
  await migrateDatabase()
  if (ChatGPTConfig.chaite.cloudApiKey) {
    const user = await authCloud(ChatGPTConfig.chaite.cloudApiKey)
    if (user) {
      logger.info(`Chaite.Cloud 认证成功, 当前用户${user.username || user.email} (${user.user_id})`)
    } else {
      logger.warn('Chaite.Cloud 认证失败，将继续使用本地功能')
    }
  }
  await initRagManager(ChatGPTConfig.llm.embeddingModel, ChatGPTConfig.llm.dimensions)
  if (!ChatGPTConfig.chaite.authKey) {
    ChatGPTConfig.chaite.authKey = Chaite.getInstance().getFrontendAuthHandler().generateToken(0, true)
  }
  chaite.getGlobalConfig().setAuthKey(ChatGPTConfig.chaite.authKey)
  // 监听Chaite配置变化，同步需要同步的配置
  chaite.on('config-change', obj => {
    const { key, newVal, oldVal } = obj
    if (key === 'authKey') {
      ChatGPTConfig.serverAuthKey = newVal
    }
    logger.debug(`Chaite config changed: ${key} from ${oldVal} to ${newVal}`)
  })
  // 监听通过chaite对插件配置修改
  chaite.setUpdateConfigCallback(config => {
    logger.debug('chatgpt-plugin config updated')

    // 设置保存来源标记，而不是使用 _isSaving
    ChatGPTConfig._saveOrigin = 'chaite'

    try {
      Object.keys(config).forEach(key => {
        if (typeof config[key] === 'object' && config[key] !== null && ChatGPTConfig[key]) {
          deepMerge(ChatGPTConfig[key], config[key])
        } else {
          ChatGPTConfig[key] = config[key]
        }
      })

      // 回传部分需要同步的配置
      chaite.getGlobalConfig().setDebug(ChatGPTConfig.basic.debug)
      chaite.getGlobalConfig().setAuthKey(ChatGPTConfig.chaite.authKey)
      operationLogStorage?.setMaxEntries(ChatGPTConfig.chaite.operationLogLimit).catch(error => logger.warn(`更新操作日志保留条数失败: ${error.message}`))

      // 使用新的触发保存方法，而不是直接调用saveToFile
      ChatGPTConfig._triggerSave('chaite')
    } finally {
      // 不需要在这里清除标记，_triggerSave已经处理了延迟清除
    }
  })
  // 授予Chaite获取插件配置的能力以便通过api放出
  chaite.setGetConfig(async () => {
    return ChatGPTConfig
  })
  chaite.getGlobalConfig().setHost(ChatGPTConfig.chaite.host)
  chaite.getGlobalConfig().setPort(ChatGPTConfig.chaite.port)
  chaite.getGlobalConfig().setDebug(ChatGPTConfig.basic.debug)
  logger.info('Chaite.RAGManager 初始化完成')
  chaite.runApiServer(app => {
    registerManagementPanelAutoLogin(app)
    app.use('/api/memory', authenticateMemoryRequest, MemoryRouter)
  }, {
    frontendDir: path.resolve('./plugins/chatgpt-plugin/resources/admin')
  })
}

function registerManagementPanelAutoLogin (app) {
  app.get('/api/chatgpt-plugin/autologin/:token', (req, res) => {
    res
      .status(200)
      .type('html')
      .send(renderAutoLoginHtml(req.params.token))
  })
}

function renderAutoLoginHtml (token) {
  const tokenJson = JSON.stringify(token).replace(/</g, '\\u003c')
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChatGPT 管理面板登录中</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      color: #1f2937;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(420px, calc(100vw - 32px));
      padding: 28px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 18px 45px rgb(15 23 42 / 8%);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: 650;
    }
    p {
      margin: 0;
      color: #64748b;
      line-height: 1.7;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <main>
    <h1>正在登录管理面板</h1>
    <p id="message">请稍候，正在校验一次性 token。</p>
  </main>
  <script>
    const token = ${tokenJson};
    const message = document.getElementById('message');

    function setLocalStorage(key, value, expire = 60 * 60 * 24 * 7) {
      window.localStorage.setItem(key, JSON.stringify({
        value,
        expire: Date.now() + expire * 1000
      }));
    }

    async function login() {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const result = await response.json();
      const data = result && result.data;
      if (!response.ok || result.code !== 0 || !data || !data.token) {
        throw new Error(result.message || 'token 无效或已过期');
      }
      setLocalStorage('userInfo', data);
      setLocalStorage('accessToken', data.token);
      if (data.refreshToken) {
        setLocalStorage('refreshToken', data.refreshToken);
      }
      message.textContent = '登录成功，正在进入面板。';
      window.location.replace('/');
    }

    login().catch(error => {
      message.textContent = '自动登录失败：' + error.message + '。请返回私聊消息，使用面板地址和 token 手动登录。';
    });
  </script>
</body>
</html>`
}

function deepMerge (target, source) {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null && target[key]) {
        // 如果是对象且目标属性存在，递归合并
        deepMerge(target[key], source[key])
      } else {
        // 否则直接赋值
        target[key] = source[key]
      }
    }
  }
}
