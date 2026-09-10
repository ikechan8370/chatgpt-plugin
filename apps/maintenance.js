import ChatGPTConfig from '../config/config.js'
import { pruneHistoryByRetention, retentionPolicies, runHistoryMaintenance, vacuumDatabases } from '../models/chaite/historyRetention.js'

const MiB = 1024 * 1024

function formatVacuumResults (results) {
  return results.map(item => {
    if (item.error) return `- ${item.name}：失败（${item.error}）`
    if (item.skipped === 'disk-space') {
      return `- ${item.name}：跳过，磁盘剩余空间不足（VACUUM 需要约 ${(item.before / MiB).toFixed(0)} MiB 临时空间）`
    }
    if (item.skipped === 'free-pages') {
      return `- ${item.name}：跳过，空闲页不多（${item.freePages} 页）`
    }
    const freed = (item.before - item.after) / MiB
    return `- ${item.name}：${(item.before / MiB).toFixed(1)} → ${(item.after / MiB).toFixed(1)} MiB，回收 ${freed.toFixed(1)} MiB，用时 ${(item.ms / 1000).toFixed(1)}s`
  })
}

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
        },
        {
          reg: `^${cmdPrefix}整理数据库$`,
          fnc: 'vacuumDatabase',
          permission: 'master'
        }
      ]
    })

    // 每天凌晨 4 点清一次。删除分批且走 low 优先级，不会挡住实时对话的写入；
    // VACUUM 也排在 low 优先级，且只在空闲页够多时才做。
    this.task = [{
      name: 'ChatGPT-历史记录保留期清理',
      cron: '0 0 4 * * *',
      fnc: this.maintenanceTask.bind(this),
      log: false
    }]
  }

  async maintenanceTask () {
    try {
      const { prune, vacuum } = await runHistoryMaintenance()
      if (prune.skipped) {
        logger.debug(`[History] retention prune skipped: ${prune.skipped}`)
      } else {
        const total = prune.results.reduce((sum, item) => sum + item.deleted, 0)
        if (total > 0) {
          logger.info(`[History] retention prune removed ${total} message(s)`)
        }
      }
      const freed = (vacuum.results || []).reduce((sum, item) => sum + ((item.before || 0) - (item.after || 0)), 0)
      if (freed > 0) {
        logger.info(`[History] vacuum reclaimed ${(freed / MiB).toFixed(1)} MiB`)
      }
    } catch (err) {
      logger.error('[History] scheduled maintenance failed:', err)
    }
    return false
  }

  async vacuumDatabase (e) {
    await e.reply('开始整理数据库，期间机器人可能短暂无响应，请稍候……')
    try {
      // 手动执行时忽略空闲页阈值：主人主动要求就照做
      const { skipped, results } = await vacuumDatabases({ force: true })
      if (skipped) {
        await e.reply(`未执行：${skipped}`)
        return true
      }
      const freed = results.reduce((sum, item) => sum + ((item.before || 0) - (item.after || 0)), 0)
      await e.reply([
        `✅ 整理完成，共回收 ${(freed / MiB).toFixed(1)} MiB`,
        ...formatVacuumResults(results)
      ].join('\n'))
    } catch (err) {
      logger.error('[History] manual vacuum failed:', err)
      await e.reply(`整理失败：${err.message}`)
    }
    return true
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
      `\n注：SQLite 删除后文件不会立刻变小。发送 ${ChatGPTConfig.basic.commandPrefix}整理数据库 可回收磁盘空间。`
    ].join('\n'))
    return true
  }
}
