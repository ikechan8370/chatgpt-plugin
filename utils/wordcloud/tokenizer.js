import { Config } from '../config.js'
import fs from 'fs'
import nodejieba from '@node-rs/jieba'

class Tokenizer {
  async getHistory (e, groupId, date = new Date(), duration = 0, userId) {
    if (!groupId) {
      throw new Error('no valid group id')
    }
    let group = e.bot.pickGroup(groupId, true)
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
    // Get the current timestamp
    let currentTime = date.getTime()

    // Step 2: Set the hours, minutes, seconds, and milliseconds to 0
    date.setHours(0, 0, 0, 0)

    // Step 3: Calculate the timestamp representing the start of the specified date
    // duration represents the number of hours to go back
    // if duration is 0, keeping the original date (start of today)
    let startOfSpecifiedDate = date.getTime()
    // if duration > 0, go back to the specified number of hours
    if (duration > 0) {
      // duration should be in range [0, 24]
      // duration = Math.min(duration, 24)
      startOfSpecifiedDate = currentTime - (duration * 60 * 60 * 1000)
    }

    // Step 4: Get the end of the specified date by current time
    const endOfSpecifiedDate = currentTime
    while (isTimestampInDateRange(chats[0]?.time, startOfSpecifiedDate, endOfSpecifiedDate) &&
    isTimestampInDateRange(chats[chats.length - 1]?.time, startOfSpecifiedDate, endOfSpecifiedDate)) {
      let chatHistory = await group.getChatHistory(seq, 20)
      if (chatHistory.length === 1) {
        if (chats[0].seq === chatHistory[0].seq) {
          // 昨天没有聊天记录 比如新建的群 新进群的机器人 会卡在某一条
          break
        }
      }
      chats.push(...chatHistory)
      chats.sort(compareByTime)
      seq = chatHistory?.[0]?.seq
      if (!seq) {
        break
      }
      if (Config.debug) {
        logger.info(`拉取到${chatHistory.length}条聊天记录，当前已累计获取${chats.length}条聊天记录，继续拉...`)
      }
    }
    chats = chats.filter(chat => isTimestampInDateRange(chat.time, startOfSpecifiedDate, endOfSpecifiedDate))
    if (userId) {
      chats = chats.filter(chat => chat.sender.user_id === userId)
    }
    return chats
  }

  async getKeywordTopK (e, groupId, topK = 100, duration = 0, userId) {
    if (!nodejieba) {
      throw new Error('未安装node-rs/jieba，娱乐功能-词云统计不可用')
    }
    if (!this.loaded) {
      nodejieba.load()
      this.loaded = true
    }
    // duration represents the number of hours to go back, should in range [0, 24]
    let chats = await this.getHistory(e, groupId, new Date(), duration, userId)
    let durationStr = duration > 0 ? `${duration}小时` : '今日'
    logger.mark(`聊天记录拉取完成，获取到${durationStr}内${chats.length}条聊天记录，准备分词中`)

    const _path = process.cwd()
    let stopWordsPath = `${_path}/plugins/chatgpt-plugin/utils/wordcloud/cn_stopwords.txt`
    const data = fs.readFileSync(stopWordsPath)
    const stopWords = String(data)?.split('\n') || []
    let chatContent = chats
      .map(c => c.message
      // 只统计文本内容
        .filter(item => item.type == 'text')
        .map(textItem => `${textItem.text}`)
        .join('').trim()
      )
      .map(c => {
        // let length = c.length
        let threshold = 2
        // if (length < 100 && length > 50) {
        //   threshold = 6
        // } else if (length <= 50 && length > 25) {
        //   threshold = 3
        // } else if (length <= 25) {
        //   threshold = 2
        // }
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

class ShamrockTokenizer extends Tokenizer {
  async getHistory (e, groupId, date = new Date(), duration = 0, userId) {
    logger.mark('当前使用Shamrock适配器')
    if (!groupId) {
      throw new Error('no valid group id')
    }
    let group = e.bot.pickGroup(groupId, true)
    // 直接加大力度
    let pageSize = 500
    let chats = (await group.getChatHistory(0, pageSize, false)) || []
    // Get the current timestamp
    let currentTime = date.getTime()

    // Step 2: Set the hours, minutes, seconds, and milliseconds to 0
    date.setHours(0, 0, 0, 0)

    // Step 3: Calculate the timestamp representing the start of the specified date
    // duration represents the number of hours to go back
    // if duration is 0, keeping the original date (start of today)
    let startOfSpecifiedDate = date.getTime()
    // if duration > 0, go back to the specified number of hours
    if (duration > 0) {
      // duration should be in range [0, 24]
      // duration = Math.min(duration, 24)
      startOfSpecifiedDate = currentTime - (duration * 60 * 60 * 1000)
    }

    // Step 4: Get the end of the specified date by currentTime
    const endOfSpecifiedDate = currentTime
    let cursor = chats.length
    // -------------------------------------------------------
    //               |             |            |
    // -------------------------------------------------------
    //                             ^            ^
    // long ago           cursor+pageSize     cursor       current
    while (isTimestampInDateRange(chats[0]?.time, startOfSpecifiedDate, endOfSpecifiedDate)) {
      // 由于Shamrock消息是从最新的开始拉，结束时由于动态更新，一旦有人发送消息就会立刻停止，所以不判断结束时间
      // 拉到后面会巨卡，所以增大page减少次数
      pageSize = Math.floor(Math.max(cursor / 2, pageSize))
      cursor = cursor + pageSize
      let retries = 3
      let chatHistory
      while (retries >= 0) {
        try {
          chatHistory = await group.getChatHistory(0, cursor, false)
          break
        } catch (err) {
          if (retries === 0) {
            logger.error(err)
          }
          retries--
        }
      }
      if (retries < 0) {
        logger.warn('拉不动了，就这样吧')
        break
      }
      if (chatHistory.length === 1) {
        break
      }
      if (chatHistory.length === chats.length) {
        // 没有了！再拉也没有了
        break
      }
      let oldLength = chats.length
      chats = chatHistory
      // chats.sort(compareByTime)
      if (Config.debug) {
        logger.info(`拉取到${chats.length - oldLength}条聊天记录，当前已累计获取${chats.length}条聊天记录，继续拉...`)
      }
    }
    chats = chats.filter(chat => isTimestampInDateRange(chat.time, startOfSpecifiedDate, endOfSpecifiedDate))
    if (userId) {
      chats = chats.filter(chat => chat.sender.user_id === userId)
    }
    return chats
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

export default {
  default: new Tokenizer(),
  shamrock: new ShamrockTokenizer()
}
