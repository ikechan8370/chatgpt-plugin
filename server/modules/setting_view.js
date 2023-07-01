import { UserInfo } from './user_data.js'
import fs from 'fs'
import path from 'path'

async function SettingView(fastify, options) {
    // 获取配置视图
    fastify.post('/settingView', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        let user = UserInfo(token)
        if (!user) {
            reply.send({ err: '未登录' })
        } else if (user.autho === 'admin') {
            const filepath = path.join('plugins/chatgpt-plugin/resources/view', 'setting_view.json')
            const configView = JSON.parse(fs.readFileSync(filepath, 'utf8'))
            reply.send(configView)
        } else {
            reply.send({ err: '权限不足' })
        }
        return reply
    })
}

export default SettingView