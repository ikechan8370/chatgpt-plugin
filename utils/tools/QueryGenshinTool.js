import { AbstractTool } from './AbstractTool.js'

export class QueryGenshinTool extends AbstractTool {
  name = 'queryGenshin'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '要查询的用户的qq号，将使用该qq号绑定的uid进行查询'
      },
      uid: {
        type: 'string',
        description: '游戏的uid，如果用户提供了则传入并优先使用'
      },
      character: {
        type: 'string',
        description: '游戏角色名'
      }
    },
    required: ['qq']
  }

  func = async function (opts, e) {
    let { qq, uid, character = '' } = opts
    if (e.at === Bot.uin) {
      e.at = null
    }
    e.atBot = false
    try {
      let ProfileList = (await import('../../../miao-plugin/apps/profile/ProfileList.js')).default
      e.msg = `#${character}面板${uid}`
      e.user_id = qq
      e.isSr = false
      await ProfileList.render(e)
      return 'the player panel of genshin impact has been sent to group'
    } catch (err) {
      return `failed to query, error: ${err.toString()}`
    }
  }

  description = 'Useful when you want to query player information of Genshin Impact(原神). '
}
