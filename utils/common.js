import { remark } from 'remark'
import stripMarkdown from 'strip-markdown'
export function markdownToText (markdown) {
  return remark()
    .use(stripMarkdown)
    .processSync(markdown ?? '')
    .toString()
}

export async function upsertMessage (message) {
  await redis.set(`CHATGPT:MESSAGE:${message.id}`, JSON.stringify(message))
}

export async function getMessageById (id) {
  let messageStr = await redis.get(`CHATGPT:MESSAGE:${id}`)
  return JSON.parse(messageStr)
}
