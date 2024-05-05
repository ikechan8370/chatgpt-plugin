import { UserInfo } from './user_data.js'
import fs from 'fs'

async function routes(fastify, options) {
    fastify.get('/page/*', async (request, reply) => {
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/page.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/version', async (request, reply) => {
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/page.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/auth/*', async (request, reply) => {
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/page.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/admin*', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        const user = UserInfo(token)
        if (!user) {
            reply.redirect(301, '/auth/login')
        }
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/page.html')
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
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/page.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/admin/settings', async (request, reply) => {
        const token = request.cookies.token || request.body?.token || 'unknown'
        const user = UserInfo(token)
        if (!user || user.autho != 'admin') {
            reply.redirect(301, '/admin/')
        }
        const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/page.html')
        reply.type('text/html').send(stream)
        return reply
    })
    fastify.get('/prompt/*', async (request, reply) => {
        const { raw } = request
        const newPath = raw.url.replace(/^\/prompt/, '')
        const response = await fetch(`https://chatgpt.roki.best${newPath}`,
        {
          method: 'GET',
          headers: {
            'FROM-CHATGPT': 'ikechan8370'
          }
        })
        if (response.ok) {
          const data = await response.json()
          reply.send(data)
        } else reply.code(500).send(new Error('Api Server Error'))
    })
    fastify.setNotFoundHandler((request, reply) => {
        if (request.method == 'GET') {
            const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
            reply.type('text/html').send(stream)
        } else {
            reply.code(404).send(new Error('Not Found'))
        }
    })
}

export default routes