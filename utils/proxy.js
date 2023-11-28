// workaround for ver 7.x and ver 5.x
import HttpsProxyAgent from 'https-proxy-agent'

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
