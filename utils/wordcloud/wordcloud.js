import { Tokenizer } from './tokenizer.js'
import { render } from '../common.js'

export async function makeWordcloud (e, groupId, duration = 0) {
  let tokenizer = new Tokenizer()
  let topK = await tokenizer.getKeywordTopK(groupId, 100, duration)
  let list = JSON.stringify(topK)
  // let list = topK
  console.log(list)
  await render(e, 'chatgpt-plugin', 'wordcloud/index', { list })
}
