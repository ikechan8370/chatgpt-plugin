import fs from 'fs'
import lodash from 'lodash'
export const defaultChatGPTAPI = 'https://chat3.avocado.wiki/backend-api/conversation'
export const officialChatGPTAPI = 'https://chat3.avocado.wiki/backend-api/conversation'
// Reverse proxy of https://api.openai.com
export const defaultOpenAIReverseProxy = 'https://mondstadt.d201.eu.org/v1'
// blocked in China Mainland
export const defaultOpenAIAPI = 'https://api.openai.com/v1'
export const pureSydneyInstruction = 'You\'re an AI assistant named [name]. Answer using the same language as the user.'
const defaultConfig = {
  blockWords: ['屏蔽词1', '屏蔽词b'],
  promptBlockWords: ['屏蔽词1', '屏蔽词b'],
  imgOcr: true,
  defaultUsePicture: false,
  defaultUseTTS: false,
  defaultTTSRole: '纳西妲',
  alsoSendText: false,
  autoUsePicture: true,
  autoUsePictureThreshold: 1200,
  ttsAutoFallbackThreshold: 299,
  conversationPreserveTime: 0,
  toggleMode: 'at',
  groupMerge: false,
  quoteReply: true,
  showQRCode: true,
  apiKey: '',
  openAiBaseUrl: defaultOpenAIReverseProxy,
  OpenAiPlatformRefreshToken: '',
  openAiForceUseReverse: false,
  apiStream: false,
  drawCD: 30,
  model: '',
  temperature: 0.8,
  /**
   * @type {'Precise' | 'Balanced' | 'Creative'}
   */
  toneStyle: 'Creative',
  sydney: pureSydneyInstruction,
  sydneyReverseProxy: 'https://666102.201666.xyz',
  sydneyForceUseReverse: false,
  sydneyWebsocketUseProxy: true,
  sydneyBrainWash: true,
  sydneyBrainWashStrength: 15,
  sydneyBrainWashName: 'Sydney',
  sydneyMood: false,
  sydneyGPTs: 'Copilot',
  sydneyImageRecognition: false,
  sydneyMoodTip: 'Your response should be divided into two parts, namely, the text and your mood. The mood available to you can only include: blandness, happy, shy, frustrated, disgusted, and frightened.All content should be replied in this format {"text": "", "mood": ""}.All content except mood should be placed in text, It is important to ensure that the content you reply to can be parsed by json.',
  chatExampleUser1: '',
  chatExampleUser2: '',
  chatExampleUser3: '',
  chatExampleBot1: '',
  chatExampleBot2: '',
  chatExampleBot3: '',
  enableSuggestedResponses: false,
  sydneyEnableSearch: false,
  api: defaultChatGPTAPI,
  apiBaseUrl: 'https://chat3.avocado.wiki/backend-api',
  apiForceUseReverse: false,
  plus: false,
  useGPT4: false,
  xinghuoToken: '',
  xhmode: 'web',
  xhAppId: '',
  xhAPISecret: '',
  xhAPIKey: '',
  xhAssistants: '',
  xhTemperature: 0.5,
  xhMaxTokens: 1024,
  xhPromptSerialize: false,
  xhPrompt: '',
  xhPromptEval: false,
  xhRetRegExp: '',
  xhRetReplace: '',
  promptPrefixOverride: 'Your answer shouldn\'t be too verbose. Prefer to answer in Chinese.',
  assistantLabel: 'ChatGPT',
  headless: false,
  chromePath: '',
  proxy: '',
  debug: true,
  defaultTimeoutMs: 120000,
  chromeTimeoutMS: 120000,
  sydneyFirstMessageTimeout: 40000,
  sunoApiTimeout: 60,
  ttsSpace: '',
  // https://114514.201666.xyz
  huggingFaceReverseProxy: '',
  noiseScale: 0.6,
  noiseScaleW: 0.668,
  lengthScale: 1.2,
  initiativeChatGroups: [],
  enableDraw: true,
  helloPrompt: '写一段话让大家来找我聊天。类似于“有人找我聊天吗？"这种风格，轻松随意一点控制在20个字以内',
  helloInterval: 3,
  helloProbability: 50,
  chatglmBaseUrl: 'http://localhost:8080',
  allowOtherMode: true,
  sydneyContext: '',
  emojiBaseURL: 'https://www.gstatic.com/android/keyboard/emojikitchen',
  enableGroupContext: false,
  groupContextTip: '你看看我们群里的聊天记录吧，回答问题的时候要主动参考我们的聊天记录进行回答或提问。但要看清楚哦，不要把我和其他人弄混啦，也不要把自己看晕啦~~',
  groupContextLength: 50,
  enableRobotAt: true,
  maxNumUserMessagesInConversation: 30,
  sydneyApologyIgnored: true,
  enforceMaster: false,
  bingAPDraw: false,
  bingSuno: 'bing',
  bingSunoApi: '',
  serverPort: 3321,
  serverHost: '',
  viewHost: '',
  chatViewWidth: 1280,
  chatViewBotName: '',
  live2d: false,
  live2dModel: '/live2d/Murasame/Murasame.model3.json',
  live2dOption_scale: 0.1,
  live2dOption_positionX: 0,
  live2dOption_positionY: 0,
  live2dOption_rotation: 0,
  live2dOption_alpha: 1,
  groupAdminPage: false,
  enablePrivateChat: false,
  whitelist: [],
  blacklist: [],
  ttsRegex: '/匹配规则/匹配模式',
  slackUserToken: '',
  slackBotUserToken: '',
  // slackChannelId: '',
  slackSigningSecret: '',
  slackClaudeUserId: '',
  slackClaudeEnableGlobalPreset: true,
  slackClaudeGlobalPreset: '',
  slackClaudeSpecifiedChannel: '',
  // slackCozeUserId: '',
  // slackCozeEnableGlobalPreset: true,
  // slackCozeGlobalPreset: '',
  // slackCozeSpecifiedChannel: '',
  cloudTranscode: 'https://silk.201666.xyz',
  cloudRender: false,
  cloudMode: 'url',
  cloudDPR: 1,
  ttsMode: 'vits-uma-genshin-honkai', // or azure
  azureTTSKey: '',
  azureTTSRegion: '',
  azureTTSSpeaker: 'zh-CN-XiaochenNeural',
  voicevoxSpace: '',
  voicevoxTTSSpeaker: '护士机器子T',
  azureTTSEmotion: false,
  enhanceAzureTTSEmotion: false,
  autoJapanese: false,
  enableGenerateContents: false,
  enableGenerateSuno: false,
  amapKey: '',
  azSerpKey: '',
  serpSource: 'ikechan8370',
  extraUrl: 'https://cpe.ikechan8370.com',
  smartMode: false,
  bingCaptchaOneShotUrl: '',
  // claude2
  claudeAIOrganizationId: '',
  claudeAISessionKey: '',
  claudeAIReverseProxy: '',
  claudeAITimeout: 120,
  claudeAIJA3: '772,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,27-5-65281-13-35-0-51-18-16-43-10-45-11-17513-23,29-23-24,0',
  claudeAIUA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  // trss配置
  trssBotUin: '',
  // 同义千问
  qwenApiKey: '',
  qwenModel: 'qwen-turbo',
  qwenTopP: 0.5,
  qwenTopK: 50,
  qwenSeed: 0,
  qwenTemperature: 1,
  qwenEnableSearch: true,
  geminiKey: '',
  geminiModel: 'gemini-pro',
  geminiPrompt: 'You are Gemini. Your answer shouldn\'t be too verbose. Prefer to answer in Chinese.',
  // origin: https://generativelanguage.googleapis.com
  geminiBaseUrl: 'https://gemini.ikechan8370.com',
  chatglmRefreshToken: '',
  sunoSessToken: '',
  sunoClientToken: '',
  enableChatSuno: false,
  SunoModel: 'local',

  claudeApiKey: '',
  claudeApiBaseUrl: 'http://claude-api.ikechan8370.com',
  claudeApiMaxToken: 1024,
  claudeApiTemperature: 0.8,
  claudeApiModel: '', // claude-3-opus-20240229 claude-3-sonnet-20240229
  claudeSystemPrompt: '', // claude api 设定
  translateSource: 'openai',
  enableMd: false, // 第三方md，非QQBot。需要适配器实现segment.markdown和segment.button方可使用，否则不建议开启，会造成各种错误
  enableToolbox: true, // 默认关闭工具箱节省占用和加速启动
  version: 'v2.8.1'
}
const _path = process.cwd()
let config = {}
if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/config/config.json`)) {
  const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/config/config.json`)
  const data = fs.readFileSync(fullPath)
  if (data) {
    try {
      config = JSON.parse(data)
    } catch (e) {
      logger.error('chatgpt插件读取配置文件出错，请检查config/config.json格式，将忽略用户配置转为使用默认配置', e)
      logger.warn('chatgpt插件即将使用默认配置')
    }
  }
} else if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/config/config.js`)) {
  // 旧版本的config.js，读取其内容，生成config.json，然后删掉config.js
  const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/config/config.js`)
  config = (await import(`file://${fullPath}`)).default
  try {
    logger.warn('[ChatGPT-Plugin]发现旧版本config.js文件，正在读取其内容并转换为新版本config.json文件')
    // 读取其内容，生成config.json
    fs.writeFileSync(`${_path}/plugins/chatgpt-plugin/config/config.json`, JSON.stringify(config, null, 2))
    // 删掉config.js
    fs.unlinkSync(`${_path}/plugins/chatgpt-plugin/config/config.js`)
    logger.info('[ChatGPT-Plugin]配置文件转换处理完成')
  } catch (err) {
    logger.error('[ChatGPT-Plugin]转换旧版配置文件失败，建议手动清理旧版config.js文件，并转为使用新版config.json格式', err)
  }
} else if (fs.existsSync(`${_path}/plugins/chatgpt-plugin/config/index.js`)) {
  // 兼容旧版本
  const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/config/index.js`)
  config = (await import(`file://${fullPath}`)).Config
  try {
    logger.warn('[ChatGPT-Plugin]发现旧版本config.js文件，正在读取其内容并转换为新版本config.json文件')
    // 读取其内容，生成config.json
    fs.writeFileSync(`${_path}/plugins/chatgpt-plugin/config/config.json`, JSON.stringify(config, null, 2))
    // index.js
    fs.unlinkSync(`${_path}/plugins/chatgpt-plugin/config/index.js`)
    logger.info('[ChatGPT-Plugin]配置文件转换处理完成')
  } catch (err) {
    logger.error('[ChatGPT-Plugin]转换旧版配置文件失败，建议手动清理旧版index.js文件，并转为使用新版config.json格式', err)
  }
}
config = Object.assign({}, defaultConfig, config)
config.version = defaultConfig.version
// const latestTag = execSync(`cd ${_path}/plugins/chatgpt-plugin && git describe --tags --abbrev=0`).toString().trim()
// config.version = latestTag

export const Config = new Proxy(config, {
  set (target, property, value) {
    target[property] = value
    const change = lodash.transform(target, function (result, value, key) {
      if (!lodash.isEqual(value, defaultConfig[key])) {
        result[key] = value
      }
    })
    try {
      fs.writeFileSync(`${_path}/plugins/chatgpt-plugin/config/config.json`, JSON.stringify(change, null, 2), { flag: 'w' })
    } catch (err) {
      logger.error(err)
      return false
    }
    return true
  }
})
