import { ChaiteStorage } from 'chaite'
import sqlite3 from 'sqlite3'

/** Private MCP connection settings. Credentials remain in the local SQLite DB. */
export class SQLiteMcpServerStorage extends ChaiteStorage {
  constructor (dbPath) {
    super()
    this.db = new sqlite3.Database(dbPath)
  }

  getName () { return 'SQLiteMcpServerStorage' }

  initialize () {
    return new Promise((resolve, reject) => this.db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        updatedAt INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(name);
    `, err => err ? reject(err) : resolve()))
  }

  getItem (id) {
    return new Promise((resolve, reject) => this.db.get('SELECT payload FROM mcp_servers WHERE id = ?', [id], (err, row) => err ? reject(err) : resolve(row ? JSON.parse(row.payload) : null)))
  }

  setItem (id, value) {
    return new Promise((resolve, reject) => this.db.run(
      'INSERT OR REPLACE INTO mcp_servers (id,name,enabled,updatedAt,payload) VALUES (?,?,?,?,?)',
      [id, value.name, value.enabled ? 1 : 0, value.updatedAt || Date.now(), JSON.stringify(value)],
      err => err ? reject(err) : resolve(id),
    ))
  }

  removeItem (id) { return new Promise((resolve, reject) => this.db.run('DELETE FROM mcp_servers WHERE id = ?', [id], err => err ? reject(err) : resolve())) }
  listItems () { return new Promise((resolve, reject) => this.db.all('SELECT payload FROM mcp_servers ORDER BY updatedAt DESC', (err, rows) => err ? reject(err) : resolve(rows.map(row => JSON.parse(row.payload))))) }
  async listItemsByEqFilter (filter) { return (await this.listItems()).filter(item => Object.entries(filter).every(([key, value]) => item[key] === value)) }
  async listItemsByInQuery (query) { return (await this.listItems()).filter(item => query.every(({ field, values }) => values.includes(item[field]))) }
}
