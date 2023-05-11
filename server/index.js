import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'

import fs from 'fs'
import path from 'path'
import os from 'os'
import schedule from 'node-schedule'

import { Config } from '../utils/config.js'
import { randomString, getPublicIP, getUserData } from '../utils/common.js'

const __dirname = path.resolve()
const server = fastify({
  logger: Config.debug
})

let usertoken = []
let Statistics = {
  SystemAccess: {
    count: 0,
    oldCount: 0
  },
  CacheFile: {
    count: 0,
    oldCount: 0
  },
  WebAccess: {
    count: 0,
    oldCount: 0
  },
  SystemLoad: {
    count: 0,
    oldCount: 0
  }
}

async function getLoad() {
  // 获取当前操作系统平台
  const platform = os.platform()
  // 判断平台是Linux还是Windows
  if (platform === 'linux') {
    // 如果是Linux，使用os.loadavg()方法获取负载平均值
    const loadAvg = os.loadavg()
    return loadAvg[0] * 100
  } else if (platform === 'win32') {
    // 如果是Windows不获取性能
    return 0
  } else {
    return 0
  }
}

async function setUserData(qq, data) {
  const dir = 'resources/ChatGPTCache/user'
  const filename = `${qq}.json`
  const filepath = path.join(dir, filename)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filepath, JSON.stringify(data))
}

export async function createServer() {
  await server.register(cors, {
    origin: '*'
  })
  await server.register(fstatic, {
    root: path.join(__dirname, 'plugins/chatgpt-plugin/server/static/')
  })
  await server.register(fastifyCookie)
  await server.get('/page/*', (request, reply) => {
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/help/*', (request, reply) => {
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/version', (request, reply) => {
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/auth/*', (request, reply) => {
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/admin*', (request, reply) => {
    const token = request.cookies.token || 'unknown'
    const user = usertoken.find(user => user.token === token)
    if (!user) {
      reply.redirect(301, '/auth/login')
    }
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/admin/dashboard', (request, reply) => {
    const token = request.cookies.token || 'unknown'
    const user = usertoken.find(user => user.token === token)
    if (!user) {
      reply.redirect(301, '/auth/login')
    }
    if (user.autho === 'admin') {
      reply.redirect(301, '/admin/settings')
    }
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/admin/settings', (request, reply) => {
    const token = request.cookies.token || 'unknown'
    const user = usertoken.find(user => user.token === token)
    if (!user || user.autho != 'admin') {
      reply.redirect(301, '/admin/')
    }
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  // 登录
  server.post('/login', async (request, reply) => {
    const body = request.body || {}
    if (body.qq && body.passwd) {
      const token = randomString(32)
      if (body.qq == Bot.uin && await redis.get('CHATGPT:ADMIN_PASSWD') == body.passwd) {
        usertoken.push({ user: body.qq, token, autho: 'admin' })
        reply.setCookie('token', token, { path: '/' })
        reply.send({ login: true, autho: 'admin' })
      } else {
        const user = await getUserData(body.qq)
        if (user.passwd != '' && user.passwd === body.passwd) {
          usertoken.push({ user: body.qq, token, autho: 'user' })
          reply.setCookie('token', token, { path: '/' })
          reply.send({ login: true, autho: 'user' })
        } else {
          reply.send({ login: false, err: `用户名密码错误,如果忘记密码请私聊机器人输入 ${body.qq == Bot.uin ? '#修改管理密码' : '#修改用户密码'} 进行修改` })
        }
      }
    } else {
      reply.send({ login: false, err: '未输入用户名或密码' })
    }
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
      const ip = await getPublicIP()
      let botName = ''
      switch (body.model) {
        case 'bing':
          botName = 'Bing'
          break
        case 'api':
          botName = 'ChatGPT'
          break
        case 'api3':
          botName = 'ChatGPT'
          break
        case 'browser':
          botName = 'ChatGPT'
          break
        case 'chatglm':
          botName = 'ChatGLM'
          break
        case 'claude':
          botName = 'Claude'
          break
        default:
          botName = body.model
          break
      }
      try {
        fs.mkdirSync(dir, { recursive: true })
        const data = {
          user: body.content.senderName,
          bot: Config.chatViewBotName || botName,
          userImg: body.userImg || '',
          botImg: body.botImg || '',
          question: body.content.prompt,
          message: body.content.content,
          group: body.content.group,
          herf: `http://${body.cacheHost || (ip + ':' + Config.serverPort || 3321)}/page/${body.entry}`,
          quote: body.content.quote,
          images: body.content.images || [],
          suggest: body.content.suggest || [],
          model: body.model,
          mood: body.content.mood || 'blandness',
          live2d: Config.live2d,
          live2dModel: Config.live2dModel,
          live2dOption: {
            scale: Config.live2dOption_scale,
            position: {
              x: Config.live2dOption_positionX,
              y: Config.live2dOption_positionY
            },
            rotation :Config.live2dOption_rotation,
          },
          time: new Date()
        }
        fs.writeFileSync(filepath, JSON.stringify(data))
        const user = await getUserData(body.qq)
        user.chat.push({
          user: data.user,
          bot: data.bot,
          group: data.group,
          herf: data.herf,
          model: data.model,
          time: data.time
        })
        await setUserData(body.qq, user)
        Statistics.CacheFile.count += 1
        reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}` })
      } catch (err) {
        server.log.error(`用户生成缓存${body.entry}时发生错误： ${err}`)
        reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}`, error: body.entry + '生成失败' })
      }
    }
  })
  // 获取系统状态
  server.post('/system-statistics', async (request, reply) => {
    Statistics.SystemLoad.count = await getLoad()
    reply.send(Statistics)
  })

  // 获取用户数据
  server.post('/userData', async (request, reply) => {
    const token = request.cookies.token || 'unknown'
    let user = usertoken.find(user => user.token === token)
    if (!user) user = { user: '' }
    const userData = await getUserData(user.user)
    reply.send({
      chat: userData.chat || [],
      mode: userData.mode || '',
      cast: userData.cast || {
        api: '', //API设定
        bing: '', //必应设定
        bing_resource: '', //必应扩展资料
        slack: '', //Slack设定
      }
    })
  })

  // 清除缓存数据
  server.post('/cleanCache', async (request, reply) => {
    const token = request.cookies.token || 'unknown'
    let user = usertoken.find(user => user.token === token)
    if (!user) user = { user: '' }
    const userData = await getUserData(user.user)
    const dir = 'resources/ChatGPTCache/page'
    userData.chat.forEach(function (item, index) {
      const filename = item.herf.substring(item.herf.lastIndexOf('/') + 1) + '.json'
      const filepath = path.join(dir, filename)
      fs.unlinkSync(filepath)
    })
    userData.chat = []
    await setUserData(user.user, userData)
    reply.send({ state: true })
  })

  // 获取系统参数
  server.post('/sysconfig', async (request, reply) => {
    const token = request.cookies.token || 'unknown'
    const user = usertoken.find(user => user.token === token)
    if (!user) {
      reply.send({ err: '未登录' })
    } else if (user.autho === 'admin') {
      let redisConfig = {}
      if (await redis.exists('CHATGPT:BING_TOKENS') != 0) {
        let bingTokens = await redis.get('CHATGPT:BING_TOKENS')
        if (bingTokens) { bingTokens = JSON.parse(bingTokens) } else bingTokens = []
        redisConfig.bingTokens = bingTokens
      } else {
        redisConfig.bingTokens = []
      }
      if (await redis.exists('CHATGPT:CONFIRM') != 0) {
        redisConfig.turnConfirm = await redis.get('CHATGPT:CONFIRM') === 'on'
      }
      reply.send({
        chatConfig: Config,
        redisConfig
      })
    } else {
      let userSetting = await redis.get(`CHATGPT:USER:${user.user}`)
      if (!userSetting) {
        userSetting = {
          usePicture: Config.defaultUsePicture,
          useTTS: Config.defaultUseTTS,
          ttsRole: Config.defaultTTSRole
        }
      } else {
        userSetting = JSON.parse(userSetting)
      }
      reply.send({
        userSetting
      })
    }
  })

  // 设置系统参数
  server.post('/saveconfig', async (request, reply) => {
    const token = request.cookies.token || 'unknown'
    const user = usertoken.find(user => user.token === token)
    const body = request.body || {}
    if (!user) {
      reply.send({ err: '未登录' })
    } else if (user.autho === 'admin') {
      const chatdata = body.chatConfig || {}
      for (let [keyPath, value] of Object.entries(chatdata)) {
        if (keyPath === 'blockWords' || keyPath === 'promptBlockWords' || keyPath === 'initiativeChatGroups') { value = value.toString().split(/[,，;；\|]/) }
        if (Config[keyPath] != value) {
          //检查云服务api
          if(keyPath === 'cloudTranscode') {
            const referer = request.headers.referer;
            const origin = referer.match(/(https?:\/\/[^/]+)/)[1];
            const checkCloud = await fetch(`${value}/check`, 
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: origin
              })
            })
            if (checkCloud.ok) {
              const checkCloudData = await checkCloud.json()
              if (checkCloudData.state != 'ok') {
                value = ''
              }
            } else value = ''
          }
          Config[keyPath] = value 
        }
      }
      const redisConfig = body.redisConfig || {}
      if (redisConfig.bingTokens != null) {
        await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(redisConfig.bingTokens))
      }
      if (redisConfig.turnConfirm != null) {
        await redis.set('CHATGPT:CONFIRM', redisConfig.turnConfirm ? 'on' : 'off')
      }
    } else {
      if (body.userSetting) {
        await redis.set(`CHATGPT:USER:${user.user}`, JSON.stringify(body.userSetting))
      }
      if (body.userConfig) {
        let temp_userData = await getUserData(user.user)
        if (body.userConfig.mode) {
          temp_userData.mode = body.userConfig.mode
        }
        if (body.userConfig.cast) {
          temp_userData.cast = body.userConfig.cast
        }
        await setUserData(user.user, temp_userData)
      }
    }
  })

  server.addHook('onRequest', (request, reply, done) => {
    if (request.method == 'POST') { Statistics.SystemAccess.count += 1 }
    if (request.method == 'GET') { Statistics.WebAccess.count += 1 }
    done()
  })
  // 定时任务
  let rule = new schedule.RecurrenceRule()
  rule.hour = 0
  rule.minute = 0
  let job_Statistics = schedule.scheduleJob(rule, function () {
    Statistics.SystemAccess.oldCount = Statistics.SystemAccess.count
    Statistics.CacheFile.oldCount = Statistics.CacheFile.count
    Statistics.WebAccess.oldCount = Statistics.WebAccess.count
    Statistics.SystemAccess.count = 0
    Statistics.CacheFile.count = 0
    Statistics.WebAccess.count = 0
  })
  let job_Statistics_SystemLoad = schedule.scheduleJob('0 * * * *', async function () {
    Statistics.SystemLoad.count = await getLoad()
    Statistics.SystemLoad.oldCount = Statistics.SystemLoad.count
  })

  server.listen({
    port: Config.serverPort || 3321,
    host: '::'
  }, (error) => {
    if (error) {
      server.log.error(`服务启动失败： ${error}`)
    } else {
      server.log.info(`server listening on ${server.server.address().port}`)
    }
  })
}
