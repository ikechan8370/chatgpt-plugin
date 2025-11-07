import express from 'express'
import fs from 'fs'
import os from 'os'
import path from 'path'
import https from 'https'
import { pipeline } from 'stream'
import { promisify } from 'util'
let AdmZip
try {
  AdmZip = (await import('adm-zip')).default
} catch (e) {
  logger.warn('Failed to load AdmZip, maybe you need to install it manually:', e)
}
import { execSync } from "child_process"
import {
  Chaite,
  ChaiteResponse,
  FrontEndAuthHandler
} from 'chaite'
import ChatGPTConfig from '../../config/config.js'
import { memoryService } from './service.js'
import {
  resetCachedDimension,
  resetMemoryDatabaseInstance,
  getSimpleExtensionState,
  resolvePluginPath,
  toPluginRelativePath,
  resetVectorTableDimension
} from './database.js'

const streamPipeline = promisify(pipeline)

const SIMPLE_DOWNLOAD_BASE_URL = 'https://github.com/wangfenjin/simple/releases/latest/download'
const SIMPLE_ASSET_MAP = {
  'linux-x64': 'libsimple-linux-ubuntu-latest.zip',
  'linux-arm64': 'libsimple-linux-ubuntu-24.04-arm.zip',
  'linux-arm': 'libsimple-linux-ubuntu-24.04-arm.zip',
  'darwin-x64': 'libsimple-osx-x64.zip',
  'darwin-arm64': 'libsimple-osx-x64.zip',
  'win32-x64': 'libsimple-windows-x64.zip',
  'win32-ia32': 'libsimple-windows-x86.zip',
  'win32-arm64': 'libsimple-windows-arm64.zip'
}
const DEFAULT_SIMPLE_INSTALL_DIR = 'resources/simple'

export function authenticateMemoryRequest (req, res, next) {
  const bearer = req.header('Authorization') || ''
  const token = bearer.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    res.status(401).json({ message: 'Access denied, token missing' })
    return
  }
  try {
    const authKey = Chaite.getInstance()?.getGlobalConfig()?.getAuthKey()
    if (authKey && FrontEndAuthHandler.validateJWT(authKey, token)) {
      next()
      return
    }
    res.status(401).json({ message: 'Invalid token' })
  } catch (error) {
    res.status(401).json({ message: 'Invalid token format' })
  }
}

function parsePositiveInt (value, fallback) {
  const num = Number(value)
  return Number.isInteger(num) && num >= 0 ? num : fallback
}

function parseNumber (value, fallback) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toStringArray (value) {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map(item => {
      if (item === undefined || item === null) {
        return null
      }
      return String(item).trim()
    })
    .filter(item => item)
}

function parseOptionalStringParam (value) {
  if (Array.isArray(value)) {
    value = value[0]
  }
  if (value === undefined || value === null) {
    return null
  }
  const trimmed = String(value).trim()
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null
  }
  return trimmed
}

function detectAssetKey (platform, arch) {
  const normalizedArch = arch === 'arm64' ? 'arm64' : (arch === 'arm' ? 'arm' : (arch === 'ia32' ? 'ia32' : 'x64'))
  const key = `${platform}-${normalizedArch}`
  if (SIMPLE_ASSET_MAP[key]) {
    return key
  }
  if (platform === 'darwin' && SIMPLE_ASSET_MAP['darwin-x64']) {
    return 'darwin-x64'
  }
  if (platform === 'linux' && SIMPLE_ASSET_MAP['linux-x64']) {
    return 'linux-x64'
  }
  if (platform === 'win32' && SIMPLE_ASSET_MAP['win32-x64']) {
    return 'win32-x64'
  }
  return null
}

function resolveSimpleAsset (requestedKey, requestedAsset) {
  if (requestedAsset) {
    return {
      key: requestedKey || 'custom',
      asset: requestedAsset
    }
  }
  if (requestedKey && SIMPLE_ASSET_MAP[requestedKey]) {
    return {
      key: requestedKey,
      asset: SIMPLE_ASSET_MAP[requestedKey]
    }
  }
  const autoKey = detectAssetKey(process.platform, process.arch)
  if (autoKey && SIMPLE_ASSET_MAP[autoKey]) {
    return { key: autoKey, asset: SIMPLE_ASSET_MAP[autoKey] }
  }
  return { key: null, asset: null }
}

function ensureDirectoryExists (dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

async function downloadToFile (url, destination, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error('Too many redirects while downloading extension')
  }
  await new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'chatgpt-plugin-memory-extension-downloader'
      }
    }, async res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        try {
          await downloadToFile(res.headers.location, destination, redirectCount + 1)
          resolve()
        } catch (err) {
          reject(err)
        }
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download extension: HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      const fileStream = fs.createWriteStream(destination)
      streamPipeline(res, fileStream).then(resolve).catch(reject)
    })
    request.on('error', error => reject(error))
  })
}

function removeDirectoryIfExists (dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
}

function findLibraryFile (rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      const found = findLibraryFile(fullPath)
      if (found) {
        return found
      }
    } else if (/simple\.(so|dylib|dll)$/i.test(entry.name) || /^libsimple/i.test(entry.name)) {
      return fullPath
    }
  }
  return null
}

function findDictDirectory (rootDir) {
  const directDictPath = path.join(rootDir, 'dict')
  if (fs.existsSync(directDictPath) && fs.statSync(directDictPath).isDirectory()) {
    return directDictPath
  }
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const match = findDictDirectory(path.join(rootDir, entry.name))
      if (match) {
        return match
      }
    }
  }
  return null
}

async function downloadSimpleExtensionArchive ({ assetKey, assetName, targetDir }) {
  if (!assetName) {
    throw new Error('Simple extension asset name is required.')
  }
  const downloadUrl = `${SIMPLE_DOWNLOAD_BASE_URL}/${assetName}`
  const tempFile = path.join(os.tmpdir(), `libsimple-${Date.now()}-${Math.random().toString(16).slice(2)}.zip`)
  ensureDirectoryExists(path.dirname(tempFile))
  await downloadToFile(downloadUrl, tempFile)
  removeDirectoryIfExists(targetDir)
  ensureDirectoryExists(targetDir)
  if (AdmZip) {
    try {
      const zip = new AdmZip(tempFile)
      zip.extractAllTo(targetDir, true)
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    }
  } else {
    // 尝试使用 unzip 命令解压
    try {
      execSync(`unzip "${tempFile}" -d "${targetDir}"`, { stdio: 'inherit' })
    } catch (error) {
      throw new Error(`Failed to extract zip file: ${error.message}. Please install adm-zip manually: pnpm i`)
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    }
  }

  const libraryFile = findLibraryFile(targetDir)
  if (!libraryFile) {
    throw new Error('Downloaded extension package does not contain libsimple library.')
  }
  const dictDir = findDictDirectory(targetDir)
  if (!ChatGPTConfig.memory.extensions) {
    ChatGPTConfig.memory.extensions = {}
  }
  if (!ChatGPTConfig.memory.extensions.simple) {
    ChatGPTConfig.memory.extensions.simple = {
      enable: false,
      libraryPath: '',
      dictPath: '',
      useJieba: false
    }
  }
  const relativeLibraryPath = toPluginRelativePath(libraryFile)
  const relativeDictPath = dictDir ? toPluginRelativePath(dictDir) : ''
  ChatGPTConfig.memory.extensions.simple.libraryPath = relativeLibraryPath
  ChatGPTConfig.memory.extensions.simple.dictPath = relativeDictPath
  return {
    assetKey,
    assetName,
    installDir: toPluginRelativePath(targetDir),
    libraryPath: relativeLibraryPath,
    dictPath: ChatGPTConfig.memory.extensions.simple.dictPath
  }
}

function updateMemoryConfig (payload = {}) {
  const current = ChatGPTConfig.memory || {}
  const previousDatabase = current.database
  const previousDimension = current.vectorDimensions

  const nextConfig = {
    ...current,
    group: {
      ...(current.group || {})
    },
    user: {
      ...(current.user || {})
    },
    extensions: {
      ...(current.extensions || {}),
      simple: {
        ...(current.extensions?.simple || {})
      }
    }
  }
  const previousSimpleConfig = JSON.stringify(current.extensions?.simple || {})

  if (Object.prototype.hasOwnProperty.call(payload, 'database') && typeof payload.database === 'string') {
    nextConfig.database = payload.database.trim()
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'vectorDimensions')) {
    const dimension = parsePositiveInt(payload.vectorDimensions, current.vectorDimensions || 1536)
    if (dimension > 0) {
      nextConfig.vectorDimensions = dimension
    }
  }

  if (payload.group && typeof payload.group === 'object') {
    const incomingGroup = payload.group
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'enable')) {
      nextConfig.group.enable = Boolean(incomingGroup.enable)
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'enabledGroups')) {
      nextConfig.group.enabledGroups = toStringArray(incomingGroup.enabledGroups)
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'extractionModel') && typeof incomingGroup.extractionModel === 'string') {
      nextConfig.group.extractionModel = incomingGroup.extractionModel.trim()
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'extractionPresetId') && typeof incomingGroup.extractionPresetId === 'string') {
      nextConfig.group.extractionPresetId = incomingGroup.extractionPresetId.trim()
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'minMessageCount')) {
      nextConfig.group.minMessageCount = parsePositiveInt(incomingGroup.minMessageCount, nextConfig.group.minMessageCount || 0)
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'maxMessageWindow')) {
      nextConfig.group.maxMessageWindow = parsePositiveInt(incomingGroup.maxMessageWindow, nextConfig.group.maxMessageWindow || 0)
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'retrievalMode')) {
      const mode = String(incomingGroup.retrievalMode || '').toLowerCase()
      if (['vector', 'keyword', 'hybrid'].includes(mode)) {
        nextConfig.group.retrievalMode = mode
      }
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'hybridPrefer')) {
      const prefer = String(incomingGroup.hybridPrefer || '').toLowerCase()
      if (prefer === 'keyword-first') {
        nextConfig.group.hybridPrefer = 'keyword-first'
      } else if (prefer === 'vector-first') {
        nextConfig.group.hybridPrefer = 'vector-first'
      }
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'historyPollInterval')) {
      nextConfig.group.historyPollInterval = parsePositiveInt(incomingGroup.historyPollInterval,
        nextConfig.group.historyPollInterval || 0)
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'historyBatchSize')) {
      nextConfig.group.historyBatchSize = parsePositiveInt(incomingGroup.historyBatchSize,
        nextConfig.group.historyBatchSize || 0)
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'promptHeader') && typeof incomingGroup.promptHeader === 'string') {
      nextConfig.group.promptHeader = incomingGroup.promptHeader
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'promptItemTemplate') && typeof incomingGroup.promptItemTemplate === 'string') {
      nextConfig.group.promptItemTemplate = incomingGroup.promptItemTemplate
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'promptFooter') && typeof incomingGroup.promptFooter === 'string') {
      nextConfig.group.promptFooter = incomingGroup.promptFooter
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'vectorMaxDistance')) {
      const distance = parseNumber(incomingGroup.vectorMaxDistance,
        nextConfig.group.vectorMaxDistance ?? 0)
      nextConfig.group.vectorMaxDistance = distance
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'textMaxBm25Score')) {
      const bm25 = parseNumber(incomingGroup.textMaxBm25Score,
        nextConfig.group.textMaxBm25Score ?? 0)
      nextConfig.group.textMaxBm25Score = bm25
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'maxFactsPerInjection')) {
      nextConfig.group.maxFactsPerInjection = parsePositiveInt(incomingGroup.maxFactsPerInjection,
        nextConfig.group.maxFactsPerInjection || 0)
    }
    if (Object.prototype.hasOwnProperty.call(incomingGroup, 'minImportanceForInjection')) {
      const importance = parseNumber(incomingGroup.minImportanceForInjection,
        nextConfig.group.minImportanceForInjection ?? 0)
      nextConfig.group.minImportanceForInjection = importance
    }
  }

  if (payload.user && typeof payload.user === 'object') {
    const incomingUser = payload.user
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'enable')) {
      nextConfig.user.enable = Boolean(incomingUser.enable)
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'whitelist')) {
      nextConfig.user.whitelist = toStringArray(incomingUser.whitelist)
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'blacklist')) {
      nextConfig.user.blacklist = toStringArray(incomingUser.blacklist)
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'extractionModel') && typeof incomingUser.extractionModel === 'string') {
      nextConfig.user.extractionModel = incomingUser.extractionModel.trim()
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'extractionPresetId') && typeof incomingUser.extractionPresetId === 'string') {
      nextConfig.user.extractionPresetId = incomingUser.extractionPresetId.trim()
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'maxItemsPerInjection')) {
      nextConfig.user.maxItemsPerInjection = parsePositiveInt(incomingUser.maxItemsPerInjection,
        nextConfig.user.maxItemsPerInjection || 0)
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'maxRelevantItemsPerQuery')) {
      nextConfig.user.maxRelevantItemsPerQuery = parsePositiveInt(incomingUser.maxRelevantItemsPerQuery,
        nextConfig.user.maxRelevantItemsPerQuery || 0)
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'minImportanceForInjection')) {
      const importance = parseNumber(incomingUser.minImportanceForInjection,
        nextConfig.user.minImportanceForInjection ?? 0)
      nextConfig.user.minImportanceForInjection = importance
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'promptHeader') && typeof incomingUser.promptHeader === 'string') {
      nextConfig.user.promptHeader = incomingUser.promptHeader
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'promptItemTemplate') && typeof incomingUser.promptItemTemplate === 'string') {
      nextConfig.user.promptItemTemplate = incomingUser.promptItemTemplate
    }
    if (Object.prototype.hasOwnProperty.call(incomingUser, 'promptFooter') && typeof incomingUser.promptFooter === 'string') {
      nextConfig.user.promptFooter = incomingUser.promptFooter
    }
  }

  if (payload.extensions && typeof payload.extensions === 'object' && !Array.isArray(payload.extensions)) {
    const incomingExtensions = payload.extensions
    if (incomingExtensions.simple && typeof incomingExtensions.simple === 'object' && !Array.isArray(incomingExtensions.simple)) {
      const incomingSimple = incomingExtensions.simple
      if (Object.prototype.hasOwnProperty.call(incomingSimple, 'enable')) {
        nextConfig.extensions.simple.enable = Boolean(incomingSimple.enable)
      }
      if (Object.prototype.hasOwnProperty.call(incomingSimple, 'libraryPath') && typeof incomingSimple.libraryPath === 'string') {
        nextConfig.extensions.simple.libraryPath = incomingSimple.libraryPath.trim()
      }
      if (Object.prototype.hasOwnProperty.call(incomingSimple, 'dictPath') && typeof incomingSimple.dictPath === 'string') {
        nextConfig.extensions.simple.dictPath = incomingSimple.dictPath.trim()
      }
      if (Object.prototype.hasOwnProperty.call(incomingSimple, 'useJieba')) {
        nextConfig.extensions.simple.useJieba = Boolean(incomingSimple.useJieba)
      }
    } else if (Object.prototype.hasOwnProperty.call(incomingExtensions, 'simple')) {
      logger.warn('[Memory] Unexpected value for extensions.simple, ignoring:', incomingExtensions.simple)
    }
  }

  ChatGPTConfig.memory.database = nextConfig.database
  ChatGPTConfig.memory.vectorDimensions = nextConfig.vectorDimensions
  if (!ChatGPTConfig.memory.group) ChatGPTConfig.memory.group = {}
  if (!ChatGPTConfig.memory.user) ChatGPTConfig.memory.user = {}
  if (!ChatGPTConfig.memory.extensions) ChatGPTConfig.memory.extensions = {}
  if (!ChatGPTConfig.memory.extensions.simple) {
    ChatGPTConfig.memory.extensions.simple = {
      enable: false,
      libraryPath: '',
      dictPath: '',
      useJieba: false
    }
  }
  Object.assign(ChatGPTConfig.memory.group, nextConfig.group)
  Object.assign(ChatGPTConfig.memory.user, nextConfig.user)
  Object.assign(ChatGPTConfig.memory.extensions.simple, nextConfig.extensions.simple)

  if (nextConfig.vectorDimensions !== previousDimension) {
    resetCachedDimension()
    const targetDimension = Number(nextConfig.vectorDimensions)
    if (Number.isFinite(targetDimension) && targetDimension > 0) {
      try {
        resetVectorTableDimension(targetDimension)
      } catch (err) {
        logger?.error?.('[Memory] failed to apply vector dimension change:', err)
      }
    }
  }
  const currentSimpleConfig = JSON.stringify(ChatGPTConfig.memory.extensions?.simple || {})

  if (nextConfig.database !== previousDatabase) {
    resetMemoryDatabaseInstance()
  } else if (currentSimpleConfig !== previousSimpleConfig) {
    resetMemoryDatabaseInstance()
  }

  if (typeof ChatGPTConfig._triggerSave === 'function') {
    ChatGPTConfig._triggerSave('memory')
  }

  return ChatGPTConfig.memory
}

export const MemoryRouter = (() => {
  const router = express.Router()

  router.get('/config', (_req, res) => {
    res.status(200).json(ChaiteResponse.ok(ChatGPTConfig.memory))
  })

  router.post('/config', (req, res) => {
    try {
      const updated = updateMemoryConfig(req.body || {})
      res.status(200).json(ChaiteResponse.ok(updated))
    } catch (error) {
      logger.error('Failed to update memory config:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to update memory config'))
    }
  })

  router.get('/group/:groupId/facts', (req, res) => {
    const { groupId } = req.params
    const limit = parsePositiveInt(req.query.limit, 50)
    const offset = parsePositiveInt(req.query.offset, 0)
    try {
      const facts = memoryService.listGroupFacts(groupId, limit, offset)
      res.status(200).json(ChaiteResponse.ok(facts))
    } catch (error) {
      logger.error('Failed to fetch group facts:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to fetch group facts'))
    }
  })

  router.get('/extensions/simple/status', (_req, res) => {
    try {
      logger?.debug?.('[Memory] simple extension status requested')
      const state = getSimpleExtensionState()
      const simpleConfig = ChatGPTConfig.memory?.extensions?.simple || {}
      const libraryPath = simpleConfig.libraryPath || state.libraryPath || ''
      const dictPath = simpleConfig.dictPath || state.dictPath || ''
      const resolvedLibraryPath = libraryPath ? resolvePluginPath(libraryPath) : ''
      const resolvedDictPath = dictPath ? resolvePluginPath(dictPath) : ''
      res.status(200).json(ChaiteResponse.ok({
        ...state,
        enabled: Boolean(simpleConfig.enable),
        libraryPath,
        dictPath,
        platform: process.platform,
        arch: process.arch,
        resolvedLibraryPath,
        libraryExists: resolvedLibraryPath ? fs.existsSync(resolvedLibraryPath) : false,
        resolvedDictPath,
        dictExists: resolvedDictPath ? fs.existsSync(resolvedDictPath) : false
      }))
    } catch (error) {
      logger.error('Failed to read simple extension status:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to read simple extension status'))
    }
  })

  router.post('/extensions/simple/download', async (req, res) => {
    const { assetKey, assetName, installDir } = req.body || {}
    try {
      const resolvedAsset = resolveSimpleAsset(assetKey, assetName)
      if (!resolvedAsset.asset) {
        res.status(400).json(ChaiteResponse.fail(null, '无法确定当前平台的扩展文件，请手动指定 assetName。'))
        return
      }
      logger?.info?.('[Memory] downloading simple extension asset=%s (key=%s)', resolvedAsset.asset, resolvedAsset.key)
      const targetRelativeDir = installDir || path.join(DEFAULT_SIMPLE_INSTALL_DIR, resolvedAsset.key || 'downloaded')
      const targetDir = resolvePluginPath(targetRelativeDir)
      const result = await downloadSimpleExtensionArchive({
        assetKey: resolvedAsset.key || assetKey || 'custom',
        assetName: resolvedAsset.asset,
        targetDir
      })
      resetMemoryDatabaseInstance()
      logger?.info?.('[Memory] simple extension downloaded and memory DB scheduled for reload')
      res.status(200).json(ChaiteResponse.ok({
        ...result,
        assetName: resolvedAsset.asset,
        assetKey: resolvedAsset.key || assetKey || 'custom'
      }))
    } catch (error) {
      logger.error('Failed to download simple extension:', error)
      res.status(500).json(ChaiteResponse.fail(null, error?.message || 'Failed to download simple extension'))
    }
  })

  router.post('/group/:groupId/facts', async (req, res) => {
    const { groupId } = req.params
    const facts = Array.isArray(req.body?.facts) ? req.body.facts : []
    if (facts.length === 0) {
      res.status(400).json(ChaiteResponse.fail(null, 'facts is required'))
      return
    }
    try {
      const saved = await memoryService.saveGroupFacts(groupId, facts)
      res.status(200).json(ChaiteResponse.ok(saved))
    } catch (error) {
      logger.error('Failed to save group facts:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to save group facts'))
    }
  })

  router.post('/group/:groupId/query', async (req, res) => {
    const { groupId } = req.params
    const { query, limit, minImportance } = req.body || {}
    if (!query || typeof query !== 'string') {
      res.status(400).json(ChaiteResponse.fail(null, 'query is required'))
      return
    }
    try {
      const facts = await memoryService.queryGroupFacts(groupId, query, {
        limit: parsePositiveInt(limit, undefined),
        minImportance: minImportance !== undefined ? parseNumber(minImportance, undefined) : undefined
      })
      res.status(200).json(ChaiteResponse.ok(facts))
    } catch (error) {
      logger.error('Failed to query group memory:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to query group memory'))
    }
  })

  router.delete('/group/:groupId/facts/:factId', (req, res) => {
    const { groupId, factId } = req.params
    try {
      const removed = memoryService.deleteGroupFact(groupId, factId)
      if (!removed) {
        res.status(404).json(ChaiteResponse.fail(null, 'Fact not found'))
        return
      }
      res.status(200).json(ChaiteResponse.ok({ removed }))
    } catch (error) {
      logger.error('Failed to delete group fact:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to delete group fact'))
    }
  })

  router.get('/user/memories', (req, res) => {
    const userId = parseOptionalStringParam(req.query.userId)
    const groupId = parseOptionalStringParam(req.query.groupId)
    const limit = parsePositiveInt(req.query.limit, 50)
    const offset = parsePositiveInt(req.query.offset, 0)
    try {
      const memories = memoryService.listUserMemories(userId, groupId, limit, offset)
      res.status(200).json(ChaiteResponse.ok(memories))
    } catch (error) {
      logger.error('Failed to fetch user memories:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to fetch user memories'))
    }
  })

  router.get('/user/:userId/memories', (req, res) => {
    const { userId } = req.params
    const groupId = req.query.groupId ?? null
    const limit = parsePositiveInt(req.query.limit, 50)
    const offset = parsePositiveInt(req.query.offset, 0)
    try {
      const memories = memoryService.listUserMemories(userId, groupId, limit, offset)
      res.status(200).json(ChaiteResponse.ok(memories))
    } catch (error) {
      logger.error('Failed to fetch user memories:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to fetch user memories'))
    }
  })

  router.post('/user/:userId/query', (req, res) => {
    const { userId } = req.params
    const groupId = req.body?.groupId ?? req.query.groupId ?? null
    const query = req.body?.query
    const totalLimit = parsePositiveInt(req.body?.totalLimit, undefined)
    const searchLimit = parsePositiveInt(req.body?.searchLimit, undefined)
    const minImportance = req.body?.minImportance !== undefined
      ? parseNumber(req.body.minImportance, undefined)
      : undefined
    if (!query || typeof query !== 'string') {
      res.status(400).json(ChaiteResponse.fail(null, 'query is required'))
      return
    }
    try {
      const memories = memoryService.queryUserMemories(userId, groupId, query, {
        totalLimit,
        searchLimit,
        minImportance
      })
      res.status(200).json(ChaiteResponse.ok(memories))
    } catch (error) {
      logger.error('Failed to query user memory:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to query user memory'))
    }
  })

  router.post('/user/:userId/memories', (req, res) => {
    const { userId } = req.params
    const groupId = req.body?.groupId ?? null
    const memories = Array.isArray(req.body?.memories) ? req.body.memories : []
    if (memories.length === 0) {
      res.status(400).json(ChaiteResponse.fail(null, 'memories is required'))
      return
    }
    try {
      const updated = memoryService.upsertUserMemories(userId, groupId, memories)
      res.status(200).json(ChaiteResponse.ok({ updated }))
    } catch (error) {
      logger.error('Failed to upsert user memories:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to upsert user memories'))
    }
  })

  router.delete('/user/:userId/memories/:memoryId', (req, res) => {
    const { userId, memoryId } = req.params
    try {
      const removed = memoryService.deleteUserMemory(memoryId, userId)
      if (!removed) {
        res.status(404).json(ChaiteResponse.fail(null, 'Memory not found'))
        return
      }
      res.status(200).json(ChaiteResponse.ok({ removed }))
    } catch (error) {
      logger.error('Failed to delete user memory:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to delete user memory'))
    }
  })

  router.delete('/memories/:memoryId', (req, res) => {
    const { memoryId } = req.params
    try {
      const removed = memoryService.deleteUserMemory(memoryId)
      if (!removed) {
        res.status(404).json(ChaiteResponse.fail(null, 'Memory not found'))
        return
      }
      res.status(200).json(ChaiteResponse.ok({ removed }))
    } catch (error) {
      logger.error('Failed to delete memory:', error)
      res.status(500).json(ChaiteResponse.fail(null, 'Failed to delete memory'))
    }
  })

  return router
})()
