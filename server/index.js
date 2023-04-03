import fastify from 'fastify'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'

import fs from 'fs'
import path from 'path'
import os from 'os'

function getPublicIP() {
  const ifaces = os.networkInterfaces();
  let en0;

  Object.keys(ifaces).forEach((ifname) => {
    let alias = 0;

    ifaces[ifname].forEach(function (iface) {
      if ("IPv4" !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        en0 = iface.address;
        console.log(ifname + ":" + alias, iface.address);
      } else {
        // this interface has only one ipv4 adress
        console.log(ifname, iface.address);
        en0 = iface.address;
      }
      ++alias;
    });
  });
  return en0;
};

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
        const dir = 'resources/ChatGPTCache';
        const filename = body.code + '.json';
        const filepath = path.join(dir, filename);
        
        let data = fs.readFileSync(filepath, 'utf8');
        reply.send(data);
    }
})

server.post('/cache', async (request, reply) => {
    const body = request.body || {};
    if (body.content) {
        const dir = 'resources/ChatGPTCache';
        const filename = body.entry + '.json';
        const filepath = path.join(dir, filename);
        const regexUrl = /\b((?:https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/g;
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filepath, JSON.stringify({
            user: body.content.senderName,
            bot: (body.bing ? 'Bing' : 'ChatGPT'),
            question: body.content.prompt,
            message: body.content.content,
            group: body.content.group,
            quote: body.content.quote.map((item) => (
              {
                text: item.replace(/(.{30}).+/, "$1..."),
                url: item.match(regexUrl)[0]
              }
            ))
          }));
          reply.send({ file: body.entry, cacheUrl: `http://${getPublicIP()}:3321/page/${body.entry}` });
        } catch (err) {
          console.error(err);
          reply.send({ file: body.entry, cacheUrl: `http://${getPublicIP()}/page/${body.entry}`, error: '生成失败' });
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