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
