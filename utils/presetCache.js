import ChatGPTConfig from '../config/config.js'

/**
 * 预设前缀索引缓存。
 *
 * getPreset 里为了判断消息是否命中某个预设的前缀，每条消息都要
 * storage.listItems() 全表 SELECT + 逐行 JSON.parse 反序列化一遍——包括那些
 * 根本不是发给机器人的消息。
 *
 * 这里只缓存判断所需的 {id, prefix}，不缓存预设本体：命中之后再按 id 取那一条。
 * 内存开销是每个预设几十字节，不会因为预设的 system prompt 很长而常驻大量内存
 * （512MB 堆里跑一堆插件的情况下这点开销可以忽略）。
 * 想彻底关掉可以把 llm.presetCacheTTL 设为 0。
 */
let cache = null

function ttlMs () {
  const seconds = Number(ChatGPTConfig.llm?.presetCacheTTL)
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return seconds * 1000
}

/**
 * 预设有变更时清掉索引。由 chat_preset_storage 的写入路径调用。
 */
export function invalidatePresetPrefixIndex () {
  cache = null
}

/**
 * 取 [{id, prefix}] 形式的预设前缀索引。
 * @param {*} manager chaite 的 ChatPresetManager
 * @returns {Promise<Array<{id: string, prefix: string}>>}
 */
export async function getPresetPrefixIndex (manager) {
  const maxAge = ttlMs()
  if (maxAge > 0 && cache && (Date.now() - cache.at) < maxAge) {
    return cache.entries
  }

  const presets = await manager.getAllPresets()
  const entries = presets
    .filter(preset => preset && typeof preset.prefix === 'string')
    .map(preset => ({ id: preset.id, prefix: preset.prefix }))

  cache = maxAge > 0 ? { at: Date.now(), entries } : null
  return entries
}
