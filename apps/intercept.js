import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { formatDate } from '../utils/common.js'

export class intercepter extends plugin {
  constructor () {
    super({
      /** 功能名称 */
      name: 'ChatGPT-Plugin 监听群聊对话',
      /** 功能描述 */
      dsc: 'ChatGPT-Plugin 监听群聊对话，以便了解上下文',
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 1,
      rule: [
        {
          /** 学习群友聊天 **/
          reg: '^[^#][sS]*',
          fnc: 'recordChat',
          log: false
        }
      ]
    })
  }

  async recordChat (e) {
    // let gl = await this.e.group.getMemberMap()
    if (!e.raw_message) {
      if (e.img && e.img.length > 0) {
        e.msg = '[图片]'
      }
    }
    if (e.isGroup && e.raw_message) {
      const chat = {
        sender: e.sender.card,
        senderId: e.sender.user_id,
        senderSex: e.sender.sex,
        msg: e.raw_message,
        role: e.sender.role,
        area: e.sender.area,
        age: e.sender.age,
        time: formatDate(new Date())
      }
      // console.log(chat)
      await redis.rPush('CHATGPT:LATEST_CHAT_RECORD:' + e.group_id, JSON.stringify(chat))
      if (await redis.lLen('CHATGPT:LATEST_CHAT_RECORD:' + e.group_id) > Config.groupContextLength) {
        await redis.lPop('CHATGPT:LATEST_CHAT_RECORD:' + e.group_id)
      }
    }
    return false
  }
}
