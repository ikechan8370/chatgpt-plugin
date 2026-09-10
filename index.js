import fs from 'node:fs'
import ChatGPTConfig from './config/config.js'
import { initChaite } from './models/chaite/cloud.js'
import { visionService } from './utils/vision.js'
import { reportRetentionOpportunity } from './models/chaite/historyRetention.js'
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

ChatGPTConfig.startSync('./plugins/chatgpt-plugin/data')
visionService.startCleanupScheduler()
// 只执行一次：从旧版本升级上来时提示一次可清理的历史。放在这里而不是插件构造
// 函数里，因为 Yunzai 每条消息都会 new 一次插件类。
initChaite()
  .then(() => reportRetentionOpportunity())
  .catch(err => logger.debug?.(`[History] retention notice skipped: ${err?.message || err}`))
logger.info('chatgpt-plugin加载成功')
logger.info(`当前版本${ChatGPTConfig.version}`)
logger.info('仓库地址 https://github.com/ikechan8370/chatgpt-plugin')
logger.info('文档地址 https://www.yunzai.chat')
logger.info('插件群号 559567232')
logger.info('**************************************')

export { apps }
