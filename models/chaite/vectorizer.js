import { Chaite, ChaiteContext, GeminiClient, OpenAIClient } from 'chaite'

async function getIClientByChannel (channel) {
  await channel.ready()
  const baseLogger = global.logger || console
  if (channel.options?.setLogger) {
    channel.options.setLogger(baseLogger)
  }
  const context = new ChaiteContext(baseLogger)
  context.setChaite(Chaite.getInstance())
  switch (channel.adapterType) {
    case 'openai':
      return new OpenAIClient(channel.options, context)
    case 'gemini':
      return new GeminiClient(channel.options, context)
    case 'claude':
      throw new Error('claude does not support embedding')
    default:
      throw new Error(`Unsupported adapter ${channel.adapterType}`)
  }
}

async function resolveChannelForModel (model) {
  const manager = Chaite.getInstance().getChannelsManager()
  const channels = await manager.getChannelByModel(model)
  if (channels.length === 0) {
    throw new Error('No channel found for model: ' + model)
  }
  return channels[0]
}

export async function getClientForModel (model) {
  const channel = await resolveChannelForModel(model)
  const client = await getIClientByChannel(channel)
  return { client, channel }
}

/**
 * 创建一个基于Chaite渠道的向量器
 * @param {string} model
 * @param {number} dimensions
 * @returns {{ textToVector: (text: string) => Promise<number[]>, batchTextToVector: (texts: string[]) => Promise<number[][]> }}
 */
export function createChaiteVectorizer (model, dimensions) {
  return {
    async textToVector (text) {
      const { client } = await getClientForModel(model)
      const options = { model }
      if (Number.isFinite(dimensions) && dimensions > 0) {
        options.dimensions = dimensions
      }
      const result = await client.getEmbedding(text, options)
      return result.embeddings[0]
    },
    async batchTextToVector (texts) {
      const manager = Chaite.getInstance().getChannelsManager()
      const channels = await manager.getChannelsByModel(model, texts.length)
      if (channels.length === 0) {
        throw new Error('No channel found for model: ' + model)
      }
      const clients = await Promise.all(channels.map(({ channel }) => getIClientByChannel(channel)))
      const results = []
      let startIndex = 0
      for (let i = 0; i < channels.length; i++) {
        const { quantity } = channels[i]
        const slice = texts.slice(startIndex, startIndex + quantity)
        const options = { model }
        if (Number.isFinite(dimensions) && dimensions > 0) {
          options.dimensions = dimensions
        }
        const embeddings = await clients[i].getEmbedding(slice, options)
        results.push(...embeddings.embeddings)
        startIndex += quantity
      }
      return results
    }
  }
}

export async function embedTexts (texts, model, dimensions) {
  if (!texts || texts.length === 0) {
    return []
  }
  const vectorizer = createChaiteVectorizer(model, dimensions)
  if (texts.length === 1) {
    return [await vectorizer.textToVector(texts[0])]
  }
  return await vectorizer.batchTextToVector(texts)
}
