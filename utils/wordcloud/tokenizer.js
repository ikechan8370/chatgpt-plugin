import { Config } from '../config.js'
import fs from 'fs'

let nodejieba
try {
  nodejieba = (await import('@node-rs/jieba')).default
  nodejieba.load()
} catch (err) {
  logger.info('未安装@node-rs/jieba，娱乐功能-词云统计不可用')
}

export class Tokenizer {
  async getTodayHistory (groupId, date = new Date()) {
    if (!groupId) {
      throw new Error('no valid group id')
    }
    let group = Bot.pickGroup(groupId, true)
    let latestChat = await group.getChatHistory(0, 1)
    let seq = latestChat[0].seq
    let chats = latestChat
    function compareByTime (a, b) {
      const timeA = a.time
      const timeB = b.time
      if (timeA < timeB) {
        return -1
      }
      if (timeA > timeB) {
        return 1
      }
      return 0
    }
    // Step 2: Set the hours, minutes, seconds, and milliseconds to 0
    date.setHours(0, 0, 0, 0)

    // Step 3: Calculate the timestamp representing the start of the specified date
    const startOfSpecifiedDate = date.getTime()

    // Step 4: Get the end of the specified date by adding 24 hours (in milliseconds)
    const endOfSpecifiedDate = startOfSpecifiedDate + (24 * 60 * 60 * 1000)
    while (isTimestampInDateRange(chats[0]?.time, startOfSpecifiedDate, endOfSpecifiedDate) && isTimestampInDateRange(chats[chats.length - 1]?.time, startOfSpecifiedDate, endOfSpecifiedDate)) {
      let chatHistory = await group.getChatHistory(seq, 20)
      if (chatHistory.length === 1) {
        if (chats[0].seq === chatHistory[0].seq) {
          // 昨天没有聊天记录 比如新建的群 新进群的机器人 会卡在某一条
          break
        }
      }
      chats.push(...chatHistory)
      chats.sort(compareByTime)
      seq = chatHistory[0].seq
      if (Config.debug) {
        logger.info(`拉取到${chatHistory.length}条聊天记录，当前已累计获取${chats.length}条聊天记录，继续拉...`)
      }
    }
    chats = chats.filter(chat => isTimestampInDateRange(chat.time, startOfSpecifiedDate, endOfSpecifiedDate))
    return chats
  }

  async getTodayKeywordTopK (groupId, topK = 100) {
    if (!nodejieba) {
      throw new Error('未安装node-rs/jieba，娱乐功能-词云统计不可用')
    }
    let chats = await this.getTodayHistory(groupId)
    logger.mark(`聊天记录拉去完成，获取到今日内${chats.length}条聊天记录，准备分词中`)
   
    const _path = process.cwd()
    let stopWordsPath = `${_path}/plugins/chatgpt-plugin/utils/wordcloud/cn_stopwords.txt`
    const data = fs.readFileSync(stopWordsPath)
    const stopWords = String(data)?.split('\n') || []
    let chatContent = chats
      .map(c => c.message
           //只统计文本内容
           .filter(item => item.type == 'text')
           .map(textItem => `${textItem.text}`)
           .join("").trim()
      )
      .map(c => {
        let length = c.length
        let threshold = 10
        if (length < 100 && length > 50) {
          threshold = 6
        } else if (length <= 50 && length > 25) {
          threshold = 3
        } else if (length <= 25) {
          threshold = 2
        }
        return nodejieba.extract(c, threshold)
      })
      .reduce((acc, curr) => acc.concat(curr), [])
      .map(c => c.keyword)
      .filter(c => stopWords.indexOf(c) < 0)
    if (Config.debug) {
      logger.info(chatContent)
    }
    const countMap = {}
    for (const value of chatContent) {
      if (countMap[value]) {
        countMap[value]++
      } else {
        countMap[value] = 1
      }
    }
    let list = Object.keys(countMap).map(k => {
      return [k, countMap[k]]
    })
    function compareByFrequency (a, b) {
      const freA = a[1]
      const freB = b[1]
      if (freA < freB) {
        return 1
      }
      if (freA > freB) {
        return -1
      }
      return 0
    }
    logger.mark('分词统计完成，绘制词云中...')
    return list.filter(s => s[1] > 2).sort(compareByFrequency).slice(0, topK)
  }
}

function isTimestampInDateRange (timestamp, startOfSpecifiedDate, endOfSpecifiedDate) {
  if (!timestamp) {
    return false
  }
  timestamp = timestamp * 1000

  // Step 5: Compare the given timestamp with the start and end of the specified date
  return timestamp >= startOfSpecifiedDate && timestamp < endOfSpecifiedDate
}
