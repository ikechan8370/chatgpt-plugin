import Config from '../config/config.js'
import { GroupMessageCollector } from '../models/memory/collector.js'
import { memoryService } from '../models/memory/service.js'
import common from '../../../lib/common/common.js'

const collector = new GroupMessageCollector()

function isGroupManager (e) {
  if (e.isMaster) {
    return true
  }
  if (!e.member) {
    return false
  }
  if (typeof e.member.is_admin !== 'undefined') {
    return e.member.is_admin || e.member.is_owner
  }
  if (typeof e.member.role !== 'undefined') {
    return ['admin', 'owner'].includes(e.member.role)
  }
  return false
}

export class MemoryManager extends plugin {
  constructor () {
    const cmdPrefix = Config.basic.commandPrefix || '#chatgpt'
    super({
      name: 'ChatGPT-Plugin记忆系统',
      dsc: '处理记忆系统相关的采集与管理',
      event: 'message',
      priority: 550,
      rule: [
        // {
        //   reg: '[\\s\\S]+',
        //   fnc: 'collect',
        //   log: false
        // },
        {
          reg: '^#?(我的)?记忆$',
          fnc: 'showUserMemory'
        },
        {
          reg: '^#?他的记忆$',
          fnc: 'showTargetUserMemory'
        },
        {
          reg: '^#?(删除|清除)(我的)?记忆\\s*(\\d+)$',
          fnc: 'deleteUserMemory'
        },
        {
          reg: '^#?(本群|群)记忆$',
          fnc: 'showGroupMemory'
        },
        {
          reg: '^#?(删除|移除)群记忆\\s*(\\d+)$',
          fnc: 'deleteGroupMemory'
        },
        {
          reg: `^${cmdPrefix}记忆列表$`,
          fnc: 'adminMemoryOverview',
          permission: 'master'
        }
      ]
    })

    // 兼容miao和trss，气死了
    let task = {
      name: 'ChatGPT-群记忆轮询',
      cron: '*/1 * * * *',
      fnc: this.pollHistoryTask.bind(this),
      log: false
    }
    this.task = [task]

  }

  async collect (e) {
    collector.push(e)
    return false
  }

  async showUserMemory (e) {
    if (!memoryService.isUserMemoryEnabled(e.sender.user_id)) {
      await e.reply('私人记忆未开启或您未被授权。')
      return false
    }
    const memories = memoryService.listUserMemories(e.sender.user_id, e.isGroup ? e.group_id : null)

    if (!memories.length) {
      await e.reply('🧠 您的记忆：\n暂无记录~')
      return true
    }

    const msgs = memories.map(item =>
      `${item.id}. ${item.value}（重要度 ${item.importance.toFixed(2)}）`
    )

    const forwardMsg = await common.makeForwardMsg(e, ['🧠 您的记忆：', ...msgs], '私人记忆列表')
    await e.reply(forwardMsg)
    return true
  }

  async showTargetUserMemory (e) {
    if (!e.isGroup) {
      await e.reply('该指令仅可在群聊中使用。')
      return false
    }

    const at = e.at || (e.message?.find(m => m.type === 'at')?.qq)
    if (!at) {
      await e.reply('请@要查询的用户。')
      return false
    }

    if (!memoryService.isUserMemoryEnabled(at)) {
      await e.reply('该用户未开启私人记忆或未被授权。')
      return false
    }

    const memories = memoryService.listUserMemories(at, e.group_id)

    if (!memories.length) {
      await e.reply('🧠 TA的记忆：\n暂无记录~')
      return true
    }

    const msgs = memories.map(item =>
      `${item.id}. ${item.value}（重要度 ${item.importance.toFixed(2)}）`
    )

    const forwardMsg = await common.makeForwardMsg(e, ['🧠 TA的记忆：', ...msgs], 'TA的记忆列表')
    await e.reply(forwardMsg)
    return true
  }

  async deleteUserMemory (e) {
    const match = e.msg.match(/(\d+)$/)
    if (!match) {
      return false
    }
    const memoryId = Number(match[1])
    if (!memoryId) {
      return false
    }
    if (!memoryService.isUserMemoryEnabled(e.sender.user_id)) {
      await e.reply('私人记忆未开启或您未被授权。')
      return false
    }
    const success = memoryService.deleteUserMemory(memoryId, e.sender.user_id)
    await e.reply(success ? '已删除指定记忆。' : '未找到对应的记忆条目。')
    return success
  }

  async showGroupMemory (e) {
    if (!e.isGroup) {
      await e.reply('该指令仅可在群聊中使用。')
      return false
    }
    if (!memoryService.isGroupMemoryEnabled(e.group_id)) {
      await e.reply('本群尚未开启记忆功能。')
      return false
    }
    await collector.flush(e.group_id)
    const facts = memoryService.listGroupFacts(e.group_id)

    if (!facts.length) {
      await e.reply('📚 本群记忆：\n暂无群记忆。')
      return true
    }

    const msgs = facts.map(item => {
      const topic = item.topic ? `【${item.topic}】` : ''
      return `${item.id}. ${topic}${item.fact}`
    })

    const forwardMsg = await common.makeForwardMsg(e, ['📚 本群记忆：', ...msgs], '群记忆列表')
    await e.reply(forwardMsg)
    return true
  }

  async deleteGroupMemory (e) {
    if (!e.isGroup) {
      await e.reply('该指令仅可在群聊中使用。')
      return false
    }
    if (!memoryService.isGroupMemoryEnabled(e.group_id)) {
      await e.reply('本群尚未开启记忆功能。')
      return false
    }
    if (!isGroupManager(e)) {
      await e.reply('仅限主人或群管理员管理群记忆。')
      return false
    }
    await collector.flush(e.group_id)
    const match = e.msg.match(/(\d+)$/)
    if (!match) {
      return false
    }
    const factId = Number(match[1])
    if (!factId) {
      return false
    }
    const success = memoryService.deleteGroupFact(e.group_id, factId)
    await e.reply(success ? '已删除群记忆。' : '未找到对应的群记忆。')
    return success
  }

  async adminMemoryOverview (e) {
    const enabledGroups = (Config.memory?.group?.enabledGroups || []).map(String)
    const groupLines = enabledGroups.length ? enabledGroups.join(', ') : '暂无'
    const userStatus = Config.memory?.user?.enable ? '已启用' : '未启用'
    await e.reply(`记忆系统概览：\n- 群记忆开关：${Config.memory?.group?.enable ? '已启用' : '未启用'}\n- 已启用群：${groupLines}\n- 私人记忆：${userStatus}`)
    return true
  }

  async pollHistoryTask () {
    try {
      await collector.tickHistoryPolling()
    } catch (err) {
      logger.error('[Memory] scheduled history poll failed:', err)
    }
    return false
  }
}
