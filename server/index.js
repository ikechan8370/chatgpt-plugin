import fastify from 'fastify'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'

import fs from 'fs'
import path from 'path'
import http from 'http'

import { Config } from '../utils/config.js'

function getPublicIP() {
  return new Promise((resolve, reject) => {
    http.get('http://ipinfo.io/json', (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      });
      res.on('end', () => {
        try {
          const ip = JSON.parse(data).ip
          resolve(ip)
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

export async function createServer() {
const __dirname = path.resolve()
const server = fastify({
  logger: Config.debug
})


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

server.post('/cache', async (request, reply) => {
    const body = request.body || {}
    if (body.content) {
        const dir = 'resources/ChatGPTCache/page'
        const filename = body.entry + '.json'
        const filepath = path.join(dir, filename)
        const regexUrl = /\b((?:https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/g
        const ip = await getPublicIP()
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filepath, JSON.stringify({
            user: body.content.senderName,
            bot: (body.bing ? 'Bing' : 'ChatGPT'),
            userImg: body.userImg || '',
            botImg: body.botImg || '',
            question: body.content.prompt,
            message: body.content.content,
            group: body.content.group,
            herf: `http://${body.cacheHost || ip}:3321/page/${body.entry}`,
            quote: body.content.quote,
            images: body.content.images || [],
            suggest: body.content.suggest || [],
            time: new Date()
          }))
          reply.send({ file: body.entry, cacheUrl: `http://${ip}:3321/page/${body.entry}` })
        } catch (err) {
          console.error(err)
          reply.send({ file: body.entry, cacheUrl: `http://${ip}/page/${body.entry}`, error: '生成失败' })
        }
    }
})

server.listen({
    port: Config.serverPort,
    host: '0.0.0.0'
}, (error) => {
    if (error) {
        console.error(error);
    }
    server.log.info(`server listening on ${server.server.address().port}`)
})
}