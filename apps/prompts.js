import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import _ from 'lodash'
import { Config } from '../utils/config.js'
import {limitString, makeForwardMsg} from '../utils/common.js'
import { getPromptByName, readPrompts, saveOnePrompt } from '../utils/prompts.js'
export class help extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin 设定管理',
      dsc: 'ChatGPT-Plugin 设定管理',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#(chatgpt|ChatGPT)设定列表$',
          fnc: 'listPrompts',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)查看设定',
          fnc: 'detailPrompt',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)使用设定',
          fnc: 'usePrompt',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)添加设定',
          fnc: 'addPrompt',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)(上传|分享|共享)设定',
          fnc: 'uploadPrompt',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)导入设定',
          fnc: 'importPrompt',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)设定帮助$',
          fnc: 'helpPrompt',
          permission: 'master'
        }
      ]
    })
  }

  async listPrompts (e) {
    let prompts = []
    let defaultPrompt = {
      name: 'API默认',
      content: Config.promptPrefixOverride
    }
    let defaultSydneyPrompt = {
      name: 'Sydney默认',
      content: Config.sydney
    }
    prompts.push(...[defaultPrompt, defaultSydneyPrompt])
    prompts.push(...readPrompts())
    console.log(prompts)
    e.reply(await makeForwardMsg(e, prompts.map(p => `《${p.name}》\n${limitString(p.content, 500)}`), '设定列表'))
  }

  async detailPrompt (e) {
    let promptName = e.msg.replace(/^#(chatgpt|ChatGPT)查看设定/, '').trim()
    let prompt = getPromptByName(promptName)
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
        await e.reply('没有这个设定', true)
        return
      }
    }
    await e.reply(`《${prompt.name}》\n${limitString(prompt.content, 500)}`, true)
  }

  async usePrompt (e) {
    let promptName = e.msg.replace(/^#(chatgpt|ChatGPT)使用设定/, '').trim()
    let prompt = getPromptByName(promptName)
    if (!prompt) {
      console.log(promptName)
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
        await e.reply('没有这个设定', true)
        return
      }
    }
    let use = await redis.get('CHATGPT:USE') || 'api'
    if (use.toLowerCase() === 'bing') {
      if (Config.toneStyle === 'Custom') {
        use = 'Custom'
      }
    }
    const keyMap = {
      api: 'promptPrefixOverride',
      Custom: 'sydney'
    }

    if (keyMap[use]) {
      Config[keyMap[use]] = prompt.content
      await redis.set(`CHATGPT:PROMPT_USE_${use}`, promptName)
      await e.reply(`你当前正在使用${use}模式，已将该模式设定应用为"${promptName}。更该设定后建议结束对话以使设定更好生效"`, true)
    } else {
      await e.reply(`你当前正在使用${use}模式，该模式不支持设定`, true)
    }
  }

  async addPrompt (e) {
    this.setContext('addPromptName')
    await e.reply('请输入设定名称', true)
  }

  async addPromptName () {
    if (!this.e.msg) return
    let name = this.e.msg
    let prompt = getPromptByName(name)
    if (prompt) {
      await this.e.reply('该设定已存在', true)
      this.finish('addPromptName')
      return
    }
    await redis.set('CHATGPT:ADD_PROMPT_NAME', name)
    await this.reply('请输入设定内容', true)
    this.finish('addPromptName')
    this.setContext('addPromptContext')
  }

  async addPromptContext () {
    if (!this.e.msg) return
    let content = this.e.msg
    let name = await redis.get('CHATGPT:ADD_PROMPT_NAME')
    saveOnePrompt(name, content)
    await redis.del('CHATGPT:ADD_PROMPT_NAME')
    await this.reply('设定添加成功', true)
    this.finish('addPromptContext')
  }

  async uploadPrompt () {
    await this.reply('敬请期待', true)
  }

  async importPrompt () {
    await this.reply('敬请期待', true)
  }

  async helpPrompt () {
    await this.reply('设定目录为/plugins/chatgpt-plugin/prompts，将会读取该目录下的所有[设定名].txt文件作为设定列表', true)
  }
}
