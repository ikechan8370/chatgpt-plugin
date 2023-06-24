import { AbstractTool } from './AbstractTool.js'
import fetch, { File, FormData } from 'node-fetch'
import { Config } from '../config.js'
import fs from 'fs'
import crypto from 'crypto'
export class ImageCaptionTool extends AbstractTool {
  name = 'imageCaption'

  parameters = {
    properties: {
      imgUrl: {
        type: 'string',
        description: 'the url of the image.'
      },
      qq: {
        type: 'string',
        description: 'if the picture is an avatar of a user, just give his qq number'
      }
    },
    required: []
  }

  description = 'useful when you want to know what is inside a picture, such as user\'s avatar'

  func = async function (opts) {
    let { imgUrl, qq } = opts
    if (qq) {
      imgUrl = `https://q1.qlogo.cn/g?b=qq&s=160&nk=${qq}`
    }
    if (!imgUrl) {
      return 'you must give at least one parameter of imgUrl and qq'
    }
    const imageResponse = await fetch(imgUrl)
    const blob = await imageResponse.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    // await fs.writeFileSync(`data/chatgpt/${crypto.randomUUID()}`, buffer)
    let formData = new FormData()
    formData.append('file', new File([buffer], 'file.png', { type: 'image/png' }))
    let captionRes = await fetch(`${Config.extraUrl}/image-captioning`, {
      method: 'POST',
      body: formData
    })
    if (captionRes.status === 200) {
      let result = await captionRes.text()
      return `the content of this picture is: ${result}`
    } else {
      return 'error happened'
    }
  }
}
