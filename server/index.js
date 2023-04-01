import fastify from 'fastify'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'

import fs from 'fs'
import path from 'path'

export async function createServer() {
const __dirname = path.resolve();
const server = fastify({
  logger: true
});


await server.register(cors, {
    origin: '*',
})
await server.register(fstatic, {
    root: path.join(__dirname, 'plugins/chatgpt-plugin/server/static/'),
})
await server.get('/page/*', (request, reply) => {
  const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
  reply.type('text/html').send(stream)
})
server.post('/page', async (request, reply) => {
    const body = request.body || {};
    if (body.code) {
        const dir = 'ChatGPTCache';
        const filename = body.code + '.json';
        const filepath = path.join(dir, filename);
        
        let data = fs.readFileSync(filepath, 'utf8');
        reply.send(data);
    }
})

server.post('/cache', async (request, reply) => {
    const body = request.body || {};
    if (body.content) {
        const dir = 'ChatGPTCache';
        const filename = body.entry + '.json';
        const filepath = path.join(dir, filename);
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filepath, JSON.stringify({
            user: body.content.senderName,
            bot: body.bing ? 'Bing' : 'ChatGPT',
            question: body.content.prompt,
            message: body.content.content,
            quote: []
          }));
          reply.send({ file: body.entry, cacheUrl: `http://47.242.61.68:3321/page/${body.entry}` });
        } catch (err) {
          console.error(err);
          reply.send({ file: body.entry, cacheUrl: `http://47.242.61.68:3321/page/${body.entry}`, error: '生成失败' });
        }
    }
})



server.listen({
    port: 3321,
    host: '0.0.0.0'
}, (error) => {
    if (error) {
        console.error(error);
    }
    server.log.info(`server listening on ${server.server.address().port}`)
});
}