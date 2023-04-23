
import crypto from 'crypto'
import { mkdirs } from '../common.js'
import { Config } from '../config.js'
let sdk
try {
  sdk = (await import('microsoft-cognitiveservices-speech-sdk')).default
} catch (err) {
  logger.warn('未安装microsoft-cognitiveservices-speech-sdk，无法使用微软Azure语音源')
}
async function generateAudio (text, option = {}) {
  if (!sdk) {
    throw new Error('未安装microsoft-cognitiveservices-speech-sdk，无法使用微软Azure语音源')
  }
  let subscriptionKey = Config.azureTTSKey
  let serviceRegion = Config.azureTTSRegion
  const _path = process.cwd()
  mkdirs(`${_path}/data/chatgpt/tts/azure`)
  let filename = `${_path}/data/chatgpt/tts/azure/${crypto.randomUUID()}.wav`
  let audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename)
  let speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion)
  // speechConfig.speechSynthesisLanguage = option?.language || 'zh-CN'
  logger.info('using speaker: ' + option?.speaker || 'zh-CN-YunyeNeural')
  speechConfig.speechSynthesisVoiceName = option?.speaker || 'zh-CN-YunyeNeural'
  let synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig)

  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(text, result => {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        console.log('synthesis finished.')
      } else {
        console.error('Speech synthesis canceled, ' + result.errorDetails +
            '\nDid you update the subscription info?')
      }
      synthesizer.close()
      synthesizer = undefined
      resolve(filename)
    }, err => {
      console.error('err - ' + err)
      synthesizer.close()
      synthesizer = undefined
      reject(err)
    })
  })
}

const supportConfigurations = [
  {
    code: 'zh-CN-liaoning-XiaobeiNeural',
    name: '晓北',
    language: 'zh-CN',
    languageDetail: '中文(东北官话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-henan-YundengNeural',
    name: '云登',
    language: 'zh-CN',
    languageDetail: '中文(中原官话河南，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-shaanxi-XiaoniNeural',
    name: '晓妮',
    language: 'zh-CN',
    languageDetail: '中文(中原官话陕西，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-henan-YundengNeural',
    name: '云翔',
    language: 'zh-CN',
    languageDetail: '中文(冀鲁官话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-XiaoxiaoNeural',
    name: '晓晓',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-YunxiNeural',
    name: '云希',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-YunyangNeural',
    name: '云扬',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-YunyeNeural',
    name: '云野',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-XiaoshuangNeural',
    name: '晓双',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaoyouNeural',
    name: '晓悠',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaoqiuNeural',
    name: '晓秋',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaochenNeural',
    name: '晓辰',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaoyanNeural',
    name: '晓颜',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaomoNeural',
    name: '晓墨',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaoxuanNeural',
    name: '晓萱',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaohanNeural',
    name: '晓涵',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaoruiNeural',
    name: '晓睿',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaomengNeural',
    name: '晓梦',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaoyiNeural',
    name: '晓伊',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-XiaozhenNeural',
    name: '晓甄',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '女'
  },
  {
    code: 'zh-CN-YunfengNeural',
    name: '云枫',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-YunhaoNeural',
    name: '云皓',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-YunjianNeural',
    name: '云健',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-YunxiaNeural',
    name: '云夏',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-CN-YunzeNeural',
    name: '云泽',
    language: 'zh-CN',
    languageDetail: '中文(普通话，简体)',
    gender: '男'
  },
  {
    code: 'zh-HK-HiuGaaiNeural',
    name: '曉佳',
    language: 'zh-CN',
    languageDetail: '中文(粤语，繁体)',
    gender: '女'
  },
  {
    code: 'zh-HK-HiuMaanNeural',
    name: '曉曼',
    language: 'zh-CN',
    languageDetail: '中文(粤语，繁体)',
    gender: '女'
  },
  {
    code: 'zh-HK-WanLungNeural',
    name: '雲龍',
    language: 'zh-CN',
    languageDetail: '中文(粤语，繁体)',
    gender: '男'
  }
]

export default { generateAudio, supportConfigurations }
