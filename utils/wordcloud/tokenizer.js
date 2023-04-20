import nodejieba from 'nodejieba'
import { Config } from '../config.js'

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
    while (isTimestampInDateRange(chats[0]?.time, date)) {
      let chatHistory = await group.getChatHistory(seq, 20)
      chats.push(...chatHistory)
      chats.sort(compareByTime)
      seq = chats[0].seq
    }
    chats = chats.filter(chat => isTimestampInDateRange(chat.time, date))
    return chats
  }

  async getTodayKeywordTopK (groupId, topK = 100) {
    let chats = await this.getTodayHistory(groupId)
    let chatContent = chats
      .map(c => c.raw_message
        .replaceAll('[图片]', '')
        .replaceAll('[表情]', '')
        .replaceAll('[动画表情]', '')
        .replaceAll('[语音]', '')
      )
      .map(c => nodejieba.extract(c, 10))
      .reduce((acc, curr) => acc.concat(curr), [])
      .map(c => c.word)
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
    return list.sort(compareByFrequency).slice(0, topK)
  }
}

function isTimestampInDateRange (timestamp, date = null) {
  if (!timestamp) {
    return false
  }
  timestamp = timestamp * 1000
  if (!date) {
    date = new Date()
  }

  // Step 2: Set the hours, minutes, seconds, and milliseconds to 0
  date.setHours(0, 0, 0, 0)

  // Step 3: Calculate the timestamp representing the start of the specified date
  const startOfSpecifiedDate = date.getTime()

  // Step 4: Get the end of the specified date by adding 24 hours (in milliseconds)
  const endOfSpecifiedDate = startOfSpecifiedDate + (24 * 60 * 60 * 1000)

  // Step 5: Compare the given timestamp with the start and end of the specified date
  return timestamp >= startOfSpecifiedDate && timestamp < endOfSpecifiedDate
}
