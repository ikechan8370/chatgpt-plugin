import fs from 'fs'
const defaultConfig = {
  blockWords: ['屏蔽词1', '屏蔽词b'],
  defaultUsePicture: false,
  autoUsePicture: true,
  autoUsePictureThreshold: 1200,
  conversationPreserveTime: 0,
  toggleMode: 'at',
  showQRCode: true,
  cacheUrl: 'http://content.alcedogroup.com/cache',
  apiKey: '',
  model: '',
  api: 'https://chatgpt.duti.tech/api/conversation',
  apiBaseUrl: 'https://chatgpt.duti.tech',
  plus: false,
  reverseProxy: 'https://chatgpt.pawan.krd/api/completions',
  promptPrefixOverride: 'Your answer shouldn\'t be too verbose. If you are generating a list, do not have too many items. Keep the number of items short. Prefer to answer in Chinese.',
  assistantLabel: 'ChatGPT',
  username: '',
  password: '',
  headless: false,
  chromePath: '',
  '2captchaToken': '',
  proxy: '',
  debug: true,
  defaultTimeoutMs: 120000,
  chromeTimeoutMS: 120000
}
const _path = process.cwd()
let config = {}
if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/config/config.js`)) {
  const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/config/config.js`);
  config = (await import(fullPath)).default;
} else if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/config/index.js`)) {
  // 兼容旧版本
  const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/config/index.js`);
  config = (await import(fullPath)).Config;
}

export const Config = Object.assign({}, defaultConfig, config);