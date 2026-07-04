import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, access, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { platform, arch } from 'node:os'
import { request } from 'node:https'
import { createHash } from 'node:crypto'
import { chmod } from 'node:fs/promises'
import { dataDir } from '../../utils/common.js'

const MEILI_DIR = join(dataDir, 'meilisearch')
// MeiliSearch binary name varies by platform
function getBinaryName () {
  const p = platform()
  const a = arch()
  if (p === 'win32') return 'meilisearch.exe'
  if (p === 'darwin') {
    return a === 'arm64' ? 'meilisearch-macos-arm64' : 'meilisearch-macos-amd64'
  }
  return a === 'arm64' ? 'meilisearch-linux-arm64' : 'meilisearch-linux-amd64'
}

function getDownloadUrl (version) {
  const p = platform()
  const a = arch()
  let asset
  if (p === 'win32') {
    asset = 'meilisearch-windows-amd64.exe'
  } else if (p === 'darwin') {
    asset = a === 'arm64' ? 'meilisearch-macos-arm64' : 'meilisearch-macos-amd64'
  } else {
    asset = a === 'arm64' ? 'meilisearch-linux-aarch64' : 'meilisearch-linux-amd64'
  }
  return `https://github.com/meilisearch/meilisearch/releases/download/v${version}/${asset}`
}

/**
 * MeiliSearch 子进程管理器
 * - 自动下载二进制（如果不存在）
 * - 启动子进程
 * - Bot 退出时自动杀死
 */
export class MeiliProcess {
  constructor (config) {
    this.config = config
    this.process = null
    this._ready = false
    this._readyPromise = null
  }

  get host () { return 'http://127.0.0.1:7700' }
  get apiKey () { return this.config.apiKey || 'yunzai-meili-master-key' }

  async start () {
    if (this._ready) return
    if (this._readyPromise) return this._readyPromise

    this._readyPromise = this._doStart()
    return this._readyPromise
  }

  async _doStart () {
    const binaryPath = join(MEILI_DIR, getBinaryName())
    await mkdir(MEILI_DIR, { recursive: true })

    // 检查二进制是否存在
    try {
      await access(binaryPath)
    } catch {
      logger.info('[MeiliSearch] 下载 MeiliSearch 二进制文件...')
      await this._download(binaryPath)
    }

    // 确保可执行
    if (platform() !== 'win32') {
      await chmod(binaryPath, 0o755)
    }

    const dbPath = join(MEILI_DIR, 'data')
    await mkdir(dbPath, { recursive: true })

    // 启动进程
    logger.info(`[MeiliSearch] 启动 MeiliSearch v${this.config.version}...`)
    this.process = spawn(binaryPath, [
      '--db-path', dbPath,
      '--http-addr', '127.0.0.1:7700',
      '--master-key', this.apiKey,
      '--no-analytics'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })

    this.process.stdout.on('data', d => logger.debug(`[MeiliSearch] ${d.toString().trim()}`))
    this.process.stderr.on('data', d => logger.debug(`[MeiliSearch] ${d.toString().trim()}`))

    this.process.on('exit', (code) => {
      if (code !== 0 && this._ready) {
        logger.warn(`[MeiliSearch] 进程异常退出，code=${code}`)
      }
      this._ready = false
      this.process = null
    })

    // 等待健康检查
    await this._waitForReady()
  }

  async _waitForReady (maxRetries = 60, interval = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const resp = await fetch(`${this.host}/health`, { signal: AbortSignal.timeout(3000) })
        if (resp.ok) {
          this._ready = true
          logger.info('[MeiliSearch] MeiliSearch 已就绪')
          return
        }
      } catch { /* not ready yet */ }
      await new Promise(r => setTimeout(r, interval))
    }
    throw new Error('MeiliSearch 启动超时')
  }

  async _download (binaryPath) {
    const version = this.config.version
    const url = getDownloadUrl(version)
    const tmpPath = binaryPath + '.download'

    logger.info(`[MeiliSearch] 下载 ${url}`)
    await new Promise((resolve, reject) => {
      const file = createWriteStream(tmpPath)
      request(url, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          // 跟随重定向
          file.close()
          unlink(tmpPath).catch(() => {})
          request(res.headers.location, res2 => {
            pipeline(res2, file).then(resolve, reject)
          }).on('error', reject)
          return
        }
        pipeline(res, file).then(resolve, reject)
      }).on('error', reject)
    })

    // 重命名
    const { rename } = await import('node:fs/promises')
    await rename(tmpPath, binaryPath)
    logger.info('[MeiliSearch] 下载完成')
  }

  async stop () {
    if (this.process) {
      logger.info('[MeiliSearch] 停止 MeiliSearch...')
      this.process.kill('SIGTERM')
      // 等待进程退出
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill('SIGKILL')
          resolve()
        }, 10000)
        this.process?.on('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
      this.process = null
    }
    this._ready = false
    this._readyPromise = null
  }
}
