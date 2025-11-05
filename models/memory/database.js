import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
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

let dbInstance = null
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

function ensureMetaTable (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
}

function getMetaValue (db, key) {
  const stmt = db.prepare('SELECT value FROM memory_meta WHERE key = ?')
  const row = stmt.get(key)
  return row ? row.value : null
}

function setMetaValue (db, key, value) {
  db.prepare(`
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

function applySimpleExtension (db) {
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
    db.loadExtension(resolvedLibraryPath)
    if (config.useJieba) {
      const resolvedDict = resolvePluginPath(config.dictPath)
      if (resolvedDict && fs.existsSync(resolvedDict)) {
        try {
          logger?.debug?.('[Memory] configuring simple tokenizer jieba dict:', resolvedDict)
          db.prepare('select jieba_dict(?)').get(resolvedDict)
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
    logger?.error?.('Failed to load simple extension:', error)
    resetSimpleState({
      requested: true,
      enabled: true,
      error: `Failed to load simple extension: ${error?.message || error}`
    })
  }
}

function loadSimpleExtensionForCleanup (db) {
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
    db.loadExtension(resolvedLibraryPath)
    const useJieba = Boolean(config.useJieba)
    if (useJieba) {
      const resolvedDict = resolvePluginPath(dictPath)
      if (resolvedDict && fs.existsSync(resolvedDict)) {
        try {
          db.prepare('select jieba_dict(?)').get(resolvedDict)
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

function ensureGroupFactsTable (db) {
  ensureMetaTable(db)
  db.exec(`
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
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_group_facts_unique
      ON group_facts(group_id, fact)
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_group_facts_group
      ON group_facts(group_id, importance DESC, created_at DESC)
  `)
  ensureGroupFactsFtsTable(db)
}

function ensureGroupHistoryCursorTable (db) {
  ensureMetaTable(db)
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_history_cursor (
      group_id TEXT PRIMARY KEY,
      last_message_id TEXT,
      last_timestamp INTEGER
    )
  `)
}

function ensureUserMemoryTable (db) {
  ensureMetaTable(db)
  db.exec(`
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
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memory_key
      ON user_memory(user_id, coalesce(group_id, ''), key)
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_memory_group
      ON user_memory(group_id)
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_memory_user
      ON user_memory(user_id)
  `)
  ensureUserMemoryFtsTable(db)
}

function dropGroupFactsFtsArtifacts (db) {
  try {
    db.exec(`
      DROP TRIGGER IF EXISTS group_facts_ai;
      DROP TRIGGER IF EXISTS group_facts_ad;
      DROP TRIGGER IF EXISTS group_facts_au;
      DROP TABLE IF EXISTS group_facts_fts;
    `)
  } catch (err) {
    if (String(err?.message || '').includes('no such tokenizer')) {
      const loaded = loadSimpleExtensionForCleanup(db)
      if (loaded) {
        db.exec(`
          DROP TRIGGER IF EXISTS group_facts_ai;
          DROP TRIGGER IF EXISTS group_facts_ad;
          DROP TRIGGER IF EXISTS group_facts_au;
          DROP TABLE IF EXISTS group_facts_fts;
        `)
      } else {
        logger?.warn?.('[Memory] Falling back to raw schema cleanup for group_facts_fts')
        try {
          db.exec('PRAGMA writable_schema = ON;')
          db.exec(`DELETE FROM sqlite_master WHERE name IN ('group_facts_ai','group_facts_ad','group_facts_au','group_facts_fts');`)
        } finally {
          db.exec('PRAGMA writable_schema = OFF;')
        }
      }
    } else {
      throw err
    }
  }
}

function createGroupFactsFts (db, tokenizer) {
  logger?.info?.('[Memory] creating group_facts_fts with tokenizer=%s', tokenizer)
  db.exec(`
    CREATE VIRTUAL TABLE group_facts_fts
      USING fts5(
        fact,
        topic,
        content = 'group_facts',
        content_rowid = 'id',
        tokenize = '${tokenizer}'
      )
  `)
  db.exec(`
    CREATE TRIGGER group_facts_ai AFTER INSERT ON group_facts BEGIN
      INSERT INTO group_facts_fts(rowid, fact, topic)
      VALUES (new.id, new.fact, coalesce(new.topic, ''));
    END;
  `)
  db.exec(`
    CREATE TRIGGER group_facts_ad AFTER DELETE ON group_facts BEGIN
      INSERT INTO group_facts_fts(group_facts_fts, rowid, fact, topic)
      VALUES ('delete', old.id, old.fact, coalesce(old.topic, ''));
    END;
  `)
  db.exec(`
    CREATE TRIGGER group_facts_au AFTER UPDATE ON group_facts BEGIN
      INSERT INTO group_facts_fts(group_facts_fts, rowid, fact, topic)
      VALUES ('delete', old.id, old.fact, coalesce(old.topic, ''));
      INSERT INTO group_facts_fts(rowid, fact, topic)
      VALUES (new.id, new.fact, coalesce(new.topic, ''));
    END;
  `)
  try {
    db.exec(`INSERT INTO group_facts_fts(group_facts_fts) VALUES ('rebuild')`)
  } catch (err) {
    logger?.debug?.('Group facts FTS rebuild skipped:', err?.message || err)
  }
}

function ensureGroupFactsFtsTable (db) {
  const desiredTokenizer = groupMemoryFtsConfig.tokenizer || TOKENIZER_DEFAULT
  const storedTokenizer = getMetaValue(db, META_GROUP_TOKENIZER_KEY)
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'group_facts_fts'
  `).get()
  if (storedTokenizer && storedTokenizer !== desiredTokenizer) {
    dropGroupFactsFtsArtifacts(db)
  } else if (!storedTokenizer && tableExists) {
    // Unknown tokenizer, drop to ensure consistency.
    dropGroupFactsFtsArtifacts(db)
  }
  const existsAfterDrop = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'group_facts_fts'
  `).get()
  if (!existsAfterDrop) {
    createGroupFactsFts(db, desiredTokenizer)
    setMetaValue(db, META_GROUP_TOKENIZER_KEY, desiredTokenizer)
    logger?.info?.('[Memory] group facts FTS initialised with tokenizer=%s', desiredTokenizer)
  }
}

function dropUserMemoryFtsArtifacts (db) {
  try {
    db.exec(`
      DROP TRIGGER IF EXISTS user_memory_ai;
      DROP TRIGGER IF EXISTS user_memory_ad;
      DROP TRIGGER IF EXISTS user_memory_au;
      DROP TABLE IF EXISTS user_memory_fts;
    `)
  } catch (err) {
    if (String(err?.message || '').includes('no such tokenizer')) {
      const loaded = loadSimpleExtensionForCleanup(db)
      if (loaded) {
        db.exec(`
          DROP TRIGGER IF EXISTS user_memory_ai;
          DROP TRIGGER IF EXISTS user_memory_ad;
          DROP TRIGGER IF EXISTS user_memory_au;
          DROP TABLE IF EXISTS user_memory_fts;
        `)
      } else {
        logger?.warn?.('[Memory] Falling back to raw schema cleanup for user_memory_fts')
        try {
          db.exec('PRAGMA writable_schema = ON;')
          db.exec(`DELETE FROM sqlite_master WHERE name IN ('user_memory_ai','user_memory_ad','user_memory_au','user_memory_fts');`)
        } finally {
          db.exec('PRAGMA writable_schema = OFF;')
        }
      }
    } else {
      throw err
    }
  }
}

function createUserMemoryFts (db, tokenizer) {
  logger?.info?.('[Memory] creating user_memory_fts with tokenizer=%s', tokenizer)
  db.exec(`
    CREATE VIRTUAL TABLE user_memory_fts
      USING fts5(
        value,
        content = 'user_memory',
        content_rowid = 'id',
        tokenize = '${tokenizer}'
      )
  `)
  db.exec(`
    CREATE TRIGGER user_memory_ai AFTER INSERT ON user_memory BEGIN
      INSERT INTO user_memory_fts(rowid, value)
      VALUES (new.id, new.value);
    END;
  `)
  db.exec(`
    CREATE TRIGGER user_memory_ad AFTER DELETE ON user_memory BEGIN
      INSERT INTO user_memory_fts(user_memory_fts, rowid, value)
      VALUES ('delete', old.id, old.value);
    END;
  `)
  db.exec(`
    CREATE TRIGGER user_memory_au AFTER UPDATE ON user_memory BEGIN
      INSERT INTO user_memory_fts(user_memory_fts, rowid, value)
      VALUES ('delete', old.id, old.value);
      INSERT INTO user_memory_fts(rowid, value)
      VALUES (new.id, new.value);
    END;
  `)
  try {
    db.exec(`INSERT INTO user_memory_fts(user_memory_fts) VALUES ('rebuild')`)
  } catch (err) {
    logger?.debug?.('User memory FTS rebuild skipped:', err?.message || err)
  }
}

function ensureUserMemoryFtsTable (db) {
  const desiredTokenizer = userMemoryFtsConfig.tokenizer || TOKENIZER_DEFAULT
  const storedTokenizer = getMetaValue(db, META_USER_TOKENIZER_KEY)
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'user_memory_fts'
  `).get()
  if (storedTokenizer && storedTokenizer !== desiredTokenizer) {
    dropUserMemoryFtsArtifacts(db)
  } else if (!storedTokenizer && tableExists) {
    dropUserMemoryFtsArtifacts(db)
  }
  const existsAfterDrop = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'user_memory_fts'
  `).get()
  if (!existsAfterDrop) {
    createUserMemoryFts(db, desiredTokenizer)
    setMetaValue(db, META_USER_TOKENIZER_KEY, desiredTokenizer)
    logger?.info?.('[Memory] user memory FTS initialised with tokenizer=%s', desiredTokenizer)
  }
}

function createVectorTable (db, dimension) {
  if (!dimension || dimension <= 0) {
    throw new Error(`Invalid vector dimension for table creation: ${dimension}`)
  }
  db.exec(`CREATE VIRTUAL TABLE vec_group_facts USING vec0(embedding float[${dimension}])`)
}

function ensureVectorTable (db) {
  ensureMetaTable(db)
  if (cachedVectorDimension !== null) {
    return cachedVectorDimension
  }
  const preferredDimension = resolvePreferredDimension()
  const stored = getMetaValue(db, META_VECTOR_DIM_KEY)
  const storedModel = getMetaValue(db, META_VECTOR_MODEL_KEY)
  const currentModel = ChatGPTConfig.llm?.embeddingModel || ''
  const tableExists = Boolean(db.prepare(`
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
      db.exec('DROP TABLE IF EXISTS vec_group_facts')
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
        createVectorTable(db, dimension)
        tablePresent = true
        setMetaValue(db, META_VECTOR_MODEL_KEY, currentModel)
        setMetaValue(db, META_VECTOR_DIM_KEY, String(dimension))
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
  setMetaValue(db, META_VECTOR_MODEL_KEY, currentModel)
  setMetaValue(db, META_VECTOR_DIM_KEY, '0')
  cachedVectorDimension = 0
  cachedVectorModel = currentModel
  return cachedVectorDimension
}
export function resetVectorTableDimension (dimension) {
  if (!Number.isFinite(dimension) || dimension <= 0) {
    throw new Error(`Invalid vector dimension: ${dimension}`)
  }
  const db = getMemoryDatabase()
  try {
    db.exec('DROP TABLE IF EXISTS vec_group_facts')
  } catch (err) {
    logger?.warn?.('[Memory] failed to drop vec_group_facts:', err)
  }
  createVectorTable(db, dimension)
  setMetaValue(db, META_VECTOR_DIM_KEY, dimension.toString())
  const model = ChatGPTConfig.llm?.embeddingModel || ''
  setMetaValue(db, META_VECTOR_MODEL_KEY, model)
  cachedVectorDimension = dimension
  cachedVectorModel = model
}

function migrate (db) {
  ensureGroupFactsTable(db)
  ensureGroupHistoryCursorTable(db)
  ensureUserMemoryTable(db)
  ensureVectorTable(db)
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

export function sanitiseFtsQueryInput (query, ftsConfig) {
  if (!query) {
    return ''
  }
  if (ftsConfig?.matchQuery) {
    return String(query).trim()
  }
  return sanitiseRawFtsInput(query)
}

export function getMemoryDatabase () {
  if (dbInstance) {
    return dbInstance
  }
  const dbPath = resolveDbPath()
  ensureDirectory(dbPath)
  logger?.info?.('[Memory] opening memory database at %s', dbPath)
  dbInstance = new Database(dbPath)
  sqliteVec.load(dbInstance)
  resetSimpleState({
    requested: false,
    enabled: false
  })
  applySimpleExtension(dbInstance)
  migrate(dbInstance)
  logger?.info?.('[Memory] memory database init completed (simple loaded=%s)', simpleExtensionState.loaded)
  return dbInstance
}

export function getVectorDimension () {
  const currentModel = ChatGPTConfig.llm?.embeddingModel || ''
  if (cachedVectorModel && cachedVectorModel !== currentModel) {
    cachedVectorDimension = null
    cachedVectorModel = null
  }
  if (cachedVectorDimension !== null) {
    return cachedVectorDimension
  }
  const db = getMemoryDatabase()
  return ensureVectorTable(db)
}

export function resetCachedDimension () {
  cachedVectorDimension = null
  cachedVectorModel = null
}

export function resetMemoryDatabaseInstance () {
  if (dbInstance) {
    try {
      dbInstance.close()
    } catch (error) {
      console.warn('Failed to close memory database:', error)
    }
  }
  dbInstance = null
  cachedVectorDimension = null
  cachedVectorModel = null
}
