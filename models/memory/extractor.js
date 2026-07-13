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

WHAT TO EXTRACT (high value):
- Personal facts about members (jobs, skills, life events, locations)
- Group events, plans, or decisions
- Shared knowledge or inside jokes the group has established
- Opinions or preferences that reveal something about a member's identity

DO NOT EXTRACT (low value):
- How members interact with a bot (commands, nicknames for bot, etc.)
- Mundane daily chatter without substance
- Greetings, thanks, or other pleasantries
- Anything that won't be relevant after a few hours

Return a JSON array. Each element must contain:
{
  "fact": 事实内容，必须完整包含事件的各个要素（谁参与了、做了什么事、背景是什么），尽可能整合而非拆分,
  "topic": 主题关键词，如 "活动"、"成员信息",
  "importance": 介于0和1之间的小数。重要事实(如人生大事、群决策)给0.8以上；普通趣事给0.4-0.6；琐碎信息给0.3以下或直接不提取,
  "source_message_ids": 原始消息ID数组,
  "source_messages": 对应原始消息的简要摘录,
  "involved_users": 出现或相关的用户ID数组
}

If nothing meaningful is found, return an empty array []. Quality over quantity.
Do not wrap the JSON array in code fences.`
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
  const systemTemplate = config.extractionSystemPrompt || presetSendMessageOption?.systemOverride || `You are an assistant that extracts long-term personal memories about a user from their conversations with a bot.

CRITICAL RULES - Only extract memories that meet ALL of these criteria:
1. The information would remain true and useful weeks or months from now
2. The information has substance - it tells us something meaningful about the user's life, knowledge, preferences, or identity
3. The information would help the bot give better, more personalized responses in future conversations

DO NOT extract:
- How the user interacts with the bot (e.g., "likes to give commands", "calls the bot X", "interacts by asking for stories")
- Generic or trivial statements without information value
- Observations about the conversation itself rather than about the user
- Repetitive filler, small talk, or greetings

GOOD examples (high information value, extract these):
- "已顺利拿到博士学位"
- "具备大语言模型及嵌入模型的相关技术知识"
- "喜欢吃川菜，特别是麻辣火锅"
- "目前在字节跳动做后端开发"
- "养了一只叫汤圆的橘猫"

BAD examples (DO NOT extract):
- "习惯通过复读指令来与机器人互动" ← describes interaction pattern, not user knowledge
- "称呼机器人为'十四'" ← nickname for bot, not meaningful user info
- "要求机器人讲色情暴力故事" ← describes interaction, not user identity
- "今天问机器人天气怎么样" ← temporary, no lasting value

Quantity: Only extract memories when you find genuinely meaningful information. Extracting 0 memories is perfectly fine if nothing meets the criteria. Quality over quantity.

Return a JSON array of strings only, without any other characters including \`\`\` or \`\`\`json. Each string must be a short sentence (in the same language as the conversation) describing one piece of long-term memory.`
  const userTemplate = config.extractionUserPrompt || `下面是用户与机器人的对话，请根据系统提示提取可长期记忆的个人信息。如果没有值得记忆的内容，返回空数组[]。

\${messages}`
  const speakerOnlyRules = `STRICT SPEAKER-ONLY RULES:
- Extract memories ONLY about the human speaker whose messages are labeled as the user in this prompt.
- Do NOT extract facts about people the speaker mentions, quotes, @mentions, replies to, or talks about.
- Do NOT extract facts from the assistant's text unless it clearly confirms or restates information about the same human speaker.
- If a sentence says another person likes, owns, works at, studies, lives in, plans, or prefers something, ignore it for this user's personal memory.
- When uncertain whether the fact is about the speaker, return nothing for that fact.`
  return {
    system: `${systemTemplate}

${speakerOnlyRules}

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
  // memory 提取不需要工具调用，清除预设中的工具配置避免 Gemini 等模型的 Jinja 模板报错
  delete options.toolGroupId
  delete options.toolChoice
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
    const detail = err?.error ?? err?.body ?? err?.response ?? err?.cause
    if (detail) {
      logger.error('Failed to extract group facts (API detail):', typeof detail === 'object' ? JSON.stringify(detail) : detail)
    }
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
    const detail = err?.error ?? err?.body ?? err?.response ?? err?.cause
    if (detail) {
      logger.error('Failed to extract user memories:', typeof detail === 'object' ? JSON.stringify(detail) : detail)
    }
    logger.error('Failed to extract user memories:', err)
    return []
  }
}
