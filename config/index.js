// Token，如不需要手动配置不填
const SESSION_TOKEN = ''

// CFtoken，每小时刷新一般不用填
const CF_CLEARANCE = ''

const PROXY = ''

export const Config = {
  token: SESSION_TOKEN,
  cfClearance: CF_CLEARANCE,
  proxy: PROXY,
  username: '',
  password: '',
  // 改为true后，全局默认以图片形式回复，并自动发出Continue命令补全回答
  defaultUsePicture: true,
  // 每个人发起的对话保留时长。超过这个时长没有进行对话，再进行对话将开启新的对话。单位：秒
  conversationPreserveTime: 600,
  // UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  headless: false,
  // 为空使用默认puppeteer的chromium，也可以传递自己本机安装的Chrome可执行文件地址，提高通过率
  chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
}
