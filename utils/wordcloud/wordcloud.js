import Tokenizer from './tokenizer.js'
import { render } from '../common.js'

export async function makeWordcloud (e, groupId, duration = 0, userId) {
  let tokenizer = getTokenizer(e)
  let topK = await tokenizer.getKeywordTopK(e, groupId, 100, duration, userId)
  let list = JSON.stringify(topK)
  logger.info(list)
  let img = await render(e, 'chatgpt-plugin', 'wordcloud/index', { list }, { retType: 'base64' })
  return img
}

function getTokenizer (e) {
  // if (e.adapter === 'shamrock') {
  //   return Tokenizer.shamrock
  // } else {
  //   return Tokenizer.default
  // }
  return Tokenizer.default
}
