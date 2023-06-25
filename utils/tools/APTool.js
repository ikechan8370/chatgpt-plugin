import { AbstractTool } from './AbstractTool.js'

export class APTool extends AbstractTool {
  name = 'draw'

  parameters = {
    properties: {
      prompt: {
        type: 'string',
        description: 'draw prompt of StableDiffusion, must be in English'
      }
    },
    required: ['prompt']
  }

  description = 'Useful when you want to draw'

  func = async function (opts, e) {
    let { prompt } = opts
    let ap
    try {
      // eslint-disable-next-line camelcase
      let { Ai_Painting } = await import('../../../ap-plugin/apps/aiPainting.js')
      ap = new Ai_Painting(e)
    } catch (err) {
      return 'the user didn\'t install ap-plugin'
    }
    try {
      e.msg = '#绘图' + prompt
      await ap.aiPainting(e)
      return 'draw success!'
    } catch (err) {
      return 'draw failed due to unknown error'
    }
  }
}
