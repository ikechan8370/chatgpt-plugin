import { GoogleGeminiClient } from './GoogleGeminiClient.js'

async function test () {
  const client = new GoogleGeminiClient({
    e: {},
    userId: 'test',
    key: 'AIzaSyBZEC3SLp0CVDnNY8WoRT7hn0LB8zn8dFA',
    model: 'gemini-pro'
  })
}
