/**
 * 并发执行但保持输出顺序，并限制同时在飞的任务数。
 *
 * 群聊上下文里的图片以前是 `for (...) { await fetch(url) }` 一张张下的，
 * 6 张图 150ms 延迟就要串行等将近 1 秒。这里改成有上限的并发：既能把等待
 * 叠起来，又不会一次性对图床发几十个请求、也不会同时把几十张图的 buffer
 * 全读进内存（内存占用大致是 limit × 单图大小）。
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit 同时在飞的最大任务数
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>} 与 items 顺序一致的结果
 */
export async function mapWithConcurrency (items, limit, fn) {
  const list = Array.from(items || [])
  if (list.length === 0) return []

  const max = Math.max(1, Math.min(Number(limit) || 1, list.length))
  if (max === 1) {
    const out = []
    for (let i = 0; i < list.length; i++) out.push(await fn(list[i], i))
    return out
  }

  const results = new Array(list.length)
  let next = 0

  const worker = async () => {
    while (true) {
      const index = next++
      if (index >= list.length) return
      results[index] = await fn(list[index], index)
    }
  }

  await Promise.all(Array.from({ length: max }, worker))
  return results
}

/**
 * 全局并发闸门。
 *
 * mapWithConcurrency 的上限只在单次调用内生效，嵌套使用时会相乘：外层 6 条消息
 * 并发、每条消息内部再 6 张图并发，实际同时在飞的下载就是 36 个而不是 6 个，
 * 内存峰值也跟着翻倍。需要限制的是"同时下载多少张图"这个全局资源，所以用一个
 * 共享的信号量，而不是在每一层各设一个上限。
 *
 * limit 每次取permit时重新读取，改配置无需重启。
 *
 * @param {() => number} getLimit
 * @returns {<T>(fn: () => Promise<T>) => Promise<T>}
 */
export function createSemaphore (getLimit) {
  let active = 0
  const queue = []

  const limit = () => Math.max(1, Number(getLimit()) || 1)

  const pump = () => {
    while (queue.length > 0 && active < limit()) {
      active++
      queue.shift()()
    }
  }

  return function withPermit (fn) {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        Promise.resolve().then(fn).then(
          value => { active--; pump(); resolve(value) },
          error => { active--; pump(); reject(error) }
        )
      })
      pump()
    })
  }
}
