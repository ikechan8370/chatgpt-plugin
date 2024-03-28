import { SlackCozeClient } from '../CozeSlackClient.js'
import fs from 'fs'
// global.store = {}

// global.redis = {
//   set: (key, val) => {
//     global.store[key] = val
//   },
//   get: (key) => {
//     return global.store[key]
//   }
// }
// global.logger = {
//   info: console.log,
//   warn: console.warn,
//   error: console.error
// }
// async function test () {
//   const fullPath = fs.realpathSync('../../config/config.json')
//   const data = fs.readFileSync(fullPath)
//   let config = JSON.parse(String(data))
//   let client = new SlackCozeClient(config)
//   await client.sendMessage('hello', {
//     sender: {
//       user_id: 450960006
//     }
//   })
// }
//
//
// test()
