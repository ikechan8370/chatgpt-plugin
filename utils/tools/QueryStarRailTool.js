import { AbstractTool } from './AbstractTool.js'

export class QueryStarRailTool extends AbstractTool {
  name = 'queryStarRail'

  parameters = {
    properties: {
      qq: {
        type: 'string',
        description: '要查询的用户的qq号，将使用该qq号绑定的uid进行查询，默认为当前聊天对象'
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
    required: []
  }

  func = async function (opts, e) {
    let { qq, uid, character } = opts
    if (e.at === Bot.uin) {
      e.at = null
    }
    e.atBot = false

    if (!uid) {
      try {
        let { Panel } = await import('../../../StarRail-plugin/apps/panel.js')
        uid = await redis.get(`STAR_RAILWAY:UID:${qq}`)
        if (!uid) {
          return '用户没有绑定uid，无法查询。可以让用户主动提供uid进行查询'
        }
      } catch (e) {
        // todo support miao-plugin and sruid
        return '未安装StarRail-Plugin，无法查询'
      }
    }
    try {
      let { Panel } = await import('../../../StarRail-plugin/apps/panel.js')
      e.msg = character ? `*${character}面板${uid}` : '*更新面板' + uid
      e.user_id = qq
      e.isSr = true
      let panel = new Panel(e)
      panel.e = e
      panel.panel(e).catch(e => logger.warn(e))
      let uidRes = await fetch('https://avocado.wiki/v1/info/' + uid)
      uidRes = await uidRes.json()
      let { assistAvatar, displayAvatars } = uidRes.playerDetailInfo
      function dealAvatar (avatar) {
        delete avatar.position
        delete avatar.vo_tag
        delete avatar.desc
        delete avatar.promption
        delete avatar.relics
        delete avatar.behaviorList
        delete avatar.images
        delete avatar.ranks
        if (avatar.equipment) {
          avatar.equipment = {
            level: avatar.equipment.level,
            rank: avatar.equipment.rank,
            name: avatar.equipment.name,
            skill_desc: avatar.equipment.skill_desc
          }
        }
      }
      dealAvatar(assistAvatar)
      if (displayAvatars) {
        displayAvatars.forEach(avatar => {
          dealAvatar(avatar)
        })
      }
      uidRes.playerDetailInfo.assistAvatar = assistAvatar
      uidRes.playerDetailInfo.displayAvatars = displayAvatars
      delete uidRes.repository
      delete uidRes.version
      return `the player info in json format is: \n${JSON.stringify(uidRes)}`
    } catch (err) {
      return `failed to query, error: ${err.toString()}`
    }
  }

  description = 'Useful when you want to query player information of Honkai Star Rail(崩坏：星穹铁道). '
}
