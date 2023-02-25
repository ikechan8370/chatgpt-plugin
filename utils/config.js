import fs from 'fs'
import lodash from 'lodash'
const defaultConfig = {
  blockWords: ['屏蔽词1', '屏蔽词b'],
  promptBlockWords: ['屏蔽词1', '屏蔽词b'],
  imgOcr: true,
  defaultUsePicture: false,
  autoUsePicture: true,
  autoUsePictureThreshold: 1200,
  conversationPreserveTime: 0,
  toggleMode: 'at',
  showQRCode: true,
  cacheUrl: 'https://content.alcedogroup.com',
  cacheEntry: false,
  apiKey: '',
  drawCD: 30,
  model: '',
  api: 'https://chatgpt.duti.tech/api/conversation',
  apiBaseUrl: 'https://chatgpt.duti.tech/api',
  plus: false,
  reverseProxy: 'https://chatgpt.pawan.krd/api/completions',
  promptPrefixOverride: 'Your answer shouldn\'t be too verbose. If you are generating a list, do not have too many items. Keep the number of items short. Prefer to answer in Chinese.',
  assistantLabel: 'ChatGPT',
  thinkingTips: true,
  username: '',
  password: '',
  UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  headless: false,
  chromePath: '',
  '2captchaToken': '',
  proxy: '',
  debug: true,
  defaultTimeoutMs: 120000,
  chromeTimeoutMS: 120000,
  version: '2.0.0'
}
const _path = process.cwd()
let config = {}
if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/config/config.js`)) {
  const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/config/config.js`)
  config = (await import(`file://${fullPath}`)).default
} else if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/config/index.js`)) {
  // 兼容旧版本
  const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/config/index.js`)
  config = (await import(`file://${fullPath}`)).Config
}
config = Object.assign({}, defaultConfig, config)
export const Config = new Proxy(config, {
  set (target, property, value) {
    target[property] = value
    const change = lodash.transform(target, function (result, value, key) {
      if (!lodash.isEqual(value, defaultConfig[key])) {
        result[key] = value
      }
    })
    try {
      fs.writeFileSync(`${_path}/plugins/chatgpt-plugin/config/config.js`, `export default ${JSON.stringify(change, '', '\t')}`, { flag: 'w' })
    } catch (err) {
      console.error(err)
      return false
    }
    return true
  }
})
