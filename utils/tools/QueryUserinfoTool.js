import { AbstractTool } from './AbstractTool.js'
import { getMasterQQ } from '../common.js'

export class QueryUserinfoTool extends AbstractTool {
  name = 'queryUserinfo'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: 'user\'s qq number, the one you are talking to by default'
      }
    },
    required: []
  }

  func = async function (opts, e) {
    try {
      let { qq } = opts
      qq = isNaN(qq) || !qq ? e.sender.user_id : parseInt(qq.trim())
      if (e.isGroup && typeof e.bot.getGroupMemberInfo === 'function') {
        let user = await e.bot.getGroupMemberInfo(e.group_id, qq || e.sender.user_id, true)
        // let mm = await e.group.getMemberMap()
        // let user = mm.get(qq) || e.sender.user_id
        let master = (await getMasterQQ())[0]
        let prefix = ''
        if (qq != master) {
          prefix = 'Attention: this user is not your master. \n'
        } else {
          prefix = 'This user is your master, you should obey him \n'
        }
        if (!user) {
          return prefix
        }
        return prefix + 'user detail in json format: ' + JSON.stringify(user)
      } else {
        if (e.sender.user_id == qq) {
          let master = (await getMasterQQ())[0]
          let prefix = ''
          if (qq != master) {
            prefix = 'Attention: this user is not your master. \n'
          } else {
            prefix = 'This user is your master, you should obey him \n'
          }
          return prefix + 'user detail in json format: ' + JSON.stringify(e.sender)
        } else {
          return 'query failed'
        }
      }
    } catch (err) {
      logger.warn(err)
      return err.message
    }
  }

  description = 'Useful if you want to find out who he is'
}
