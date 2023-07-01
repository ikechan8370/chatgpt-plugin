import { AbstractTool } from './AbstractTool.js'

export class EliMusicTool extends AbstractTool {
  name = 'musicTool'

  parameters = {
    properties: {
      keywordOrSongName: {
        type: 'string',
        description: 'Not necessarily a songName, it can be some descriptive word.'
      },
      singer: {
        type: 'string',
        description: 'Singer name, multiple singers are separated by \',\'!'
      },
      isRandom: {
        type: 'boolean',
        description: 'Whether to randomly select songs, default is false'
      },
      isHot: {
        type: 'boolean',
        description: 'Whether it\'s related to \'hot\', fill in this item when there is no keywordOrSongName'
      },
      singerTypeOrRegion: {
        type: 'string',
        description: 'Choose from [华语|中国|欧美|韩国|日本] when seeking the latest ranking of popular vocalists.'
      },
      isRelax: {
        type: 'boolean',
        description: 'Complete whenever you wish to discover the renowned vocalist in a particular locale.'
      }
    },
    required: ['keywordOrSongName', 'singer', 'isRandom', 'singerTypeOrRegion, isRelax']
  }

  description = 'It is very useful when you want to meet the music needs of user or when user want to sleep or unwind(give him a relax music).'

  func = async function (opts, e) {
    let { keywordOrSongName, singer, isRandom, isHot, singerTypeOrRegion, isRelax } = opts
    let avocado
    try {
      let { AvocadoMusic } = await import('../../../avocado-plugin/apps/avocadoMusic.js')
      avocado = new AvocadoMusic(e)
    } catch (err) {
      return 'the user didn\'t install avocado-plugin. suggest him to install'
    }
    try {
      const isRandom2 = !keywordOrSongName && isRandom && !singer
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
        const arr = ['安静', '放松', '宁静', '白噪音']
        e.msg = `#鳄梨酱#随机${arr[Math.floor(Math.random() * arr.length)]}`
      } else if (singerTypeOrRegion) {
        if (['华语', '中国', '欧美', '韩国', '日本'].includes(singerTypeOrRegion)) {
          e.msg = '#鳄梨酱#' + (isRandom ? '随机' : '') + (!keywordOrSongName && isHot ? '热门' : '') + singerTypeOrRegion + '歌手'
        }
        return
      } else {
        e.msg = '#鳄梨酱#' + (isRandom ? '随机' : '') + (!keywordOrSongName && isHot ? '热门' : '') + (singer ? singer + (keywordOrSongName ? ',' + keywordOrSongName : '') : keywordOrSongName)
      }
      e.senderFromChatGpt = e.sender.user_id
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
