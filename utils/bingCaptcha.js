import fetch from 'node-fetch'

// this file is deprecated
import { Config } from './config.js'
export async function solveCaptchaOneShot (token) {
  if (!token) {
    throw new Error('no token')
  }
  let solveUrl = Config.bingCaptchaOneShotUrl
  if (!solveUrl) {
    throw new Error('no captcha source')
  }
  logger.info(`尝试解决token${token}的验证码`)
  let result = await fetch(solveUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      _U: token
    })
  })
  if (result.status === 200) {
    return await result.json()
  } else {
    return {
      success: false,
      error: result.statusText
    }
  }
}
