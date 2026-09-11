/**
 * 把 `?` 占位符翻译成 Postgres 的 `$1..$n`。
 *
 * 这样 storage 层可以一直按 SQLite 的写法写 `?`，共用同一份 SQL 字符串，
 * 只在 pg driver 的执行入口翻译一次——比让每条 SQL 自己去适配方言干净得多。
 *
 * 扫描时会跳过单引号字符串、双引号标识符、行注释和块注释，避免把字面量里的
 * 问号也换掉。
 *
 * 注意：Postgres 的 jsonb `?` 操作符会被误判为占位符。当前代码没有用到 jsonb
 * （JSON 一律按 TEXT 存），真要用的话写成 `jsonb_exists()` 绕开。
 *
 * @param {string} sql
 * @returns {string}
 */
export function toDollarPlaceholders (sql) {
  let out = ''
  let index = 0
  let i = 0

  while (i < sql.length) {
    const char = sql[i]

    // 单引号字符串：'' 表示转义的单引号
    if (char === "'") {
      const start = i
      i++
      while (i < sql.length) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { i += 2; continue }
          i++
          break
        }
        i++
      }
      out += sql.slice(start, i)
      continue
    }

    // 双引号标识符："" 表示转义的双引号
    if (char === '"') {
      const start = i
      i++
      while (i < sql.length) {
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') { i += 2; continue }
          i++
          break
        }
        i++
      }
      out += sql.slice(start, i)
      continue
    }

    // 行注释
    if (char === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i)
      const stop = end === -1 ? sql.length : end
      out += sql.slice(i, stop)
      i = stop
      continue
    }

    // 块注释
    if (char === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      const stop = end === -1 ? sql.length : end + 2
      out += sql.slice(i, stop)
      i = stop
      continue
    }

    if (char === '?') {
      out += `$${++index}`
      i++
      continue
    }

    out += char
    i++
  }

  return out
}

/**
 * 统计一条 SQL 里的占位符个数，用于参数个数校验。
 * @param {string} sql
 * @returns {number}
 */
export function countPlaceholders (sql) {
  const translated = toDollarPlaceholders(sql)
  const match = translated.match(/\$(\d+)/g)
  if (!match) return 0
  return Math.max(...match.map(m => Number(m.slice(1))))
}
