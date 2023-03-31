import fastify from 'fastify'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'
import fastifyVite from 'fastify-vite'

import fs from 'fs'
import path from 'path'

export async function createServer() {
const __dirname = path.resolve();
const server = fastify();

await server.register(fastifyVite, {})

await server.register(cors, {
    origin: '*',
})
await server.register(fstatic, {
    root: path.join(__dirname, 'plugins/chatgpt-plugin/server/static/'),
    prefix: '/'
})

server.post('/page', async (request, reply) => {
    const body = request.body || {};
    if (body.code) {
        const dir = 'ChatGPTCache';
        const filename = body.code + '.json';
        const filepath = path.join(dir, filename);
        fs.readFile(filepath, 'utf8', (err, data) => {
          if (err) {
            console.error(err);
            return;
          }
          reply.send(data);
        })
    }
})

server.post('/cache', async (request, reply) => {
    const body = request.body || {};
    if (body.content) {
        const dir = 'ChatGPTCache';
        const filename = body.entry + '.json';
        const filepath = path.join(dir, filename);
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                reply.send({
                    cache: 'err',
                });
                return;
            }
            fs.writeFile(filepath, JSON.stringify({
                user: body.content.senderName,
                bot: body.bing ? 'Bing' : 'ChatGPT',
                question: body.content.prompt,
                message: body.content.content,
                quote: []
            }), (err) => {
                if (err) {
                    console.error(err);
                    reply.send({
                        cache: 'err',
                    });
                    return;
                }
                reply.send({
                    cache: 'ok',
                });
            });
        });
    }
})


server.listen({
    port: 3321,
    host: 'localhost'
}, (error) => {
    if (error) {
        console.error(error);
    }
    server.log.info(`server listening on ${server.server.address().port}`)
});
}