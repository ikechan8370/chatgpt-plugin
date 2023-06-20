import { UserInfo, AddUser } from './user_data.js'
import { randomString, getUserData } from '../../utils/common.js'
import fs from 'fs'

async function User(fastify, options) {
    // 登录
    fastify.post('/login', async (request, reply) => {
        const body = request.body || {}
        if (body.qq && body.passwd) {
            const token = randomString(32)
            if (body.qq == Bot.uin && await redis.get('CHATGPT:ADMIN_PASSWD') == body.passwd) {
                AddUser({ user: body.qq, token: token, autho: 'admin' })
                reply.setCookie('token', token, { path: '/' })
                reply.send({ login: true, autho: 'admin', token: token })
            } else {
                const user = await getUserData(body.qq)
                if (user.passwd != '' && user.passwd === body.passwd) {
                    AddUser({ user: body.qq, token: token, autho: 'user' })
                    reply.setCookie('token', token, { path: '/' })
                    reply.send({ login: true, autho: 'user', token: token })
                } else {
                    reply.send({ login: false, err: `用户名密码错误,如果忘记密码请私聊机器人输入 ${body.qq == Bot.uin ? '#修改管理密码' : '#修改用户密码'} 进行修改` })
                }
            }
        } else {
            reply.send({ login: false, err: '未输入用户名或密码' })
        }
        return reply
    })
    // 检查用户是否存在
    fastify.post('/verify', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        const user = UserInfo(token)
        if (!user || token === 'unknown') {
            reply.send({
                verify: false,
            })
            return
        }
        reply.send({
            verify: true,
            user: user.user,
            autho: user.autho
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
                api: '', //API设定
                bing: '', //必应设定
                bing_resource: '', //必应扩展资料
                slack: '', //Slack设定
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