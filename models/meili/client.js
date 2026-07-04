import { MeiliSearch } from 'meilisearch'
import ChatGPTConfig from '../../config/config.js'
import { MeiliProcess } from './meiliProcess.js'

let _client = null
let _process = null

/**
 * 获取共享 MeiliSearch 客户端
 * 根据配置自动选择外部或本地模式
 */
export function getMeiliClient () {
  if (_client) return _client

  const config = ChatGPTConfig.meili
  if (!config) return null

  if (config.mode === 'local') {
    if (!_process) {
      _process = new MeiliProcess(config)
    }
    // 返回一个代理，lazy 等待启动完成
    return createLazyClient(config, _process)
  }

  // 外部模式
  if (!config.host) return null
  _client = new MeiliSearch({
    host: config.host,
    apiKey: config.apiKey || undefined
  })
  return _client
}

/**
 * 本地模式：等待 MeiliSearch 进程就绪后创建客户端
 */
function createLazyClient (config, process) {
  let _inner = null
  let _initPromise = null

  return new Proxy({}, {
    get (target, prop) {
      if (prop === 'then') return undefined // 防止被当作 Promise
      return async (...args) => {
        if (!_inner) {
          if (!_initPromise) {
            _initPromise = process.start().then(() => {
              _inner = new MeiliSearch({
                host: process.host,
                apiKey: process.apiKey
              })
              return _inner
            })
          }
          await _initPromise
        }
        const method = _inner[prop]
        if (typeof method === 'function') return method.apply(_inner, args)
        return method
      }
    }
  })
}

/**
 * 获取 MeiliSearch 进程管理器（仅本地模式）
 */
export function getMeiliProcess () {
  return _process
}

/**
 * 初始化 MeiliSearch（在 chaite init 时调用）
 * 本地模式：启动子进程，注册退出清理
 * @returns {Promise<{client: object, process?: MeiliProcess}>}
 */
export async function initMeili () {
  const config = ChatGPTConfig.meili
  if (!config) return null

  if (config.mode === 'local') {
    _process = new MeiliProcess(config)
    await _process.start()
    const client = new MeiliSearch({
      host: _process.host,
      apiKey: _process.apiKey
    })

    // 注册退出清理
    const cleanup = async () => {
      await _process.stop()
    }
    process.on('exit', cleanup)
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    return { client, process: _process }
  }

  // 外部模式
  if (config.host) {
    const client = new MeiliSearch({
      host: config.host,
      apiKey: config.apiKey || undefined
    })
    return { client }
  }

  return null
}

/**
 * 检查 MeiliSearch 是否已配置且可用
 */
export function isMeiliConfigured () {
  const config = ChatGPTConfig.meili
  if (!config) return false
  if (config.mode === 'local') return true
  return !!config.host
}
