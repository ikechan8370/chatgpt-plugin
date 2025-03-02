import { Config } from '../utils/config.js'
import { getChatHistoryGroup } from '../utils/chat.js'
import { convertFaces } from '../utils/face.js'
import { customSplitRegex, filterResponseChunk } from '../utils/text.js'
import core, { roleMap } from '../model/core.js'
import { formatDate } from '../utils/common.js'

export class bym extends plugin {
  constructor () {
    super({
      name: 'ChatGPT-Plugin 伪人bym',
      dsc: 'bym',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^[^#][sS]*',
          fnc: 'bym',
          priority: '-1000000',
          log: false
        }
      ]
    })
  }

  /** 复读 */
  async bym (e) {
    if (!Config.enableBYM) {
      return false
    }

    // 伪人禁用群
    if (Config.bymDisableGroup?.includes(e.group_id?.toString())) {
      return false
    }

    let prop = this._genProp()
    if (Config.assistantLabel && e.msg?.includes(Config.assistantLabel)) {
      prop = -1
    }

    if (prop < Config.bymRate) {
      logger.info('random chat hit')

      await this._handleReply(e)

    }
    return false
  }

  async _handleReply(e) {

    if(Config.bymContinue){
      const delay = Config.bymContinueDelay || 10
      this.setContext("_handleContinue", false, delay, "")
    }

    let sender = e.sender.user_id
    let card = e.sender.card || e.sender.nickname
    let group = e.group_id

    let fuck = false
    let candidate = Config.bymPreset
    if (Config.bymFuckList?.find(i => e.msg?.includes(i))) {
      fuck = true
      candidate = candidate + Config.bymFuckPrompt
    }

    let system = `你的名字是“${Config.assistantLabel}”，你在一个qq群里，群号是${group},当前和你说话的人群名片是${card}, qq号是${sender}, 请你结合用户的发言和聊天记录作出回应，要求表现得随性一点，最好参与讨论，混入其中。不要过分插科打诨，不知道说什么可以复读群友的话。要求你做搜索、发图、发视频和音乐等操作时要使用工具。不可以直接发[图片]这样蒙混过关。要求优先使用中文进行对话。如果此时不需要自己说话，可以只回复<EMPTY>` +
    candidate +
    `\n你的回复应该尽可能简练，像人类一样随意，不要附加任何奇怪的东西，如聊天记录的格式（比如${Config.assistantLabel}：），禁止重复聊天记录。`

    let rsp = await core.sendMessage(e.msg, {}, Config.bymMode, e, {
      enableSmart: Config.smartMode,
      system: {
        api: system,
        qwen: system,
        bing: system,
        claude: system,
        claude2: system,
        gemini: system,
        xh: system
      },
      settings: {
        replyPureTextCallback: msg => {
          msg = filterResponseChunk(msg)
          msg && e.reply(msg)
        },
        // 强制打开上下文，不然伪人笨死了
        enableGroupContext: true
      }
    })
    // let rsp = await client.sendMessage(e.msg, opt)
    let text = rsp.text
    let texts = customSplitRegex(text, /(?<!\?)[。？\n](?!\?)/, 3)
    // let texts = text.split(/(?<!\?)[。？\n](?!\?)/, 3)
    for (let [index, t] of texts.entries()) {
      if (!t) {
        continue
      }
      t = t.trim()
      if (text[text.indexOf(t) + t.length] === '？') {
        t += '？'
      }
      let finalMsg = await convertFaces(t, true, e)
      logger.info(JSON.stringify(finalMsg))
      finalMsg = finalMsg.map(filterResponseChunk).filter(i => !!i)
      if (finalMsg && finalMsg.length > 0) {
        if(index !== 0) await new Promise((resolve) => {
          setTimeout(() => {
            resolve()
          }, Math.min(t.length * 200, 3000))
        })
        await this.reply(finalMsg, (this._genProp() < 10) , {
          recallMsg: fuck ? 10 : 0
        })
      }
    }


  }

  _genProp() {
    return Math.floor(Math.random() * 100)
  }

  async _handleContinue(e) {
    logger.mark("bym继续对话")
    this.finish("_handleContinue", e.isGroup)
    await this._handleReply(e)
  }
}
