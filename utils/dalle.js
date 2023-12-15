import { Configuration, OpenAIApi } from 'openai'
import { Config, defaultOpenAIAPI, defaultOpenAIReverseProxy } from './config.js'
import fs from 'fs'
import { isCN, mkdirs } from './common.js'
import { getProxy } from './proxy.js'
let proxy = getProxy()
export async function createImage (prompt, n = 1, size = '512x512') {
  let basePath = Config.openAiBaseUrl
  if (Config.openAiBaseUrl && Config.proxy && !Config.openAiForceUseReverse) {
    // 如果配了proxy，而且有反代，但是没开启强制反代
    basePath = defaultOpenAIReverseProxy
  }
  if (!Config.openAiBaseUrl) {
    basePath = await isCN() ? defaultOpenAIReverseProxy : defaultOpenAIAPI
  }
  const configuration = new Configuration({
    apiKey: Config.apiKey,
    basePath
  })
  const openai = new OpenAIApi(configuration)
  if (Config.debug) {
    logger.info({ prompt, n, size })
  }
  let proxyFn = proxy
  const response = await openai.createImage({
    prompt,
    n,
    size,
    response_format: 'b64_json'
  }, {
    httpsAgent: Config.proxy ? proxyFn(Config.proxy) : null
  })
  return response.data.data?.map(pic => pic.b64_json)
}

export async function imageVariation (imageUrl, n = 1, size = '512x512') {
  let basePath = Config.openAiBaseUrl
  if (Config.openAiBaseUrl && Config.proxy && !Config.openAiForceUseReverse) {
    // 如果配了proxy，而且有反代，但是没开启强制反代
    basePath = defaultOpenAIReverseProxy
  }
  if (!Config.openAiBaseUrl) {
    basePath = await isCN() ? defaultOpenAIReverseProxy : defaultOpenAIAPI
  }
  const configuration = new Configuration({
    apiKey: Config.apiKey,
    basePath
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
  let proxyFn = getProxy()
  const response = await openai.createImageVariation(
    fs.createReadStream(croppedFileLoc),
    n,
    size,
    'b64_json',
    '',
    {
      httpsAgent: Config.proxy ? proxyFn(Config.proxy) : null
    }
  )
  if (response.status !== 200) {
    console.log(response.data.error)
  }
  await fs.unlinkSync(fileLoc)
  await fs.unlinkSync(croppedFileLoc)
  return response.data.data?.map(pic => pic.b64_json)
}

export async function resizeAndCropImage (inputFilePath, outputFilePath, size = 512) {
  // Determine the maximum dimension of the input image
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch (e) {
    logger.error('sharp未安装，请执行 pnpm install sharp@0.31.3')
    throw new Error('sharp未安装，请执行 pnpm install sharp@0.31.3')
  }
  const metadata = await sharp(inputFilePath).metadata()
  const maxDimension = Math.max(metadata.width, metadata.height)
  logger.mark(`original picture size is ${metadata.width} x ${metadata.height}`)
  // Calculate the required dimensions for the output image
  const outputWidth = Math.round(size * metadata.width / maxDimension)
  const outputHeight = Math.round(size * metadata.height / maxDimension)

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

export async function editImage (originalImage, mask = [], prompt, num = 1, size = '512x512') {
  let basePath = Config.openAiBaseUrl
  if (Config.openAiBaseUrl && Config.proxy && !Config.openAiForceUseReverse) {
    // 如果配了proxy，而且有反代，但是没开启强制反代
    basePath = defaultOpenAIReverseProxy
  }
  if (!Config.openAiBaseUrl) {
    basePath = await isCN() ? defaultOpenAIReverseProxy : defaultOpenAIAPI
  }
  const configuration = new Configuration({
    apiKey: Config.apiKey,
    basePath
  })
  const openai = new OpenAIApi(configuration)
  if (Config.debug) {
    logger.info({ originalImage, mask, num, size })
  }
  const imageResponse = await fetch(originalImage)
  const fileType = imageResponse.headers.get('Content-Type').split('/')[1]
  let fileLoc = `data/chatgpt/imagesAccept/${Date.now()}.${fileType}`
  mkdirs('data/chatgpt/imagesAccept')
  const blob = await imageResponse.blob()
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFileSync(fileLoc, buffer)
  let proxyFn = getProxy()
  let croppedFileLoc = `data/chatgpt/imagesAccept/${Date.now()}_cropped.png`
  await resizeAndCropImage(fileLoc, croppedFileLoc, 512)
  let maskFileLoc = await createMask(croppedFileLoc, mask)
  let response = await openai.createImageEdit(
    fs.createReadStream(croppedFileLoc),
    prompt, fs.createReadStream(maskFileLoc),
    num,
    size,
    'b64_json',
    '',
    {
      httpsAgent: Config.proxy ? proxyFn(Config.proxy) : null
    }
  )
  if (response.status !== 200) {
    console.log(response.data.error)
  }
  await fs.unlinkSync(fileLoc)
  await fs.unlinkSync(croppedFileLoc)
  await fs.unlinkSync(maskFileLoc)
  return response.data.data?.map(pic => pic.b64_json)
}

async function createMask (inputFilePath, mask = []) {
  let sharp, Jimp
  try {
    sharp = (await import('sharp')).default
  } catch (e) {
    logger.error('sharp未安装，请执行 pnpm install sharp@0.31.3')
    throw new Error('sharp未安装，请执行 pnpm install sharp@0.31.3')
  }
  try {
    Jimp = (await import('jimp')).default
  } catch (e) {
    logger.error('jimp未安装，请执行 pnpm install jimp')
    throw new Error('jimp未安装，请执行 pnpm install jimp')
  }
  let image = await sharp(inputFilePath)
    .png()
    .ensureAlpha()
    .toBuffer()
    .then(inputData => {
      // Load the PNG input data with Jimp
      return Jimp.read(inputData)
    })
  let [x, y, width, height] = mask
  // Set the transparency for a specified rectangular area
  image.scan(x, y, width, height, function (x, y, idx) {
    this.bitmap.data[idx + 3] = 0 // set alpha to 0 to make transparent
  })

  // Write the modified PNG data to a new file
  const outputFilePath = `data/chatgpt/imagesAccept/${Date.now()}_masked.png`
  await image.writeAsync(outputFilePath)
  return outputFilePath
}
