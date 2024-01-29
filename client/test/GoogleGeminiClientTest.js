import { GoogleGeminiClient } from '../GoogleGeminiClient.js'

async function test () {
  const client = new GoogleGeminiClient({
    e: {},
    userId: 'test',
    key: '',
    model: 'gemini-pro'
  })
}
