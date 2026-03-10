import ChatGPTConfig from '../config/config.js'
import { createCRUDCommandRules, createSwitchCommandRules } from '../utils/command.js'
import { Chaite, VERSION } from 'chaite'
import * as crypto from 'node:crypto'
import common from '../../../lib/common/common.js'
import { parseBooleanFlag } from '../utils/common.js'

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

  managementPanel (e) {
    // todo
    // this.reply(`(todo)管理面板地址：http://${ChatGPTConfig.chaite.host}:${ChatGPTConfig.chaite.host}`)
    const token = Chaite.getInstance().getFrontendAuthHandler().generateToken(300)
    this.reply(`token: ${token}, 有效期300秒`, true)
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
}
