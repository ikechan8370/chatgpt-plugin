import { AbstractTool } from './AbstractTool.js'
import fetch, { File, FormData } from 'node-fetch'
import { Config } from '../config.js'
export class ProcessPictureTool extends AbstractTool {
  name = 'processPicture'

  parameters = {
    properties: {
      type: {
        type: 'string',
        enum: ['Image2Hed', 'Image2Scribble'],
        description: 'how to process it. Image2Hed: useful when you want to detect the soft hed boundary of the image; Image2Scribble: useful when you want to generate a scribble of the image'
      },
      qq: {
        type: 'string',
        description: 'if the picture is avatar of a user, input his qq number'
      },
      url: {
        type: 'string',
        description: 'url of the picture'
      }
    },
    required: ['type']
  }

  description = 'useful when you want to know what is inside a photo, such as user\'s avatar or other pictures'

  func = async function (opts) {
    let { url, qq, type } = opts
    if (qq) {
      url = `https://q1.qlogo.cn/g?b=qq&s=160&nk=${qq}`
    }
    if (!url) {
      return 'you must give at least one parameter of url and qq'
    }
    const imageResponse = await fetch(url)
    const blob = await imageResponse.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    // await fs.writeFileSync(`data/chatgpt/${crypto.randomUUID()}`, buffer)
    let formData = new FormData()
    formData.append('file', new File([buffer], 'file.png', { type: 'image/png' }))
    let endpoint = 'image2hed'
    switch (type) {
      case 'Image2Scribble': {
        endpoint = 'image2Scribble'
        break
      }
      case 'Image2Hed': {
        endpoint = 'image2hed'
        break
      }
    }
    let captionRes = await fetch(`${Config.extraUrl}/${endpoint}`, {
      method: 'POST',
      body: formData
    })
    if (captionRes.status === 200) {
      let result = await captionRes.text()
      return `the processed image url is ${Config.extraUrl}${result}`
    } else {
      return 'error happened'
    }
  }
}
