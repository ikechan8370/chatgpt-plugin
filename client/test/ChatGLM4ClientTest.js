import { ChatGLM4Client } from '../ChatGLM4Client.js'

async function sendMsg () {
  const client = new ChatGLM4Client({
    refreshToken: '',
    debug: true
  })
  let res = await client.sendMessage('你好啊')
  console.log(res)
}
// global.redis = null
// global.logger = {
//   info: console.log,
//   warn: console.warn,
//   error: console.error
// }
// sendMsg()
