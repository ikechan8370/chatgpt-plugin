import { AbstractTool } from './AbstractTool.js'

export class EliMusicTool extends AbstractTool {
  name = 'musicTool'

  parameters = {
    properties: {
      keywordOrSongName: {
        type: 'string',
        description: 'Not necessarily a songName, it can be some descriptive words.'
      },
      singer: {
        type: 'string',
        description: 'Singer name, multiple singers are separated by \',\'!'
      },
      isRandom: {
        type: 'boolean',
        description: 'true when randomly select songs'
      },
      isHot: {
        type: 'boolean',
        description: 'true when user\'s needs related to \'hot\''
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
    let avocado, songDetail, musicUtils
    try {
      let { AvocadoMusic } = await import('../../../avocado-plugin/apps/avocadoMusic.js')
      musicUtils = await import('../../../avocado-plugin/utils/music.js')
      avocado = new AvocadoMusic(e)
    } catch (err) {
      return 'the user didn\'t install avocado-plugin. suggest him to install'
    }
    try {
      // 条件成立则随机播放最爱歌手的音乐
      const orderFavSinger = !keywordOrSongName && isRandom && !singer

      if (orderFavSinger) { // 随机播放最爱歌手的音乐, 需要通过指令设置
        try {
          singer = await redis.get(`AVOCADO:MUSIC_${e.sender.user_id}_FAVSINGER`)
          if (!singer) throw new Error('no favorite singer')
          singer = JSON.parse(singer).singerName
        } catch (err) {
          return 'the user didn\'t set a favorite singer. Suggest setting it through the command \'#设置歌手+歌手名称\'!'
        }
        e.msg = '#鳄梨酱音乐#随机' + singer
      } else if (isRelax) { // 随机发送放松音乐
        const arr = ['安静', '放松', '宁静', '白噪音']
        e.msg = `#鳄梨酱音乐#随机${arr[Math.floor(Math.random() * arr.length)]}`
      } else if (singerTypeOrRegion) { // 查看热门歌手榜单
        if (['华语', '中国', '欧美', '韩国', '日本'].includes(singerTypeOrRegion)) {
          e.msg = '#鳄梨酱音乐#' + (isRandom ? '随机' : '') + (!keywordOrSongName && isHot ? '热门' : '') + singerTypeOrRegion + '歌手'
        }
      } else { // 正常点歌
        if (singer && keywordOrSongName) {
          isRandom = false // 有时候ai会随意设置这个参数,降低权重
          songDetail = await musicUtils.getOrderSongList(e.sender.user_id, singer + ',' + keywordOrSongName, 1)
        }
        e.msg = '#鳄梨酱音乐#' + (isRandom ? '随机' : '') + (!keywordOrSongName && isHot ? '热门' : '') + (singer ? singer + (keywordOrSongName ? ',' + keywordOrSongName : '') : keywordOrSongName)
      }
      await avocado.pickMusic(e)
      if (orderFavSinger) {
        return 'tell the user that a random song by his favorite artist has been sent to him!'
      } else {
        return 'tell user that the response of his request has been sent to the him!' +
            (songDetail
              ? 'song detail is: ' + JSON.stringify(songDetail) + ' and send album picture to user'
              : ''
            )
      }
    } catch (e) {
      return `music share failed: ${e}`
    }
  }
}
