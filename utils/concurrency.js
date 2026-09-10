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
