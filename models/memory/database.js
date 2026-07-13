import sqlite3 from 'sqlite3'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import ChatGPTConfig from '../../config/config.js'

const META_VECTOR_DIM_KEY = 'group_vec_dimension'
const META_VECTOR_MODEL_KEY = 'group_vec_model'
const META_GROUP_TOKENIZER_KEY = 'group_memory_tokenizer'
const META_USER_TOKENIZER_KEY = 'user_memory_tokenizer'
const TOKENIZER_DEFAULT = 'unicode61'
const SIMPLE_MATCH_SIMPLE = 'simple_query'
const SIMPLE_MATCH_JIEBA = 'jieba_query'
const PLUGIN_ROOT = path.resolve('./plugins/chatgpt-plugin')
const require = createRequire(import.meta.url)

let dbInstance = null
let sqliteVecLoader = null
let cachedVectorDimension = null
let cachedVectorModel = null
let userMemoryFtsConfig = {
  tokenizer: TOKENIZER_DEFAULT,
  matchQuery: null
}
let groupMemoryFtsConfig = {
  tokenizer: TOKENIZER_DEFAULT,
  matchQuery: null
}
const simpleExtensionState = {
  requested: false,
  enabled: false,
  loaded: false,
  error: null,
  libraryPath: '',
  dictPath: '',
  tokenizer: TOKENIZER_DEFAULT,
  matchQuery: null
}
const optionalDependencyState = {
  databaseError: null,
  vectorError: null
}

export class MemoryDatabaseUnavailableError extends Error {
  constructor (message, cause) {
    super(message)
    this.name = 'MemoryDatabaseUnavailableError'
    this.cause = cause
  }
}

class SQLiteStatement {
  constructor (nativeDb, sql) {
    this.nativeDb = nativeDb
    this.sql = sql
  }

  run (...params) {
    return new Promise((resolve, reject) => {
      this.nativeDb.run(this.sql, normaliseParams(params), function (err) {
        if (err) {
          reject(err)
          return
        }
        resolve({
          changes: this.changes || 0,
          lastInsertRowid: this.lastID || 0,
          lastID: this.lastID || 0
        })
      })
    })
  }

  get (...params) {
    return new Promise((resolve, reject) => {
      this.nativeDb.get(this.sql, normaliseParams(params), (err, row) => {
        if (err) {
          reject(err)
          return
        }
        resolve(row)
      })
    })
  }

  all (...params) {
    return new Promise((resolve, reject) => {
      this.nativeDb.all(this.sql, normaliseParams(params), (err, rows) => {
        if (err) {
          reject(err)
          return
        }
        resolve(rows || [])
      })
    })
  }
}

class SQLiteDatabase {
  constructor (nativeDb) {
    this.nativeDb = nativeDb
    this.open = true
  }

  exec (sql) {
    return new Promise((resolve, reject) => {
      this.nativeDb.exec(sql, err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  prepare (sql) {
    return new SQLiteStatement(this.nativeDb, sql)
  }

  transaction (callback) {
    return async (...args) => {
      await this.exec('BEGIN')
      try {
        const result = await callback(...args)
        await this.exec('COMMIT')
        return result
      } catch (error) {
        try {
          await this.exec('ROLLBACK')
        } catch (rollbackError) {
          logger?.warn?.('[Memory] rollback failed:', rollbackError)
        }
        throw error
      }
    }
  }

  loadExtension (libraryPath) {
    const tryLoad = candidate => new Promise((resolve, reject) => {
      this.nativeDb.loadExtension(candidate, err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
    return tryLoad(libraryPath).catch(async err => {
      const ext = path.extname(libraryPath).toLowerCase()
      if (!['.so', '.dylib', '.dll'].includes(ext)) {
        throw err
      }
      const withoutExt = libraryPath.slice(0, -ext.length)
      const message = String(err?.message || '')
      if (!message.includes(`${libraryPath}${ext}`) && !message.includes(`${path.basename(libraryPath)}${ext}`)) {
        throw err
      }
      logger?.debug?.('[Memory] retrying SQLite extension load without platform suffix:', withoutExt)
      return await tryLoad(withoutExt)
    })
  }

  close () {
    return new Promise((resolve, reject) => {
      this.nativeDb.close(err => {
        this.open = false
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }
}

function normaliseParams (params) {
  if (params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0]) && !Buffer.isBuffer(params[0]) && !ArrayBuffer.isView(params[0])) {
    const source = params[0]
    const named = {}
    for (const [key, value] of Object.entries(source)) {
      if (!key.startsWith('@') && !key.startsWith(':') && !key.startsWith('$')) {
        named[`@${key}`] = value
      } else {
        named[key] = value
      }
    }
    return named
  }
  return params
}

function openSqliteDatabase (dbPath) {
  return new Promise((resolve, reject) => {
    const nativeDb = new sqlite3.Database(dbPath, err => {
      if (err) {
        optionalDependencyState.databaseError = err
        reject(new MemoryDatabaseUnavailableError(
          '[Memory] sqlite3 database is unavailable. Memory features are disabled because the host sqlite3 dependency failed to open.',
          err
        ))
        return
      }
      optionalDependencyState.databaseError = null
      resolve(new SQLiteDatabase(nativeDb))
    })
  })
}

async function tryLoadSqliteVec (db) {
  if (sqliteVecLoader === false) {
    return false
  }
  try {
    if (!sqliteVecLoader) {
      sqliteVecLoader = require('sqlite-vec')
    }
    const loadablePath = sqliteVecLoader.getLoadablePath
      ? sqliteVecLoader.getLoadablePath()
      : null
    if (!loadablePath) {
      sqliteVecLoader.load(db)
    } else {
      await db.loadExtension(loadablePath)
    }
    optionalDependencyState.vectorError = null
    return true
  } catch (error) {
    sqliteVecLoader = false
    optionalDependencyState.vectorError = error
    logger?.warn?.('[Memory] optional dependency sqlite-vec is unavailable; vector retrieval is disabled:', error?.message || error)
    return false
  }
}

function resolveDbPath () {
  const relativePath = ChatGPTConfig.memory?.database || 'data/memory.db'
  return path.resolve('./plugins/chatgpt-plugin', relativePath)
}

export function resolvePluginPath (targetPath) {
  if (!targetPath) {
    return ''
  }
  if (path.isAbsolute(targetPath)) {
    return targetPath
  }
  return path.resolve(PLUGIN_ROOT, targetPath)
}

export function toPluginRelativePath (absolutePath) {
  if (!absolutePath) {
    return ''
  }
  return path.relative(PLUGIN_ROOT, absolutePath)
}

function resolvePreferredDimension () {
  const { memory, llm } = ChatGPTConfig
  if (memory?.vectorDimensions && memory.vectorDimensions > 0) {
    return memory.vectorDimensions
  }
  if (llm?.dimensions && llm.dimensions > 0) {
    return llm.dimensions
  }
  return 1536
}

function ensureDirectory (filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function ensureMetaTable (db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS memory_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
}

async function getMetaValue (db, key) {
  const stmt = db.prepare('SELECT value FROM memory_meta WHERE key = ?')
  const row = await stmt.get(key)
  return row ? row.value : null
}

async function setMetaValue (db, key, value) {
  await db.prepare(`
    INSERT INTO memory_meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

function resetSimpleState (overrides = {}) {
  simpleExtensionState.loaded = false
  simpleExtensionState.error = null
  simpleExtensionState.tokenizer = TOKENIZER_DEFAULT
  simpleExtensionState.matchQuery = null
  Object.assign(simpleExtensionState, overrides)
  userMemoryFtsConfig = {
    tokenizer: TOKENIZER_DEFAULT,
    matchQuery: null
  }
  groupMemoryFtsConfig = {
    tokenizer: TOKENIZER_DEFAULT,
    matchQuery: null
  }
}

function sanitiseRawFtsInput (input) {
  if (!input) {
    return ''
  }
  const trimmed = String(input).trim()
  if (!trimmed) {
    return ''
  }
  const replaced = trimmed
    .replace(/["'`]+/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/[^\p{L}\p{N}\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1100-\u11FF\s]+/gu, ' ')
  const collapsed = replaced.replace(/\s+/g, ' ').trim()
  return collapsed || trimmed
}

function isSimpleLibraryFile (filename) {
  return /(^libsimple.*\.(so|dylib|dll)$)|(^simple\.(so|dylib|dll)$)/i.test(filename)
}

function findSimpleLibrary (startDir) {
  const stack = [startDir]
  while (stack.length > 0) {
    const dir = stack.pop()
    if (!dir || !fs.existsSync(dir)) {
      continue
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
      } else if (entry.isFile() && isSimpleLibraryFile(entry.name)) {
        return fullPath
      }
    }
  }
  return ''
}

function locateDictPathNear (filePath) {
  if (!filePath) {
    return ''
  }
  let currentDir = path.dirname(filePath)
  for (let depth = 0; depth < 5 && currentDir && currentDir !== path.dirname(currentDir); depth++) {
    const dictCandidate = path.join(currentDir, 'dict')
    if (fs.existsSync(dictCandidate) && fs.statSync(dictCandidate).isDirectory()) {
      return dictCandidate
    }
    currentDir = path.dirname(currentDir)
  }
  return ''
}

function discoverSimplePaths () {
  const searchRoots = [
    path.join(PLUGIN_ROOT, 'resources/simple'),
    path.join(PLUGIN_ROOT, 'resources'),
    path.join(PLUGIN_ROOT, 'lib/simple'),
    PLUGIN_ROOT
  ]
  for (const root of searchRoots) {
    if (!root || !fs.existsSync(root)) {
      continue
    }
    const lib = findSimpleLibrary(root)
    if (lib) {
      const dictCandidate = locateDictPathNear(lib)
      return {
        libraryPath: toPluginRelativePath(lib) || lib,
        dictPath: dictCandidate ? (toPluginRelativePath(dictCandidate) || dictCandidate) : ''
      }
    }
  }
  return { libraryPath: '', dictPath: '' }
}

async function applySimpleExtension (db) {
  const config = ChatGPTConfig.memory?.extensions?.simple || {}
  simpleExtensionState.requested = Boolean(config.enable)
  simpleExtensionState.enabled = Boolean(config.enable)
  simpleExtensionState.libraryPath = config.libraryPath || ''
  simpleExtensionState.dictPath = config.dictPath || ''
  if (!config.enable) {
    logger?.debug?.('[Memory] simple tokenizer disabled via config')
    resetSimpleState({ requested: false, enabled: false })
    return
  }
  if (!simpleExtensionState.libraryPath) {
    const detected = discoverSimplePaths()
    if (detected.libraryPath) {
      simpleExtensionState.libraryPath = detected.libraryPath
      simpleExtensionState.dictPath = detected.dictPath
      config.libraryPath = detected.libraryPath
      if (detected.dictPath) {
        config.dictPath = detected.dictPath
      }
    }
  }
  const resolvedLibraryPath = resolvePluginPath(config.libraryPath)
  if (!resolvedLibraryPath || !fs.existsSync(resolvedLibraryPath)) {
    logger?.warn?.('[Memory] simple tokenizer library missing:', resolvedLibraryPath || '(empty path)')
    resetSimpleState({
      requested: true,
      enabled: true,
      error: `Simple extension library not found at ${resolvedLibraryPath || '(empty path)'}`
    })
    return
  }
  try {
    logger?.info?.('[Memory] loading simple tokenizer extension from', resolvedLibraryPath)
    await db.loadExtension(resolvedLibraryPath)
    if (config.useJieba) {
      const resolvedDict = resolvePluginPath(config.dictPath)
      if (resolvedDict && fs.existsSync(resolvedDict)) {
        try {
          logger?.debug?.('[Memory] configuring simple tokenizer jieba dict:', resolvedDict)
          await db.prepare('select jieba_dict(?)').get(resolvedDict)
        } catch (err) {
          logger?.warn?.('Failed to register jieba dict for simple extension:', err)
        }
      } else {
        logger?.warn?.('Simple extension jieba dict path missing:', resolvedDict)
      }
    }
    const tokenizer = config.useJieba ? 'simple_jieba' : 'simple'
    const matchQuery = config.useJieba ? SIMPLE_MATCH_JIEBA : SIMPLE_MATCH_SIMPLE
    simpleExtensionState.loaded = true
    simpleExtensionState.error = null
    simpleExtensionState.tokenizer = tokenizer
    simpleExtensionState.matchQuery = matchQuery
    logger?.info?.('[Memory] simple tokenizer initialised, tokenizer=%s, matchQuery=%s', tokenizer, matchQuery)
    userMemoryFtsConfig = {
      tokenizer,
      matchQuery
    }
    groupMemoryFtsConfig = {
      tokenizer,
      matchQuery
    }
    return
  } catch (error) {
    logger?.warn?.('Failed to load simple extension; falling back to unicode61 tokenizer:', error)
    resetSimpleState({
      requested: true,
      enabled: true,
      error: `Failed to load simple extension: ${error?.message || error}`
    })
  }
}

async function loadSimpleExtensionForCleanup (db) {
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
  const config = ChatGPTConfig.memory.extensions.simple
  let libraryPath = config.libraryPath || ''
  let dictPath = config.dictPath || ''
  if (!libraryPath) {
    const detected = discoverSimplePaths()
    libraryPath = detected.libraryPath
    if (detected.dictPath && !dictPath) {
      dictPath = detected.dictPath
    }
    if (libraryPath) {
      ChatGPTConfig.memory.extensions.simple = ChatGPTConfig.memory.extensions.simple || {}
      ChatGPTConfig.memory.extensions.simple.libraryPath = libraryPath
      if (dictPath) {
        ChatGPTConfig.memory.extensions.simple.dictPath = dictPath
      }
    }
  }
  const resolvedLibraryPath = resolvePluginPath(libraryPath)
  if (!resolvedLibraryPath || !fs.existsSync(resolvedLibraryPath)) {
    logger?.warn?.('[Memory] cleanup requires simple extension but library missing:', resolvedLibraryPath || '(empty path)')
    return false
  }
  try {
    logger?.info?.('[Memory] temporarily loading simple extension for cleanup tasks')
    await db.loadExtension(resolvedLibraryPath)
    const useJieba = Boolean(config.useJieba)
    if (useJieba) {
      const resolvedDict = resolvePluginPath(dictPath)
      if (resolvedDict && fs.existsSync(resolvedDict)) {
        try {
          await db.prepare('select jieba_dict(?)').get(resolvedDict)
        } catch (err) {
          logger?.warn?.('Failed to set jieba dict during cleanup:', err)
        }
      }
    }
    return true
  } catch (error) {
    logger?.error?.('Failed to load simple extension for cleanup:', error)
    return false
  }
}

async function ensureGroupFactsTable (db) {
  await ensureMetaTable(db)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      fact TEXT NOT NULL,
      topic TEXT,
      importance REAL DEFAULT 0.5,
      source_message_ids TEXT,
      source_messages TEXT,
      involved_users TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_group_facts_unique
      ON group_facts(group_id, fact)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_group_facts_group
      ON group_facts(group_id, importance DESC, created_at DESC)
  `)
  await ensureGroupFactsFtsTable(db)
}

async function ensureGroupHistoryCursorTable (db) {
  await ensureMetaTable(db)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_history_cursor (
      group_id TEXT PRIMARY KEY,
      last_message_id TEXT,
      last_timestamp INTEGER
    )
  `)
}

async function ensureUserMemoryTable (db) {
  await ensureMetaTable(db)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      group_id TEXT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      importance REAL DEFAULT 0.5,
      source_message_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memory_key
      ON user_memory(user_id, coalesce(group_id, ''), key)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_memory_group
      ON user_memory(group_id)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_memory_user
      ON user_memory(user_id)
  `)
  await ensureUserMemoryFtsTable(db)
}

async function dropGroupFactsFtsArtifacts (db) {
  try {
    await db.exec(`
      DROP TRIGGER IF EXISTS group_facts_ai;
      DROP TRIGGER IF EXISTS group_facts_ad;
      DROP TRIGGER IF EXISTS group_facts_au;
      DROP TABLE IF EXISTS group_facts_fts;
    `)
  } catch (err) {
    if (String(err?.message || '').includes('no such tokenizer')) {
      const loaded = await loadSimpleExtensionForCleanup(db)
      if (loaded) {
        await db.exec(`
          DROP TRIGGER IF EXISTS group_facts_ai;
          DROP TRIGGER IF EXISTS group_facts_ad;
          DROP TRIGGER IF EXISTS group_facts_au;
          DROP TABLE IF EXISTS group_facts_fts;
        `)
      } else {
        logger?.warn?.('[Memory] Falling back to raw schema cleanup for group_facts_fts')
        try {
          await db.exec('PRAGMA writable_schema = ON;')
          await db.exec(`DELETE FROM sqlite_master WHERE name IN ('group_facts_ai','group_facts_ad','group_facts_au','group_facts_fts');`)
        } finally {
          await db.exec('PRAGMA writable_schema = OFF;')
        }
      }
    } else {
      throw err
    }
  }
}

async function createGroupFactsFts (db, tokenizer) {
  logger?.info?.('[Memory] creating group_facts_fts with tokenizer=%s', tokenizer)
  await db.exec(`
    CREATE VIRTUAL TABLE group_facts_fts
      USING fts5(
        fact,
        topic,
        content = 'group_facts',
        content_rowid = 'id',
        tokenize = '${tokenizer}'
      )
  `)
  await db.exec(`
    CREATE TRIGGER group_facts_ai AFTER INSERT ON group_facts BEGIN
      INSERT INTO group_facts_fts(rowid, fact, topic)
      VALUES (new.id, new.fact, coalesce(new.topic, ''));
    END;
  `)
  await db.exec(`
    CREATE TRIGGER group_facts_ad AFTER DELETE ON group_facts BEGIN
      INSERT INTO group_facts_fts(group_facts_fts, rowid, fact, topic)
      VALUES ('delete', old.id, old.fact, coalesce(old.topic, ''));
    END;
  `)
  await db.exec(`
    CREATE TRIGGER group_facts_au AFTER UPDATE ON group_facts BEGIN
      INSERT INTO group_facts_fts(group_facts_fts, rowid, fact, topic)
      VALUES ('delete', old.id, old.fact, coalesce(old.topic, ''));
      INSERT INTO group_facts_fts(rowid, fact, topic)
      VALUES (new.id, new.fact, coalesce(new.topic, ''));
    END;
  `)
  try {
    await db.exec(`INSERT INTO group_facts_fts(group_facts_fts) VALUES ('rebuild')`)
  } catch (err) {
    logger?.debug?.('Group facts FTS rebuild skipped:', err?.message || err)
  }
}

async function ensureGroupFactsFtsTable (db) {
  const desiredTokenizer = groupMemoryFtsConfig.tokenizer || TOKENIZER_DEFAULT
  const storedTokenizer = await getMetaValue(db, META_GROUP_TOKENIZER_KEY)
  const tableExists = await db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'group_facts_fts'
  `).get()
  if (storedTokenizer && storedTokenizer !== desiredTokenizer) {
    await dropGroupFactsFtsArtifacts(db)
  } else if (!storedTokenizer && tableExists) {
    // Unknown tokenizer, drop to ensure consistency.
    await dropGroupFactsFtsArtifacts(db)
  }
  const existsAfterDrop = await db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'group_facts_fts'
  `).get()
  if (!existsAfterDrop) {
    await createGroupFactsFts(db, desiredTokenizer)
    await setMetaValue(db, META_GROUP_TOKENIZER_KEY, desiredTokenizer)
    logger?.info?.('[Memory] group facts FTS initialised with tokenizer=%s', desiredTokenizer)
  }
}

async function dropUserMemoryFtsArtifacts (db) {
  try {
    await db.exec(`
      DROP TRIGGER IF EXISTS user_memory_ai;
      DROP TRIGGER IF EXISTS user_memory_ad;
      DROP TRIGGER IF EXISTS user_memory_au;
      DROP TABLE IF EXISTS user_memory_fts;
    `)
  } catch (err) {
    if (String(err?.message || '').includes('no such tokenizer')) {
      const loaded = await loadSimpleExtensionForCleanup(db)
      if (loaded) {
        await db.exec(`
          DROP TRIGGER IF EXISTS user_memory_ai;
          DROP TRIGGER IF EXISTS user_memory_ad;
          DROP TRIGGER IF EXISTS user_memory_au;
          DROP TABLE IF EXISTS user_memory_fts;
        `)
      } else {
        logger?.warn?.('[Memory] Falling back to raw schema cleanup for user_memory_fts')
        try {
          await db.exec('PRAGMA writable_schema = ON;')
          await db.exec(`DELETE FROM sqlite_master WHERE name IN ('user_memory_ai','user_memory_ad','user_memory_au','user_memory_fts');`)
        } finally {
          await db.exec('PRAGMA writable_schema = OFF;')
        }
      }
    } else {
      throw err
    }
  }
}

async function createUserMemoryFts (db, tokenizer) {
  logger?.info?.('[Memory] creating user_memory_fts with tokenizer=%s', tokenizer)
  await db.exec(`
    CREATE VIRTUAL TABLE user_memory_fts
      USING fts5(
        value,
        content = 'user_memory',
        content_rowid = 'id',
        tokenize = '${tokenizer}'
      )
  `)
  await db.exec(`
    CREATE TRIGGER user_memory_ai AFTER INSERT ON user_memory BEGIN
      INSERT INTO user_memory_fts(rowid, value)
      VALUES (new.id, new.value);
    END;
  `)
  await db.exec(`
    CREATE TRIGGER user_memory_ad AFTER DELETE ON user_memory BEGIN
      INSERT INTO user_memory_fts(user_memory_fts, rowid, value)
      VALUES ('delete', old.id, old.value);
    END;
  `)
  await db.exec(`
    CREATE TRIGGER user_memory_au AFTER UPDATE ON user_memory BEGIN
      INSERT INTO user_memory_fts(user_memory_fts, rowid, value)
      VALUES ('delete', old.id, old.value);
      INSERT INTO user_memory_fts(rowid, value)
      VALUES (new.id, new.value);
    END;
  `)
  try {
    await db.exec(`INSERT INTO user_memory_fts(user_memory_fts) VALUES ('rebuild')`)
  } catch (err) {
    logger?.debug?.('User memory FTS rebuild skipped:', err?.message || err)
  }
}

async function ensureUserMemoryFtsTable (db) {
  const desiredTokenizer = userMemoryFtsConfig.tokenizer || TOKENIZER_DEFAULT
  const storedTokenizer = await getMetaValue(db, META_USER_TOKENIZER_KEY)
  const tableExists = await db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'user_memory_fts'
  `).get()
  if (storedTokenizer && storedTokenizer !== desiredTokenizer) {
    await dropUserMemoryFtsArtifacts(db)
  } else if (!storedTokenizer && tableExists) {
    await dropUserMemoryFtsArtifacts(db)
  }
  const existsAfterDrop = await db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'user_memory_fts'
  `).get()
  if (!existsAfterDrop) {
    await createUserMemoryFts(db, desiredTokenizer)
    await setMetaValue(db, META_USER_TOKENIZER_KEY, desiredTokenizer)
    logger?.info?.('[Memory] user memory FTS initialised with tokenizer=%s', desiredTokenizer)
  }
}

async function createVectorTable (db, dimension) {
  if (!dimension || dimension <= 0) {
    throw new Error(`Invalid vector dimension for table creation: ${dimension}`)
  }
  if (optionalDependencyState.vectorError) {
    throw optionalDependencyState.vectorError
  }
  await db.exec(`CREATE VIRTUAL TABLE vec_group_facts USING vec0(embedding float[${dimension}])`)
}

async function ensureVectorTable (db) {
  await ensureMetaTable(db)
  if (cachedVectorDimension !== null) {
    return cachedVectorDimension
  }
  if (optionalDependencyState.vectorError) {
    cachedVectorDimension = 0
    cachedVectorModel = ChatGPTConfig.llm?.embeddingModel || ''
    return cachedVectorDimension
  }
  const preferredDimension = resolvePreferredDimension()
  const stored = await getMetaValue(db, META_VECTOR_DIM_KEY)
  const storedModel = await getMetaValue(db, META_VECTOR_MODEL_KEY)
  const currentModel = ChatGPTConfig.llm?.embeddingModel || ''
  const tableExists = Boolean(await db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'vec_group_facts'
  `).get())

  const parseDimension = value => {
    if (!value && value !== 0) return 0
    const parsed = parseInt(String(value), 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }

  const storedDimension = parseDimension(stored)
  let dimension = storedDimension
  let tablePresent = tableExists

  let needsTableReset = false
  if (tableExists && storedDimension <= 0) {
    needsTableReset = true
  }

  if (needsTableReset && tableExists) {
    try {
      await db.exec('DROP TABLE IF EXISTS vec_group_facts')
      tablePresent = false
      dimension = 0
    } catch (err) {
      logger?.warn?.('[Memory] failed to drop vec_group_facts during dimension change:', err)
    }
  }

  if (!tablePresent) {
    if (dimension <= 0) {
      dimension = parseDimension(preferredDimension)
    }
    if (dimension > 0) {
      try {
        await createVectorTable(db, dimension)
        tablePresent = true
        await setMetaValue(db, META_VECTOR_MODEL_KEY, currentModel)
        await setMetaValue(db, META_VECTOR_DIM_KEY, String(dimension))
        cachedVectorDimension = dimension
        cachedVectorModel = currentModel
        return cachedVectorDimension
      } catch (err) {
        logger?.error?.('[Memory] failed to (re)create vec_group_facts table:', err)
        dimension = 0
      }
    }
  }

  if (tablePresent && storedDimension > 0) {
    cachedVectorDimension = storedDimension
    cachedVectorModel = storedModel || currentModel
    return cachedVectorDimension
  }

  // At this point we failed to determine a valid dimension, set metadata to 0 to avoid loops.
  await setMetaValue(db, META_VECTOR_MODEL_KEY, currentModel)
  await setMetaValue(db, META_VECTOR_DIM_KEY, '0')
  cachedVectorDimension = 0
  cachedVectorModel = currentModel
  return cachedVectorDimension
}
export async function resetVectorTableDimension (dimension) {
  if (!Number.isFinite(dimension) || dimension <= 0) {
    throw new Error(`Invalid vector dimension: ${dimension}`)
  }
  const db = await getMemoryDatabase()
  try {
    await db.exec('DROP TABLE IF EXISTS vec_group_facts')
  } catch (err) {
    logger?.warn?.('[Memory] failed to drop vec_group_facts:', err)
  }
  await createVectorTable(db, dimension)
  await setMetaValue(db, META_VECTOR_DIM_KEY, dimension.toString())
  const model = ChatGPTConfig.llm?.embeddingModel || ''
  await setMetaValue(db, META_VECTOR_MODEL_KEY, model)
  cachedVectorDimension = dimension
  cachedVectorModel = model
}

async function migrate (db) {
  await ensureGroupFactsTable(db)
  await ensureGroupHistoryCursorTable(db)
  await ensureUserMemoryTable(db)
  await ensureVectorTable(db)
}

export function getUserMemoryFtsConfig () {
  return { ...userMemoryFtsConfig }
}

export function getGroupMemoryFtsConfig () {
  return { ...groupMemoryFtsConfig }
}

export function getSimpleExtensionState () {
  return { ...simpleExtensionState }
}

export function getMemoryOptionalDependencyState () {
  return {
    databaseAvailable: !optionalDependencyState.databaseError,
    databaseError: optionalDependencyState.databaseError?.message || null,
    vectorAvailable: !optionalDependencyState.vectorError,
    vectorError: optionalDependencyState.vectorError?.message || null
  }
}

export function sanitiseFtsQueryInput (query, ftsConfig) {
  if (!query) {
    return ''
  }
  if (ftsConfig?.matchQuery) {
    return String(query).trim()
  }
  return sanitiseRawFtsInput(query)
}

export async function getMemoryDatabase () {
  if (dbInstance) {
    return dbInstance
  }
  const dbPath = resolveDbPath()
  ensureDirectory(dbPath)
  logger?.info?.('[Memory] opening memory database at %s', dbPath)
  dbInstance = await openSqliteDatabase(dbPath)
  // 启用 WAL 模式，允许并发读写，避免 SQLITE_BUSY
  await dbInstance.exec('PRAGMA journal_mode = WAL')
  await dbInstance.exec('PRAGMA busy_timeout = 5000')
  await tryLoadSqliteVec(dbInstance)
  resetSimpleState({
    requested: false,
    enabled: false
  })
  await applySimpleExtension(dbInstance)
  await migrate(dbInstance)
  logger?.info?.('[Memory] memory database init completed (simple loaded=%s)', simpleExtensionState.loaded)
  return dbInstance
}

export async function getVectorDimension () {
  const currentModel = ChatGPTConfig.llm?.embeddingModel || ''
  if (cachedVectorModel && cachedVectorModel !== currentModel) {
    cachedVectorDimension = null
    cachedVectorModel = null
  }
  if (cachedVectorDimension !== null) {
    return cachedVectorDimension
  }
  const db = await getMemoryDatabase()
  return await ensureVectorTable(db)
}

export function resetCachedDimension () {
  cachedVectorDimension = null
  cachedVectorModel = null
}

export function resetMemoryDatabaseInstance () {
  if (dbInstance) {
    try {
      dbInstance.close().catch(error => {
        console.warn('Failed to close memory database:', error)
      })
    } catch (error) {
      console.warn('Failed to close memory database:', error)
    }
  }
  dbInstance = null
  cachedVectorDimension = null
  cachedVectorModel = null
}
