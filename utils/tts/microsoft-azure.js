import crypto from 'crypto'
import { getDefaultReplySetting, mkdirs } from '../common.js'
import { Config } from '../config.js'
import { translate } from '../translate.js'

let sdk
try {
  sdk = (await import('microsoft-cognitiveservices-speech-sdk')).default
} catch (err) {
  logger.warn('未安装microsoft-cognitiveservices-speech-sdk，无法使用微软Azure语音源')
}
async function generateAudio (text, option = {}, ssml = '') {
  if (!sdk) {
    throw new Error('未安装microsoft-cognitiveservices-speech-sdk，无法使用微软Azure语音源')
  }
  let subscriptionKey = Config.azureTTSKey
  let serviceRegion = Config.azureTTSRegion
  let speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion)
  const _path = process.cwd()
  mkdirs(`${_path}/data/chatgpt/tts/azure`)
  let filename = `${_path}/data/chatgpt/tts/azure/${crypto.randomUUID()}.wav`
  let audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename)
  let synthesizer
  let speaker = option?.speaker || '随机'
  let context = text
  // 打招呼用
  if (speaker === '随机') {
    speaker = supportConfigurations[Math.floor(Math.random() * supportConfigurations.length)].code
    let languagePrefix = supportConfigurations.find(config => config.code === speaker).languageDetail.charAt(0)
    languagePrefix = languagePrefix.startsWith('E') ? '英' : languagePrefix
    context = (await translate(context, languagePrefix)).replace('\n', '')
  }
  if (ssml) {
    synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
    await speakSsmlAsync(synthesizer, ssml)
  } else { // 打招呼用
    speechConfig.speechSynthesisLanguage = option?.language || supportConfigurations.find(config => config.code === speaker).language
    speechConfig.speechSynthesisVoiceName = speaker
    logger.info('using speaker: ' + speaker)
    logger.info('using language: ' + speechConfig.speechSynthesisLanguage)
    synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)
    await speakTextAsync(synthesizer, context)
  }

  console.log('synthesis finished.')
  synthesizer.close()
  return filename
}

async function speakTextAsync (synthesizer, text) {
  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(text, result => {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        logger.info('speakTextAsync: true')
        resolve()
      } else {
        console.error('Speech synthesis canceled, ' + result.errorDetails +
            '\nDid you update the subscription info?')
        reject(result.errorDetails)
      }
    }, err => {
      console.error('err - ' + err)
      reject(err)
    })
  })
}

async function speakSsmlAsync (synthesizer, ssml) {
  return new Promise((resolve, reject) => {
    synthesizer.speakSsmlAsync(ssml, result => {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        logger.info('speakSsmlAsync: true')
        resolve()
      } else {
        console.error('Speech synthesis canceled, ' + result.errorDetails +
            '\nDid you update the subscription info?')
        reject(result.errorDetails)
      }
    }, err => {
      console.error('err - ' + err)
      reject(err)
    })
  })
}
async function generateSsml (text, option = {}) {
  let speaker = option?.speaker || '随机'
  let emotionDegree, role, emotion
  // 打招呼用
  if (speaker === '随机') {
    role = supportConfigurations[Math.floor(Math.random() * supportConfigurations.length)]
    speaker = role.code
    if (role?.emotion) {
      const keys = Object.keys(role.emotion)
      emotion = keys[Math.floor(Math.random() * keys.length)]
    }
    logger.info('using speaker: ' + speaker)
    logger.info('using emotion: ' + emotion)
    emotionDegree = 2
  } else {
    emotion = option.emotion
    emotionDegree = option.emotionDegree
  }
  const expressAs = emotion !== undefined ? `<mstts:express-as style="${emotion}" styledegree="${emotionDegree || 1}">` : ''
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
    xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="${speaker}">
        ${expressAs}${text}${expressAs ? '</mstts:express-as>' : ''}
    </voice>
  </speak>`
}
async function getEmotionPrompt (e) {
  if (!Config.azureTTSEmotion) return ''
  let userReplySetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
  userReplySetting = !userReplySetting
    ? getDefaultReplySetting()
    : JSON.parse(userReplySetting)
  let emotionPrompt = ''
  let ttsRoleAzure = userReplySetting.ttsRoleAzure
  const configuration = Config.ttsMode === 'azure' ? supportConfigurations.find(config => config.code === ttsRoleAzure) : ''
  if (configuration !== '' && configuration?.emotion) {
    // 0-1 感觉没啥区别，说实话只有1和2听得出差别。。
    emotionPrompt = `\n在回复的最开始使用[]在其中表示你这次回复的情绪风格和程度(1-2)，最小单位0.1
                               \n例如：['angry',2]表示你极度愤怒
                               \n这是情绪参考值，禁止使用给出范围以外的词，且单次回复只需要给出一个情绪表示
                               \n${JSON.stringify(configuration.emotion)}
                               \n另外，不要在情绪[]前后使用回车换行，如果你明白上面的设定，请回复’好的，我明白了‘并在后续的对话中严格执行此设定。`
    // logger.warn('emotionPrompt:', `${JSON.stringify(configuration.emotion)}`)
  } else {
    return ''
  }
  return emotionPrompt
}
export const supportConfigurations = [
  {
    code: 'zh-CN-liaoning-XiaobeiNeural',
    name: '晓北',
    language: 'zh-CN',
    languageDetail: '中文(东北官话，简体)',
    gender: '女',
    roleInfo: '晓北-女-中文(东北官话，简体)'
  },
  {
    code: 'zh-CN-henan-YundengNeural',
    name: '云登',
    language: 'zh-CN',
    languageDetail: '中文(中原官话河南，简体)',
    gender: '男',
    roleInfo: '云登-男-中文(中原官话河南，简体)'
  },
  {
    code: 'zh-CN-shaanxi-XiaoniNeural',
    name: '晓妮',
    language: 'zh-CN',
    languageDetail: '中文(中原官话陕西，简体)',
    gender: '女',
    roleInfo: '晓妮-女-中文(中原官话陕西，简体)'
  },
  {
    code: 'zh-CN-henan-YundengNeural',
    name: '云翔',
    language: 'zh-CN',
    languageDetail: '中文(冀鲁官话，简体)',
    gender: '男',
    roleInfo: '云翔-男-中文(冀鲁官话，简体)'
  },
  {
    code: 'zh-CN-XiaoxiaoNeural',
    name: '晓晓',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: {
      affectionate: '温暖、亲切的语气',
      angry: '生气和厌恶的语气',
      assistant: '数字助理用的是热情而轻松的语气',
      calm: '沉着冷静的态度说话。语气、音调和韵律统一',
      chat: '表达轻松随意的语气',
      cheerful: '表达积极愉快的语气',
      customerservice: '以友好热情的语气为客户提供支持',
      disgruntled: '轻蔑、抱怨的语气，表现不悦和蔑视',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      fearful: '恐惧、紧张的语气，说话人处于紧张和不安的状态',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      gentle: '温和、礼貌、愉快的语气，音调和音量较低',
      lyrical: '以优美又带感伤的方式表达情感',
      newscast: '以正式专业的语气叙述新闻',
      'poetry-reading': '读诗时带情感和节奏的语气',
      sad: '表达悲伤语气',
      serious: '严肃、命令的语气'
    },
    roleInfo: '晓晓-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-YunxiNeural',
    name: '云希',
    language: 'zh-CN',
    languageDetail: '中文 (普通话，简体)',
    gender: '男',
    emotion: {
      angry: '表达生气和愤怒的语气',
      assistant: '数字助理使用热情而轻松的语气',
      chat: '表达轻松随意的语气',
      cheerful: '表达积极愉快的语气',
      depressed: '表达沮丧、消沉的语气',
      disgruntled: '表达不满、不悦的语气',
      embarrassed: '表达尴尬、难为情的语气',
      fearful: '表达害怕、恐惧的语气',
      'narration-relaxed': '以轻松、自然的语气叙述',
      newscast: '用于新闻播报，表现出庄重、严谨的语气',
      sad: '表达悲伤、失落的语气',
      serious: '表现出认真、严肃的语气'
    },
    roleInfo: '云希-男-中文 (普通话，简体)'
  },
  {
    code: 'zh-CN-YunyangNeural',
    name: '云扬',
    language: 'zh-CN',
    languageDetail: '中文 (普通话，简体)',
    gender: '男',
    emotion: {
      customerservice: '以亲切友好的语气为客户提供支持',
      'narration-professional': '以专业、稳重的语气讲述',
      'newscast-casual': '以轻松自然的语气播报新闻'
    },
    roleInfo: '云扬-男-中文 (普通话，简体)'
  },
  {
    code: 'zh-CN-YunyeNeural',
    name: '云野',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男',
    emotion: {
      angry: '表达愤怒和不满的语气',
      calm: '以冷静的态度说话，不带过多情绪',
      cheerful: '表达快乐和积极的语气',
      disgruntled: '表达不满和不满足的语气',
      embarrassed: '表达不自在或难堪的语气',
      fearful: '表达害怕和不安的语气',
      sad: '表达悲伤和失落的语气',
      serious: '以认真和严肃的态度说话'
    },
    roleInfo: '云野-男-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaoshuangNeural',
    name: '晓双',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: { chat: '表达轻松随意的语气' },
    roleInfo: '晓双-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaoyouNeural',
    name: '晓悠',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    roleInfo: '晓悠-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaoqiuNeural',
    name: '晓秋',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    roleInfo: '晓秋-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaochenNeural',
    name: '晓辰',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    roleInfo: '晓辰-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaoyanNeural',
    name: '晓颜',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    roleInfo: '晓颜-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaomoNeural',
    name: '晓墨',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: {
      affectionate: '温暖、亲切的语气',
      angry: '生气和厌恶的语气',
      calm: '沉着冷静的态度说话。语气、音调和韵律统一',
      cheerful: '表达积极愉快的语气',
      depressed: '调低音调和音量来表达忧郁、沮丧的语气',
      disgruntled: '轻蔑、抱怨的语气，表现不悦和蔑视',
      embarrassed: '在说话者感到不舒适时表达不确定、犹豫的语气',
      envious: '当你渴望别人拥有的东西时，表达一种钦佩的语气',
      fearful: '恐惧、紧张的语气，说话人处于紧张和不安的状态',
      gentle: '温和、礼貌、愉快的语气，音调和音量较低',
      sad: '表达悲伤语气',
      serious: '严肃、命令的语气'
    },
    roleInfo: '晓墨-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaoxuanNeural',
    name: '晓萱',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: {
      angry: '生气和厌恶的语气',
      calm: '沉着冷静的态度说话。语气、音调和韵律统一',
      cheerful: '表达积极愉快的语气',
      depressed: '调低音调和音量来表达忧郁、沮丧的语气',
      disgruntled: '轻蔑、抱怨的语气，表现不悦和蔑视',
      fearful: '恐惧、紧张的语气，说话人处于紧张和不安的状态',
      gentle: '温和、礼貌、愉快的语气，音调和音量较低',
      serious: '严肃、命令的语气'
    },
    roleInfo: '晓萱-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaohanNeural',
    name: '晓涵',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: {
      affectionate: '温暖、亲切的语气',
      angry: '生气和厌恶的语气',
      calm: '沉着冷静的态度说话。语气、音调和韵律统一',
      cheerful: '表达积极愉快的语气',
      disgruntled: '轻蔑、抱怨的语气，表现不悦和蔑视',
      embarrassed: '在说话者感到不舒适时表达不确定、犹豫的语气',
      fearful: '恐惧、紧张的语气，说话人处于紧张和不安的状态',
      gentle: '温和、礼貌、愉快的语气，音调和音量较低',
      sad: '表达悲伤语气',
      serious: '严肃、命令的语气'
    },
    roleInfo: '晓涵-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaoruiNeural',
    name: '晓睿',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: {
      angry: '生气和厌恶的语气',
      calm: '沉着冷静的态度说话。语气、音调和韵律统一',
      fearful: '恐惧、紧张的语气，说话人处于紧张和不安的状态',
      sad: '表达悲伤语气'
    },
    roleInfo: '晓睿-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaomengNeural',
    name: '晓梦',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: { chat: '表达轻松随意的语气' },
    roleInfo: '晓梦-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaoyiNeural',
    name: '晓伊',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: {
      angry: '生气和厌恶的语气',
      affectionate: '温暖、亲切的语气',
      cheerful: '表达积极愉快的语气',
      gentle: '温和、礼貌、愉快的语气，音调和音量较低',
      sad: '表达悲伤语气',
      serious: '严肃、命令的语气'
    },
    roleInfo: '晓伊-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-XiaozhenNeural',
    name: '晓甄',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      disgruntled: '轻蔑、抱怨的语气，表现不悦和蔑视',
      fearful: '恐惧、紧张的语气，说话人处于紧张和不安的状态',
      sad: '表达悲伤语气',
      serious: '严肃、命令的语气'
    },
    roleInfo: '晓甄-女-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-YunfengNeural',
    name: '云枫',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      depressed: '调低音调和音量来表达忧郁、沮丧的语气',
      disgruntled: '轻蔑、抱怨的语气，表现不悦和蔑视',
      fearful: '恐惧、紧张的语气，说话人处于紧张和不安的状态',
      sad: '表达悲伤语气',
      serious: '严肃、命令的语气'
    },
    roleInfo: '云枫-男-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-YunhaoNeural',
    name: '云皓',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男',
    roleInfo: '云皓-男-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-YunjianNeural',
    name: '云健',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男',
    emotion: {
      'narration-relaxed': '以轻松、自然的语气进行叙述',
      'sports-commentary': '在解说体育比赛时，使用专业而自信的语气',
      'sports-commentary-excited': '在解说激动人心的体育比赛时，使用兴奋和激动的语气'
    },
    roleInfo: '云健-男-中文(普通话，简体)'
  },
  {
    code: 'zh-CN-YunxiaNeural',
    name: '云夏',
    language: 'zh-CN',
    languageDetail: '中文 (普通话，简体)',
    gender: '男',
    emotion: {
      angry: '生气和厌恶的语气',
      calm: '沉着冷静的态度说话。语气、音调和韵律统一',
      cheerful: '表达积极愉快的语气',
      fearful: '表达害怕、紧张的语气',
      sad: '表达悲伤和失落的语气'
    },
    roleInfo: '云夏-男-中文 (普通话，简体)'
  },
  {
    code: 'zh-CN-YunzeNeural',
    name: '云泽',
    language: 'zh-CN',
    languageDetail: '中文 (普通话，简体)',
    gender: '男',
    emotion: {
      angry: '用愤怒的语气表达强烈的不满和愤怒',
      calm: '以冷静、沉着的语气说话，表现出稳重、深思熟虑的态度',
      cheerful: '表达愉快和轻松的情绪',
      depressed: '用沉闷、低落的语气表达消极、悲伤的情绪',
      disgruntled: '表达不满和不高兴的情绪',
      'documentary-narration': '用一种客观、中立的语气讲述事实和事件',
      fearful: '表达害怕、不安的情绪',
      sad: '用悲伤的语气表达悲伤和失落',
      serious: '以严肃的语气和态度表现出对事情的重视和认真对待'
    },
    roleInfo: '云泽-男-中文 (普通话，简体)'
  },
  {
    code: 'zh-HK-HiuGaaiNeural',
    name: '曉佳',
    language: 'zh-CN',
    languageDetail: '中文(粤语，繁体)',
    gender: '女',
    roleInfo: '曉佳-女-中文(粤语，繁体)'
  },
  {
    code: 'zh-HK-HiuMaanNeural',
    name: '曉曼',
    language: 'zh-CN',
    languageDetail: '中文(粤语，繁体)',
    gender: '女',
    roleInfo: '曉曼-女-中文(粤语，繁体)'
  },
  {
    code: 'zh-HK-WanLungNeural',
    name: '雲龍',
    language: 'zh-CN',
    languageDetail: '中文(粤语，繁体)',
    gender: '男',
    roleInfo: '雲龍-男-中文(粤语，繁体)'
  },
  {
    code: 'en-GB-AbbiNeural',
    name: 'Abbi',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'female',
    roleInfo: 'Abbi-女-英语（英国）'
  },
  {
    code: 'en-GB-AlfieNeural',
    name: 'Alfie',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'male',
    roleInfo: 'Alfie-男-英语（英国）'
  },
  {
    code: 'en-GB-BellaNeural',
    name: 'Bella',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'female',
    roleInfo: 'Bella-女-英语（英国）'
  },
  {
    code: 'en-GB-ElliotNeural',
    name: 'Elliot',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'male',
    roleInfo: 'Elliot-男-英语（英国）'
  },
  {
    code: 'en-GB-EthanNeural',
    name: 'Ethan',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'male',
    roleInfo: 'Ethan-男-英语（英国）'
  },
  {
    code: 'en-GB-HollieNeural',
    name: 'Hollie',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'female',
    roleInfo: 'Hollie-女-英语（英国）'
  },
  {
    code: 'en-GB-LibbyNeural',
    name: 'Libby',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'female',
    roleInfo: 'Libby-女-英语（英国）'
  },
  {
    code: 'en-GB-MaisieNeural',
    name: 'Maisie',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'female',
    roleInfo: 'Maisie-女-英语（英国）'
  },
  {
    code: 'en-GB-NoahNeural',
    name: 'Noah',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'male',
    roleInfo: 'Noah-男-英语（英国）'
  },
  {
    code: 'en-GB-OliverNeural',
    name: 'Oliver',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'male',
    roleInfo: 'Oliver-男-英语（英国）'
  },
  {
    code: 'en-GB-OliviaNeural',
    name: 'Olivia',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'female',
    roleInfo: 'Olivia-女-英语（英国）'
  },
  {
    code: 'en-GB-RyanNeural',
    name: 'Ryan',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'male',
    emotion: { chat: '表达轻松随意的语气', cheerful: '表达积极愉快的语气' },
    roleInfo: 'Ryan-男-英语（英国）'
  },
  {
    code: 'en-GB-SoniaNeural',
    name: 'Sonia',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'female',
    emotion: { cheerful: '表达积极愉快的语气', sad: '表达悲伤语气' },
    roleInfo: 'Sonia-女-英语（英国）'
  },
  {
    code: 'en-GB-ThomasNeural',
    name: 'Thomas',
    language: 'en-GB',
    languageDetail: '英语（英国）',
    gender: 'male',
    roleInfo: 'Thomas-男-英语（英国）'
  },
  {
    code: 'ja-JP-AoiNeural',
    name: '葵',
    language: 'ja-JP',
    languageDetail: '日语（日本）',
    gender: '女',
    roleInfo: '葵-女-日语（日本）'
  },
  {
    code: 'ja-JP-DaichiNeural',
    name: '大地',
    language: 'ja-JP',
    languageDetail: '日语（日本）',
    gender: '男',
    roleInfo: '大地-男-日语（日本）'
  },
  {
    code: 'ja-JP-KeitaNeural',
    name: '慶太',
    language: 'ja-JP',
    languageDetail: '日语（日本）',
    gender: '男',
    roleInfo: '慶太-男-日语（日本）'
  },
  {
    code: 'ja-JP-MayuNeural',
    name: '真由',
    language: 'ja-JP',
    languageDetail: '日语（日本）',
    gender: '女',
    roleInfo: '真由-女-日语（日本）'
  },
  {
    code: 'ja-JP-NanamiNeural',
    name: '七海',
    language: 'ja-JP',
    languageDetail: '日语（日本）',
    gender: '女',
    emotion: {
      chat: '表达轻松随意的语气',
      cheerful: '表达积极愉快的语气',
      customerservice: '以友好热情的语气为客户提供支持'
    },
    roleInfo: '七海-女-日语（日本）'
  },
  {
    code: 'ja-JP-NaokiNeural',
    name: '直樹',
    language: 'ja-JP',
    languageDetail: '日语（日本）',
    gender: '男',
    roleInfo: '直樹-男-日语（日本）'
  },
  {
    code: 'ja-JP-ShioriNeural',
    name: '栞',
    language: 'ja-JP',
    languageDetail: '日语（日本）',
    gender: '女',
    roleInfo: '栞-女-日语（日本）'
  },
  {
    code: 'en-US-AIGenerate1Neural1',
    name: 'AI Generate 1',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '男',
    roleInfo: 'AI Generate 1-男-英语（美国）'
  },
  {
    code: 'en-US-AIGenerate2Neural1',
    name: 'AI Generate 2',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女',
    roleInfo: 'AI Generate 2-女-英语（美国）'
  },
  {
    code: 'en-US-AmberNeural',
    name: 'Amber',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女',
    roleInfo: 'Amber-女-英语（美国）'
  },
  {
    code: 'en-US-AnaNeural',
    name: 'Ana',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女性、儿童',
    roleInfo: 'Ana-女性、儿童-英语（美国）'
  },
  {
    code: 'en-US-AriaNeural',
    name: 'Aria',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔',
      chat: '表达轻松随意的语气',
      customerservice: '以友好热情的语气为客户提供支持',
      empathetic: '表达关心和理解',
      'narration-professional': '以专业、客观的语气朗读内容',
      'newscast-casual': '以通用、随意的语气发布一般新闻',
      'newscast-formal': '以正式、自信和权威的语气发布新闻'
    },
    roleInfo: 'Aria-女-英语（美国）'
  },
  {
    code: 'en-US-AshleyNeural',
    name: 'Ashley',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女',
    roleInfo: 'Ashley-女-英语（美国）'
  },
  {
    code: 'en-US-BrandonNeural',
    name: 'Brandon',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '男',
    roleInfo: 'Brandon-男-英语（美国）'
  },
  {
    code: 'en-US-ChristopherNeural',
    name: 'Christopher',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '男',
    roleInfo: 'Christopher-男-英语（美国）'
  },
  {
    code: 'en-US-CoraNeural',
    name: 'Cora',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女',
    roleInfo: 'Cora-女-英语（美国）'
  },
  {
    code: 'en-US-DavisNeural',
    name: 'Davis',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '男',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔'
    },
    roleInfo: 'Davis-男-英语（美国）'
  },
  {
    code: 'en-US-ElizabethNeural',
    name: 'Elizabeth',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女',
    roleInfo: 'Elizabeth-女-英语（美国）'
  },
  {
    code: 'en-US-EricNeural',
    name: 'Eric',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '男',
    roleInfo: 'Eric-男-英语（美国）'
  },
  {
    code: 'en-US-GuyNeural',
    name: 'Guy',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '男',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔',
      newscast: '以正式专业的语气叙述新闻'
    },
    roleInfo: 'Guy-男-英语（美国）'
  },
  {
    code: 'en-US-JacobNeural',
    name: 'Jacob',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '男',
    roleInfo: 'Jacob-男-英语（美国）'
  },
  {
    code: 'en-US-JaneNeural',
    name: 'Jane',
    language: 'en-US',
    languageDetail: 'English (United States)',
    gender: '女',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔'
    },
    roleInfo: 'Jane-女-英语（美国）'
  },
  {
    code: 'en-US-JasonNeural',
    name: 'Jason',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'male',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔'
    },
    roleInfo: 'Jason-男-英语（美国）'
  },
  {
    code: 'en-US-JennyNeural',
    name: 'Jenny',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'female',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔',
      assistant: '数字助理用的是热情而轻松的语气',
      chat: '表达轻松随意的语气',
      customerservice: '以友好热情的语气为客户提供支持',
      newscast: '以正式专业的语气叙述新闻'
    },
    roleInfo: 'Jenny-女-英语（美国）'
  },
  {
    code: 'en-US-MichelleNeural',
    name: 'Michelle',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'female',
    roleInfo: 'Michelle-女-英语（美国）'
  },
  {
    code: 'en-US-MonicaNeural',
    name: 'Monica',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'female',
    roleInfo: 'Monica-女-英语（美国）'
  },
  {
    code: 'en-US-NancyNeural',
    name: 'Nancy',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'female',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔'
    },
    roleInfo: 'Nancy-女-英语（美国）'
  },
  {
    code: 'en-US-RogerNeural',
    name: 'Roger',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'male',
    roleInfo: 'Roger-男-英语（美国）'
  },
  {
    code: 'en-US-SaraNeural',
    name: 'Sara',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'female',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔'
    },
    roleInfo: 'Sara-女-英语（美国）'
  },
  {
    code: 'en-US-SteffanNeural',
    name: 'Steffan',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'male',
    roleInfo: 'Steffan-男-英语（美国）'
  },
  {
    code: 'en-US-TonyNeural',
    name: 'Tony',
    language: 'en-US',
    languageDetail: '英语（美国）',
    gender: 'male',
    emotion: {
      angry: '生气和厌恶的语气',
      cheerful: '表达积极愉快的语气',
      excited: '乐观、充满希望的语气，发生了美好的事情',
      friendly: '愉快、怡人、温暖、真诚、关切的语气',
      hopeful: '温暖且渴望的语气。像是会有好事发生',
      sad: '表达悲伤语气',
      shouting: '就像从遥远的地方说话或在外面说话',
      terrified: '非常害怕的语气，语速快且声音颤抖。不稳定的疯狂状态',
      unfriendly: '表达一种冷淡无情的语气',
      whispering: '说话非常柔和，发出的声音小且温柔'
    },
    roleInfo: 'Tony-男-英语（美国）'
  },
  {
    code: 'en-IN-NeerjaNeural',
    name: 'Neerja',
    language: 'en',
    languageDetail: '英语（印度）',
    gender: 'female',
    roleInfo: 'Neerja-女-英语（印度）'
  },
  {
    code: 'en-IN-PrabhatNeural',
    name: 'Prabhat',
    language: 'en',
    languageDetail: '英语（印度）',
    gender: 'male',
    roleInfo: 'Prabhat-男-英语（印度）'
  }
]

export default { generateAudio, generateSsml, getEmotionPrompt, supportConfigurations }
