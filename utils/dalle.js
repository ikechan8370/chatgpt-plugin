import { Configuration, OpenAIApi } from 'openai'
import { Config } from './config.js'

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
