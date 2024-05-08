import { getUin, getUserData } from '../utils/common.js'
import { Config } from '../utils/config.js'
import { KeyvFile } from 'keyv-file'
import _ from 'lodash'

export const originalValues = ['星火', '通义千问', '克劳德', '克劳德2', '必应', 'api', 'API', 'api3', 'API3', 'glm', '双子星', '双子座', '智谱']
export const correspondingValues = ['xh', 'qwen', 'claude', 'claude2', 'bing', 'api', 'api', 'api3', 'api3', 'chatglm', 'gemini', 'gemini', 'chatglm4']

export class ConversationManager {
  async endConversation (e) {
    const userData = await getUserData(e.user_id)
    const match = e.msg.trim().match('^#?(.*)(结束|新开|摧毁|毁灭|完结)对话')
    console.log(match[1])
    let use
    if (match[1] && match[1] != 'chatgpt') {
      use = correspondingValues[originalValues.indexOf(match[1])]
    } else {
      use = (userData.mode === 'default' ? null : userData.mode) || await redis.get('CHATGPT:USE')
    }
    console.log(use)
    await redis.del(`CHATGPT:WRONG_EMOTION:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
    // fast implementation
    if (use === 'claude') {
      await redis.del(`CHATGPT:CONVERSATIONS_CLAUDE:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
      await this.reply('claude对话已结束')
      return
    }
    if (use === 'claude2') {
      await redis.del(`CHATGPT:CLAUDE2_CONVERSATION:${e.sender.user_id}`)
      await this.reply('claude.ai对话已结束')
      return
    }
    if (use === 'xh') {
      await redis.del(`CHATGPT:CONVERSATIONS_XH:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
      await this.reply('星火对话已结束')
      return
    }
    let ats = e.message.filter(m => m.type === 'at')
    const isAtMode = Config.toggleMode === 'at'
    if (isAtMode) ats = ats.filter(item => item.qq !== getUin(e))
    if (ats.length === 0) {
      if (use === 'api3') {
        await redis.del(`CHATGPT:QQ_CONVERSATION:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'bing') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BING:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
          return
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
        }
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: Config.toneStyle
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        logger.info(`SydneyUser_${e.sender.user_id}`, await conversationsCache.get(`SydneyUser_${e.sender.user_id}`))
        await conversationsCache.delete(`SydneyUser_${e.sender.user_id}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'chatglm') {
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: 'chatglm_6b'
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        logger.info(`ChatGLMUser_${e.sender.user_id}`, await conversationsCache.get(`ChatGLMUser_${e.sender.user_id}`))
        await conversationsCache.delete(`ChatGLMUser_${e.sender.user_id}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'api') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'qwen') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_QWEN:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_QWEN:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'gemini') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_GEMINI:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_GEMINI:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'chatglm4') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_CHATGLM4:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_CHATGLM4:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'bing') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'browser') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BROWSER:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BROWSER:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      }
    } else {
      let at = ats[0]
      let qq = at.qq
      let atUser = _.trimStart(at.text, '@')
      if (use === 'api3') {
        await redis.del(`CHATGPT:QQ_CONVERSATION:${qq}`)
        await this.reply(`${atUser}已退出TA当前的对话，TA仍可以@我进行聊天以开启新的对话`, true)
      } else if (use === 'bing') {
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: Config.toneStyle
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        await conversationsCache.delete(`SydneyUser_${qq}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'chatglm') {
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: 'chatglm_6b'
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        logger.info(`ChatGLMUser_${e.sender.user_id}`, await conversationsCache.get(`ChatGLMUser_${e.sender.user_id}`))
        await conversationsCache.delete(`ChatGLMUser_${qq}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'api') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'qwen') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_QWEN:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_QWEN:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'gemini') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_GEMINI:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_GEMINI:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'chatglm4') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_CHATGLM4:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_CHATGLM4:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'bing') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BING:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'browser') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BROWSER:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BROWSER:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      }
    }
  }

  async endAllConversations (e) {
    const match = e.msg.trim().match('^#?(.*)(结束|新开|摧毁|毁灭|完结)全部对话')
    console.log(match[1])
    let use
    if (match[1] && match[1] != 'chatgpt') {
      use = correspondingValues[originalValues.indexOf(match[1])]
    } else {
      use = await redis.get('CHATGPT:USE') || 'api'
    }
    console.log(use)
    let deleted = 0
    switch (use) {
      case 'claude': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS_CLAUDE:*')
        let we = await redis.keys('CHATGPT:WRONG_EMOTION:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete claude conversation of qq: ' + cs[i])
          }
          deleted++
        }
        for (const element of we) {
          await redis.del(element)
        }
        break
      }
      case 'xh': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS_XH:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete xh conversation of qq: ' + cs[i])
          }
          deleted++
        }
        break
      }
      case 'bing': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS_BING:*')
        let we = await redis.keys('CHATGPT:WRONG_EMOTION:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete bing conversation of qq: ' + cs[i])
          }
          deleted++
        }
        for (const element of we) {
          await redis.del(element)
        }
        break
      }
      case 'api': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete api conversation of qq: ' + cs[i])
          }
          deleted++
        }
        break
      }
      case 'api3': {
        let qcs = await redis.keys('CHATGPT:QQ_CONVERSATION:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
      case 'chatglm': {
        let qcs = await redis.keys('CHATGPT:CONVERSATIONS_CHATGLM:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete chatglm conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
      case 'qwen': {
        let qcs = await redis.keys('CHATGPT:CONVERSATIONS_QWEN:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete qwen conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
      case 'gemini': {
        let qcs = await redis.keys('CHATGPT:CONVERSATIONS_GEMINI:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete gemini conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
      case 'chatglm4': {
        let qcs = await redis.keys('CHATGPT:CONVERSATIONS_CHATGLM4:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete chatglm4 conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
    }
    await this.reply(`结束了${deleted}个用户的对话。`, true)
  }
}
