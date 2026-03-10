import fs from 'node:fs'
import ChatGPTConfig from './config/config.js'
import { initChaite } from './models/chaite/cloud.js'
logger.info('**************************************')
logger.info('chatgpt-plugin加载中')

if (!global.segment) {
  try {
    global.segment = (await import('icqq')).segment
  } catch (err) {
    global.segment = (await import('oicq')).segment
  }
}

const files = fs.readdirSync('./plugins/chatgpt-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')
  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
global.chatgpt = {

}

// startSync returns proxied objects; bind them back so nested writes auto-persist
const proxiedConfig = ChatGPTConfig.startSync('./plugins/chatgpt-plugin/data')
for (const key of ['basic', 'bym', 'llm', 'management', 'chaite', 'memory']) {
  if (proxiedConfig?.[key]) {
    ChatGPTConfig[key] = proxiedConfig[key]
  }
}
initChaite()
logger.info('chatgpt-plugin加载成功')
logger.info(`当前版本${ChatGPTConfig.version}`)
logger.info('仓库地址 https://github.com/ikechan8370/chatgpt-plugin')
logger.info('文档地址 https://www.yunzai.chat')
logger.info('插件群号 559567232')
logger.info('**************************************')

export { apps }
