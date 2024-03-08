import fs from 'node:fs'
import { Config } from './utils/config.js'
import { createServer, runServer } from './server/index.js'

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
// 启动服务器
if (Config.enableToolbox) {
  logger.info('开启工具箱配置项，工具箱启动中')
  await createServer()
  await runServer()
  logger.info('工具箱启动成功')
} else {
  logger.info('提示：当前配置未开启chatgpt工具箱，可通过锅巴或`#chatgpt开启工具箱`指令开启')
}
logger.info('chatgpt-plugin加载成功')
logger.info(`当前版本${Config.version}`)
logger.info('仓库地址 https://github.com/ikechan8370/chatgpt-plugin')
logger.info('文档地址 https://www.yunzai.chat')
logger.info('插件群号 559567232')
logger.info('**************************************')

export { apps }
