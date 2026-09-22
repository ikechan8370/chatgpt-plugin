import { getGroupHistory } from './group.js'
import { formatTimeToBeiJing } from './common.js'

/**
 * Jev (System One) 决策模型客户端。
 *
 * Jev 不生成文本，只对传入的 state 做结构化判断：
 *   POST {url}/v1/systemone
 *   { state, model, questions: { <key>: { type: 'noul'|'choice'|'score', instructions, ... } } }
 *   → { model, answers: { <key>: { type, noul?|choice?|score?, confidence?, probabilities? } }, usage }
 */

/**
 * 调用 System One 评估端点。
 * @param {{
 *   url: string,
 *   apiKey?: string,
 *   model?: string,
 *   state: string,
 *   questions: Record<string, *>,
 *   timeout?: number
 * }} options
 * @returns {Promise<{model: string, answers: Record<string, *>, usage?: *}>}
 */
export async function callSystemOne (options) {
  const {
    url,
    apiKey = '',
    model = 'jev-latest',
    state,
    questions,
    timeout = 5000
  } = options
  if (!url) {
    throw new Error('Jev url is not configured')
  }
  const endpoint = url.replace(/\/+$/, '') + '/v1/systemone'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ state, model, questions }),
      signal: controller.signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Jev HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
    const json = await res.json()
    if (!json?.answers || typeof json.answers !== 'object') {
      throw new Error('Jev response missing answers')
    }
    return json
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 把群聊历史转写成喂给 Jev 的纯文本上下文。
 * @param {Array<*>} chats getGroupHistory 返回的消息列表（oldest-first）
 * @returns {string}
 */
function renderTranscript (chats) {
  const lines = chats
    .filter(chat => chat && (chat.raw_message || chat.message))
    .map(chat => {
      const sender = chat.sender || {}
      const name = sender.card || sender.nickname || sender.user_id || '未知'
      const time = chat.time ? formatTimeToBeiJing(chat.time * 1000) : '-'
      return `[${time}] ${name}: ${chat.raw_message || chat.message}`
    })
  if (lines.length > 0) {
    // 最后一条就是触发本次判断的消息，明确标出来
    lines[lines.length - 1] += ' ←【最新消息】'
  }
  return lines.join('\n')
}

/**
 * 用 Jev 判断机器人是否应该接茬。
 * 群聊场景会把最近的群聊上下文转写成对话记录作为 state；
 * 非群聊场景只用触发消息本身。
 * @param {*} e yunzai 事件
 * @param {{
 *   url: string,
 *   apiKey?: string,
 *   model?: string,
 *   threshold?: number,
 *   contextLength?: number,
 *   timeout?: number,
 *   instructions?: string
 * }} cfg bym.jevTrigger 配置
 * @returns {Promise<{triggered: boolean, noul: number|null, latencyMs: number, answered: boolean}>}
 *   answered=false 表示 Jev 没有给出有效答案（调用失败/格式不符），调用方应走回退逻辑
 */
export async function jevShouldChimeIn (e, cfg) {
  const threshold = typeof cfg.threshold === 'number' ? cfg.threshold : 0.6
  const contextLength = cfg.contextLength > 0 ? cfg.contextLength : 20
  const startedAt = Date.now()
  let state
  if (e.isGroup) {
    const chats = await getGroupHistory(e, contextLength)
    const transcript = renderTranscript(chats || [])
    state = (transcript || '（群聊记录为空）') +
      `\n\nCurrent Time: ${formatTimeToBeiJing(new Date().getTime())}`
  } else {
    state = `用户私信：${e.msg || ''}`
  }
  const questions = {
    should_reply: {
      type: 'noul',
      instructions: cfg.instructions ||
        '根据群聊上下文判断：机器人此刻加入对话是否自然？' +
        '如果有人直接@机器人、向机器人提问、提到机器人、或话题明显需要机器人参与（例如求助、点名、接梗），应当接茬；' +
        '如果只是群友之间的普通闲聊、与机器人无关，不应该插话。'
    }
  }
  const json = await callSystemOne({
    url: cfg.url,
    apiKey: cfg.apiKey,
    model: cfg.model,
    state,
    questions,
    timeout: cfg.timeout
  })
  const answer = json.answers.should_reply
  const noul = typeof answer?.noul === 'number' ? answer.noul : null
  return {
    triggered: noul !== null && noul >= threshold,
    noul,
    latencyMs: Date.now() - startedAt,
    answered: noul !== null
  }
}
