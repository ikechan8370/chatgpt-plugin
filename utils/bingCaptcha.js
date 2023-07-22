import fetch from 'node-fetch'
import { Config } from './config.js'
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
    }
  })
  const blob = await imageResponse.blob()
  let id = imageResponse.headers.get('id')
  const arrayBuffer = await blob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64String = buffer.toString('base64')
  // await e.reply(segment.image(base64String))
  return { id, image: base64String }
}

export async function solveCaptcha (id, text, token) {
  let baseUrl = Config.sydneyReverseProxy
  let url = `${baseUrl}/edgesvc/turing/captcha/verify?type=visual&id=${id}&regionId=0&value=${text}`
  let res = await newFetch(url, {
    headers: {
      Cookie: '_U=' + token
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
