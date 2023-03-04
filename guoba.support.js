import { Config } from './utils/config.js'

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
          bottomHelpMessage: '全局默认以图片形式回复，并自动发出Continue命令补全回答。长回复可能会有bug。',
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
          bottomHelpMessage: 'OpenAI的API服务器地址。默认为https://api.openai.com',
          component: 'Input'
        },
        {
          field: 'model',
          label: '模型',
          bottomHelpMessage: '模型名称，如无特殊需求保持默认即可，会使用chatgpt-api库提供的当前可用的最适合的默认值。保底可用的是 text-davinci-003。当发现新的可用的chatGPT模型会更新这里的值。',
          component: 'Input'
        },
        {
          field: 'thinkingTips',
          label: '思考提示',
          bottomHelpMessage: '是否开启AI正在思考中的提示信息。',
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
              { label: 'Sydney(可能存在风险)', value: 'Sydney' }
            ]
          }
        },
        {
          field: 'sydney',
          label: 'Sydney的设定',
          bottomHelpMessage: '你可以自己改写Sydney的设定，让Sydney变成你希望的样子，不过请注意，Sydney仍然是Sydney。',
          component: 'InputTextArea'
        },
        {
          field: 'sydneyReverseProxy',
          label: 'sydney反代',
          bottomHelpMessage: '国内ip无法正常使用sydney，如果有bing.com的反代可以填在此处，或者使用proxy',
          component: 'Input'
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
          label: '以下为浏览器方式的配置',
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
          if (keyPath === 'blockWords' || keyPath === 'promptBlockWords') { value = value.toString().split(/[,，;；\|]/) }
          if (Config[keyPath] != value) { Config[keyPath] = value }
        }
        return Result.ok({}, '保存成功~')
      }
    }
  }
}
