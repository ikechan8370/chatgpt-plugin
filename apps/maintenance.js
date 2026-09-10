import ChatGPTConfig from '../config/config.js'
import { pruneHistoryByRetention, retentionPolicies } from '../models/chaite/historyRetention.js'

export class ChatGPTMaintenance extends plugin {
  constructor () {
    const cmdPrefix = ChatGPTConfig.basic.commandPrefix
    super({
      name: 'ChatGPT-Plugin数据维护',
      dsc: '按保留期清理对话历史',
      event: 'message',
      priority: 20,
      rule: [
        {
          reg: `^${cmdPrefix}清理历史(记录)?$`,
          fnc: 'pruneHistory',
          permission: 'master'
        },
        {
          reg: `^${cmdPrefix}历史(记录)?(统计|状态)$`,
          fnc: 'historyStatus',
          permission: 'master'
        }
      ]
    })

    // 每天凌晨 4 点清一次。删除分批且走 low 优先级，不会挡住实时对话的写入。
    this.task = [{
      name: 'ChatGPT-历史记录保留期清理',
      cron: '0 0 4 * * *',
      fnc: this.pruneTask.bind(this),
      log: false
    }]
  }

  async pruneTask () {
    try {
      const { skipped, results } = await pruneHistoryByRetention()
      if (skipped) {
        logger.debug(`[History] retention prune skipped: ${skipped}`)
        return false
      }
      const total = results.reduce((sum, item) => sum + item.deleted, 0)
      if (total > 0) {
        logger.info(`[History] retention prune removed ${total} message(s)`)
      }
    } catch (err) {
      logger.error('[History] scheduled retention prune failed:', err)
    }
    return false
  }

  async historyStatus (e) {
    const policies = retentionPolicies()
    if (policies.length === 0) {
      await e.reply('当前未配置历史保留期，历史记录会一直保留。\n可设置 bym.historyRetentionDays（伪人会话）或 llm.historyRetentionDays（全部会话）。')
      return true
    }
    const { skipped, results } = await pruneHistoryByRetention({ dryRun: true })
    if (skipped) {
      await e.reply(`无法统计：${skipped}`)
      return true
    }
    const lines = results.map(item =>
      `- ${item.name}：保留 ${item.days} 天，当前有 ${item.deleted} 条待清理${item.error ? `（统计失败：${item.error}）` : ''}`
    )
    await e.reply(['📊 历史记录保留期：', ...lines, `\n执行清理请发送 ${ChatGPTConfig.basic.commandPrefix}清理历史`].join('\n'))
    return true
  }

  async pruneHistory (e) {
    const policies = retentionPolicies()
    if (policies.length === 0) {
      await e.reply('当前未配置历史保留期，没有可清理的内容。')
      return true
    }
    await e.reply('开始清理历史记录，请稍候……')
    const { skipped, results } = await pruneHistoryByRetention()
    if (skipped) {
      await e.reply(`清理未执行：${skipped}`)
      return true
    }
    const lines = results.map(item => {
      if (item.error) return `- ${item.name}：失败（${item.error}）`
      return `- ${item.name}：清理 ${item.deleted} 条${item.truncated ? '，仍有剩余，请再执行一次' : ''}`
    })
    const total = results.reduce((sum, item) => sum + item.deleted, 0)
    await e.reply([
      `✅ 共清理 ${total} 条历史记录`,
      ...lines,
      '\n注：SQLite 删除后文件不会立刻变小，空间会被后续写入复用。'
    ].join('\n'))
    return true
  }
}
