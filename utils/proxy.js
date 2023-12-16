// workaround for ver 7.x and ver 5.x
import HttpsProxyAgent from 'https-proxy-agent'
import { Config } from './config.js'
import fetch from 'node-fetch'

let proxy = HttpsProxyAgent
if (typeof proxy !== 'function') {
  proxy = (p) => {
    return new HttpsProxyAgent.HttpsProxyAgent(p)
  }
}

/**
 * return a proxy function
 * @returns {*|createHttpsProxyAgent|((opts: (string | createHttpsProxyAgent.HttpsProxyAgentOptions)) => HttpsProxyAgent)}
 */
export function getProxy () {
  return proxy
}

export const newFetch = (url, options = {}) => {
  const defaultOptions = Config.proxy
    ? {
        agent: proxy(Config.proxy)
      }
    : {}
  const mergedOptions = {
    ...defaultOptions,
    ...options
  }

  return fetch(url, mergedOptions)
}
