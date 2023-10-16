import { UserInfo } from './user_data.js'

async function Guoba(fastify, options) {
    // 获取锅巴登陆链接
    fastify.post('/guobaLogin', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        let user = UserInfo(token)
        if (user && user.autho == 'admin') {
            try {
                let { LoginService } = await import('../../../Guoba-Plugin/server/service/both/LoginService.js')
                const guobaLoginService = new LoginService()
                const guobaAPI = await guobaLoginService.setQuickLogin(user.user)
                reply.send({ guoba: guobaAPI })
            }
            catch (err) {
                console.error(err)
                reply.send({ state: false, error: err })
            }
        } else {
            reply.send({ state: false, error: '用户权限不足' })
        }
        return reply
    })
    // 代理锅巴接口
    fastify.post('/guobaApi', async (request, reply) => {
        const body = request.body || {}
        const token = request.cookies.token || request.body?.token || 'unknown'
        let user = UserInfo(token)
        if (user && user.autho == 'admin' && body.guobaToken) {
            try {
                let { LoginService } = await import('../../../Guoba-Plugin/server/service/both/LoginService.js')
                const guobaLoginService = new LoginService()
                const { custom, local, remote } = await guobaLoginService.setQuickLogin(user.user)
                if (local.length > 0) {
                    const guobaOptions = {
                        method: 'GET',
                        headers: {
                            'Guoba-Access-Token': body.guobaToken
                        },
                        body: body.data
                    }
                    const response = await fetch(`${local[0]}/${body.path}`, guobaOptions)
                    if (response.ok) {
                        const json = await response.json()
                        reply.send(json)
                    }
                } else {
                    reply.send({ state: false, error: '锅巴接口异常' })
                }
            }
            catch (err) {
                console.error(err)
                reply.send({ state: false, error: err })
            }
        } else {
            reply.send({ state: false, error: '用户权限不足' })
        }
        return reply
    })
}

export default Guoba