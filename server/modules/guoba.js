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
                let { getAllWebAddress } = await import('../../../Guoba-Plugin/utils/common.js')
                const { custom, local, remote } = await getAllWebAddress()
                if (local.length > 0) {
                    const guobaOptions = {
                        method: body.post ? 'POST' : 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Guoba-Access-Token': body.guobaToken
                        }
                    }
                    if (body.data) {
                        if (body.post) {
                            guobaOptions.body = JSON.stringify(body.data)
                        } else {
                            let paramsArray = []
                            Object.keys(body.data).forEach(key => paramsArray.push(key + '=' + body.data[key]))
                            if (paramsArray.length > 0) {
                                body.path += '?' + paramsArray.join('&')
                            }
                        }
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