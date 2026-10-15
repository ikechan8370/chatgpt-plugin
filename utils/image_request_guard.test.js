import assert from 'node:assert/strict'
import test from 'node:test'
import { installImageRequestGuard, limitRequestImages } from './image_request_guard.js'

test('unchanged text/URL history is passed through without copying', async () => {
  const history = [{ role: 'user', content: [{ type: 'text', text: 'hi' }, { type: 'image', image: 'https://example.com/image.png' }] }]
  assert.equal(await limitRequestImages(history, 10485760), history)
})

test('a failure identifies the historical image and prevents the transport call', async () => {
  let calls = 0
  class Client { async _sendMessage () { calls++ } }
  installImageRequestGuard([Client], () => 10485760, async () => { throw new Error('浏览器不可用') })
  const history = Array.from({ length: 14 }, () => ({ role: 'user', content: [] }))
  history[13].content = [...Array.from({ length: 6 }, () => ({ type: 'text', text: 'context' })), { type: 'image', image: 'oversized' }]
  await assert.rejects(new Client()._sendMessage(history), /messages\.13\.content\.6.*浏览器不可用/)
  assert.equal(calls, 0)
})

test('installation is idempotent, reads live config, and guards every request round', async () => {
  const seen = []
  const limits = []
  let configuredLimit = 100
  class Client {
    async _sendMessage (messages, apiKey, options) {
      seen.push({ client: this, messages, apiKey, options })
      return messages
    }
  }
  const limit = async (item, max) => { limits.push(max); return { ...item, image: 'compressed' } }
  installImageRequestGuard([Client], () => configuredLimit, limit)
  const installed = Client.prototype._sendMessage
  installImageRequestGuard([Client], () => configuredLimit, limit)
  assert.equal(Client.prototype._sendMessage, installed)
  const client = new Client()
  const history = [{ role: 'user', content: [{ type: 'image', image: 'original', ref: 'ref' }] }]
  const options = { model: 'test' }
  await client._sendMessage(history, 'key', options)
  configuredLimit = 200
  await client._sendMessage(history, 'key', options)
  assert.deepEqual(limits, [100, 200])
  assert.equal(seen[0].client, client)
  assert.equal(seen[0].apiKey, 'key')
  assert.equal(seen[0].options, options)
  assert.equal(seen[0].messages[0].content[0].ref, 'ref')
  assert.equal(history[0].content[0].image, 'original')
})
