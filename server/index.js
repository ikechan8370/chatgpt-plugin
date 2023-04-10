import fastify from 'fastify'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'

import fs from 'fs'
import path from 'path'
import os from 'os'

import { Config } from '../utils/config.js'

function isPrivateIP(ip) {
  var match = ipRegex.exec(ip)
  if (match) {
    var a = parseInt(match[1])
    var b = parseInt(match[2])
    var c = parseInt(match[3])
    var d = parseInt(match[4])
    if (a === 10) {
      return true
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true
    }
    if (a === 192 && b === 168) {
      return true
    }
  }
  return false
}
function getPublicIP() {
  let interfaces = os.networkInterfaces()
  let myip = '127.0.0.1'
  for (let key in interfaces) {
    let items = interfaces[key]
    for (let i = 0; i < items.length; i++) {
      let item = items[i]
      // 排除内网IP和IPv6地址
      if (!item.internal && item.family === 'IPv4' && !isPrivateIP(item.address)) {
        myip = item.address
        break
      }
    }
  }
  return myip
}

const __dirname = path.resolve()
const server = fastify({
  logger: Config.debug
})

export async function createServer() {
  await server.register(cors, {
      origin: '*',
  })
  await server.register(fstatic, {
      root: path.join(__dirname, 'plugins/chatgpt-plugin/server/static/'),
  })
  await server.get('/page/*', (request, reply) => {
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/help/*', (request, reply) => {
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  // 页面数据获取
  server.post('/page', async (request, reply) => {
      const body = request.body || {}
      if (body.code) {
          const dir = 'resources/ChatGPTCache/page'
          const filename = body.code + '.json'
          const filepath = path.join(dir, filename)
          
          let data = fs.readFileSync(filepath, 'utf8')
          reply.send(data)
      }
  })
  // 帮助内容获取
  server.post('/help', async (request, reply) => {
    const body = request.body || {}
    if (body.use) {
        const dir = 'plugins/chatgpt-plugin/resources'
        const filename = 'help.json'
        const filepath = path.join(dir, filename)
        let data = fs.readFileSync(filepath, 'utf8')
        data = JSON.parse(data)
        reply.send(data[body.use])
    }
  })
  // 创建页面缓存内容
  server.post('/cache', async (request, reply) => {
      const body = request.body || {}
      if (body.content) {
          const dir = 'resources/ChatGPTCache/page'
          const filename = body.entry + '.json'
          const filepath = path.join(dir, filename)
          const regexUrl = /\b((?:https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/g
          try {
            const ip = getPublicIP()
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filepath, JSON.stringify({
              user: body.content.senderName,
              bot: Config.chatViewBotName || (body.bing ? 'Bing' : 'ChatGPT'),
              userImg: body.userImg || '',
              botImg: body.botImg || '',
              question: body.content.prompt,
              message: body.content.content,
              group: body.content.group,
              herf: `http://${body.cacheHost || (ip + ':' + Config.serverPort || 3321)}/page/${body.entry}`,
              quote: body.content.quote,
              images: body.content.images || [],
              suggest: body.content.suggest || [],
              time: new Date()
            }))
            reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}` })
          } catch (err) {
            console.error(err)
            reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}`, error: '生成失败' })
          }
      }
  })
  server.listen({
      port: Config.serverPort || 3321,
      host: '0.0.0.0'
  }, (error) => {
      if (error) {
          console.error(error);
      }
      server.log.info(`server listening on ${server.server.address().port}`)
  })
}