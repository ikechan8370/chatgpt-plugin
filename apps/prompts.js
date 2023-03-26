import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import _ from 'lodash'
import { Config } from '../utils/config.js'
import { getMasterQQ, limitString, makeForwardMsg } from '../utils/common.js'
import { deleteOnePrompt, getPromptByName, readPrompts, saveOnePrompt } from '../utils/prompts.js'
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
          reg: '^#(chatgpt|ChatGPT)(删除|移除)设定',
          fnc: 'removePrompt',
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
          reg: '^#(chatgpt|ChatGPT)(在线)?(浏览|查找)设定',
          fnc: 'browsePrompt'
        },
        {
          reg: '^#(chatgpt|ChatGPT)设定帮助$',
          fnc: 'helpPrompt',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)(开启|关闭)洗脑$',
          fnc: 'setSydneyBrainWash',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)(设置)?洗脑强度',
          fnc: 'setSydneyBrainWashStrength',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt|ChatGPT)(设置)?洗脑名称',
          fnc: 'setSydneyBrainWashName',
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
      await e.reply(`你当前正在使用${use}模式，已将该模式设定应用为"${promptName}"。更该设定后建议结束对话以使设定更好生效`, true)
    } else {
      await e.reply(`你当前正在使用${use}模式，该模式不支持设定`, true)
    }
    if (use === 'Custom') {
      Config.sydneyBrainWashName = promptName
    }
  }

  async setSydneyBrainWashName (e) {
    let name = e.msg.replace(/^#(chatgpt|ChatGPT)设置洗脑名称/, '')
    if (name) {
      Config.sydneyBrainWashName = name
      await e.reply('操作成功', true)
    }
  }

  async setSydneyBrainWash (e) {
    if (e.msg.indexOf('开启') > -1) {
      Config.sydneyBrainWash = true
    } else {
      Config.sydneyBrainWash = false
    }
    await e.reply('操作成功', true)
  }

  async setSydneyBrainWashStrength (e) {
    let strength = e.msg.replace(/^#(chatgpt|ChatGPT)(设置)?洗脑强度/, '')
    if (!strength) {
      return
    }
    strength = parseInt(strength)
    if (strength > 0) {
      Config.sydneyBrainWashStrength = strength
      await e.reply('操作成功', true)
    }
  }

  async removePrompt (e) {
    let promptName = e.msg.replace(/^#(chatgpt|ChatGPT)(删除|移除)设定/, '')
    if (!promptName) {
      await e.reply('你要删除哪个设定呢？')
      return
    }
    deleteOnePrompt(promptName)
    await e.reply(`设定${promptName}已删除。`)
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
      await this.e.reply('【警告】该设定已存在，新增的内容将会覆盖之前的设定', true)
      // this.finish('addPromptName')
      // return
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

  async uploadPrompt (e) {
    if (await redis.get('CHATGPT:UPLOAD_PROMPT')) {
      await this.reply('本机器人存在其他人正在上传设定，请稍后')
      return
    }
    let use = await redis.get('CHATGPT:USE') || 'api'
    if (use.toLowerCase() === 'bing') {
      if (Config.toneStyle === 'Custom') {
        use = 'Custom'
      }
    }
    let currentUse = e.msg.replace(/^#(chatgpt|ChatGPT)(上传|分享|共享)设定/, '')
    if (!currentUse) {
      currentUse = await redis.get(`CHATGPT:PROMPT_USE_${use}`)
    }
    await this.reply(`即将上传设定${currentUse}，确定请回复确定，取消请回复取消，或者回复其他本地存在设定的名字`, true)
    let extraData = {
      currentUse,
      use
    }
    await redis.set('CHATGPT:UPLOAD_PROMPT', JSON.stringify(extraData), 300)
    this.setContext('uploadPromptConfirm')
  }

  async uploadPromptConfirm () {
    if (!this.e.msg) return
    let name = this.e.msg.trim()
    if (name === '取消') {
      await redis.del('CHATGPT:UPLOAD_PROMPT')
      await this.reply('已取消上传', true)
      this.finish('uploadPromptConfirm')
      return
    }
    let extraData = JSON.parse(await redis.get('CHATGPT:UPLOAD_PROMPT'))
    if (name !== '确定') {
      extraData.currentUse = name
    }
    if (!getPromptByName(extraData.currentUse)) {
      await redis.del('CHATGPT:UPLOAD_PROMPT')
      await this.reply(`设定${extraData.currentUse}不存在，已取消上传`, true)
      this.finish('uploadPromptConfirm')
      return
    }
    await redis.set('CHATGPT:UPLOAD_PROMPT', JSON.stringify(extraData), 300)
    await this.reply('请输入对该设定的描述或备注，便于其他人快速了解该设定', true)
    this.finish('uploadPromptConfirm')
    this.setContext('uploadPromptDescription')
  }

  async uploadPromptDescription () {
    if (!this.e.msg) return
    let description = this.e.msg.trim()
    if (description === '取消') {
      await redis.del('CHATGPT:UPLOAD_PROMPT')
      await this.reply('已取消上传', true)
      this.finish('uploadPromptDescription')
      return
    }
    let extraData = JSON.parse(await redis.get('CHATGPT:UPLOAD_PROMPT'))
    extraData.description = description
    await redis.set('CHATGPT:UPLOAD_PROMPT', JSON.stringify(extraData), 300)
    await this.reply('该设定是否是R18设定？请回复是或否', true)
    this.finish('uploadPromptDescription')
    this.setContext('uploadPromptR18')
  }

  async uploadPromptR18 () {
    if (this.e.msg.trim() === '取消') {
      await redis.del('CHATGPT:UPLOAD_PROMPT')
      await this.reply('已取消上传', true)
      this.finish('uploadPromptR18')
      return
    }
    if (!this.e.msg || (this.e.msg !== '是' && this.e.msg !== '否')) {
      return
    }
    let r18 = this.e.msg.trim() === '是'
    await this.reply('资料录入完成，正在上传中……', true)
    let extraData = JSON.parse(await redis.get('CHATGPT:UPLOAD_PROMPT'))
    const { currentUse, description } = extraData
    const { content } = getPromptByName(currentUse)
    let toUploadBody = {
      title: currentUse,
      prompt: content,
      qq: (await getMasterQQ())[0], // 上传者设定为主人qq而不是机器人qq
      use: extraData.use === 'Custom' ? 'Sydney' : 'ChatGPT',
      r18,
      description
    }
    logger.info(toUploadBody)
    let response = await fetch('https://chatgpt.roki.best/prompt', {
      method: 'POST',
      body: JSON.stringify(toUploadBody),
      headers: {
        'Content-Type': 'application/json',
        'FROM-CHATGPT': 'ikechan8370'
      }
    })
    await redis.del('CHATGPT:UPLOAD_PROMPT')
    if (response.status === 200) {
      response = await response.json()
      if (response.data === true) {
        await this.reply(`设定${currentUse}已上传，其他人可以通过#chatgpt导入设定${currentUse} 来快速导入该设定。感谢您的分享。`, true)
      } else {
        await this.reply(`设定上传失败，原因：${response.msg}`)
      }
    } else {
      await this.reply(`设定上传失败: ${await response.text()}`)
    }
    this.finish('uploadPromptR18')
  }

  async browsePrompt (e) {
    let search = e.msg.replace(/^#(chatgpt|ChatGPT)(在线)?(浏览|查找)设定/, '')
    let split = search.split('页码')
    let page = 1
    if (split.length > 1) {
      search = split[0]
      page = parseInt(split[1])
    }
    let response = await fetch('https://chatgpt.roki.best/prompt/list?search=' + search + `&page=${page - 1}`, {
      method: 'GET',
      headers: {
        'FROM-CHATGPT': 'ikechan8370'
      }
    })
    if (response.status === 200) {
      const { totalElements, content, pageable } = (await response.json()).data
      let output = '| 【设定名称】 |  上传者QQ  |  上传时间  ｜  是否R18  ｜  使用场景  ｜\n'
      output += '----------------------------------------------------------------------------------------\n'
      content.forEach(c => {
        output += `|  【${c.title}】  |  ${c.qq}  | ${c.createTime} | ${c.r18} | ${c.use}｜\n`
      })
      output += '**************************************************************************\n'
      output += `                       当前为第${pageable.pageNumber + 1}页，共${totalElements}个设定`
      await this.reply(output)
    } else {
      await this.reply('查询失败：' + await response.text())
    }
  }

  async importPrompt (e) {
    let promptName = e.msg.replace(/^#(chatgpt|ChatGPT)导入设定/, '')
    if (!promptName) {
      await e.reply('设定名字呢？', true)
      return true
    }
    let response = await fetch('https://chatgpt.roki.best/prompt?name=' + promptName, {
      method: 'GET',
      headers: {
        'FROM-CHATGPT': 'ikechan8370'
      }
    })
    if (response.status === 200) {
      let r = await response.json()
      if (r.code === 200) {
        const { prompt, title } = r.data
        saveOnePrompt(title, prompt)
        e.reply(`导入成功。您现在可以使用 #chatgpt使用设定${title} 来体验这个设定了。`)
      } else {
        await e.reply('导入失败：' + r.msg)
      }
    } else {
      await this.reply('导入失败：' + await response.text())
    }
    // await this.reply('敬请期待', true)
  }

  async helpPrompt () {
    await this.reply('设定目录为/plugins/chatgpt-plugin/prompts，将会读取该目录下的所有[设定名].txt文件作为设定列表', true)
  }
}
