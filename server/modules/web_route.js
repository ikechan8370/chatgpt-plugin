import { UserInfo } from './user_data.js'
import fs from 'fs'

async function routes(fastify, options) {
    fastify.get('/page/*', async (request, reply) => {
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/help/*', async (request, reply) => {
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/version', async (request, reply) => {
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/auth/*', async (request, reply) => {
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/admin*', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        const user = UserInfo(token)
        if (!user) {
            reply.redirect(301, '/auth/login')
        }
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/admin/dashboard', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        const user = UserInfo(token)
        if (!user) {
            reply.redirect(301, '/auth/login')
        }
        if (user.autho === 'admin') {
            reply.redirect(301, '/admin/settings')
        }
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/admin/settings', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        const user = UserInfo(token)
        if (!user || user.autho != 'admin') {
            reply.redirect(301, '/admin/')
        }
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
        reply.type('text/html').send(stream)
        return reply
    })
}

export default routes