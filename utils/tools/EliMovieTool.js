import { AbstractTool } from './AbstractTool.js'

export class EliMovieTool extends AbstractTool {
  name = 'currentHotMovies'

  parameters = {
    properties: {
      yesOrNo: {
        type: 'string',
        description: 'check or not'
      }
    },
    required: ['yesOrNo']
  }

  description = 'Useful when you want to check out the current hot movies'

  func = async function (opts, e) {
    let { yesOrNo } = opts
    if (yesOrNo === 'no') {
      return 'tell user why you don\'t want to check'
    }
    if (e.at === Bot.uin) {
      e.at = null
    }
    e.atBot = false
    let avocado
    try {
    // eslint-disable-next-line camelcase
      let { AvocadoMovie } = await import('../../../avocado-plugin/apps/avocadoMovie.js')
      avocado = new AvocadoMovie(e)
    } catch (err1) {
      return 'the user didn\'t install avocado-plugin. suggest him to install'
    }
    try {
      // eslint-disable-next-line new-cap
      await avocado.getHotMovies(e)
      return 'notify the user that the movie has been sent to them and they can obtain more information by sending commands displayed in the picture. you don’t need to search for additional information to reply! just simply inform them that you have completed your task!!!'
    } catch (err) {
      logger.warn(err)
      return 'failed due to unknown error'
    }
  }
}
