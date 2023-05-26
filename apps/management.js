import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { exec } from 'child_process'
import {
  checkPnpm,
  formatDuration,
  parseDuration,
  getPublicIP,
  renderUrl,
  makeForwardMsg,
  getDefaultReplySetting
} from '../utils/common.js'
import SydneyAIClient from '../utils/SydneyAIClient.js'
import { convertSpeaker, speakers as vitsRoleList } from '../utils/tts.js'
import md5 from 'md5'
import path from 'path'
import fs from 'fs'
import loader from '../../../lib/plugins/loader.js'
import { supportConfigurations as voxRoleList } from '../utils/tts/voicevox.js'
import { supportConfigurations as azureRoleList } from '../utils/tts/microsoft-azure.js'
let isWhiteList = true
export class ChatgptManagement extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin 管理',
      dsc: '插件的管理项配置，让你轻松掌控各个功能的开闭和管理。包含各种实用的配置选项，让你的聊天更加便捷和高效！',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '#chatgpt开启(问题)?(回复)?确认',
          fnc: 'turnOnConfirm',
          permission: 'master'
        },
        {
          reg: '#chatgpt关闭(问题)?(回复)?确认',
          fnc: 'turnOffConfirm',
          permission: 'master'
        },
        {
          reg: '#chatgpt(设置|绑定)(token|Token)',
          fnc: 'setAccessToken',
          permission: 'master'
        },
        {
          reg: '#chatgpt(设置|绑定)(Poe|POE)(token|Token)',
          fnc: 'setPoeCookie',
          permission: 'master'
        },
        {
          reg: '#chatgpt(设置|绑定|添加)(必应|Bing |bing )(token|Token)',
          fnc: 'setBingAccessToken',
          permission: 'master'
        },
        {
          reg: '#chatgpt(删除|移除)(必应|Bing |bing )(token|Token)',
          fnc: 'delBingAccessToken',
          permission: 'master'
        },
        {
          reg: '#chatgpt(查看|浏览)(必应|Bing |bing )(token|Token)',
          fnc: 'getBingAccessToken',
          permission: 'master'
        },
        {
          reg: '#chatgpt(迁移|恢复)(必应|Bing |bing )(token|Token)',
          fnc: 'migrateBingAccessToken',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换浏览器$',
          fnc: 'useBrowserBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换API$',
          fnc: 'useOpenAIAPIBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换(ChatGLM|chatglm)$',
          fnc: 'useChatGLMSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换API3$',
          fnc: 'useReversedAPIBasedSolution2',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换(必应|Bing)$',
          fnc: 'useBingSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换(Poe|poe)$',
          fnc: 'useClaudeBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换(Claude|claude|slack)$',
          fnc: 'useSlackClaudeBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换星火$',
          fnc: 'useXinghuoBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(必应|Bing)切换',
          fnc: 'changeBingTone',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(必应|Bing)(开启|关闭)建议(回复)?',
          fnc: 'bingOpenSuggestedResponses',
          permission: 'master'
        },
        {
          reg: '^#chatgpt模式(帮助)?$',
          fnc: 'modeHelp'
        },
        {
          reg: '^#chatgpt版本(信息)',
          fnc: 'versionChatGPTPlugin'
        },
        {
          reg: '^#chatgpt(本群)?(群\\d+)?(关闭|闭嘴|关机|休眠|下班)',
          fnc: 'shutUp',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(本群)?(群\\d+)?(打开|开启|启动|激活|张嘴|开口|说话|上班)',
          fnc: 'openMouth',
          permission: 'master'
        },
        {
          reg: '^#chatgpt查看?(关闭|闭嘴|关机|休眠|下班|休眠)列表',
          fnc: 'listShutUp',
          permission: 'master'
        },
        {
          reg: '^#chatgpt设置(API|key)(Key|key)',
          fnc: 'setAPIKey',
          permission: 'master'
        },
        {
          reg: '^#chatgpt设置(API|api)设定',
          fnc: 'setAPIPromptPrefix',
          permission: 'master'
        },
        {
          reg: '^#chatgpt设置星火token',
          fnc: 'setXinghuoToken',
          permission: 'master'
        },
        {
          reg: '^#chatgpt设置(Bing|必应|Sydney|悉尼|sydney|bing)设定',
          fnc: 'setBingPromptPrefix',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(开启|关闭)画图$',
          fnc: 'switchDraw',
          permission: 'master'
        },
        {
          reg: '^#chatgpt查看(API|api)设定$',
          fnc: 'queryAPIPromptPrefix',
          permission: 'master'
        },
        {
          reg: '^#chatgpt查看(Bing|必应|Sydney|悉尼|sydney|bing)设定$',
          fnc: 'queryBingPromptPrefix',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(打开|关闭|设置)?全局((图片模式|语音模式|(语音角色|角色语音|角色).*)|回复帮助)$',
          fnc: 'setDefaultReplySetting',
          permission: 'master'
        },
        {
          /** 命令正则匹配 */
          reg: '^#(关闭|打开)群聊上下文$',
          /** 执行方法 */
          fnc: 'enableGroupContext',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(允许|禁止|打开|关闭|同意)私聊$',
          fnc: 'enablePrivateChat',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(设置|添加)群聊[白黑]名单$',
          fnc: 'setList',
          permission: 'master'
        },
        {
          reg: '^#chatgpt查看群聊[白黑]名单$',
          fnc: 'checkGroupList',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(删除|移除)群聊[白黑]名单$',
          fnc: 'delGroupList',
          permission: 'master'
        },
        {
          reg: '^#(设置|修改)管理密码',
          fnc: 'setAdminPassword',
          permission: 'master'
        },
        {
          reg: '^#(设置|修改)用户密码',
          fnc: 'setUserPassword'
        },
        {
          reg: '^#chatgpt系统(设置|配置|管理)',
          fnc: 'adminPage',
          permission: 'master'
        },
        {
          reg: '^#chatgpt用户(设置|配置|管理)',
          fnc: 'userPage'
        },
        {
          reg: '^#(chatgpt)?(对话|管理|娱乐|绘图|人物设定|聊天记录)?指令表(帮助|搜索(.+))?',
          fnc: 'commandHelp'
        },
        {
          reg: '^#语音切换.*',
          fnc: 'ttsSwitch',
          permission: 'master'
        },
        {
          reg: '^#chatgpt角色列表$',
          fnc: 'getTTSRoleList'
        },
        {
          reg: '^#chatgpt设置后台(刷新|refresh)(t|T)oken$',
          fnc: 'setOpenAIPlatformToken'
        }
      ]
    })
  }

  async getTTSRoleList (e) {
    let userReplySetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
    userReplySetting = !userReplySetting
      ? getDefaultReplySetting()
      : JSON.parse(userReplySetting)
    if (!userReplySetting.useTTS) return
    let ttsMode = Config.ttsMode
    let roleList = []
    if (ttsMode === 'vits-uma-genshin-honkai') {
      const [firstHalf, secondHalf] = [vitsRoleList.slice(0, Math.floor(vitsRoleList.length / 2)).join('、'), vitsRoleList.slice(Math.floor(vitsRoleList.length / 2)).join('、')]
      const [chunk1, chunk2] = [firstHalf.match(/[^、]+(?:、[^、]+){0,30}/g), secondHalf.match(/[^、]+(?:、[^、]+){0,30}/g)]
      const list = [await makeForwardMsg(e, chunk1, `${Config.ttsMode}角色列表1`), await makeForwardMsg(e, chunk2, `${Config.ttsMode}角色列表2`)]
      roleList = await makeForwardMsg(e, list, `${Config.ttsMode}角色列表`)
      await this.reply(roleList)
      return
    } else if (ttsMode === 'voicevox') {
      roleList = voxRoleList.map(item => item.name).join('、')
    } else if (ttsMode === 'azure') {
      roleList = azureRoleList.map(item => item.name).join('、')
    }
    if (roleList.length > 300) {
      let chunks = roleList.match(/[^、]+(?:、[^、]+){0,30}/g)
      roleList = await makeForwardMsg(e, chunks, `${Config.ttsMode}角色列表`)
    }
    await this.reply(roleList)
  }

  async ttsSwitch (e) {
    let userReplySetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
    userReplySetting = !userReplySetting
      ? getDefaultReplySetting()
      : JSON.parse(userReplySetting)
    if (!userReplySetting.useTTS) {
      let replyMsg
      if (userReplySetting.usePicture) {
        replyMsg = `当前为${!userReplySetting.useTTS ? '图片模式' : ''}，请先切换到语音模式吧~`
      } else {
        replyMsg = `当前为${!userReplySetting.useTTS ? '文本模式' : ''}，请先切换到语音模式吧~`
      }
      await this.reply(replyMsg, e.isGroup)
      return false
    }
    let regExp = /#语音切换(.*)/
    let ttsMode = e.msg.match(regExp)[1]
    if (['vits', 'azure', 'voicevox'].includes(ttsMode)) {
      if (ttsMode === 'vits') {
        Config.ttsMode = 'vits-uma-genshin-honkai'
      } else {
        Config.ttsMode = ttsMode
      }
      await this.reply(`语音回复已切换至${Config.ttsMode}模式${Config.ttsMode === 'azure' ? '，建议重新开始对话以获得更好的对话效果！' : ''}`)
    } else {
      await this.reply('暂不支持此模式，当前支持vits，azure，voicevox。')
    }
    return false
  }

  async commandHelp (e) {
    if (!this.e.isMaster) { return this.reply('你没有权限') }
    if (/^#(chatgpt)?指令表帮助$/.exec(e.msg.trim())) {
      await this.reply('#chatgpt指令表: 查看本插件的所有指令\n' +
          '#chatgpt(对话|管理|娱乐|绘图|人物设定|聊天记录)指令表: 查看对应功能分类的指令表\n' +
          '#chatgpt指令表搜索xxx: 查看包含对应关键词的指令')
      return false
    }
    const categories = {
      对话: '对话',
      管理: '管理',
      娱乐: '娱乐',
      绘图: '绘图',
      人物设定: '人物设定',
      聊天记录: '聊天记录'
    }

    function getCategory (e, plugin) {
      for (const key in categories) {
        if (e.msg.includes(key) && plugin.name.includes(categories[key])) {
          return '功能名称: '
        }
      }
      return ''
    }
    const commandSet = []
    const plugins = await Promise.all(loader.priority.map(p => new p.class()))

    for (const plugin of plugins) {
      const name = plugin.name
      const rule = plugin.rule
      if (/^chatgpt/i.test(name) && rule) {
        commandSet.push({ name, dsc: plugin.dsc, rule })
      }
    }
    if (e.msg.includes('搜索')) {
      let cmd = e.msg.trim().match(/^#(chatgpt)?(对话|管理|娱乐|绘图|人物设定|聊天记录)?指令表(帮助|搜索(.+))?/)[4]
      if (!cmd) {
        await this.reply('(⊙ˍ⊙)')
        return 0
      } else {
        let searchResults = []
        commandSet.forEach(plugin => {
          plugin.rule.forEach(item => {
            if (item.reg.toLowerCase().includes(cmd.toLowerCase())) {
              searchResults.push(item.reg)
            }
          })
        })
        if (!searchResults.length) {
          await this.reply('没有找到符合的结果，换个关键词吧！', e.isGroup)
          return 0
        } else if (searchResults.length <= 5) {
          await this.reply(searchResults.join('\n'), e.isGroup)
          return 1
        } else {
          let msg = await makeForwardMsg(e, searchResults, e.msg.slice(1).startsWith('chatgpt') ? e.msg.slice(8) : 'chatgpt' + e.msg.slice(1))
          await this.reply(msg)
          return 1
        }
      }
    }
    const generatePrompt = (plugin, command) => {
      const category = getCategory(e, plugin)
      const commandsStr = command.length ? `正则指令:\n${command.join('\n')}\n` : '正则指令: 无\n'
      const description = `功能介绍：${plugin.dsc}\n`
      return `${category}${plugin.name}\n${description}${commandsStr}`
    }

    const prompts = []
    for (const plugin of commandSet) {
      const commands = plugin.rule.map(v => v.reg.includes('[#*0-9]') ? '表情合成功能只需要发送两个emoji表情即可' : v.reg)
      const category = getCategory(e, plugin)
      if (category || (!e.msg.includes('对话') && !e.msg.includes('管理') && !e.msg.includes('娱乐') && !e.msg.includes('绘图') && !e.msg.includes('人物设定') && !e.msg.includes('聊天记录'))) {
        prompts.push(generatePrompt(plugin, commands))
      }
    }
    let msg = await makeForwardMsg(e, prompts, e.msg.slice(1).startsWith('chatgpt') ? e.msg.slice(1) : ('chatgpt' + e.msg.slice(1)))
    await this.reply(msg)
    return true
  }

  /**
   * 对原始黑白名单进行去重和去除无效群号处理
   * @param whitelist
   * @param blacklist
   * @returns {Promise<any[][]>}
   */
  async processList (whitelist, blacklist) {
    let groupWhitelist = Array.isArray(whitelist)
      ? whitelist
      : String(whitelist).split(/[,，]/)
    let groupBlacklist = !Array.isArray(blacklist)
      ? blacklist
      : String(blacklist).split(/[,，]/)
    groupWhitelist = Array.from(new Set(groupWhitelist)).filter(value => /^[1-9]\d{8,9}$/.test(value))
    groupBlacklist = Array.from(new Set(groupBlacklist)).filter(value => /^[1-9]\d{8,9}$/.test(value))
    return [groupWhitelist, groupBlacklist]
  }

  async setList (e) {
    this.setContext('saveList')
    isWhiteList = e.msg.includes('白')
    const listType = isWhiteList ? '白名单' : '黑名单'
    await this.reply(`请发送需要设置的群聊${listType}，群号间使用,隔开`, e.isGroup)
    return false
  }

  async saveList (e) {
    if (!this.e.msg) return
    const listType = isWhiteList ? '白名单' : '黑名单'
    const inputMatch = this.e.msg.match(/\d+/g)
    let [groupWhitelist, groupBlacklist] = await this.processList(Config.groupWhitelist, Config.groupBlacklist)
    let inputList = Array.isArray(inputMatch) ? this.e.msg.match(/\d+/g).filter(value => /^[1-9]\d{8,9}$/.test(value)) : []
    if (!inputList.length) {
      await this.reply('无效输入，请在检查群号是否正确后重新输入', e.isGroup)
      return false
    }
    inputList = Array.from(new Set(inputList))
    let whitelist = []
    let blacklist = []
    for (const element of inputList) {
      if (listType === '白名单') {
        groupWhitelist = groupWhitelist.filter(item => item !== element)
        whitelist.push(element)
      } else {
        groupBlacklist = groupBlacklist.filter(item => item !== element)
        blacklist.push(element)
      }
    }
    if (!(whitelist.length || blacklist.length)) {
      await this.reply('无效输入，请在检查群号是否正确或重复添加后重新输入', e.isGroup)
      return false
    } else {
      if (listType === '白名单') {
        Config.groupWhitelist = groupWhitelist
          .filter(group => group !== '')
          .concat(whitelist)
      } else {
        Config.groupBlacklist = groupBlacklist
          .filter(group => group !== '')
          .concat(blacklist)
      }
    }
    let replyMsg = `群聊${listType}已更新，可通过\n'#chatgpt查看群聊${listType}'查看最新名单\n'#chatgpt移除群聊${listType}'管理名单`
    if (e.isPrivate) {
      replyMsg += `\n当前群聊${listType}为：${listType === '白名单' ? Config.groupWhitelist : Config.groupBlacklist}`
    }
    await this.reply(replyMsg, e.isGroup)
    this.finish('saveList')
  }

  async checkGroupList (e) {
    isWhiteList = e.msg.includes('白')
    const list = isWhiteList ? Config.groupWhitelist : Config.groupBlacklist
    const listType = isWhiteList ? '白名单' : '黑名单'
    const replyMsg = list.length ? `当前群聊${listType}为：${list}` : `当前没有设置任何群聊${listType}`
    await this.reply(replyMsg, e.isGroup)
    return false
  }

  async delGroupList (e) {
    isWhiteList = e.msg.includes('白')
    const listType = isWhiteList ? '白名单' : '黑名单'
    let replyMsg = ''
    if (Config.groupWhitelist.length === 0 && Config.groupBlacklist.length === 0) {
      replyMsg = `当前群聊(白|黑)名单为空，请先添加${listType}吧~`
    } else if ((listType === '白名单' && !Config.groupWhitelist.length) || (listType === '黑名单' && !Config.groupBlacklist.length)) {
      replyMsg = `当前群聊${listType}为空，请先添加吧~`
    }
    if (replyMsg) {
      await this.reply(replyMsg, e.isGroup)
      return false
    }
    this.setContext('confirmDelGroup')
    await this.reply(`请发送需要删除的群聊${listType}，群号间使用,隔开。输入‘全部删除’清空${listType}。`, e.isGroup)
    return false
  }

  async confirmDelGroup (e) {
    if (!this.e.msg) return
    const isAllDeleted = this.e.msg.trim() === '全部删除'
    const groupNumRegex = /^[1-9]\d{8,9}$/
    const inputMatch = this.e.msg.match(/\d+/g)
    const validGroups = Array.isArray(inputMatch) ? inputMatch.filter(groupNum => groupNumRegex.test(groupNum)) : []
    let [groupWhitelist, groupBlacklist] = await this.processList(Config.groupWhitelist, Config.groupBlacklist)
    if (isAllDeleted) {
      Config.groupWhitelist = isWhiteList ? [] : groupWhitelist
      Config.groupBlacklist = !isWhiteList ? [] : groupBlacklist
    } else {
      if (!validGroups.length) {
        await this.reply('无效输入，请在检查群号是否正确后重新输入', e.isGroup)
        return false
      } else {
        for (const element of validGroups) {
          if (isWhiteList) {
            Config.groupWhitelist = groupWhitelist.filter(item => item !== element)
          } else {
            Config.groupBlacklist = groupBlacklist.filter(item => item !== element)
          }
        }
      }
    }
    const listType = isWhiteList ? '白名单' : '黑名单'
    let replyMsg = `群聊${listType}已更新，可通过'#chatgpt查看群聊${listType}'命令查看最新名单`
    if (e.isPrivate) {
      replyMsg += `\n当前群聊${listType}为：${listType === '白名单' ? Config.groupWhitelist : Config.groupBlacklist}`
    }
    await this.reply(replyMsg, e.isGroup)
    this.finish('confirmDelGroup')
  }

  async enablePrivateChat (e) {
    Config.enablePrivateChat = !!e.msg.match(/(允许|打开|同意)/)
    await this.reply('设置成功', e.isGroup)
    return false
  }

  async enableGroupContext (e) {
    const reg = /(关闭|打开)/
    const match = e.msg.match(reg)
    if (match) {
      const action = match[1]
      if (action === '关闭') {
        Config.enableGroupContext = false // 关闭
        await this.reply('已关闭群聊上下文功能', true)
      } else {
        Config.enableGroupContext = true // 打开
        await this.reply('已打开群聊上下文功能', true)
      }
    }
    return false
  }

  async setDefaultReplySetting (e) {
    const reg = /^#chatgpt(打开|关闭|设置)?全局((文本模式|图片模式|语音模式|(语音角色|角色语音|角色).*)|回复帮助)/
    const matchCommand = e.msg.match(reg)
    const settingType = matchCommand[2]
    let replyMsg = ''
    switch (settingType) {
      case '图片模式':
        if (matchCommand[1] === '打开') {
          Config.defaultUsePicture = true
          Config.defaultUseTTS = false
          replyMsg = 'ChatGPT将默认以图片回复'
        } else if (matchCommand[1] === '关闭') {
          Config.defaultUsePicture = false
          if (Config.defaultUseTTS) {
            replyMsg = 'ChatGPT将默认以语音回复'
          } else {
            replyMsg = 'ChatGPT将默认以文本回复'
          }
        } else if (matchCommand[1] === '设置') {
          replyMsg = '请使用“#chatgpt打开全局图片模式”或“#chatgpt关闭全局图片模式”命令来设置回复模式'
        } break
      case '文本模式':
        if (matchCommand[1] === '打开') {
          Config.defaultUsePicture = false
          Config.defaultUseTTS = false
          replyMsg = 'ChatGPT将默认以文本回复'
        } else if (matchCommand[1] === '关闭') {
          if (Config.defaultUseTTS) {
            replyMsg = 'ChatGPT将默认以语音回复'
          } else if (Config.defaultUsePicture) {
            replyMsg = 'ChatGPT将默认以图片回复'
          } else {
            Config.defaultUseTTS = true
            replyMsg = 'ChatGPT将默认以语音回复'
          }
        } else if (matchCommand[1] === '设置') {
          replyMsg = '请使用“#chatgpt打开全局文本模式”或“#chatgpt关闭全局文本模式”命令来设置回复模式'
        } break
      case '语音模式':
        if (!Config.ttsSpace) {
          replyMsg = '您没有配置VITS API，请前往锅巴面板进行配置'
          break
        }
        if (matchCommand[1] === '打开') {
          Config.defaultUseTTS = true
          Config.defaultUsePicture = false
          replyMsg = 'ChatGPT将默认以语音回复'
        } else if (matchCommand[1] === '关闭') {
          Config.defaultUseTTS = false
          if (Config.defaultUsePicture) {
            replyMsg = 'ChatGPT将默认以图片回复'
          } else {
            replyMsg = 'ChatGPT将默认以文本回复'
          }
        } else if (matchCommand[1] === '设置') {
          replyMsg = '请使用“#chatgpt打开全局语音模式”或“#chatgpt关闭全局语音模式”命令来设置回复模式'
        } break
      case '回复帮助':
        replyMsg = '可使用以下命令配置全局回复:\n#chatgpt(打开/关闭)全局(语音/图片/文本)模式\n#chatgpt设置全局(语音角色|角色语音|角色)+角色名称(留空则为随机)'
        break
      default:
        if (!Config.ttsSpace) {
          replyMsg = '您没有配置VITS API，请前往锅巴面板进行配置'
          break
        }
        if (settingType.match(/(语音角色|角色语音|角色)/)) {
          const speaker = matchCommand[2].replace(/(语音角色|角色语音|角色)/, '').trim() || ''
          if (!speaker.length) {
            replyMsg = 'ChatGpt将随机挑选角色回复'
            Config.defaultTTSRole = ''
          } else {
            const ttsRole = convertSpeaker(speaker)
            if (vitsRoleList.includes(ttsRole)) {
              Config.defaultTTSRole = ttsRole
              replyMsg = `ChatGPT默认语音角色已被设置为“${ttsRole}”`
            } else {
              replyMsg = `抱歉，我还不认识“${ttsRole}”这个语音角色`
            }
          }
        } else {
          replyMsg = "无法识别的设置类型\n请使用'#chatgpt全局回复帮助'查看正确命令"
        }
    }
    await this.reply(replyMsg, true)
  }

  async turnOnConfirm (e) {
    await redis.set('CHATGPT:CONFIRM', 'on')
    await this.reply('已开启消息确认', true)
    return false
  }

  async turnOffConfirm (e) {
    await redis.set('CHATGPT:CONFIRM', 'off')
    await this.reply('已关闭消息确认', true)
    return false
  }

  async setAccessToken (e) {
    this.setContext('saveToken')
    await this.reply('请发送ChatGPT AccessToken', true)
    return false
  }

  async setPoeCookie () {
    this.setContext('savePoeToken')
    await this.reply('请发送Poe Cookie', true)
    return false
  }

  async savePoeToken (e) {
    if (!this.e.msg) return
    let token = this.e.msg
    if (!token.startsWith('p-b=')) {
      await this.reply('Poe cookie格式错误', true)
      this.finish('savePoeToken')
      return
    }
    await redis.set('CHATGPT:POE_TOKEN', token)
    await this.reply('Poe cookie设置成功', true)
    this.finish('savePoeToken')
  }

  async setBingAccessToken (e) {
    this.setContext('saveBingToken')
    await this.reply('请发送Bing Cookie Token.("_U" cookie from bing.com)', true)
    return false
  }

  async migrateBingAccessToken () {
    let token = await redis.get('CHATGPT:BING_TOKEN')
    if (token) {
      token = token.split('|')
      token = token.map((item, index) => (
        {
          Token: item,
          State: '正常',
          Usage: 0
        }
      ))
    } else {
      token = []
    }
    let tokens = await redis.get('CHATGPT:BING_TOKENS')
    if (tokens) {
      tokens = JSON.parse(tokens)
    } else {
      tokens = []
    }
    await redis.set('CHATGPT:BING_TOKENS', JSON.stringify([...token, ...tokens]))
    await this.reply('迁移完成', true)
  }

  async getBingAccessToken (e) {
    let tokens = await redis.get('CHATGPT:BING_TOKENS')
    if (tokens) tokens = JSON.parse(tokens)
    else tokens = []
    tokens = tokens.length > 0
      ? tokens.map((item, index) => (
            `【${index}】 Token：${item.Token.substring(0, 5 / 2) + '...' + item.Token.substring(item.Token.length - 5 / 2, item.Token.length)}`
      )).join('\n')
      : '无必应Token记录'
    await this.reply(`${tokens}`, true)
    return false
  }

  async delBingAccessToken (e) {
    this.setContext('deleteBingToken')
    let tokens = await redis.get('CHATGPT:BING_TOKENS')
    if (tokens) tokens = JSON.parse(tokens)
    else tokens = []
    tokens = tokens.length > 0
      ? tokens.map((item, index) => (
            `【${index}】 Token：${item.Token.substring(0, 5 / 2) + '...' + item.Token.substring(item.Token.length - 5 / 2, item.Token.length)}`
      )).join('\n')
      : '无必应Token记录'
    await this.reply(`请发送要删除的token编号\n${tokens}`, true)
    if (tokens.length == 0) this.finish('saveBingToken')
    return false
  }

  async saveBingToken () {
    if (!this.e.msg) return
    let token = this.e.msg
    if (token.length < 100) {
      await this.reply('Bing Token格式错误，请确定获取了有效的_U Cookie或完整的Cookie', true)
      this.finish('saveBingToken')
      return
    }
    let cookie
    if (token?.indexOf('=') > -1) {
      cookie = token
    }
    const bingAIClient = new SydneyAIClient({
      userToken: token, // "_U" cookie from bing.com
      cookie,
      debug: Config.debug
    })
    // 异步就好了，不卡着这个context了
    bingAIClient.createNewConversation().then(async res => {
      if (res.clientId) {
        logger.info('bing token 有效')
      } else {
        logger.error('bing token 无效', res)
        // 移除无效token
        if (await redis.exists('CHATGPT:BING_TOKENS') != 0) {
          let bingToken = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
          const element = bingToken.findIndex(element => element.token === token)
          if (element >= 0) {
            bingToken[element].State = '异常'
            await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingToken))
          }
        }
        await this.reply(`经检测，Bing Token无效。来自Bing的错误提示：${res.result?.message}`)
      }
    })
    let bingToken = []
    if (await redis.exists('CHATGPT:BING_TOKENS') != 0) {
      bingToken = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
      if (!bingToken.some(element => element.token === token)) {
        bingToken.push({
          Token: token,
          State: '正常',
          Usage: 0
        })
      }
    } else {
      bingToken = [{
        Token: token,
        State: '正常',
        Usage: 0
      }]
    }
    await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingToken))
    await this.reply('Bing Token设置成功', true)
    this.finish('saveBingToken')
  }

  async deleteBingToken () {
    if (!this.e.msg) return
    let tokenId = this.e.msg
    if (await redis.exists('CHATGPT:BING_TOKENS') != 0) {
      let bingToken = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
      if (tokenId >= 0 && tokenId < bingToken.length) {
        const removeToken = bingToken[tokenId].Token
        bingToken.splice(tokenId, 1)
        await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingToken))
        await this.reply(`Token ${removeToken.substring(0, 5 / 2) + '...' + removeToken.substring(removeToken.length - 5 / 2, removeToken.length)} 移除成功`, true)
        this.finish('deleteBingToken')
      } else {
        await this.reply('Token编号错误！', true)
        this.finish('deleteBingToken')
      }
    } else {
      await this.reply('Token记录异常', true)
      this.finish('deleteBingToken')
    }
  }

  async saveToken () {
    if (!this.e.msg) return
    let token = this.e.msg
    if (!token.startsWith('ey') || token.length < 20) {
      await this.reply('ChatGPT AccessToken格式错误', true)
      this.finish('saveToken')
      return
    }
    await redis.set('CHATGPT:TOKEN', token)
    await this.reply('ChatGPT AccessToken设置成功', true)
    this.finish('saveToken')
  }

  async useBrowserBasedSolution (e) {
    await redis.set('CHATGPT:USE', 'browser')
    await this.reply('已切换到基于浏览器的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
  }

  async useOpenAIAPIBasedSolution (e) {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'api') {
      await redis.set('CHATGPT:USE', 'api')
      await this.reply('已切换到基于OpenAI API的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
    } else {
      await this.reply('当前已经是API模式了')
    }
  }

  async useChatGLMSolution (e) {
    await redis.set('CHATGPT:USE', 'chatglm')
    await this.reply('已切换到ChatGLM-6B解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
  }

  async useReversedAPIBasedSolution2 (e) {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'api3') {
      await redis.set('CHATGPT:USE', 'api3')
      await this.reply('已切换到基于第三方Reversed Conversastion API(API3)的解决方案')
    } else {
      await this.reply('当前已经是API3模式了')
    }
  }

  async useBingSolution (e) {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'bing') {
      await redis.set('CHATGPT:USE', 'bing')
      await this.reply('已切换到基于微软新必应的解决方案，如果已经对话过务必执行`#结束对话`避免引起404错误')
    } else {
      await this.reply('当前已经是必应Bing模式了')
    }
  }

  async useClaudeBasedSolution (e) {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'poe') {
      await redis.set('CHATGPT:USE', 'poe')
      await this.reply('已切换到基于Quora\'s POE的解决方案')
    } else {
      await this.reply('当前已经是POE模式了')
    }
  }

  async useSlackClaudeBasedSolution () {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'claude') {
      await redis.set('CHATGPT:USE', 'claude')
      await this.reply('已切换到基于slack claude机器人的解决方案')
    } else {
      await this.reply('当前已经是claude模式了')
    }
  }

  async useXinghuoBasedSolution () {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'xh') {
      await redis.set('CHATGPT:USE', 'xh')
      await this.reply('已切换到基于星火的解决方案')
    } else {
      await this.reply('当前已经是星火模式了')
    }
  }

  async changeBingTone (e) {
    let tongStyle = e.msg.replace(/^#chatgpt(必应|Bing)切换/, '')
    if (!tongStyle) {
      return
    }
    let map = {
      精准: 'precise',
      创意: 'creative',
      均衡: 'balanced',
      Sydney: 'Sydney',
      sydney: 'Sydney',
      悉尼: 'Sydney',
      自设定: 'Custom',
      自定义: 'Custom'
    }
    if (map[tongStyle]) {
      Config.toneStyle = map[tongStyle]
      await e.reply('切换成功')
    } else {
      await e.reply('没有这种风格。支持的风格：精准、创意、均衡、悉尼、自设定')
    }
  }

  async bingOpenSuggestedResponses (e) {
    Config.enableSuggestedResponses = e.msg.indexOf('开启') > -1
    await e.reply('操作成功')
  }

  async checkAuth (e) {
    if (!e.isMaster) {
      e.reply(`只有主人才能命令ChatGPT哦~
    (*/ω＼*)`)
      return false
    }
    return true
  }
  async versionChatGPTPlugin (e) {
    await renderUrl(e, `http://127.0.0.1:${Config.serverPort || 3321}/version`, { Viewport: { width: 800, height: 600 } })
  }

  async modeHelp () {
    let mode = await redis.get('CHATGPT:USE')
    const modeMap = {
      browser: '浏览器',
      // apiReverse: 'API2',
      api: 'API',
      bing: '必应',
      api3: 'API3',
      chatglm: 'ChatGLM-6B',
      claude: 'Claude',
      poe: 'Poe'
    }
    let modeText = modeMap[mode || 'api']
    let message = `    API模式和浏览器模式如何选择？

    // eslint-disable-next-line no-irregular-whitespace
    API模式会调用OpenAI官方提供的gpt-3.5-turbo API，只需要提供API Key。一般情况下，该种方式响应速度更快，不会像chatGPT官网一样总出现不可用的现象，但注意gpt-3.5-turbo的API调用是收费的，新用户有18美元试用金可用于支付，价格为$0.0020/ 1K tokens.(问题和回答加起来算token)
   
    API3模式会调用官网反代API，他会帮你绕过CF防护，需要提供ChatGPT的Token。效果与官网和浏览器一致。设置token指令：#chatgpt设置token。

    浏览器模式通过在本地启动Chrome等浏览器模拟用户访问ChatGPT网站，使得获得和官方以及API2模式一模一样的回复质量，同时保证安全性。缺点是本方法对环境要求较高，需要提供桌面环境和一个可用的代理（能够访问ChatGPT的IP地址），且响应速度不如API，而且高峰期容易无法使用。

    必应（Bing）将调用微软新必应接口进行对话。需要在必应网页能够正常使用新必应且设置有效的Bing 登录Cookie方可使用。#chatgpt设置必应token
    
    自建ChatGLM模式会调用自建的ChatGLM-6B服务器API进行对话，需要自建。参考https://github.com/ikechan8370/SimpleChatGLM6BAPI
    
    Claude模式会调用Slack中的Claude机器人进行对话，与其他模式不同的是全局共享一个对话。配置参考https://ikechan8370.com/archives/chatgpt-plugin-for-yunzaipei-zhi-slack-claude
    
    Poe模式会调用Poe中的Claude-instant进行对话。需要提供cookie：#chatgpt设置PoeToken

    您可以使用‘#chatgpt切换浏览器/API/API3/Bing/ChatGLM/Claude/Poe’来切换到指定模式。

    当前为${modeText}模式。
`
    await this.reply(message)
  }

  async shutUp (e) {
    let duration = e.msg.replace(/^#chatgpt(本群)?(群\d+)?(关闭|闭嘴|关机|休眠|下班)/, '')
    let scope
    let time = 3600000
    if (duration === '永久') {
      time = 0
    } else if (duration) {
      time = parseDuration(duration)
    }
    const match = e.msg.match(/#chatgpt群(\d+)?(关闭|闭嘴|关机|休眠|下班)(.*)/)
    if (e.msg.indexOf('本群') > -1) {
      if (e.isGroup) {
        scope = e.group.group_id
        if (await redis.get(`CHATGPT:SHUT_UP:${scope}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${scope}`)
          await redis.set(`CHATGPT:SHUT_UP:${scope}`, '1', { EX: time })
          await e.reply(`好的，已切换休眠状态：倒计时${formatDuration(time)}`)
        } else {
          await redis.set(`CHATGPT:SHUT_UP:${scope}`, '1', { EX: time })
          await e.reply(`好的，已切换休眠状态：倒计时${formatDuration(time)}`)
        }
      } else {
        await e.reply('主人，这里好像不是群哦')
        return false
      }
    } else if (match) {
      const groupId = parseInt(match[1], 10)
      if (Bot.getGroupList().get(groupId)) {
        if (await redis.get(`CHATGPT:SHUT_UP:${groupId}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${groupId}`)
          await redis.set(`CHATGPT:SHUT_UP:${groupId}`, '1', { EX: time })
          await e.reply(`好的，即将在群${groupId}中休眠${formatDuration(time)}`)
        } else {
          await redis.set(`CHATGPT:SHUT_UP:${groupId}`, '1', { EX: time })
          await e.reply(`好的，即将在群${groupId}中休眠${formatDuration(time)}`)
        }
      } else {
        await e.reply('主人还没告诉我群号呢')
        return false
      }
    } else {
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await redis.del('CHATGPT:SHUT_UP:ALL')
        await redis.set('CHATGPT:SHUT_UP:ALL', '1', { EX: time })
        await e.reply(`好的，我会延长休眠时间${formatDuration(time)}`)
      } else {
        await redis.set('CHATGPT:SHUT_UP:ALL', '1', { EX: time })
        await e.reply(`好的，我会延长休眠时间${formatDuration(time)}`)
      }
    }
  }

  async openMouth (e) {
    const match = e.msg.match(/^#chatgpt群(\d+)/)
    if (e.msg.indexOf('本群') > -1) {
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await e.reply('当前为休眠模式，没办法做出回应呢')
        return false
      }
      if (e.isGroup) {
        let scope = e.group.group_id
        if (await redis.get(`CHATGPT:SHUT_UP:${scope}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${scope}`)
          await e.reply('好的主人，我又可以和大家聊天啦')
        } else {
          await e.reply('主人，我已经启动过了哦')
        }
      } else {
        await e.reply('主人，这里好像不是群哦')
        return false
      }
    } else if (match) {
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await e.reply('当前为休眠模式，没办法做出回应呢')
        return false
      }
      const groupId = parseInt(match[1], 10)
      if (Bot.getGroupList().get(groupId)) {
        if (await redis.get(`CHATGPT:SHUT_UP:${groupId}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${groupId}`)
          await e.reply(`好的主人，我终于又可以在群${groupId}和大家聊天了`)
        } else {
          await e.reply(`主人，我在群${groupId}中已经是启动状态了哦`)
        }
      } else {
        await e.reply('主人还没告诉我群号呢')
        return false
      }
    } else {
      let keys = await redis.keys('CHATGPT:SHUT_UP:*')
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await redis.del('CHATGPT:SHUT_UP:ALL')
        for (let i = 0; i < keys.length; i++) {
          await redis.del(keys[i])
        }
        await e.reply('好的，我会开启所有群聊响应')
      } else if (keys || keys.length > 0) {
        for (let i = 0; i < keys.length; i++) {
          await redis.del(keys[i])
        }
        await e.reply('已经开启过全群响应啦')
      } else {
        await e.reply('我没有在任何群休眠哦')
      }
    }
  }

  async listShutUp () {
    let keys = await redis.keys('CHATGPT:SHUT_UP:*')
    if (!keys || keys.length === 0) {
      await this.reply('已经开启过全群响应啦', true)
    } else {
      let list = []
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let groupId = key.replace('CHATGPT:SHUT_UP:', '')
        let ttl = await redis.ttl(key)
        let ttlFormat = formatDuration(ttl)
        list.push({ groupId, ttlFormat })
      }
      await this.reply(list.map(item => item.groupId !== 'ALL' ? `群聊${item.groupId}: ${item.ttlFormat}` : `全局: ${item.ttlFormat}`).join('\n'))
    }
  }

  async setAPIKey (e) {
    this.setContext('saveAPIKey')
    await this.reply('请发送OpenAI API Key.', true)
    return false
  }

  async saveAPIKey () {
    if (!this.e.msg) return
    let token = this.e.msg
    if (!token.startsWith('sk-')) {
      await this.reply('OpenAI API Key格式错误', true)
      this.finish('saveAPIKey')
      return
    }
    // todo
    Config.apiKey = token
    await this.reply('OpenAI API Key设置成功', true)
    this.finish('saveAPIKey')
  }

  async setXinghuoToken () {
    this.setContext('saveXinghuoToken')
    await this.reply('请发送星火的ssoSessionId', true)
    return false
  }

  async saveXinghuoToken () {
    if (!this.e.msg) return
    let token = this.e.msg
    // todo
    Config.xinghuoToken = token
    await this.reply('星火ssoSessionId设置成功', true)
    this.finish('saveXinghuoToken')
  }

  async setAPIPromptPrefix (e) {
    this.setContext('saveAPIPromptPrefix')
    await this.reply('请发送用于API模式的设定', true)
    return false
  }

  async saveAPIPromptPrefix (e) {
    if (!this.e.msg) return
    if (this.e.msg === '取消') {
      await this.reply('已取消设置API设定', true)
      this.finish('saveAPIPromptPrefix')
      return
    }
    // todo
    Config.promptPrefixOverride = this.e.msg
    await this.reply('API模式的设定设置成功', true)
    this.finish('saveAPIPromptPrefix')
  }

  async setBingPromptPrefix (e) {
    this.setContext('saveBingPromptPrefix')
    await this.reply('请发送用于Bing Sydney模式的设定', true)
    return false
  }

  async saveBingPromptPrefix (e) {
    if (!this.e.msg) return
    if (this.e.msg === '取消') {
      await this.reply('已取消设置Sydney设定', true)
      this.finish('saveBingPromptPrefix')
      return
    }
    Config.sydney = this.e.msg
    await this.reply('Bing Sydney模式的设定设置成功', true)
    this.finish('saveBingPromptPrefix')
  }

  async switchDraw (e) {
    if (e.msg.indexOf('开启') > -1) {
      if (Config.enableDraw) {
        await this.reply('当前已经开启chatgpt画图功能', true)
      } else {
        Config.enableDraw = true
        await this.reply('chatgpt画图功能开启成功', true)
      }
    } else {
      if (!Config.enableDraw) {
        await this.reply('当前未开启chatgpt画图功能', true)
      } else {
        Config.enableDraw = false
        await this.reply('chatgpt画图功能关闭成功', true)
      }
    }
  }

  async queryAPIPromptPrefix (e) {
    await this.reply(Config.promptPrefixOverride, true)
  }

  async queryBingPromptPrefix (e) {
    await this.reply(Config.sydney, true)
  }

  async setAdminPassword (e) {
    if (e.isGroup || !e.isPrivate) {
      await this.reply('请私聊发送命令', true)
      return true
    }
    this.setContext('saveAdminPassword')
    await this.reply('请发送系统管理密码', true)
    return false
  }

  async setUserPassword (e) {
    if (e.isGroup || !e.isPrivate) {
      await this.reply('请私聊发送命令', true)
      return true
    }
    this.setContext('saveUserPassword')
    await this.reply('请发送系统用户密码', true)
    return false
  }

  async saveAdminPassword (e) {
    if (!this.e.msg) return
    const passwd = this.e.msg
    await redis.set('CHATGPT:ADMIN_PASSWD', md5(passwd))
    await this.reply('设置成功', true)
    this.finish('saveAdminPassword')
  }

  async saveUserPassword (e) {
    if (!this.e.msg) return
    const passwd = this.e.msg
    const dir = 'resources/ChatGPTCache/user'
    const filename = `${this.e.user_id}.json`
    const filepath = path.join(dir, filename)
    fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(filepath)) {
      fs.readFile(filepath, 'utf8', (err, data) => {
        if (err) {
          console.error(err)
          return
        }
        const config = JSON.parse(data)
        config.passwd = md5(passwd)
        fs.writeFile(filepath, JSON.stringify(config), 'utf8', (err) => {
          if (err) {
            console.error(err)
          }
        })
      })
    } else {
      fs.writeFile(filepath, JSON.stringify({
        user: this.e.user_id,
        passwd: md5(passwd),
        chat: []
      }), 'utf8', (err) => {
        if (err) {
          console.error(err)
        }
      })
    }
    await this.reply('设置完成', true)
    this.finish('saveUserPassword')
  }

  async adminPage (e) {
    if (!Config.groupAdminPage && (e.isGroup || !e.isPrivate)) {
      await this.reply('请私聊发送命令', true)
      return true
    }
    const viewHost = Config.serverHost ? `http://${Config.serverHost}/` : `http://${await getPublicIP()}:${Config.serverPort || 3321}/`
    await this.reply(`请登录${viewHost + 'admin/settings'}进行系统配置`, true)
  }

  async userPage (e) {
    if (!Config.groupAdminPage && (e.isGroup || !e.isPrivate)) {
      await this.reply('请私聊发送命令', true)
      return true
    }
    const viewHost = Config.serverHost ? `http://${Config.serverHost}/` : `http://${await getPublicIP()}:${Config.serverPort || 3321}/`
    await this.reply(`请登录${viewHost + 'admin/dashboard'}进行系统配置`, true)
  }

  async setOpenAIPlatformToken (e) {
    this.setContext('doSetOpenAIPlatformToken')
    await e.reply('请发送refreshToken\n你可以在已登录的platform.openai.com后台界面打开调试窗口，在终端中执行\nJSON.parse(localStorage.getItem(Object.keys(localStorage).filter(k => k.includes(\'auth0\'))[0])).body.refresh_token\n如果仍不能查看余额，请退出登录重新获取刷新令牌')
  }

  async doSetOpenAIPlatformToken () {
    let token = this.e.msg
    if (!token) {
      return false
    }
    Config.OpenAiPlatformRefreshToken = token.replaceAll('\'', '')
    await this.e.reply('设置成功')
    this.finish('doSetOpenAIPlatformToken')
  }
}
