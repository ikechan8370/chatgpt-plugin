const PROXY = 'http://127.0.0.1:7890'
const API_KEY = ''

export const Config = {
  apiKey: API_KEY,
  // 暂时不支持proxy
  proxy: PROXY,
  // 改为true后，全局默认以图片形式回复，并自动发出Continue命令补全回答
  defaultUsePicture: true,
  // 每个人发起的对话保留时长。超过这个时长没有进行对话，再进行对话将开启新的对话。单位：秒
  conversationPreserveTime: 0
}
