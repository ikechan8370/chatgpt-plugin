import { AbstractTool } from './AbstractTool.js'

export class EliMusicTool extends AbstractTool {
  name = 'musicTool'

  parameters = {
    properties: {
      keyword: {
        type: 'string',
        description: 'Not necessarily a songName, it can be some descriptive words, but does not include the singer\'s name! can be left blank!'
      },
      singer: {
        type: 'string',
        description: 'Singer name, multiple singers are separated by \',\'! can be left blank!'
      },
      isRandom: {
        type: 'boolean',
        description: 'Whether to randomly select songs, default is false'
      },
      isRandom2: {
        type: 'boolean',
        description: 'when isRandom is true and neither singer nor songName is specified!!!, this value is true; otherwise, it is false. The default value is false.'
      },
      isHot: {
        type: 'boolean',
        description: 'Whether it\'s related to \'hot\', consider filling in this item when there is no song name, can be left blank'
      },
      singerRegion: {
        type: 'string',
        description: 'Whether it\'s related to \'hot\', consider filling in this item when there is no song name, can be left blank'
      },
      isRelax: {
        type: 'boolean',
        description: 'Fill in when the user wants to sleep or rest, leave others blank when filling in this item, default is false'
      }
    },
    required: ['keyword', 'singer', 'isRandom', 'singerRegion, isRelax', 'isRandom2']
  }

  description = 'It is very useful when you want to meet the music needs or of users or when users want to sleep or unwind., so you should use this tool as much as possible, regardless of whether I asked you before!'

  func = async function (opts, e) {
    let { keyword, singer, isRandom, isHot, singerRegion, isRelax, isRandom2 } = opts
    let avocado
    try {
      let { AvocadoMusic } = await import('../../../avocado-plugin/apps/avocadoMusic.js')
      avocado = new AvocadoMusic(e)
    } catch (err) {
      return 'the user didn\'t install avocado-plugin. suggest him to install'
    }
    try {
      // 不听话的gpt
      isRandom2 = !keyword && isRandom && !isRandom2 && !singer
      if (isRandom2) {
        try {
          singer = await redis.get(`AVOCADO:MUSIC_${e.sender.user_id}_FAVSINGER`)
          if (!singer) throw new Error('no favorite singer')
          singer = JSON.parse(singer).singer
          logger.warn(singer)
        } catch (err) {
          return 'the user didn\'t set a favorite singer. Suggest setting it through the command \'#设置歌手+歌手名称\'!'
        }
        e.msg = '#鳄梨酱#随机' + singer
      } else if (isRelax) {
        e.msg = '#鳄梨酱#随机放松'
      } else if (singerRegion) {
        e.msg = '#鳄梨酱#' + (isRandom ? '随机' : '') + (isHot ? '热门' : '') + singerRegion + '歌手'
      } else {
        e.msg = '#鳄梨酱#' + (isRandom ? '随机' : '') + (isHot ? '热门' : '') + (singer ? singer + (keyword ? ',' + keyword : '') : keyword)
      }

      logger.warn(e.msg)
      await avocado.pickMusic(e)
      if (isRandom2) {
        return 'tell the user that a random song by his favorite artist has been sent to him! you don\'t need to find other info!'
      } else {
        return 'tell user that the response of his request has been sent to the user! you don\'t need to find other info!'
      }
    } catch (e) {
      return `music share failed: ${e}`
    }
  }
}
