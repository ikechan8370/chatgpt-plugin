import { AbstractTool } from './AbstractTool.js'
import { convertFaces } from '../face.js'
import {getMasterQQ} from '../common.js'
import {Config} from '../config.js'

export class SendMessageToSpecificGroupOrUserTool extends AbstractTool {
  name = 'sendMessage'

  parameters = {
    properties: {
      msg: {
        type: 'string',
        description: 'text to be sent'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'target qq or group number'
      }
    },
    required: ['msg', 'targetGroupIdOrQQNumber']
  }

  func = async function (opt, e) {
    let { msg, sender, targetGroupIdOrQQNumber } = opt
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)

    let groupList
    try {
      groupList = await e.bot.getGroupList()
    } catch (err) {
      groupList = e.bot.gl
    }
    try {
      if ((typeof groupList.get === 'function' && groupList.get(target)) || 
          (Array.isArray(groupList) && groupList.includes(target))) {
        let group = await e.bot.pickGroup(target)
        await group.sendMsg(await convertFaces(msg, true, e))
        return 'msg has been sent to group' + target
      } else {
        let masters = (await getMasterQQ())
        if (!Config.enableToolPrivateSend && !masters.includes(sender + '')) {
          return 'you are not allowed to pm other group members'
        }
        let user = e.bot.pickUser(target)
        if (e.group_id) {
          user = user.asMember(e.group_id)
        }
        // let user = await e.bot.pickFriend(target)
        await user.sendMsg(msg)
        return 'msg has been sent to user' + target
      }
    } catch (err) {
      return `failed to send msg, error: ${JSON.stringify(err)}`
    }
  }

  description = 'Useful when you want to send a text message to specific user or group.  If no extra description needed, just reply <EMPTY> at the next turn'
}