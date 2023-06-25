import { AbstractTool } from './AbstractTool.js'
import { convertSpeaker, generateAudio } from '../tts.js'
import uploadRecord from '../uploadRecord.js'
import { Config } from '../config.js'

export class TTSTool extends AbstractTool {
  name = 'tts'

  parameters = {
    properties: {
      text: {
        type: 'string',
        description: 'the text will be turned into audio'
      },
      role: {
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
      groupId: {
        type: 'string',
        description: 'groupId'
      }
    },
    required: ['text', 'role', 'groupId']
  }

  description = 'Useful when you want to turn text into audio and send it'

  func = async function (opts) {
    let { text, role, groupId } = opts
    groupId = parseInt(groupId.trim())
    try {
      let wav = await generateAudio(text, convertSpeaker(role), '中日混合（中文用[ZH][ZH]包裹起来，日文用[JA][JA]包裹起来）')
      let sendable = await uploadRecord(wav, Config.ttsMode)
      if (sendable) {
        let group = await Bot.pickGroup(groupId)
        await group.sendMsg(sendable)
        return 'audio has been sent successfully'
      } else {
        return 'audio generation failed'
      }
    } catch (err) {
      logger.error(err)
      return 'audio generation failed'
    }
  }
}
