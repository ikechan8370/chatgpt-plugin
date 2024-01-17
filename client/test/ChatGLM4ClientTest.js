import { ChatGLM4Client } from '../ChatGLM4Client.js'

async function sendMsg () {
  const client = new ChatGLM4Client({
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTcwNTQ2NjMwMywianRpIjoiOTc2OGVlMzAtNDIxZS00Nzk2LWIxN2UtYjc0MDA3NmFhMGUyIiwidHlwZSI6InJlZnJlc2giLCJzdWIiOiJhNWRiZDcyOTMwYWY0ZWY0YjVjZDBiM2M2YzBkNzRmZiIsIm5iZiI6MTcwNTQ2NjMwMywiZXhwIjoxNzIxMDE4MzAzLCJ1aWQiOiI2NWE3M2ExNmVmNjQ2ZWIxODA2OGY3ODAiLCJ1cGxhdGZvcm0iOiJoNSIsInJvbGVzIjpbInVuYXV0aGVkX3VzZXIiXX0.vlxSwm7pXaFT6v9jNJ0IlTButLx8n4tIkKhF_d7Jvww',
    debug: true
  })
  let res = await client.sendMessage('你好啊')
  console.log(res)
}
global.redis = null
global.logger = {
  info: console.log,
  warn: console.warn,
  error: console.error
}
sendMsg()
