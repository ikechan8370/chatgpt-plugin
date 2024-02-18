import { UserInfo } from './user_data.js'
import { Config } from '../../utils/config.js'
import { deleteOnePrompt, getPromptByName, readPrompts, saveOnePrompt } from '../../utils/prompts.js'

async function Prompt (fastify, options) {
  // 获取设定列表
  fastify.post('/getPromptList', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    let user = UserInfo(token)
    if (!user) {
      reply.send({ err: '未登录' })
    } else if (user.autho === 'admin') {
      reply.send([
        {
          name: 'Sydney默认',
          content: Config.sydney
        },
        {
          name: 'API默认',
          content: Config.promptPrefixOverride
        },
        ...readPrompts()
      ])
    } else {
      reply.send({ err: '权限不足' })
    }
    return reply
  })
  // 添加设定
  fastify.post('/addPrompt', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    let user = UserInfo(token)
    if (!user) {
      reply.send({ err: '未登录' })
    } else if (user.autho === 'admin') {
      const body = request.body || {}
      if (body.prompt && body.content) {
        saveOnePrompt(body.prompt, body.content)
        reply.send({ state: true })
      } else {
        reply.send({ err: '参数不足' })
      }
    } else {
      reply.send({ err: '权限不足' })
    }
    return reply
  })
  // 删除设定
  fastify.post('/deletePrompt', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    let user = UserInfo(token)
    if (!user) {
      reply.send({ err: '未登录' })
    } else if (user.autho === 'admin') {
      const body = request.body || {}
      if (body.prompt) {
        deleteOnePrompt(body.prompt)
        reply.send({ state: true })
      } else {
        reply.send({ err: '参数不足' })
      }
    } else {
      reply.send({ err: '权限不足' })
    }
    return reply
  })
  // 使用设定
  fastify.post('/usePrompt', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    let user = UserInfo(token)
    if (!user) {
      reply.send({ err: '未登录' })
    } else if (user.autho === 'admin') {
      const body = request.body || {}
      if (body.prompt) {
        let promptName = body.prompt
        let prompt = getPromptByName(promptName)
        let use = await redis.get('CHATGPT:USE') || 'api'
        if (!prompt) {
          if (promptName === 'API默认') {
            prompt = {
              name: 'API默认',
              content: Config.promptPrefixOverride
            }
          } else if (promptName === 'Sydney默认') {
            prompt = {
              name: 'Sydney默认',
              content: Config.sydney
            }
          } else {
            prompt = false
            reply.send({ state: false, use, error: '未找到设定' })
          }
        }
        const keyMap = {
          api: 'promptPrefixOverride',
          Custom: 'sydney',
          claude: 'slackClaudeGlobalPreset'
        }
        if (prompt) {
          if (keyMap[use]) {
            if (Config.ttsMode === 'azure') {
              Config[keyMap[use]] = prompt.content + '\n' + await AzureTTS.getEmotionPrompt(e)
              logger.warn(Config[keyMap[use]])
            } else {
              Config[keyMap[use]] = prompt.content
            }
            await redis.set(`CHATGPT:PROMPT_USE_${use}`, promptName)
            reply.send({ state: true, use })
          } else {
            reply.send({ state: false, use, error: '当前模式不支持设定修改' })
          }
        }
      } else {
        reply.send({ err: '参数不足' })
      }
    } else {
      reply.send({ err: '权限不足' })
    }
    return reply
  })
}
export default Prompt
