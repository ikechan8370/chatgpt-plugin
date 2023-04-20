import { Tokenizer } from './tokenizer.js'
import { render } from '../common.js'

export async function makeWordcloud (e, groupId) {
  let tokenizer = new Tokenizer()
  let topK = await tokenizer.getTodayKeywordTopK(groupId, 100)
  let list = JSON.stringify(topK)
  // let list = topK
  console.log(list)
  await render(e, 'chatgpt-plugin', 'wordcloud/index', { list })
}
