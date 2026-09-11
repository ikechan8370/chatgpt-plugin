import ChatGPTConfig from '../config/config.js'
import { createSemaphore } from './concurrency.js'

/**
 * 全插件共享的图片下载闸门。
 *
 * 群聊上下文、引用消息、当前消息的图片下载都走这一个闸门，保证
 * llm.imageFetchConcurrency 就是"同时在内存里的图片数量"上限——内存峰值大致是
 * 该值 × 单图大小 × 2.3（Buffer + base64 字符串）。
 *
 * 不要在各处再套一层 mapWithConcurrency 的并发上限，那会让实际并发相乘。
 */
export const withImageFetchPermit = createSemaphore(
  () => ChatGPTConfig.llm?.imageFetchConcurrency || 6
)
