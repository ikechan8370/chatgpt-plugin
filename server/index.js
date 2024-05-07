import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'
import websocket from '@fastify/websocket'

import fs from 'fs'
import path from 'path'
import websocketclient from 'ws'

import { Config } from '../utils/config.js'
import { UserInfo, GetUser, AddUser, ReplaceUsers } from './modules/user_data.js'
import { getPublicIP, getUserData, getMasterQQ, randomString, getUin } from '../utils/common.js'

import webRoute from './modules/web_route.js'
import webUser from './modules/user.js'
import webPrompt from './modules/prompts.js'
import Guoba from './modules/guoba.js'
import SettingView from './modules/setting_view.js'

const __dirname = path.resolve()
const isTrss = Array.isArray(Bot.uin)

// 无法访问端口的情况下创建与media的通讯
async function mediaLink () {
  const ip = await getPublicIP()
  const testServer = await fetch(`${Config.cloudTranscode}/check`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `http://${ip}:${Config.serverPort || 3321}/`
      })
    })
  if (testServer.ok) {
    const checkCloudData = await testServer.json()
    if (checkCloudData.state == 'error') {
      console.log('本地服务无法访问，开启media服务代理')
      const serverurl = new URL(Config.cloudTranscode)
      const ws = new websocketclient(`ws://${serverurl.hostname}${serverurl.port ? ':' + serverurl.port : ''}/ws`)
      ws.on('open', () => {
        ws.send(JSON.stringify({
          command: 'register',
          region: getUin(),
          type: 'server'
        }))
      })
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message)
          switch (data.command) {
            case 'register':
              if (data.state) {
                let master = (await getMasterQQ())[0]
                if (Array.isArray(Bot.uin)) {
                  Bot.pickFriend(master).sendMsg(`当前chatgpt插件服务无法被外网访问，已启用代理链接，访问代码：${data.token}`)
                } else {
                  Bot.sendPrivateMsg(master, `当前chatgpt插件服务无法被外网访问，已启用代理链接，访问代码：${data.token}`, false)
                }
              } else {
                console.log('注册区域失败')
              }
              break
            case 'login':
              if (data.token) {
                const user = UserInfo(data.token)
                if (user) {
                  ws.login = true
                  ws.send(JSON.stringify({ command: data.command, state: true, region: getUin(), type: 'server' }))
                } else {
                  ws.send(JSON.stringify({ command: data.command, state: false, error: '权限验证失败', region: getUin(), type: 'server' }))
                }
              }
              break
            case 'post_login':
              if (data.qq && data.passwd) {
                const token = randomString(32)
                if (data.qq == getUin() && await redis.get('CHATGPT:ADMIN_PASSWD') == data.passwd) {
                  await AddUser({ user: data.qq, token, autho: 'admin' })
                  ws.send(JSON.stringify({ command: data.command, state: true, autho: 'admin', token, region: getUin(), type: 'server' }))
                } else {
                  const user = await getUserData(data.qq)
                  if (user.passwd != '' && user.passwd === data.passwd) {
                    await AddUser({ user: data.qq, token, autho: 'user' })
                    ws.send(JSON.stringify({ command: data.command, state: true, autho: 'user', token, region: getUin(), type: 'server' }))
                  } else {
                    ws.send(JSON.stringify({ command: data.command, state: false, error: `用户名密码错误,如果忘记密码请私聊机器人输入 ${data.qq == getUin() ? '#修改管理密码' : '#修改用户密码'} 进行修改`, region: getUin(), type: 'server' }))
                  }
                }
              } else {
                ws.send(JSON.stringify({ command: data.command, state: false, error: '未输入用户名或密码', region: getUin(), type: 'server' }))
              }
              break
            case 'post_command':
              console.log(data)
              const fetchOptions = {
                method: 'POST',
                body: data.postData
              }
              const response = await fetch(`http://localhost:${Config.serverPort || 3321}${data.postPath}`, fetchOptions)
              if (response.ok) {
                const json = await response.json()
                ws.send(JSON.stringify({ command: data.command, state: true, region: getUin(), type: 'server', path: data.postPath, data: json }))
              }
              break
          }
        } catch (error) {
          console.log(error)
        }
      })
    } else {
      console.log('本地服务网络正常，无需开启通讯')
    }
  } else {
    console.log('media服务器未响应')
  }
}
// 未完工，暂不开启这个功能
// mediaLink()

export async function createServer () {
  let server = fastify({
    logger: Config.debug
  })

  async function setUserData (qq, data) {
    const dir = 'resources/ChatGPTCache/user'
    const filename = `${qq}.json`
    const filepath = path.join(dir, filename)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filepath, JSON.stringify(data))
  }

  await server.register(cors, {
    origin: '*'
  })
  await server.register(fstatic, {
    root: path.join(__dirname, 'plugins/chatgpt-plugin/server/static/')
  })
  await server.register(websocket, {
    cors: true,
    options: {
      maxPayload: 1048576
    }
  })
  await server.register(fastifyCookie)
  await server.register(webRoute)
  await server.register(webUser)
  await server.register(SettingView)
  await server.register(webPrompt)
  await server.register(Guoba)

  // 页面数据获取
  server.post('/page', async (request, reply) => {
    const body = request.body || {}
    if (body.code) {
      const pattern = /^[a-zA-Z0-9]+$/
      if (!pattern.test(body.code)) {
        reply.send({ error: 'bad request' })
      }
      const dir = 'resources/ChatGPTCache/page'
      const filename = body.code + '.json'
      const filepath = path.join(dir, filename)
      let data = fs.readFileSync(filepath, 'utf8')
      reply.send(data)
    }
    return reply
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
    return reply
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
            rotation: Config.live2dOption_rotation,
            alpha: Config.live2dOption_alpha,
            dpr: Config.cloudDPR
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
        reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}` })
      } catch (err) {
        server.log.error(`用户生成缓存${body.entry}时发生错误： ${err}`)
        reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}`, error: body.entry + '生成失败' })
      }
    }
    return reply
  })

  // 清除缓存数据
  server.post('/cleanCache', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    let user = UserInfo(token)
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
    return reply
  })
  let clients = []
  // 获取消息
  const wsFn = async (connection, request) => {
    connection.socket.on('open', message => {
      // 开始连接
      console.log(`Received message: ${message}`)
      const response = { data: 'hello, client' }
      connection.socket.send(JSON.stringify(response))
    })
    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message)
        const user = UserInfo(data.token)
        switch (data.command) {
          case 'sendMsg': // 代理消息发送
            if (!connection.login) {
              await connection.socket.send(JSON.stringify({ command: data.command, state: false, error: '请先登录账号' }))
              return
            }
            if (data.id && data.message) {
              if (data.group) {
                if (isTrss) {
                  let msg = []
                  if (data.quotable) {
                    msg.push(segment.at(data.quotable.user_id, data.quotable.user_name))
                  }
                  msg.push(data.message)
                  Bot[user.user].pickGroup(parseInt(data.id)).sendMsg(msg)
                } else {
                  Bot.sendGroupMsg(parseInt(data.id), data.message, data.quotable)
                }
              } else {
                if (isTrss) {
                  Bot[user.user].pickFriend(parseInt(data.id)).sendMsg(data.message)
                } else {
                  Bot.sendPrivateMsg(parseInt(data.id), data.message, data.quotable)
                }
              }
              await connection.socket.send(JSON.stringify({ command: data.command, state: true }))
            } else {
              await connection.socket.send(JSON.stringify({ command: data.command, state: false, error: '参数不足' }))
            }
            break
          case 'userInfo': // 获取用户信息
            if (!connection.login) {
              await connection.socket.send(JSON.stringify({ command: data.command, state: false, error: '请先登录账号' }))
            } else {
              await connection.socket.send(JSON.stringify({ command: data.command, state: true, user: { user: user.user, autho: user.autho } }))
            }
            break
          case 'login': // 登录
            if (user) {
              clients[user.user] = connection.socket
              connection.login = true
              await connection.socket.send(JSON.stringify({ command: data.command, state: true }))
            } else {
              await connection.socket.send(JSON.stringify({ command: data.command, state: false, error: '权限验证失败' }))
            }
            break
          case 'initQQMessageInfo': // qq消息模块初始化信息
            if (!connection.login) {
              await connection.socket.send(JSON.stringify({ command: data.command, state: false, error: '请先登录账号' }))
              return
            }
            if (user?.autho != 'admin') {
              await connection.socket.send(JSON.stringify({ command: data.command, state: true, error: '普通用户无需进行初始化' }))
              return
            }
            let _Bot = Bot
            if (isTrss) {
              _Bot = Bot[user.user]
            }
            const groupList = await _Bot.getGroupList()
            groupList.forEach(async (item) => {
              const group = _Bot.pickGroup(isTrss ? item : item.group_id)
              const groupMessages = await group.getChatHistory()
              if (groupMessages) {
                groupMessages.forEach(async (e) => {
                  e.message = e.message.map(item => {
                    if (item.type === 'at') {
                      return { ...item, text: group.pickMember(parseInt(item.qq)).card || group.pickMember(parseInt(item.qq)).nickname }
                    }
                    return item
                  })
                  const messageData = {
                    notice: 'clientMessage',
                    message: e.message,
                    sender: e.sender,
                    group: {
                      isGroup: true,
                      group_id: e.group_id,
                      group_name: e.group_name || group.group_name
                    },
                    quotable: {
                      user_id: e.user_id,
                      time: e.time,
                      seq: e.seq,
                      rand: e.rand,
                      message: e.message,
                      user_name: e.sender.nickname
                    },
                    read: true
                  }
                  await connection.socket.send(JSON.stringify(messageData))
                })
              } else {
                const messageData = {
                  notice: 'clientList',
                  user_id: _Bot.uin,
                  nickname: _Bot.nickname,
                  group: {
                    isGroup: true,
                    group_id: group.group_id,
                    group_name: group.group_name
                  },
                  quotable: {
                    user_id: _Bot.uin,
                    user_name: _Bot.nickname
                  },
                }
                await connection.socket.send(JSON.stringify(messageData))
              }
            })
            const friendList = await _Bot.getFriendList()
            friendList.forEach(async (item) => {
              const friend = _Bot.pickFriend(item)
              const messageData = {
                notice: 'clientList',
                user_id: item,
                nickname: friend.nickname,
                group: {
                  isGroup: false,
                },
                quotable: {
                  user_id: _Bot.uin,
                  user_name: _Bot.nickname
                },
              }
              await connection.socket.send(JSON.stringify(messageData))
            })

            break
          case 'ping': // 心跳
            await connection.socket.send(JSON.stringify({ command: 'ping', time: new Date(), state: true }))
            break
          default:
            await connection.socket.send(JSON.stringify({ data }))
            break
        }
      } catch (error) {
        console.error(error)
        await connection.socket.send(JSON.stringify({ error: error.message }))
      }
    })
    connection.socket.on('close', () => {
      // 监听连接关闭事件
      const response = { code: 403, data: 'Client disconnected', message: 'Client disconnected' }
      connection.socket.send(JSON.stringify(response))
    })
    return request
  }
  Bot.on('message', e => {
    e.message = e.message.map(item => {
      if (item.type === 'at') {
        let user
        try {
          user = e.group.pickMember(parseInt(item.qq)).card || e.group.pickMember(parseInt(item.qq)).nickname
        } catch (error) {
          user = item.qq
        }
        return { ...item, text: user }
      }
      return item
    })
    const messageData = {
      notice: 'clientMessage',
      message: e.message,
      sender: e.sender,
      group: {
        isGroup: e.isGroup || e.group_id != undefined,
        group_id: e.group_id,
        group_name: e.group_name || e.bot.gl?.get(e.group_id)?.group_name || e.group_id
      },
      quotable: {
        user_id: e.user_id,
        time: e.time,
        seq: e.seq,
        rand: e.rand,
        message: e.message,
        user_name: e.sender.card || e.sender.nickname
      }
    }
    if (clients) {
      for (const index in clients) {
        const user = GetUser(index)
        if (user.autho == 'admin' || user.user == e.user_id) {
          clients[index].send(JSON.stringify(messageData))
        }
      }
    }
  })
  server.get('/ws', {
    websocket: true
  }, wsFn)

  // 获取系统参数
  server.post('/sysconfig', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    const user = UserInfo(token)
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
      if (await redis.exists('CHATGPT:USE') != 0) {
        redisConfig.useMode = await redis.get('CHATGPT:USE')
      }
      if (await redis.exists('CHATGPT:?') != 0) {
        redisConfig.openAiPlatformAccessToken = await redis.get('CHATGPT:TOKEN')
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
    return reply
  })

  // 设置系统参数
  server.post('/saveconfig', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    const user = UserInfo(token)
    const body = request.body || {}
    let changeConfig = []
    if (!user) {
      reply.send({ state: false, error: '未登录' })
    } else if (user.autho === 'admin') {
      const chatdata = body.chatConfig || {}
      for (let [keyPath, value] of Object.entries(chatdata)) {
        if (keyPath === 'blockWords' || keyPath === 'promptBlockWords' || keyPath === 'initiativeChatGroups') { value = value.toString().split(/[,，;；\|]/) }
        if (Config[keyPath] != value) {
          // 检查云服务api
          if (keyPath === 'cloudTranscode') {
            const referer = request.headers.referer
            const origin = referer.match(/(https?:\/\/[^/]+)/)[1]
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
          changeConfig.push({
            item: keyPath,
            old: Config[keyPath],
            new: value
          })
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
      if (redisConfig.useMode != null) {
        await redis.set('CHATGPT:USE', redisConfig.useMode)
      }
      if (redisConfig.openAiPlatformAccessToken != null) {
        await redis.set('CHATGPT:TOKEN', redisConfig.openAiPlatformAccessToken)
      }
      reply.send({ change: changeConfig, state: true })
      // 通知所有WS客户端刷新数据
      if (clients) {
        for (const index in clients) {
          const user = GetUser(index)
          if (user.autho == 'admin') {
            clients[index].send(JSON.stringify({
              notice: 'updateConfig'
            }))
          }
        }
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
      reply.send({ state: true })
    }
    return reply
  })

  // 系统服务测试
  server.post('/serverTest', async (request, reply) => {
    let serverState = {
      cache: false, // 待移除
      cloud: false
    }
    if (Config.cloudTranscode) {
      const checkCheckCloud = await fetch(Config.cloudTranscode, { method: 'GET' })
      if (checkCheckCloud.ok) {
        serverState.cloud = true
      }
    }
    reply.send(serverState)
    return reply
  })

  global.chatgpt.server = server
  return server
}

export async function runServer () {
  let server = global.chatgpt.server
  if (!server) {
    server = await createServer()
  }
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
  await ReplaceUsers()
}

export async function stopServer () {
  let server = global.chatgpt.server
  if (server) {
    await server.close()
  }
}
