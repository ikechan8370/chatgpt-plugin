import { Configuration, OpenAIApi } from 'openai'
import { Config } from './config.js'
import fs from 'fs'
import { mkdirs } from './common.js'

export async function createImage (prompt, n = 1, size = '512x512') {
  const configuration = new Configuration({
    apiKey: Config.apiKey
  })
  const openai = new OpenAIApi(configuration)
  if (Config.debug) {
    logger.info({ prompt, n, size })
  }
  const response = await openai.createImage({
    prompt,
    n,
    size,
    response_format: 'b64_json'
  })
  return response.data.data?.map(pic => pic.b64_json)
}

export async function imageVariation (imageUrl, n = 1, size = '512x512') {
  const configuration = new Configuration({
    apiKey: Config.apiKey
  })
  const openai = new OpenAIApi(configuration)
  if (Config.debug) {
    logger.info({ imageUrl, n, size })
  }
  const imageResponse = await fetch(imageUrl)
  const fileType = imageResponse.headers.get('Content-Type').split('/')[1]
  let fileLoc = `data/chatgpt/imagesAccept/${Date.now()}.${fileType}`
  mkdirs('data/chatgpt/imagesAccept')
  const blob = await imageResponse.blob()
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFileSync(fileLoc, buffer)

  let croppedFileLoc = `data/chatgpt/imagesAccept/${Date.now()}_cropped.png`
  await resizeAndCropImage(fileLoc, croppedFileLoc, 512)

  const response = await openai.createImageVariation(
    fs.createReadStream(croppedFileLoc),
    n,
    size,
    'b64_json'
  )
  if (response.status !== 200) {
    console.log(response.data.error)
  }
  await fs.unlinkSync(fileLoc)
  await fs.unlinkSync(croppedFileLoc)
  return response.data.data?.map(pic => pic.b64_json)
}

async function resizeAndCropImage (inputFilePath, outputFilePath, size = 512) {
  // Determine the maximum dimension of the input image
  let sharp
  try {
    sharp = await import('sharp')
  } catch (e) {
    logger.error('sharp未安装，请执行 pnpm install sharp@0.31.3')
    throw new Error('sharp未安装，请执行 pnpm install sharp@0.31.3')
  }
  const metadata = await sharp(inputFilePath).metadata()
  const maxDimension = Math.max(metadata.width, metadata.height)
  logger.mark(`original picture size is ${metadata.width} x ${metadata.height}`)
  // Calculate the required dimensions for the output image
  const outputWidth = size * metadata.width / maxDimension
  const outputHeight = size * metadata.height / maxDimension

  // Resize the image to the required dimensions
  await sharp(inputFilePath)
    .resize(outputWidth, outputHeight, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .resize(size, size, { fit: 'cover', position: 'center' })
    .png()
    .toFile(outputFilePath)
  console.log('Image resized successfully!')

  console.log('Image resized and cropped successfully!')
}
