import { Config } from './utils/config.js'
import { speakers } from './utils/tts.js'

// 支持锅巴
export function supportGuoba () {
  return {
    // 插件信息，将会显示在前端页面
    // 如果你的插件没有在插件库里，那么需要填上补充信息
    // 如果存在的话，那么填不填就无所谓了，填了就以你的信息为准
    pluginInfo: {
      name: 'chatgpt-plugin',
      title: 'ChatGPT-Plugin',
      author: '@ikechan8370',
      authorLink: 'https://github.com/ikechan8370',
      link: 'https://github.com/ikechan8370/chatgpt-plugin',
      isV3: true,
      isV2: false,
      description: '基于OpenAI最新推出的chatgpt和微软的 New bing通过api进行聊天的插件，需自备openai账号或有New bing访问权限的必应账号',
      // 显示图标，此为个性化配置
      // 图标可在 https://icon-sets.iconify.design 这里进行搜索
      icon: 'simple-icons:openai',
      // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
      iconColor: '#00c3ff'
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
        {
          field: 'blockWords',
          label: '输出黑名单',
          bottomHelpMessage: '检查输出结果中是否有违禁词，如果存在黑名单中的违禁词则不输出',
          component: 'InputTextArea'
        },
        {
          field: 'promptBlockWords',
          label: '输入黑名单',
          bottomHelpMessage: '检查输入结果中是否有违禁词，如果存在黑名单中的违禁词则不输出',
          component: 'InputTextArea'
        },
        {
          field: 'imgOcr',
          label: '图片识别',
          bottomHelpMessage: '是否识别消息中图片的文字内容，需要同时包含图片和消息才生效',
          component: 'Switch'
        },
        {
          field: 'defaultUsePicture',
          label: '全局图片模式',
          bottomHelpMessage: '全局默认以图片形式回复。',
          component: 'Switch'
        },
        {
          field: 'defaultUseTTS',
          label: '全局语音模式',
          bottomHelpMessage: '全局默认以语音形式回复，使用默认角色音色。',
          component: 'Switch'
        },
        {
          field: 'defaultTTSRole',
          label: '语音模式默认角色',
          bottomHelpMessage: '语音模式下，未指定角色时使用的角色。若留空，将使用随机角色回复。若用户通过指令指定了角色，将忽略本设定',
          component: 'Select',
          componentProps: {
            options: speakers.concat('随机').map(s => { return { label: s, value: s } })
          }
        },
        {
          field: 'ttsAutoFallbackThreshold',
          label: '语音转文字阈值',
          helpMessage: '语音模式下，字数超过这个阈值就降级为文字',
          bottomHelpMessage: '语音转为文字的阈值。',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 299
          }
        },
        {
          field: 'alsoSendText',
          label: '语音同时发送文字',
          bottomHelpMessage: '语音模式下，同时发送文字版，避免音质较低听不懂',
          component: 'Switch'
        },
        {
          field: 'autoUsePicture',
          label: '长文本自动转图片',
          bottomHelpMessage: '字数大于阈值会自动用图片发送，即使是文本模式。',
          component: 'Switch'
        },
        {
          field: 'autoUsePictureThreshold',
          label: '自动转图片阈值',
          helpMessage: '长文本自动转图片开启后才生效',
          bottomHelpMessage: '自动转图片的字数阈值。',
          component: 'InputNumber',
          componentProps: {
            min: 0
          }
        },
        {
          field: 'conversationPreserveTime',
          label: '对话保留时长',
          helpMessage: '单位：秒',
          bottomHelpMessage: '每个人发起的对话保留时长。超过这个时长没有进行对话，再进行对话将开启新的对话。',
          component: 'InputNumber',
          componentProps: {
            min: 0
          }
        },
        {
          field: 'toggleMode',
          label: '触发方式',
          bottomHelpMessage: 'at模式下只有at机器人才会回复。#chat模式下不需要at，但需要添加前缀#chat。',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'at', value: 'at' },
              { label: '#chat', value: 'prefix' }
            ]
          }
        },
        {
          field: 'allowOtherMode',
          label: '允许其他模式',
          bottomHelpMessage: '开启后，则允许用户使用#chat1/#chat3/#chatglm/#bing等命令无视全局模式进行聊天',
          component: 'Switch'
        },
        {
          field: 'quoteReply',
          label: '图片引用消息',
          bottomHelpMessage: '在回复图片时引用原始消息',
          component: 'Switch'
        },
        {
          field: 'showQRCode',
          label: '启用二维码',
          bottomHelpMessage: '在图片模式中启用二维码。该对话内容将被发送至第三方服务器以进行渲染展示，如果不希望对话内容被上传到第三方服务器请关闭此功能。',
          component: 'Switch'
        },
        {
          field: 'cacheUrl',
          label: '渲染服务器地址',
          bottomHelpMessage: '用于缓存图片模式会话内容并渲染的服务器地址。',
          component: 'Input'
        },
        {
          field: 'cacheEntry',
          label: '预制渲染服务器访问代码',
          bottomHelpMessage: '图片内容渲染服务器开启预制访问代码，当渲染服务器访问较慢时可以开启,但无法保证访问代码可以正常访问页面。',
          component: 'Switch'
        },
        {
          field: 'drawCD',
          label: '绘图CD',
          helpMessage: '单位：秒',
          bottomHelpMessage: '绘图指令的CD时间，主人不受限制',
          component: 'InputNumber',
          componentProps: {
            min: 0
          }
        },
        {
          field: 'enableDraw',
          label: '绘图功能开关',
          component: 'Switch'
        },
        {
          field: 'proxy',
          label: '代理服务器地址',
          bottomHelpMessage: '数据通过代理服务器发送，http或socks5代理。',
          component: 'Input'
        },
        {
          field: 'debug',
          label: '调试信息',
          bottomHelpMessage: '将输出更多调试信息，如果不希望控制台刷屏的话，可以关闭。',
          component: 'Switch'
        },
        {
          label: '以下为服务超时配置。',
          component: 'Divider'
        },
        {
          field: 'defaultTimeoutMs',
          label: '默认超时时间',
          helpMessage: '单位：毫秒',
          bottomHelpMessage: '各个地方的默认超时时间。',
          component: 'InputNumber',
          componentProps: {
            min: 0
          }
        },
        {
          field: 'chromeTimeoutMS',
          label: '浏览器超时时间',
          helpMessage: '单位：毫秒',
          bottomHelpMessage: '浏览器默认超时，浏览器可能需要更高的超时时间。',
          component: 'InputNumber',
          componentProps: {
            min: 0
          }
        },
        {
          field: 'sydneyFirstMessageTimeout',
          label: 'Sydney模式接受首条信息超时时间',
          helpMessage: '单位：毫秒',
          bottomHelpMessage: '超过该时间阈值未收到Bing的任何消息，则断开本次连接并重试（最多重试3次，失败后返回timeout waiting for first message）。',
          component: 'InputNumber',
          componentProps: {
            min: 15000
          }
        },
        {
          label: '以下为API方式(默认)的配置',
          component: 'Divider'
        },
        {
          field: 'apiKey',
          label: 'OpenAI API Key',
          bottomHelpMessage: 'OpenAI的ApiKey，用于访问OpenAI的API接口。',
          component: 'InputPassword'
        },
        {
          field: 'openAiBaseUrl',
          label: 'OpenAI API服务器地址',
          bottomHelpMessage: 'OpenAI的API服务器地址。注意要带上/v1。默认为https://api.openai.com/v1',
          component: 'Input'
        },
        {
          field: 'openAiForceUseReverse',
          label: '强制使用OpenAI反代',
          bottomHelpMessage: '即使配置了proxy，依然使用OpenAI反代',
          component: 'Switch'
        },
        {
          field: 'promptPrefixOverride',
          label: 'AI风格',
          bottomHelpMessage: '你可以在这里写入你希望AI回答的风格，比如希望优先回答中文，回答长一点等。',
          component: 'InputTextArea'
        },
        {
          field: 'assistantLabel',
          label: 'AI名字',
          bottomHelpMessage: 'AI认为的自己的名字，当你问他你是谁是他会回答这里的名字。',
          component: 'Input'
        },
        {
          field: 'temperature',
          label: 'temperature',
          bottomHelpMessage: '用于控制回复内容的多样性，数值越大回复越加随机、多元化，数值越小回复越加保守。',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 2
          }
        },
        {
          label: '以下为必应方式的配置。',
          component: 'Divider'
        },
        {
          field: 'toneStyle',
          label: 'Bing模式',
          bottomHelpMessage: '微软必应官方的三种应答风格。默认为均衡，Sydney为实验风格，独立与三种风格之外。',
          component: 'Select',
          componentProps: {
            options: [
              { label: '均衡', value: 'balanced' },
              { label: '创意', value: 'creative' },
              { label: '精确', value: 'precise' },
              { label: 'Sydney(可能存在风险)', value: 'Sydney' },
              { label: '自设定(可能存在风险)', value: 'Custom' }
            ]
          }
        },
        {
          field: 'enableSuggestedResponses',
          label: '是否开启建议回复',
          bottomHelpMessage: '开启了会像官网上一样，每个问题给出建议的用户问题',
          component: 'Switch'
        },
        {
          field: 'sydney',
          label: 'Custom的设定',
          bottomHelpMessage: '仅自设定模式下有效。你可以自己改写设定，让Sydney变成你希望的样子。可能存在不稳定的情况。',
          component: 'InputTextArea'
        },
        {
          field: 'sydneyContext',
          label: 'Bing的扩展资料',
          bottomHelpMessage: 'AI将会从你提供的扩展资料中学习到一些知识，帮助它更好地回答你的问题。实际相当于使用edge侧边栏Bing时读取的你当前浏览网页的内容。如果太长可能容易到达GPT-4的8192token上限。',
          component: 'InputTextArea'
        },
        {
          field: 'sydneyReverseProxy',
          label: 'sydney反代',
          bottomHelpMessage: '仅自设定模式下有效。国内ip无法正常使用sydney和自设定模式，如果有bing.com的反代可以填在此处，或者使用proxy',
          component: 'Input'
        },
        {
          field: 'sydneyForceUseReverse',
          label: '强制使用sydney反代',
          bottomHelpMessage: '即使配置了proxy，依然使用sydney反代',
          component: 'Switch'
        },
        {
          field: 'sydneyBrainWash',
          label: '开启强制洗脑',
          bottomHelpMessage: '仅自设定模式下有效。如果发现自设定模式下总是回复类似于换个话题之类的话，可以开启强制洗脑试试，如果还不行就调整你的设定',
          component: 'Switch'
        },
        {
          field: 'sydneyBrainWashName',
          label: 'Custom模式下的称呼',
          bottomHelpMessage: '仅自设定模式下有效。如果开启了强制洗脑，务必准确填写这个才能精准洗脑。不开启洗脑可以不管这个',
          component: 'Input'
        },
        {
          field: 'sydneyBrainWashStrength',
          label: '洗脑强度',
          bottomHelpMessage: '仅自设定模式下有效。洗脑强度。默认为15，可以酌情调整。太大的话可能长对话会影响对话质量',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 100
          }
        },
        {
          label: '以下为API3方式的配置。',
          component: 'Divider'
        },
        {
          field: 'api',
          label: 'ChatGPT API反代服务器地址',
          bottomHelpMessage: 'ChatGPT的API反代服务器，用于绕过Cloudflare访问ChatGPT API',
          component: 'Input'
        },
        {
          field: 'apiBaseUrl',
          label: 'apiBaseUrl地址',
          bottomHelpMessage: 'apiBaseUrl地址',
          component: 'Input'
        },
        {
          field: 'apiForceUseReverse',
          label: '强制使用ChatGPT反代',
          bottomHelpMessage: '即使配置了proxy，依然使用ChatGPT反代',
          component: 'Switch'
        },
        {
          field: 'useGPT4',
          label: '使用GPT-4',
          bottomHelpMessage: '使用GPT-4，注意试用配额较低，如果用不了就关掉',
          component: 'Switch'
        },
        {
          label: '以下为浏览器方式的配置.(Deprecated)',
          component: 'Divider'
        },
        {
          field: 'username',
          label: '用户名',
          bottomHelpMessage: 'OpenAI用户名。',
          component: 'Input'
        },
        {
          field: 'password',
          label: '密码',
          bottomHelpMessage: 'OpenAI密码。',
          component: 'InputPassword'
        },
        {
          field: 'UA',
          label: '浏览器UA',
          bottomHelpMessage: '模拟浏览器UA，无特殊需求保持默认即可。',
          component: 'InputTextArea'
        },
        {
          field: 'headless',
          label: '无头模式',
          bottomHelpMessage: '无界面的服务器可以开启，但遇到验证码时可能无法使用。(实测很容易卡住，几乎不可用)。',
          component: 'Switch'
        },
        {
          field: 'chromePath',
          label: 'Chrome路径',
          bottomHelpMessage: '为空使用默认puppeteer的chromium，也可以传递自己本机安装的Chrome可执行文件地址，提高通过率。windows可以是‘C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe’，linux通过which查找路径。',
          component: 'Input'
        },
        {
          label: '以下为ChatGLM方式的配置',
          component: 'Divider'
        },
        {
          field: 'chatglmBaseUrl',
          label: 'ChatGLM API地址',
          bottomHelpMessage: '如 http://localhost:8080',
          component: 'Input'
        },
        {
          label: '以下为杂七杂八的配置',
          component: 'Divider'
        },
        {
          field: '2captchaToken',
          label: '验证码平台Token',
          bottomHelpMessage: '可注册2captcha实现跳过验证码，收费服务但很便宜。否则可能会遇到验证码而卡住。',
          component: 'InputPassword'
        },
        {
          field: 'ttsSpace',
          label: '语音转换API地址',
          bottomHelpMessage: '前往duplicate空间https://huggingface.co/spaces/ikechan8370/vits-uma-genshin-honkai后查看api地址',
          component: 'Input'
        },
        {
          field: 'huggingFaceReverseProxy',
          label: '语音转换huggingface反代',
          bottomHelpMessage: '没有就空着',
          component: 'Input'
        },
        {
          field: 'noiseScale',
          label: 'noiseScale',
          bottomHelpMessage: '控制情感变化程度',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1
          }
        },
        {
          field: 'noiseScaleW',
          label: 'noiseScaleW',
          bottomHelpMessage: '控制音素发音长度',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1
          }
        },
        {
          field: 'lengthScale',
          label: 'lengthScale',
          bottomHelpMessage: '控制整体语速',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 2
          }
        },
        {
          field: 'initiativeChatGroups',
          label: '主动发起聊天群聊的群号',
          bottomHelpMessage: '在这些群聊里会不定时主动说一些随机的打招呼的话，用英文逗号隔开。必须配置了OpenAI Key',
          component: 'Input'
        },
        {
          field: 'helloPrompt',
          label: '打招呼所说文字的引导文字',
          bottomHelpMessage: '将会用这段文字询问ChatGPT，由ChatGPT给出随机的打招呼文字。',
          component: 'Input'
        }
      ],
      // 获取配置数据方法（用于前端填充显示数据）
      getConfigData () {
        return Config
      },
      // 设置配置的方法（前端点确定后调用的方法）
      setConfigData (data, { Result }) {
        for (let [keyPath, value] of Object.entries(data)) {
          // 处理黑名单
          if (keyPath === 'blockWords' || keyPath === 'promptBlockWords' || keyPath === 'initiativeChatGroups') { value = value.toString().split(/[,，;；\|]/) }
          if (Config[keyPath] != value) { Config[keyPath] = value }
        }
        return Result.ok({}, '保存成功~')
      }
    }
  }
}
