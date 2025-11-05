import { SendMessageOption, Chaite } from 'chaite'
import ChatGPTConfig from '../../config/config.js'
import { getClientForModel } from '../chaite/vectorizer.js'

function collectTextFromResponse (response) {
  if (!response?.contents) {
    return ''
  }
  return response.contents
    .filter(content => content.type === 'text')
    .map(content => content.text || '')
    .join('\n')
    .trim()
}

function parseJSON (text) {
  if (!text) {
    return null
  }
  const trimmed = text.trim()
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const payload = codeBlockMatch ? codeBlockMatch[1] : trimmed
  try {
    return JSON.parse(payload)
  } catch (err) {
    logger.warn('Failed to parse JSON from memory extractor response:', text)
    return null
  }
}

function formatEntry (entry) {
  let str = ''
  try {
    if (typeof entry === 'string') {
      str = entry
    } else {
      str = JSON.stringify(entry)
    }
  } catch (err) {
    str = String(entry)
  }
  const limit = 200
  return str.length > limit ? str.slice(0, limit) + '…' : str
}

function injectMessagesIntoTemplate (template, body) {
  if (!template || typeof template !== 'string') {
    return body
  }
  const placeholders = ['${messages}', '{messages}', '{{messages}}']
  let result = template
  let replaced = false
  for (const placeholder of placeholders) {
    if (result.includes(placeholder)) {
      result = result.split(placeholder).join(body)
      replaced = true
    }
  }
  if (!replaced) {
    const trimmed = result.trim()
    if (!trimmed) {
      return body
    }
    if (/\n\s*$/.test(result)) {
      return `${result}${body}`
    }
    return `${result}\n${body}`
  }
  return result
}

async function resolvePresetSendMessageOption (presetId, scope) {
  if (!presetId) {
    return null
  }
  try {
    const chaite = Chaite.getInstance?.()
    if (!chaite) {
      logger.warn(`[Memory] ${scope} extraction preset ${presetId} configured but Chaite is not initialized`)
      return null
    }
    const presetManager = chaite.getChatPresetManager?.()
    if (!presetManager) {
      logger.warn(`[Memory] ${scope} extraction preset ${presetId} configured but preset manager unavailable`)
      return null
    }
    const preset = await presetManager.getInstance(presetId)
    if (!preset) {
      logger.warn(`[Memory] ${scope} extraction preset ${presetId} not found`)
      return null
    }
    logger.debug(`[Memory] using ${scope} extraction preset ${presetId}`)
    return {
      preset,
      sendMessageOption: JSON.parse(JSON.stringify(preset.sendMessageOption || {}))
    }
  } catch (err) {
    logger.error(`[Memory] failed to load ${scope} extraction preset ${presetId}:`, err)
    return null
  }
}

function resolveGroupExtractionPrompts (presetSendMessageOption) {
  const config = ChatGPTConfig.memory?.group || {}
  const system = config.extractionSystemPrompt || presetSendMessageOption?.systemOverride || `You are a knowledge extraction assistant that specialises in summarising long-term facts from group chat transcripts.
Read the provided conversation and identify statements that should be stored as long-term knowledge for the group.
Return a JSON array. Each element must contain:
{
  "fact": 事实内容，必须完整包含事件的各个要素而不能是简单的短语（比如谁参与了事件、做了什么事情、背景时间是什么）（同一件事情尽可能整合为同一条而非拆分，以便利于检索）,
  "topic": 主题关键词，字符串，如 "活动"、"成员信息",
  "importance": 一个介于0和1之间的小数，数值越大表示越重要,
  "source_message_ids": 原始消息ID数组,
  "source_messages": 对应原始消息的简要摘录或合并文本,
  "involved_users": 出现或相关的用户ID数组
}
Only include meaningful, verifiable group-specific information that is useful for future conversations. Do not record incomplete information. Do not include general knowledge or unrelated facts. Do not wrap the JSON array in code fences.`
  const userTemplate = config.extractionUserPrompt || `以下是群聊中的一些消息，请根据系统说明提取值得长期记忆的事实，以JSON数组形式返回，不要输出额外说明。

\${messages}`
  return { system, userTemplate }
}

function buildGroupUserPrompt (messages, template) {
  const joined = messages.map(msg => {
    const sender = msg.nickname || msg.user_id || '未知用户'
    return `${sender}: ${msg.text}`
  }).join('\n')
  return injectMessagesIntoTemplate(template, joined)
}

function buildExistingMemorySection (existingMemories = []) {
  if (!existingMemories || existingMemories.length === 0) {
    return '当前没有任何已知的长期记忆。'
  }
  const lines = existingMemories.map((item, idx) => `${idx + 1}. ${item}`)
  return `以下是关于用户的已知长期记忆，请在提取新记忆时参考，避免重复已有事实，并在信息变更时更新描述：\n${lines.join('\n')}`
}

function resolveUserExtractionPrompts (existingMemories = [], presetSendMessageOption) {
  const config = ChatGPTConfig.memory?.user || {}
  const systemTemplate = config.extractionSystemPrompt || presetSendMessageOption?.systemOverride || `You are an assistant that extracts long-term personal preferences or persona details about a user.
Given a conversation snippet between the user and the bot, identify durable information such as preferences, nicknames, roles, speaking style, habits, or other facts that remain valid over time.
Return a JSON array of **strings**, and nothing else, without any other characters including \`\`\` or \`\`\`json. Each string must be a short sentence (in the same language as the conversation) describing one piece of long-term memory. Do not include keys, JSON objects, or additional metadata. Ignore temporary topics or uncertain information.`
  const userTemplate = config.extractionUserPrompt || `下面是用户与机器人的对话，请根据系统提示提取可长期记忆的个人信息。

\${messages}`
  return {
    system: `${systemTemplate}

${buildExistingMemorySection(existingMemories)}`,
    userTemplate
  }
}

function buildUserPrompt (messages, template) {
  const body = messages.map(msg => {
    const prefix = msg.role === 'assistant' ? '机器人' : (msg.nickname || msg.user_id || '用户')
    return `${prefix}: ${msg.text}`
  }).join('\n')
  return injectMessagesIntoTemplate(template, body)
}

async function callModel ({ prompt, systemPrompt, model, maxToken = 4096, temperature = 0.2, sendMessageOption }) {
  const options = sendMessageOption
    ? JSON.parse(JSON.stringify(sendMessageOption))
    : {}
  options.model = model || options.model
  if (!options.model) {
    throw new Error('No model available for memory extraction call')
  }
  const resolvedModel = options.model
  const { client } = await getClientForModel(resolvedModel)
  const response = await client.sendMessage({
    role: 'user',
    content: [
      {
        type: 'text',
        text: prompt
      }
    ]
  }, SendMessageOption.create({
    ...options,
    model: options.model,
    temperature: options.temperature ?? temperature,
    maxToken: options.maxToken ?? maxToken,
    systemOverride: systemPrompt ?? options.systemOverride,
    disableHistoryRead: true,
    disableHistorySave: true,
    stream: false
  }))
  return collectTextFromResponse(response)
}

function resolveGroupExtractionModel (presetSendMessageOption) {
  const config = ChatGPTConfig.memory?.group
  if (config?.extractionModel) {
    return config.extractionModel
  }
  if (presetSendMessageOption?.model) {
    return presetSendMessageOption.model
  }
  if (ChatGPTConfig.llm?.defaultModel) {
    return ChatGPTConfig.llm.defaultModel
  }
  return ''
}

function resolveUserExtractionModel (presetSendMessageOption) {
  const config = ChatGPTConfig.memory?.user
  if (config?.extractionModel) {
    return config.extractionModel
  }
  if (presetSendMessageOption?.model) {
    return presetSendMessageOption.model
  }
  if (ChatGPTConfig.llm?.defaultModel) {
    return ChatGPTConfig.llm.defaultModel
  }
  return ''
}

export async function extractGroupFacts (messages) {
  if (!messages || messages.length === 0) {
    return []
  }
  const groupConfig = ChatGPTConfig.memory?.group || {}
  const presetInfo = await resolvePresetSendMessageOption(groupConfig.extractionPresetId, 'group')
  const presetOptions = presetInfo?.sendMessageOption
  const model = resolveGroupExtractionModel(presetOptions)
  if (!model) {
    logger.warn('No model configured for group memory extraction')
    return []
  }
  try {
    const prompts = resolveGroupExtractionPrompts(presetOptions)
    logger.debug(`[Memory] start group fact extraction, messages=${messages.length}, model=${model}${presetInfo?.preset ? `, preset=${presetInfo.preset.id}` : ''}`)
    const text = await callModel({
      prompt: buildGroupUserPrompt(messages, prompts.userTemplate),
      systemPrompt: prompts.system,
      model,
      sendMessageOption: presetOptions
    })
    const parsed = parseJSON(text)
    if (Array.isArray(parsed)) {
      logger.info(`[Memory] extracted ${parsed.length} group facts`)
      parsed.slice(0, 10).forEach((item, idx) => {
        logger.debug(`[Memory] group fact[${idx}] ${formatEntry(item)}`)
      })
      return parsed
    }
    logger.debug('[Memory] group fact extraction returned non-array content')
    return []
  } catch (err) {
    logger.error('Failed to extract group facts:', err)
    return []
  }
}

export async function extractUserMemories (messages, existingMemories = []) {
  if (!messages || messages.length === 0) {
    return []
  }
  const userConfig = ChatGPTConfig.memory?.user || {}
  const presetInfo = await resolvePresetSendMessageOption(userConfig.extractionPresetId, 'user')
  const presetOptions = presetInfo?.sendMessageOption
  const model = resolveUserExtractionModel(presetOptions)
  if (!model) {
    logger.warn('No model configured for user memory extraction')
    return []
  }
  try {
    const prompts = resolveUserExtractionPrompts(existingMemories, presetOptions)
    logger.debug(`[Memory] start user memory extraction, snippets=${messages.length}, existing=${existingMemories.length}, model=${model}${presetInfo?.preset ? `, preset=${presetInfo.preset.id}` : ''}`)
    const text = await callModel({
      prompt: buildUserPrompt(messages, prompts.userTemplate),
      systemPrompt: prompts.system,
      model,
      sendMessageOption: presetOptions
    })
    const parsed = parseJSON(text)
    if (Array.isArray(parsed)) {
      const sentences = parsed.map(item => {
        if (typeof item === 'string') {
          return item.trim()
        }
        if (item && typeof item === 'object') {
          const possible = item.sentence || item.text || item.value || item.fact
          if (possible) {
            return String(possible).trim()
          }
        }
        return ''
      }).filter(Boolean)
      logger.info(`[Memory] extracted ${sentences.length} user memories`)
      sentences.slice(0, 10).forEach((item, idx) => {
        logger.debug(`[Memory] user memory[${idx}] ${formatEntry(item)}`)
      })
      return sentences
    }
    logger.debug('[Memory] user memory extraction returned non-array content')
    return []
  } catch (err) {
    logger.error('Failed to extract user memories:', err)
    return []
  }
}
