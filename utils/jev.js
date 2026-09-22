import { getGroupHistory } from './group.js'
import { formatTimeToBeiJing } from './common.js'
import { renderTemplate } from './template.js'

/**
 * Jev (System One) 决策模型客户端。
 *
 * Jev 不生成文本，只对传入的 state 做结构化判断：
 *   POST {url}/v1/systemone
 *   { state, model, questions: { <key>: { type: 'noul'|'choice'|'score', instructions, ... } } }
 *   → { model, answers: { <key>: { type, noul?|choice?|score?, confidence?, probabilities? } }, usage }
 */

// state 构建模板的内置默认值（cfg 未配置/为空时使用）
const STATE_TEMPLATE_DEFAULTS = {
  // 每条群消息的渲染格式。可用占位符：${time} ${sender} ${message} ${card} ${nickname} ${userId}
  stateMessageTemplate: '[${time}] ${sender}: ${message}',
  // 追加在最新一条消息（触发判定那条）行尾的标记，设为空字符串则不加标记
  stateLatestMark: ' ←【最新消息】',
  // 整个 state 的组装。可用占位符：${transcript} ${currentTime} ${groupName} ${groupId}
  stateTemplate: '${transcript}\n\nCurrent Time: ${currentTime}',
  // 私聊场景的 state。可用占位符：${message} ${currentTime}
  privateStateTemplate: '用户私信：${message}'
}

function resolveTemplate (value, fallback) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || fallback
}

/**
 * 把群聊历史按模板转写成喂给 Jev 的纯文本上下文。
 * @param {Array<*>} chats getGroupHistory 返回的消息列表（oldest-first）
 * @param {*} cfg bym.jevTrigger 配置
 * @returns {string}
 */
function renderTranscript (chats, cfg) {
  const messageTemplate = resolveTemplate(cfg.stateMessageTemplate, STATE_TEMPLATE_DEFAULTS.stateMessageTemplate)
  const latestMark = typeof cfg.stateLatestMark === 'string' ? cfg.stateLatestMark : STATE_TEMPLATE_DEFAULTS.stateLatestMark
  const lines = chats
    .filter(chat => chat && (chat.raw_message || chat.message))
    .map((chat, index, arr) => {
      const sender = chat.sender || {}
      const values = {
        time: chat.time ? formatTimeToBeiJing(chat.time * 1000) : '-',
        sender: sender.card || sender.nickname || sender.user_id || '未知',
        card: sender.card || '-',
        nickname: sender.nickname || '-',
        userId: sender.user_id || '-',
        message: chat.raw_message || chat.message || ''
      }
      let line = renderTemplate(messageTemplate, values)
      if (index === arr.length - 1) {
        line += latestMark
      }
      return line
    })
  return lines.join('\n')
}

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
 * 用 Jev 判断机器人是否应该接茬。
 * 群聊场景会把最近的群聊上下文按模板转写成对话记录作为 state；
 * 非群聊场景使用私聊模板。
 * @param {*} e yunzai 事件
 * @param {{
 *   url: string,
 *   apiKey?: string,
 *   model?: string,
 *   threshold?: number,
 *   contextLength?: number,
 *   timeout?: number,
 *   instructions?: string,
 *   stateMessageTemplate?: string,
 *   stateLatestMark?: string,
 *   stateTemplate?: string,
 *   privateStateTemplate?: string
 * }} cfg bym.jevTrigger 配置
 * @returns {Promise<{triggered: boolean, noul: number|null, latencyMs: number, answered: boolean}>}
 *   answered=false 表示 Jev 没有给出有效答案（调用失败/格式不符），调用方应走回退逻辑
 */
export async function jevShouldChimeIn (e, cfg) {
  const threshold = typeof cfg.threshold === 'number' ? cfg.threshold : 0.6
  const contextLength = cfg.contextLength > 0 ? cfg.contextLength : 20
  const startedAt = Date.now()
  const currentTime = formatTimeToBeiJing(new Date().getTime())
  let state
  if (e.isGroup) {
    const chats = await getGroupHistory(e, contextLength)
    const transcript = renderTranscript(chats || [], cfg) || '（群聊记录为空）'
    state = renderTemplate(
      resolveTemplate(cfg.stateTemplate, STATE_TEMPLATE_DEFAULTS.stateTemplate),
      {
        transcript,
        currentTime,
        groupName: e.group?.name || e.group_name || '-',
        groupId: e.group?.group_id || e.group_id || '-'
      }
    )
  } else {
    state = renderTemplate(
      resolveTemplate(cfg.privateStateTemplate, STATE_TEMPLATE_DEFAULTS.privateStateTemplate),
      {
        message: e.msg || '',
        currentTime
      }
    )
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
