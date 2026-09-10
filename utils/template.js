const PLACEHOLDER_RE = /\$\{([\w.]+)\}/g

/**
 * 群聊上下文模板每条消息渲染为 Markdown 表格的一行，因此代入的值里不能出现
 * 换行和竖线，否则群友可以用一条消息伪造出额外的表格行（冒充别人的 qq 号 /
 * 群角色），或者提前闭合 <settings> 块。
 * @param {*} value
 * @returns {string}
 */
export function escapeTemplateValue (value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r\n|\r|\n/g, ' ')
}

/**
 * 一次性替换模板里的所有占位符。
 *
 * 必须一次扫完，不能像以前那样链式调用 String.prototype.replace：
 * 1. 链式替换时，先代入的值会被后面的 replace 再次扫描，群名片填
 *    `${message.raw_message}` 就能劫持后面的占位符；
 * 2. replace 的字符串参数里 `$&`、`` $` `` 等有特殊含义，群名片填 `` $` ``
 *    会把前面整段内容重新拼进结果。
 * 用替换函数可以同时避免这两点。
 *
 * 模板里没有提供对应值的占位符保持原样，与旧行为一致。
 *
 * @param {string} template
 * @param {Record<string, *>} values
 * @returns {string}
 */
export function renderTemplate (template, values = {}) {
  return String(template ?? '').replace(PLACEHOLDER_RE, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return match
    return escapeTemplateValue(values[key])
  })
}

/**
 * 群聊上下文单条消息的取值表，供 renderTemplate 使用。
 * @param {*} chat
 * @param {{messageId: string, rawMessage: string, time: string}} resolved
 * @returns {Record<string, *>}
 */
export function groupMessageTemplateValues (chat, resolved) {
  const sender = chat.sender || {}
  return {
    'message.sender.card': sender.card || '-',
    'message.sender.nickname': sender.nickname || '-',
    'message.sender.user_id': sender.user_id || '-',
    'message.sender.role': sender.role || '-',
    'message.sender.title': sender.title || '-',
    'message.time': resolved.time || '-',
    'message.messageId': resolved.messageId || '-',
    'message.raw_message': resolved.rawMessage || '-'
  }
}

/**
 * 群聊上下文前缀的取值表。
 * 默认模板里写的是 ${group.id}，而旧代码只替换 ${group.group_id}，导致默认配置
 * 下模型看到的是没被替换掉的 ${group.id}。两个键都提供，兼容已改过模板的用户。
 * @param {string} groupId
 * @param {string} groupName
 * @returns {Record<string, *>}
 */
export function groupHeaderTemplateValues (groupId, groupName) {
  return {
    'group.group_id': groupId,
    'group.id': groupId,
    'group.name': groupName
  }
}
