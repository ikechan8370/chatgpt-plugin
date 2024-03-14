import { newFetch } from '../utils/proxy.js'
import common from '../../../lib/common/common.js'
import { decrypt } from '../utils/jwt.js'
import { FormData } from 'node-fetch'

export class SunoClient {
  constructor (options) {
    this.options = options
    this.sessToken = options.sessToken
    this.clientToken = options.clientToken
    if (!this.clientToken || !this.sessToken) {
      throw new Error('Token is required')
    }
  }

  async getToken () {
    let lastToken = this.sessToken
    let payload = decrypt(lastToken)
    let sid = JSON.parse(payload).sid
    logger.debug('sid: ' + sid)
    let tokenRes = await newFetch(`https://clerk.suno.ai/v1/client/sessions/${sid}/tokens/api?_clerk_js_version=4.70.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: `__client=${this.clientToken};`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Origin: 'https://app.suno.ai',
        Referer: 'https://app.suno.ai/create/'
      }
    })
    let tokenData = await tokenRes.json()
    let token = tokenData.jwt
    logger.info('new token got: ' + token)
    return token
  }

  async createSong (description) {
    let sess = await this.getToken()
    let createRes = await newFetch('https://studio-api.suno.ai/api/generate/v2/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sess}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Origin: 'https://app.suno.ai',
        Referer: 'https://app.suno.ai/create/',
        Cookie: `__sess=${sess}`
      },
      body: JSON.stringify({ gpt_description_prompt: description, mv: 'chirp-v2-engine-v13', prompt: '' })
    })

    if (createRes.status !== 200) {
      console.log(await createRes.json())
      throw new Error('Failed to create song ' + createRes.status)
    }
    let createData = await createRes.json()
    let ids = createData?.clips?.map(clip => clip.id)
    let queryUrl = `https://studio-api.suno.ai/api/feed/?ids=${ids[0]}%2C${ids[1]}`
    let allDone = false; let songs = []
    let timeout = 60
    while (timeout > 0 && !allDone) {
      try {
        let queryRes = await newFetch(queryUrl, {
          headers: {
            Authorization: `Bearer ${sess}`
          }
        })
        if (queryRes.status === 401) {
          sess = await this.getToken()
          continue
        }
        if (queryRes.status !== 200) {
          logger.error(await queryRes.text())
          console.error('Failed to query song')
        }
        let queryData = await queryRes.json()
        logger.debug(queryData)
        allDone = queryData.every(clip => clip.status === 'complete' || clip.status === 'error')
        songs = queryData.filter(clip => clip.status === 'complete')
      } catch (err) {
        console.error(err)
      }
      await common.sleep(1000)
      timeout--
    }
    return songs
  }

  async queryUser (sess) {
    if (!sess) {
      sess = await this.getToken()
    }
    let userRes = await newFetch('https://studio-api.suno.ai/api/session/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sess}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Origin: 'https://app.suno.ai',
        Referer: 'https://app.suno.ai/create/',
        Cookie: `__sess=${sess}`
      }
    })
    let userData = await userRes.json()
    logger.debug(userData)
    let user = userData?.user.email
    return user
  }

  async queryCredit () {
    let sess = await this.getToken()
    let infoRes = await newFetch('https://studio-api.suno.ai/api/billing/info/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sess}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Origin: 'https://app.suno.ai',
        Referer: 'https://app.suno.ai/create/',
        Cookie: `__sess=${sess}`
      }
    })
    let infoData = await infoRes.json()
    logger.debug(infoData)
    let credit = infoData?.total_credits_left
    let email = await this.queryUser(sess)
    return {
      email, credit
    }
  }

  async heartbeat () {
    let lastToken = this.sessToken
    let payload = decrypt(lastToken)
    let sid = JSON.parse(payload).sid
    logger.debug('sid: ' + sid)
    let heartbeatUrl = `https://clerk.suno.ai/v1/client/sessions/${sid}/touch?_clerk_js_version=4.70.0`
    let heartbeatRes = await fetch(heartbeatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: `__client=${this.clientToken};`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Origin: 'https://app.suno.ai',
        Referer: 'https://app.suno.ai/create/'
      },
      body: 'active_organization_id='
    })
    logger.debug(await heartbeatRes.text())
    if (heartbeatRes.status === 200) {
      logger.debug('heartbeat success')
      return true
    }
  }
}
