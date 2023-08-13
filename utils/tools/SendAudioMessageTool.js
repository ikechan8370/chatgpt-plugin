import { AbstractTool } from './AbstractTool.js'
import { generateVitsAudio } from '../tts.js'
import { Config } from '../config.js'
import { generateAudio, generateAzureAudio } from '../common.js'
import VoiceVoxTTS from '../tts/voicevox.js'
import uploadRecord from '../uploadRecord.js'

export class SendAudioMessageTool extends AbstractTool {
  name = 'sendAudioMessage'

  parameters = {
    properties: {
      pendingText: {
        type: 'string',
        description: 'Message to be sent and it will be turned into audio message'
      },
      ttsMode: {
        type: 'number',
        description: 'default is 1, which indicates that the text will be processed in the current ttsMode.' +
            '2 is azureMode.' +
            '3 or 4 corresponds to vitsMode or voxMode.'
      },
      vitsModeRole: {
        type: 'string',
        description: 'use whose voice',
        enum: ['琴', '空',
          '丽莎', '荧', '芭芭拉', '凯亚', '迪卢克', '雷泽', '安柏', '温迪',
          '香菱', '北斗', '行秋', '魈', '凝光', '可莉', '钟离', '菲谢尔（皇女）',
          '班尼特', '达达利亚（公子）', '诺艾尔（女仆）', '七七', '重云', '甘雨（椰羊）',
          '阿贝多', '迪奥娜（猫猫）', '莫娜', '刻晴', '砂糖', '辛焱', '罗莎莉亚',
          '胡桃', '枫原万叶（万叶）', '烟绯', '宵宫', '托马', '优菈', '雷电将军（雷神）',
          '早柚', '珊瑚宫心海', '五郎', '九条裟罗', '荒泷一斗',
          '埃洛伊', '申鹤', '八重神子', '神里绫人（绫人）', '夜兰', '久岐忍',
          '鹿野苑平藏', '提纳里', '柯莱', '多莉', '云堇', '纳西妲（草神）', '深渊使徒',
          '妮露', '赛诺']
      },
      azureModeRole: {
        type: 'string',
        description: 'can be \'随机\' or specified by the user. default is currentRole.'
      },
      voxModeRole: {
        type: 'string',
        description: 'can be random or currentRole or specified by the user. default is currentRole.'
      },
      speakingEmotion: {
        type: 'string',
        description: 'specified by the user. default is blank.'
      },
      speakingEmotionDegree: {
        type: 'number',
        description: 'specified by the user. default is blank.'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target user\'s qq number or groupId when you need to send audio message to specific user or group, otherwise leave blank'
      }
    },
    required: ['pendingText', 'ttsMode', 'targetGroupIdOrQQNumber']
  }

  description = 'This tool is used to send voice|audio messages, utilize it only if the user grants you permission to do so.'

  func = async function (opts, e) {
    if (!Config.ttsSpace && !Config.azureTTSKey && !Config.voicevoxSpace) {
      return 'you don\'t have permission to send audio message due to a lack of a valid ttsKey'
    }
    let { pendingText, ttsMode, vitsModeRole, azureModeRole, voxModeRole, speakingEmotion, speakingEmotionDegree, targetGroupIdOrQQNumber } = opts
    let sendable
    ttsMode = isNaN(ttsMode) || !ttsMode ? 1 : ttsMode
    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === Bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)
    try {
      switch (ttsMode) {
        case 1:
          sendable = await generateAudio(e, pendingText, speakingEmotion)
          break
        case 2:
          if (!Config.azureTTSKey) return 'audio generation failed, due to a lack of a azureTTSKey'
          sendable = await generateAzureAudio(pendingText, azureModeRole, speakingEmotion, speakingEmotionDegree)
          break
        case 3:
          if (!Config.ttsSpace) return 'audio generation failed, due to a lack of a ttsSpace'
          sendable = await uploadRecord(
            await generateVitsAudio(pendingText, vitsModeRole, '中日混合（中文用[ZH][ZH]包裹起来，日文用[JA][JA]包裹起来）')
            , 'vits-uma-genshin-honkai'
          )
          break
        case 4:
          if (!Config.voicevoxSpace) return 'audio generation failed, due to a lack of a voicevoxSpace'
          sendable = await uploadRecord(
            await VoiceVoxTTS.generateAudio(pendingText, voxModeRole)
            , 'voicevox'
          )
          break
        default:
          sendable = await generateAzureAudio(pendingText, azureModeRole, speakingEmotion, speakingEmotionDegree)
      }
    } catch (err) {
      logger.error(err)
      return `audio generation failed,  error: ${JSON.stringify(err)}`
    }
    if (sendable) {
      let groupList = await Bot.getGroupList()
      try {
        if (groupList.get(target)) {
          let group = await Bot.pickGroup(target)
          await group.sendMsg(sendable)
          return 'audio has been sent to group' + target
        } else {
          let user = await Bot.pickFriend(target)
          await user.sendMsg(sendable)
          return 'audio has been sent to user' + target
        }
      } catch (err) {
        return `failed to send audio, error: ${JSON.stringify(err)}`
      }
    } else {
      return 'audio generation failed'
    }
  }
}
