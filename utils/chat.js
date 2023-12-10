import common from '../../../lib/common/common.js'

export async function getChatHistoryGroup (e, num) {
  // if (e.adapter === 'shamrock') {
  //  return await e.group.getChatHistory(0, num, false)
  // } else {
  let latestChats = await e.group.getChatHistory(0, 1)
  if (latestChats.length > 0) {
    let latestChat = latestChats[0]
    if (latestChat) {
      let seq = latestChat.seq || latestChat.message_id
      let chats = []
      while (chats.length < num) {
        let chatHistory = await e.group.getChatHistory(seq, 20)
        chats.push(...chatHistory)
        seq = chatHistory[0].seq || chatHistory[0].message_id
      }
      chats = chats.slice(0, num)
      try {
        let mm = await e.group.getMemberMap()
        for (const chat of chats) {
          if (e.adapter === 'shamrock') {
            if (chat.sender?.user_id === 0) {
              // 奇怪格式的历史消息，过滤掉
              continue
            }
            let sender = await pickMemberAsync(e, chat.sender.user_id)
            if (sender) {
              chat.sender = sender
            }
          } else {
            let sender = mm.get(chat.sender.user_id)
            if (sender) {
              chat.sender = sender
            }
          }
        }
      } catch (err) {
        logger.warn(err)
      }
      // console.log(chats)
      return chats
    }
  }
  // }
  return []
}

function pickMemberAsync (e, userId) {
  return new Promise((resolve, reject) => {
    e.group.pickMember(userId, true, (sender) => {
      resolve(sender)
    })
  })
}
