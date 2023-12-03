export function getBots () {
  if (Bot.uin === 88888) {
    // 找适配器
    let adapters = Bot.adapter
    return adapters?.map(uin => Bot[uin])
  } else if (Bot.adapter && Bot.adapter.length > 0) {
    let bots = [Bot]
    Bot.adapter.forEach(uin => {
      bots.push(Bot[uin])
    })
    return bots
  } else {
    return [Bot]
  }
}
