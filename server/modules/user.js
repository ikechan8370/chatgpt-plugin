import { UserInfo, AddUser } from './user_data.js'
import { randomString, getUserData, getMasterQQ, getUin } from '../../utils/common.js'
import { getBots } from '../../utils/bot.js';
import fs from 'fs'
import path from 'path';

async function User (fastify, options) {
  // 登录
  fastify.post('/login', async (request, reply) => {
    const body = request.body || {}
    let guobaLoginService
    let guobaAPI = ''
    try {
      let { LoginService } = await import('../../../Guoba-Plugin/server/service/both/LoginService.js')
      let { getAllWebAddress } = await import('../../../Guoba-Plugin/utils/common.js')
      guobaLoginService = new LoginService()
      guobaAPI = await getAllWebAddress()
    } catch (err) {
      console.error(err)
      guobaLoginService = {
        signToken: () => { return null }
      }
    }
    if (body.qq && body.passwd) {
      const token = randomString(32)
      if (body.qq == getUin() && await redis.get('CHATGPT:ADMIN_PASSWD') == body.passwd) {
        const guobaToken = await guobaLoginService.signToken(body.qq)
        await AddUser({ user: body.qq, token, autho: 'admin' })
        reply.setCookie('token', token, { path: '/' })
        reply.send({ login: true, autho: 'admin', token, guobaToken, guoba: guobaAPI })
      } else {
        const user = await getUserData(body.qq)
        if (user.passwd != '' && user.passwd === body.passwd) {
          await AddUser({ user: body.qq, token, autho: 'user' })
          reply.setCookie('token', token, { path: '/' })
          reply.send({ login: true, autho: 'user', token })
        } else {
          reply.send({ login: false, err: `用户名密码错误,如果忘记密码请私聊机器人输入 ${body.qq == getUin() ? '#修改管理密码' : '#修改用户密码'} 进行修改` })
        }
      }
    } else if (body.otp) {
      const token = randomString(32)
      const opt = await redis.get('CHATGPT:SERVER_QUICK')
      if (opt && body.otp == opt) {
        const guobaToken = await guobaLoginService.signToken(getUin())
        await AddUser({ user: getUin(), token, autho: 'admin' })
        reply.setCookie('token', token, { path: '/' })
        reply.send({ login: true, autho: 'admin', token, user: getUin(), guobaToken, guoba: guobaAPI })
      } else {
        reply.send({ login: false, err: '快捷登录代码错误，请检查后重试' })
      }
    } else {
      reply.send({ login: false, err: '未输入用户名或密码' })
    }
    return reply
  })
  // 快速登录
  fastify.post('/quick', async (request, reply) => {
    const otp = randomString(6)
    const isTrss = Array.isArray(Bot.uin)
    await redis.set(
      'CHATGPT:SERVER_QUICK',
      otp,
      { EX: 60000 }
    )
    const master = (await getMasterQQ())[0]
    let bots = getBots()
    for (let bot of bots) {
      if(isTrss) {
        try {
          bot.pickFriend(master).sendMsg(`收到工具箱快捷登录请求，1分钟内有效：${otp}`)
        } catch (error) {
          logger.error(error)
        }
      } else {
        bot.pickUser(master).sendMsg(`收到工具箱快捷登录请求，1分钟内有效：${otp}`)
      }
    }
    reply.send({ state: true })
    return reply
  })
  // 检查用户是否存在
  fastify.post('/verify', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    const user = UserInfo(token)
    if (!user || token === 'unknown') {
      reply.send({
        verify: false
      })
      return
    }
    reply.send({
      verify: true,
      user: user.user,
      autho: user.autho,
      version: 10016
    })
    return reply
  })
  // 获取用户数据
  fastify.post('/userData', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    let user = UserInfo(token)
    if (!user) user = { user: '' }
    const userData = await getUserData(user.user)
    reply.send({
      chat: userData.chat || [],
      mode: userData.mode || '',
      cast: userData.cast || {
        api: '', // API设定
        bing: '', // 必应设定
        bing_resource: '', // 必应扩展资料
        slack: '' // Slack设定
      }
    })
    return reply
  })
  // 删除用户
  fastify.post('/deleteUser', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    const user = UserInfo(token)
    if (!user || user === 'unknown') {
      reply.send({ state: false, error: '无效token' })
      return
    }
    const filepath = `resources/ChatGPTCache/user/${user.user}.json`
    fs.unlinkSync(filepath)
    reply.send({ state: true })
    return reply
  })
  // 修改密码
  fastify.post('/changePassword', async (request, reply) => {
    const token = request.cookies.token || request.body?.token || 'unknown'
    const user = UserInfo(token)
    if (!user || user === 'unknown') {
      reply.send({ state: false, error: '无效的用户信息' })
      return
    }
    const userData = await getUserData(user.user)
    const body = request.body || {}
    if (!body.newPasswd) {
      reply.send({ state: false, error: '无效参数' })
      return
    }
    if (body.passwd && body.passwd != userData.passwd) {
      reply.send({ state: false, error: '原始密码错误' })
      return
    }
    if (user.autho === 'admin') {
      await redis.set('CHATGPT:ADMIN_PASSWD', body.newPasswd)
    } else if (user.autho === 'user') {
      const dir = 'resources/ChatGPTCache/user'
      const filename = `${user.user}.json`
      const filepath = path.join(dir, filename)
      fs.mkdirSync(dir, { recursive: true })
      if (fs.existsSync(filepath)) {
        fs.readFile(filepath, 'utf8', (err, data) => {
          if (err) {
            console.error(err)
            return
          }
          const config = JSON.parse(data)
          config.passwd = body.newPasswd
          fs.writeFile(filepath, JSON.stringify(config), 'utf8', (err) => {
            if (err) {
              console.error(err)
            }
          })
        })
      } else {
        reply.send({ state: false, error: '错误的用户数据' })
        return
      }
    }
    reply.send({ state: true })
    return reply
  })
}

export default User
