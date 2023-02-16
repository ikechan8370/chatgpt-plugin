// 例如http://127.0.0.1:7890
const PROXY = ''
const API_KEY = ''

export const Config = {
  // ***********************************************************************************************************************************
  //                                                               通用配置                                                              *
  // ***********************************************************************************************************************************
  // 如果回答包括屏蔽词，就不返回。
  blockWords: ['屏蔽词1', '屏蔽词b'],
  // 改为true后，全局默认以图片形式回复，并自动发出Continue命令补全回答。长回复可能会有bug。
  defaultUsePicture: false,
  // 每个人发起的对话保留时长。超过这个时长没有进行对话，再进行对话将开启新的对话。单位：秒
  conversationPreserveTime: 0,
  // 触发方式 可选值：at 或 prefix 。at模式下只有at机器人才会回复。prefix模式下不需要at，但需要添加前缀#chat
  toggleMode: 'at',
  // ***********************************************************************************************************************************
  //                                                     以下为API方式(默认)的配置                                                          *
  // ***********************************************************************************************************************************
  apiKey: API_KEY,
  // 模型名称，选填。如无特殊需求保持默认即可，会使用chatgpt-api库提供的当前可用的最适合的默认值。保底可用的是 text-davinci-003。当发现新的可用的chatGPT模型会更新这里的值
  // 20230211： text-chat-davinci-002-sh-alpha-aoruigiofdj83 中午存活了几分钟
  model: '',
  // ***********************************************************************************************************************************
  //                                                        以下为API3方式的配置                                                          *
  // ***********************************************************************************************************************************
  // from https://github.com/acheong08/ChatGPT
  api: 'https://chat.duti.tech/api/conversation',
  // ***********************************************************************************************************************************
  //                                                        以下为API2方式的配置                                                          *
  // ***********************************************************************************************************************************
  // 如果购买了plus，改为true将使用收费模型，响应更快
  plus: false,
  // 使用谁提供的第三方API。github开源的有几个，没特别要求保持默认就好
  // https://chatgpt.pawan.krd/api/completions 来自https://github.com/PawanOsman 使用Cloudflare CDN，三网延迟可能都较高。目前看起来最稳定
  // https://chatgpt.roki.best/api/completions 对上面那个的二次反代，搭建在Hong Kong（本人自建，不保证稳定性）
  // https://chatgpt.hato.ai/completions 来自https://github.com/waylaidwanderer（本插件使用的chatgpt库之一的作者）
  reverseProxy: 'https://chatgpt.pawan.krd/api/completions',
  // ***********************************************************************************************************************************
  //                                                   以下为API/API2方式公用的配置                                                       *
  // ***********************************************************************************************************************************
  // 给模型的前言promt。选填。默认完整值：`You are ${this._assistantLabel}, a large language model trained by OpenAI. You answer as concisely as possible for each response (e.g. don’t be verbose). It is very important that you answer as concisely as possible, so please remember this. If you are generating a list, do not have too many items. Keep the number of items short. Current date: ${currentDate}\n\n
  // 此项配置会覆盖掉中间部分。保持为空将使用网友从对话中推测出的指令。
  // 你可以在这里写入你希望AI回答的风格，比如希望优先回答中文，回答长一点等
  promptPrefixOverride: 'Your answer shouldn\'t be too verbose. If you are generating a list, do not have too many items. Keep the number of items short. Prefer to answer in Chinese.',
  // AI认为的自己的名字，当你问他你是谁是他会回答这里的名字。
  assistantLabel: 'ChatGPT',
  // ***********************************************************************************************************************************
  //                                                         以下为浏览器方式的配置                                                        *
  // ***********************************************************************************************************************************
  username: '',
  password: '',
  // UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  // 服务器无interface的话只能用true，但是可能遇到验证码就一定要配置下面的2captchaToken了
  // true时使用无头模式，无界面的服务器可以为true，但遇到验证码时可能无法使用。(实测很容易卡住，几乎不可用)
  headless: false,
  // 为空使用默认puppeteer的chromium，也可以传递自己本机安装的Chrome可执行文件地址，提高通过率。windows可以是‘C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe’，linux通过which查找路径
  chromePath: '',
  // 可注册2captcha实现跳过验证码，收费服务但很便宜。否则可能会遇到验证码而卡住。
  '2captchaToken': '',
  // http或socks5代理
  proxy: PROXY,
  debug: false,
  // 各个地方的默认超时时间
  defaultTimeoutMs: 120000,
  // bing默认超时时间，bing太慢了有的时候
  //bingTimeoutMs: 360000,
  // 浏览器默认超时，浏览器可能需要更高的超时时间
  chromeTimeoutMS: 120000
}
