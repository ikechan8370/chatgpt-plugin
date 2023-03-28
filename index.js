import fs from 'node:fs'
import { Config } from './utils/config.js'

if (!global.segment) {
  global.segment = (await import('oicq')).segment
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
logger.info('**************************************')
logger.info('chatgpt-plugin加载成功')
logger.info(`当前版本${Config.version}`)
logger.info('仓库地址 https://github.com/ikechan8370/chatgpt-plugin')
logger.info('插件群号 559567232')
logger.info('**************************************')
export { apps }
