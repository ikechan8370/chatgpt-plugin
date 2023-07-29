import fetch from 'node-fetch'

// this file is deprecated
import {Config} from './config.js'
import HttpsProxyAgent from 'https-proxy-agent'

const newFetch = (url, options = {}) => {
  const defaultOptions = Config.proxy
    ? {
        agent: HttpsProxyAgent(Config.proxy)
      }
    : {}
  const mergedOptions = {
    ...defaultOptions,
    ...options
  }

  return fetch(url, mergedOptions)
}
export async function createCaptcha (e, tokenU) {
  let baseUrl = Config.sydneyReverseProxy
  let imageResponse = await newFetch(`${baseUrl}/edgesvc/turing/captcha/create`, {
    headers: {
      Cookie: `_U=${tokenU};`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.82',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      Referer: 'https://edgeservices.bing.com/edgesvc/chat?udsframed=1&form=SHORUN&clientscopes=chat,noheader,channelstable,&shellsig=ddb7b7dc7a56d0c5350f37b3653696bbeb77496e&setlang=zh-CN&lightschemeovr=1'
    }
  })
  const blob = await imageResponse.blob()
  let id = imageResponse.headers.get('id')
  let regionId = imageResponse.headers.get('Regionid')
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64String = buffer.toString('base64')
  // await e.reply(segment.image(base64String))
  return { id, regionId, image: base64String }
}

export async function solveCaptcha (id, regionId, text, token) {
  let baseUrl = Config.sydneyReverseProxy
  let url = `${baseUrl}/edgesvc/turing/captcha/verify?type=visual&id=${id}&regionId=${regionId}&value=${text}`
  let res = await newFetch(url, {
    headers: {
      Cookie: '_U=' + token,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.82',
      Referer: 'https://edgeservices.bing.com/edgesvc/chat?udsframed=1&form=SHORUN&clientscopes=chat,noheader,channelstable,&shellsig=ddb7b7dc7a56d0c5350f37b3653696bbeb77496e&setlang=zh-CN&lightschemeovr=1'
    }
  })
  res = await res.json()
  if (res.reason === 'Solved') {
    return {
      result: true,
      detail: res
    }
  } else {
    return {
      result: false,
      detail: res
    }
  }
}

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
