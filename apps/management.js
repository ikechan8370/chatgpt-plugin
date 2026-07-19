import ChatGPTConfig from '../config/config.js'
import { createCRUDCommandRules, createSwitchCommandRules } from '../utils/command.js'
import { Chaite, VERSION, McpToolExecutor } from 'chaite'
import * as crypto from 'node:crypto'
import * as os from 'node:os'
import fetch from 'node-fetch'
import common from '../../../lib/common/common.js'
import { parseBooleanFlag } from '../utils/common.js'
import { initMcpCompatibility } from '../utils/mcp/manager.js'

export class ChatGPTManagement extends plugin {
  constructor () {
    const cmdPrefix = ChatGPTConfig.basic.commandPrefix
    super({
      name: 'ChatGPT-Plugin管理',
      dsc: 'ChatGPT-Plugin管理',
      event: 'message',
      priority: 20,
      rule: [
        {
          reg: `^${cmdPrefix}管理面板$`,
          fnc: 'managementPanel',
          permission: 'master'
        },
        {
          reg: `^(${cmdPrefix})?#?结束(全部)?对话$`,
          fnc: 'destroyConversation'
        },
        {
          reg: `^${cmdPrefix}(bym|伪人)设置默认预设`,
          fnc: 'setDefaultBymPreset',
          permission: 'master'
        },
        {
          reg: `^${cmdPrefix}(开启|关闭)(普通对话)?(思考|推理)(过程)?(转发|回显)$`,
          fnc: 'toggleChatReasoningForward',
          permission: 'master'
        },
        {
          reg: `^${cmdPrefix}(查看)?(当前)?(配置|信息|统计信息|状态)$`,
          fnc: 'currentStatus',
          permission: 'master'
        },
        {
          reg: `^${cmdPrefix}(刷新|重载)(MCP|mcp)(工具)?$`,
          fnc: 'refreshMcpTools',
          permission: 'master'
        },
        {
          reg: `^${cmdPrefix}确认MCP\\s+[a-zA-Z0-9-]+$`,
          fnc: 'confirmMcpDraft',
          permission: 'master'
        }
      ]
    })
    if (!Chaite.getInstance()) {
      const waitForChaite = async () => {
        while (!Chaite.getInstance()) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        return Chaite.getInstance()
      }
      waitForChaite().then(() => {
        this.initCommand(cmdPrefix)
      })
    } else {
      this.initCommand(cmdPrefix)
    }
  }

  initCommand (cmdPrefix) {
    this.rule.push(...[
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '渠道', 'channels'),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '预设', 'presets'),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '工具', 'tools'),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '处理器', 'processors'),
      createSwitchCommandRules.bind(this)(cmdPrefix, '(预设切换|其他人切换预设)', 'customPreset', 1),
      createSwitchCommandRules.bind(this)(cmdPrefix, '(调试|debug)(模式)?', 'debug'),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '预设切换黑名单', 'customPresetUserBlackList', false),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '预设切换白名单', 'customPresetUserWhiteList', false),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '输入屏蔽词', 'promptBlockWords', false),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '输出屏蔽词', 'responseBlockWords', false),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '黑名单群', 'blackGroups', false),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '白名单群', 'whiteGroups', false),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '黑名单用户', 'blackUsers', false),
      ...createCRUDCommandRules.bind(this)(cmdPrefix, '白名单用户', 'whiteUsers', false),
      createSwitchCommandRules(cmdPrefix, '(伪人|bym)', 'bym')
    ])
  }

  async managementPanel (e) {
    const token = Chaite.getInstance().getFrontendAuthHandler().generateToken(300)
    const loginPath = `/api/chatgpt-plugin/autologin/${encodeURIComponent(token)}`
    const messages = [
      '管理面板登录入口已生成。\n请从下面几类地址里选择当前环境能打开的一项。',
      formatPanelAddressMessage('自定义地址', getCustomPanelBaseUrlEntries(), loginPath, '没有配置自定义访问地址。'),
      formatPanelAddressMessage('内网地址', getInternalPanelBaseUrlEntries(), loginPath, '没有读取到本机网卡地址。'),
      formatPanelAddressMessage('外网地址', await getExternalPanelBaseUrlEntries(), loginPath, '暂时没有获取到公网 IPv4/IPv6。'),
      [
        `临时 token：${token}`,
        '一次性登录链接 300 秒内有效，打开成功后该临时 token 会立即失效。',
        '如果自动登录失败，请打开对应的面板地址后手动粘贴 token。'
      ].join('\n')
    ]

    const sentPrivate = await replyPrivateForward(e, messages, '管理面板登录入口')
    if (e.isGroup) {
      if (sentPrivate) {
        await e.reply('管理面板登录信息已通过私聊发送，请注意查收', true)
      } else {
        await e.reply('管理面板登录信息生成成功，但私聊发送失败，请先添加机器人好友或私聊机器人后重试', true)
      }
    }
  }

  async confirmMcpDraft (e) {
    const draftId = e.msg.trim().split(/\s+/).pop()
    const chaite = Chaite.getInstance()
    const config = chaite.getMcpCapabilityManager()?.takeDraft(draftId)
    if (!config) {
      await e.reply('没有找到可确认的 MCP 草案，草案可能已过期。')
      return false
    }
    const manager = chaite.getMcpServerManager()
    const server = await manager?.add(config)
    try {
      const executor = new McpToolExecutor(server)
      const tools = await executor.listAvailableTools({ runId: 'qq-confirm', userId: String(e.user_id || e.sender?.user_id || 'master') })
      await executor.close()
      await manager?.update(server.id, { tools, toolsDiscoveredAt: Date.now() })
      await e.reply(`MCP 服务“${server.name}”已保存并连接成功，发现并缓存 ${tools.length} 个工具。接下来可在面板创建关联 Skill。`)
    } catch (error) {
      await manager?.delete(server?.id)
      await e.reply(`MCP 服务连接失败，未保存：${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  async setDefaultBymPreset (e) {
    const presetId = e.msg.replace(`${ChatGPTConfig.basic.commandPrefix}伪人设置默认预设`, '')
    const preset = await Chaite.getInstance().getChatPresetManager().getInstance(presetId)
    if (preset) {
      ChatGPTConfig.bym.defaultPreset = presetId
      this.reply(`伪人模式默认预设已切换为${presetId}(${preset.name})`)
    } else {
      this.reply(`未找到预设${presetId}`)
    }
  }

  toggleChatReasoningForward (e) {
    const enable = e.msg.includes('开启')
    ChatGPTConfig.basic.sendReasoning = enable
    if (typeof ChatGPTConfig.saveToFile === 'function') {
      ChatGPTConfig.saveToFile('code')
    }
    logger.info(`[ChatGPT-Plugin] set basic.sendReasoning=${ChatGPTConfig.basic.sendReasoning} (type=${typeof ChatGPTConfig.basic.sendReasoning})`)
    this.reply(`普通对话思考过程转发已${enable ? '开启' : '关闭'}`)
  }

  async destroyConversation (e) {
    if (e.msg.includes('全部')) {
      if (!e.isMaster) {
        this.reply('仅限主人使用')
        return false
      }
      const userStates = await Chaite.getInstance().getUserStateStorage().listItems()
      // let num = 0
      for (const userState of userStates) {
        if (userState.current.conversationId && userState.current.messageId) {
          // num++
          userState.current.conversationId = crypto.randomUUID()
          userState.current.messageId = crypto.randomUUID()
          await Chaite.getInstance().getUserStateStorage().setItem(userState.userId + '', userState)
        }
      }
      this.reply('已结束全部对话')
    } else {
      const state = await Chaite.getInstance().getUserStateStorage().getItem(e.sender.user_id + '')
      if (!state || !state.current.conversationId || !state.current.messageId) {
        this.reply('当前未开启对话')
        return false
      }
      state.current.conversationId = crypto.randomUUID()
      state.current.messageId = crypto.randomUUID()
      await Chaite.getInstance().getUserStateStorage().setItem(e.sender.user_id + '', state)
      this.reply('已结束当前对话')
    }
  }

  async currentStatus (e) {
    const msgs = []
    let basic = `Chaite版本：${VERSION}\n`
    const user = Chaite.getInstance().getToolsManager().cloudService?.getUser()
    if (user) {
      basic += `Chaite Cloud：已认证 @${user.username}`
    } else if (ChatGPTConfig.chaite.cloudBaseUrl) {
      basic += 'Chaite Cloud: 未认证'
    } else {
      basic += 'Chaite Cloud: 未接入'
    }
    msgs.push(basic)

    const allChannels = await Chaite.getInstance().getChannelsManager().getAllChannels()
    let channelMsg = `渠道总数：${allChannels.length}\n`
    channelMsg += `请使用 ${ChatGPTConfig.basic.commandPrefix}渠道列表 查看全部渠道\n\n`
    allChannels.map(c => c.models).reduce((acc, cur) => {
      acc.push(...cur)
      return acc
    }, []).forEach(m => {
      channelMsg += `${m}：${allChannels.filter(c => c.models.includes(m)).length}个\n`
    })
    msgs.push(channelMsg)

    const allPresets = await Chaite.getInstance().getChatPresetManager().getAllPresets()
    let presetMsg = `预设总数：${allPresets.length}\n`
    presetMsg += `请使用 ${ChatGPTConfig.basic.commandPrefix}预设列表 查看全部预设`
    msgs.push(presetMsg)

    const defaultChatPresetId = ChatGPTConfig.llm.defaultChatPresetId
    const currentPreset = await Chaite.getInstance().getChatPresetManager().getInstance(defaultChatPresetId)
    msgs.push(`当前预设：${currentPreset?.name || '未设置'}${currentPreset ? ('\n\n' + currentPreset.toFormatedString(false)) : ''}`)
    const chatReasoningEnabled = parseBooleanFlag(ChatGPTConfig.basic.sendReasoning, true)
    const bymReasoningEnabled = parseBooleanFlag(ChatGPTConfig.bym.sendReasoning, false)
    msgs.push(`普通对话思考过程转发：${chatReasoningEnabled ? '开启' : '关闭'}\n伪人思考过程转发：${bymReasoningEnabled ? '开启' : '关闭'}`)

    const allTools = await Chaite.getInstance().getToolsManager().listInstances()
    let toolsMsg = `工具总数：${allTools.length}\n`
    toolsMsg += `请使用 ${ChatGPTConfig.basic.commandPrefix}工具列表 查看全部工具`
    msgs.push(toolsMsg)

    const allProcessors = await Chaite.getInstance().getProcessorsManager().listInstances()
    let processorsMsg = `处理器总数：${allProcessors.length}\n`
    processorsMsg += `请使用 ${ChatGPTConfig.basic.commandPrefix}处理器列表 查看全部处理器`
    msgs.push(processorsMsg)

    const userStatesManager = Chaite.getInstance().getUserStateStorage()
    const allUsers = await userStatesManager.listItems()
    const currentUserNums = allUsers.filter(u => u.current.conversationId && u.current.messageId).length
    const historyUserNums = allUsers.length
    msgs.push(`用户总数：${historyUserNums}\n当前对话用户数：${currentUserNums}`)

    const m = await common.makeForwardMsg(e, msgs, e.msg)
    e.reply(m)
  }

  async refreshMcpTools (e) {
    if (!ChatGPTConfig.mcp?.enable) {
      await this.reply('MCP 未开启，请先在配置中启用 mcp.enable')
      return false
    }

    const toolsManager = Chaite.getInstance().getToolsManager()
    const before = await toolsManager.listInstances()

    await this.reply('开始刷新 MCP 工具，请稍候...')
    try {
      await initMcpCompatibility(toolsManager)
      const after = await toolsManager.listInstances()
      const mcpPrefix = `${ChatGPTConfig.mcp?.toolNamePrefix || 'mcp'}_`
      const mcpCount = after.filter(t => String(t?.name || '').startsWith(mcpPrefix)).length
      await this.reply(`MCP 工具刷新完成\n工具总数：${before.length} -> ${after.length}\n桥接工具数：${mcpCount}`)
      return true
    } catch (err) {
      logger.error('[MCP] 手动刷新工具失败:', err)
      await this.reply(`MCP 工具刷新失败：${err?.message || err}`)
      return false
    }
  }
}

function getCustomPanelBaseUrlEntries () {
  const publicBaseUrl = String(ChatGPTConfig.chaite.publicBaseUrl || '').trim()
  return publicBaseUrl
    ? [{ label: '配置项 publicBaseUrl', url: normalizeBaseUrl(publicBaseUrl) }]
    : []
}

function getInternalPanelBaseUrlEntries () {
  const entries = []
  const port = ChatGPTConfig.chaite.port
  const normalizedHost = String(ChatGPTConfig.chaite.host || '').trim()
  if (normalizedHost && !['0.0.0.0', '::', '::0'].includes(normalizedHost)) {
    entries.push({
      label: '配置的监听地址',
      url: `http://${formatHost(normalizedHost)}:${port}`,
      host: normalizedHost
    })
  }

  getLocalNetworkAddressEntries().forEach(entry => {
    entries.push({
      label: `网卡 ${entry.name}`,
      url: `http://${formatHost(entry.address)}:${port}`,
      host: entry.address
    })
  })

  entries.push({
    label: '本机回环地址',
    url: `http://127.0.0.1:${port}`,
    host: '127.0.0.1'
  })

  const uniqueEntries = uniqueUrlEntries(entries)
  const nonLoopbackEntries = uniqueEntries.filter(entry => !isLoopbackHost(entry.host))
  // 回环地址只在没有任何实际可访问地址时作为本机访问的兜底。
  return nonLoopbackEntries.length > 0 ? nonLoopbackEntries : uniqueEntries
}

async function getExternalPanelBaseUrlEntries () {
  const port = ChatGPTConfig.chaite.port
  const [ipv4, ipv6] = await Promise.all([
    fetchPublicIP('IPv4', [
      'https://api.live.bilibili.com/xlive/web-room/v1/index/getIpInfo',
      'https://api-ipv4.ip.sb/ip',
      'https://api.ipify.org',
      'https://ip.me'
    ]),
    fetchPublicIP('IPv6', [
      'https://api-ipv6.ip.sb/ip',
      'https://api64.ipify.org'
    ])
  ])
  return uniqueUrlEntries([
    ipv4 ? { label: '公网 IPv4', url: `http://${formatHost(ipv4)}:${port}` } : null,
    ipv6 ? { label: '公网 IPv6', url: `http://${formatHost(ipv6)}:${port}` } : null
  ].filter(Boolean))
}

function getLocalNetworkAddressEntries () {
  const candidates = []
  const interfaces = os.networkInterfaces()
  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' || address.family === 'IPv6') {
        candidates.push({
          name,
          address: address.address,
          family: address.family,
          internal: address.internal
        })
      }
    }
  }
  return candidates.sort((left, right) => {
    if (left.internal !== right.internal) {
      return left.internal ? 1 : -1
    }
    if (left.family !== right.family) {
      return left.family === 'IPv4' ? -1 : 1
    }
    if (isPrivateIPv4(left.address) !== isPrivateIPv4(right.address)) {
      return isPrivateIPv4(left.address) ? -1 : 1
    }
    return left.address.localeCompare(right.address)
  })
}

async function fetchPublicIP (family, urls) {
  for (const url of urls) {
    let timeout
    try {
      const controller = new AbortController()
      timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'chatgpt-plugin'
        }
      })
      clearTimeout(timeout)
      if (!response.ok) {
        continue
      }
      const text = (await response.text()).trim()
      const ip = parsePublicIPResponse(text)
      if (isIPLiteral(ip, family)) {
        return ip
      }
    } catch (error) {
      logger?.debug?.(`[ManagementPanel] public ${family} lookup failed: ${url} (${error?.code || error?.type || error?.name || error?.message || 'unknown'})`)
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }
  return ''
}

function parsePublicIPResponse (text) {
  if (isIPLiteral(text)) {
    return text
  }
  try {
    const data = JSON.parse(text)
    return String(data?.data?.addr || data?.ip || data?.addr || '').trim()
  } catch {
    return ''
  }
}

function isIPLiteral (value, family) {
  if (family === 'IPv4') {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
  }
  if (family === 'IPv6') {
    return value.includes(':') && /^[0-9a-f:]+$/i.test(value)
  }
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-f:]+$/i.test(value)
}

function isPrivateIPv4 (ip) {
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return true
  }
  const match = ip.match(/^172\.(\d+)\./)
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31)
}

function isLoopbackHost (host) {
  const normalizedHost = String(host || '').trim().toLowerCase()
  return normalizedHost === '127.0.0.1'
    || normalizedHost === '::1'
    || normalizedHost === '[::1]'
    || normalizedHost === 'localhost'
}

function formatHost (host) {
  const safeHost = host.replace(/%/g, '%25')
  return safeHost.includes(':') && !safeHost.startsWith('[') ? `[${safeHost}]` : safeHost
}

function joinUrl (baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

function normalizeBaseUrl (url) {
  return url.replace(/\/+$/, '')
}

function formatPanelAddressMessage (title, entries, loginPath, emptyText) {
  const lines = [`${title}：`]
  if (entries.length === 0) {
    lines.push(emptyText)
  } else {
    entries.forEach(entry => {
      lines.push(`${entry.label}：${joinUrl(entry.url, loginPath)}`)
    })
  }
  return lines.join('\n')
}

function uniqueUrlEntries (entries) {
  const seen = new Set()
  return entries.filter(entry => {
    if (seen.has(entry.url)) {
      return false
    }
    seen.add(entry.url)
    return true
  })
}

async function replyPrivateForward (e, messages, title) {
  const forwardMsg = await makePrivateForwardMsg(e, messages, title)
  if (!e.isGroup) {
    await e.reply(forwardMsg)
    return true
  }

  const userId = e.sender?.user_id || e.user_id
  if (!userId) {
    return false
  }

  try {
    const bot = e.bot || globalThis.Bot
    const user = bot?.pickUser?.(userId) || bot?.pickFriend?.(userId)
    if (user?.sendMsg) {
      await user.sendMsg(forwardMsg)
      return true
    }
    if (e.friend?.sendMsg) {
      await e.friend.sendMsg(forwardMsg)
      return true
    }
  } catch (error) {
    logger?.warn?.('Failed to send management panel login info privately:', error)
  }
  return false
}

async function makePrivateForwardMsg (e, messages, title) {
  const bot = e.bot || globalThis.Bot
  const userId = e.sender?.user_id || e.user_id
  const user = userId ? (bot?.pickUser?.(userId) || bot?.pickFriend?.(userId)) : null
  const userInfo = {
    user_id: bot?.uin || e.self_id || userId,
    nickname: bot?.nickname || 'ChatGPT-Plugin'
  }
  const nodes = messages.map(message => ({
    ...userInfo,
    message
  }))

  try {
    if (user?.makeForwardMsg) {
      return await user.makeForwardMsg(nodes)
    }
    if (e.friend?.makeForwardMsg) {
      return await e.friend.makeForwardMsg(nodes)
    }
    if (e.group?.makeForwardMsg) {
      return await e.group.makeForwardMsg(nodes)
    }
    return await common.makeForwardMsg(e, messages, title)
  } catch (error) {
    logger?.warn?.('Failed to build management panel forward message:', error)
    return [`${title}：`, ...messages].join('\n\n')
  }
}
