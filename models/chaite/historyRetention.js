import { Chaite } from 'chaite'
import ChatGPTConfig from '../../config/config.js'
import { vacuumSQLiteDatabases } from './storage/sqlite/runtime.js'

// 伪人会话 id 的前缀，见 apps/bym.js
const BYM_CONVERSATION_PREFIX = 'bym'

function retentionDays (value) {
  const days = Number(value)
  if (!Number.isFinite(days) || days <= 0) return 0
  return days
}

function cutoffFor (days) {
  // createdAt 存的是 new Date().toISOString()，ISO 8601 UTC 字符串按字典序比较
  // 就等于按时间比较，所以可以直接丢给 SQL 并用上 createdAt 索引。
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * 当前生效的保留策略，短的在前。
 * @returns {Array<{name: string, days: number, before: string, conversationPrefix: string}>}
 */
export function retentionPolicies () {
  const policies = []
  const bymDays = retentionDays(ChatGPTConfig.bym?.historyRetentionDays)
  if (bymDays > 0) {
    policies.push({
      name: '伪人会话',
      days: bymDays,
      before: cutoffFor(bymDays),
      conversationPrefix: BYM_CONVERSATION_PREFIX
    })
  }
  const allDays = retentionDays(ChatGPTConfig.llm?.historyRetentionDays)
  if (allDays > 0) {
    policies.push({
      name: '全部会话',
      days: allDays,
      before: cutoffFor(allDays),
      conversationPrefix: ''
    })
  }
  return policies
}

/**
 * 按配置的保留期清理历史消息。
 *
 * 删除是分批 + low 优先级的，实时对话的写入会插到前面，所以可以放心在后台跑。
 *
 * @param {{dryRun?: boolean}} [options]
 * @returns {Promise<{skipped?: string, results: Array<{name: string, days: number, deleted: number, truncated: boolean}>}>}
 */
export async function pruneHistoryByRetention (options = {}) {
  const chaite = Chaite.getInstance()
  const historyManager = chaite?.getHistoryManager?.()
  if (!historyManager) {
    return { skipped: 'chaite 尚未初始化', results: [] }
  }
  if (typeof historyManager.pruneHistory !== 'function') {
    // lowdb 后端没有实现，跳过而不是报错
    return { skipped: '当前历史存储不支持按保留期清理', results: [] }
  }

  const policies = retentionPolicies()
  if (policies.length === 0) {
    return { skipped: '未配置保留期', results: [] }
  }

  const results = []
  for (const policy of policies) {
    try {
      if (options.dryRun) {
        const count = typeof historyManager.countHistoryBefore === 'function'
          ? await historyManager.countHistoryBefore(policy)
          : 0
        results.push({ name: policy.name, days: policy.days, deleted: count, truncated: false })
        continue
      }
      const { deleted, truncated } = await historyManager.pruneHistory(policy)
      if (deleted > 0) {
        logger.info(`[History] pruned ${deleted} ${policy.name} message(s) older than ${policy.days}d${truncated ? ' (还有剩余，下次继续)' : ''}`)
      }
      results.push({ name: policy.name, days: policy.days, deleted, truncated })
    } catch (err) {
      logger.error(`[History] failed to prune ${policy.name}:`, err)
      results.push({ name: policy.name, days: policy.days, deleted: 0, truncated: false, error: err.message })
    }
  }
  return { results }
}

/**
 * 从旧版本升级上来时，保留期是被强制关掉的（见 config.js 的 retentionUpgradeNotice）。
 * 这里在启动时提示一次：报出真实的行数和占用，让主人自己决定要不要开。
 *
 * 只在真的有可观的数据量时才提示，免得对着一个几乎空的库刷屏。
 */
export async function reportRetentionOpportunity (options = {}) {
  if (!ChatGPTConfig.retentionUpgradeNotice) {
    // 留一行 debug，方便确认这个检查确实被调用过（而不是压根没接上）
    logger.debug?.('[History] retention notice: skipped, not an upgrade from a pre-retention version')
    return false
  }
  ChatGPTConfig.retentionUpgradeNotice = false

  const historyManager = options.historyManager || Chaite.getInstance()?.getHistoryManager?.()
  if (typeof historyManager?.countHistoryBefore !== 'function') {
    logger.debug?.('[History] retention notice: history storage does not support counting, skipped')
    return false
  }

  try {
    const before = cutoffFor(30)
    const [bymRows, allRows] = await Promise.all([
      historyManager.countHistoryBefore({ before, conversationPrefix: BYM_CONVERSATION_PREFIX }),
      historyManager.countHistoryBefore({ before })
    ])
    if (bymRows + allRows < (options.minRows ?? 10000)) {
      logger.debug?.(`[History] retention notice: only ${allRows} prunable row(s), not worth reporting`)
      return false
    }

    const prefix = ChatGPTConfig.basic?.commandPrefix || '#chatgpt'
    logger.warn('='.repeat(62))
    logger.warn('[ChatGPT-Plugin] 检测到可清理的历史记录')
    logger.warn(`  超过 30 天的伪人会话记录：${bymRows} 条（全部会话：${allRows} 条）`)
    logger.warn('  伪人每次发言都会把当次群聊上下文写进历史表用于审计，这张表默认只增不减。')
    logger.warn('  为避免升级时误删你的历史，保留期目前是关闭的。如需自动清理，请在配置中设置：')
    logger.warn('    bym.historyRetentionDays = 30   （伪人历史保留天数，0 为永久）')
    logger.warn('    chaite.autoVacuum = true        （清理后回收磁盘空间）')
    logger.warn(`  开启前可先用 ${prefix}历史统计 查看会清理多少，用 ${prefix}清理历史 手动执行一次。`)
    logger.warn('='.repeat(62))
    return true
  } catch (err) {
    logger.debug?.(`[History] retention opportunity check failed: ${err.message}`)
    return false
  }
}

/**
 * 回收删除后留下的磁盘空间。
 *
 * @param {{force?: boolean}} [options] force 时忽略空闲页阈值，用于手动命令
 * @returns {Promise<{skipped?: string, results: object[]}>}
 */
export async function vacuumDatabases (options = {}) {
  if (ChatGPTConfig.chaite?.storage !== 'sqlite') {
    return { skipped: '当前存储不是 sqlite', results: [] }
  }
  const minFreePages = options.force
    ? 0
    : Math.max(0, Number(ChatGPTConfig.chaite?.autoVacuumMinFreePages) || 0)
  return { results: await vacuumSQLiteDatabases({ minFreePages }) }
}

/**
 * 保留期清理 + （按配置）回收磁盘空间。定时任务和手动命令共用。
 * @param {{force?: boolean}} [options]
 */
export async function runHistoryMaintenance (options = {}) {
  const prune = await pruneHistoryByRetention()
  const shouldVacuum = options.force || ChatGPTConfig.chaite?.autoVacuum === true
  const vacuum = shouldVacuum
    ? await vacuumDatabases({ force: options.force })
    : { skipped: '未开启 autoVacuum', results: [] }
  return { prune, vacuum }
}
