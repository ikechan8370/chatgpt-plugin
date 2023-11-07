export async function getChatHistoryGroup (e, num) {
  if (e.adapter === 'shamrock') {
    return await e.group.getChatHistory(0, num, false)
  } else {
    let latestChats = await e.group.getChatHistory(0, 1)
    if (latestChats.length > 0) {
      let latestChat = latestChats[0]
      if (latestChat) {
        let seq = latestChat.seq
        let chats = []
        while (chats.length < num) {
          let chatHistory = await e.group.getChatHistory(seq, 20)
          chats.push(...chatHistory)
        }
        chats = chats.slice(0, num)
        try {
          let mm = await e.group.getMemberMap()
          chats.forEach(chat => {
            let sender = mm.get(chat.sender.user_id)
            if (sender) {
              chat.sender = sender
            }
          })
        } catch (err) {
          logger.warn(err)
        }
        // console.log(chats)
        return chats
      }
    }
  }
  return []
}
