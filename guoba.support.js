import { Config } from './utils/config.js'

// 支持锅巴
export function supportGuoba() {
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
      description: '基于OpenAI最新推出的chatgpt和微软的 New bing通过api进行问答的插件，需自备openai账号或有New bing访问权限的必应账号',
      // 显示图标，此为个性化配置
      // 图标可在 https://icon-sets.iconify.design 这里进行搜索
      icon: 'simple-icons:openai',
      // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
      iconColor: '#00c3ff',
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
        {
          field: 'defaultUsePicture',
          label: '全局图片模式',
          bottomHelpMessage: '全局默认以图片形式回复，并自动发出Continue命令补全回答。长回复可能会有bug。',
          component: 'Switch',
        },
        {
            field: 'autoUsePicture',
            label: '长文本自动转图片',
            bottomHelpMessage: '字数大于阈值会自动用图片发送，即使是文本模式。',
            component: 'Switch',
        },
        {
            field: 'autoUsePictureThreshold',
            label: '自动转图片阈值',
            helpMessage: '长文本自动转图片开启后才生效',
            bottomHelpMessage: '自动转图片的字数阈值。',
            component: 'InputNumber',
            componentProps: {
              min: 0,
            },
        },
        {
            field: 'conversationPreserveTime',
            label: '对话保留时长',
            helpMessage: '单位：秒',
            bottomHelpMessage: '每个人发起的对话保留时长。超过这个时长没有进行对话，再进行对话将开启新的对话。',
            component: 'InputNumber',
            componentProps: {
              min: 0,
            },
        },
        {
          field: 'toggleMode',
          label: '触发方式',
          bottomHelpMessage: 'at模式下只有at机器人才会回复。#chat模式下不需要at，但需要添加前缀#chat。',
          component: 'Select',
          componentProps: {
            options: [
              {label: 'at', value: 'at'},
              {label: '#chat', value: 'prefix'},
            ],
          },
        },
        {
            field: 'showQRCode',
            label: '启用二维码',
            bottomHelpMessage: '在图片模式中启用二维码。该对话内容将被发送至第三方服务器以进行渲染展示，如果不希望对话内容被上传到第三方服务器请关闭此功能。',
            component: 'Switch',
        },
        {
          field: 'cacheUrl',
          label: '渲染服务器地址',
          bottomHelpMessage: '用于缓存图片模式会话内容并渲染的服务器地址。',
          component: 'Input',
        },
        {
          field: 'proxy',
          label: '代理服务器地址',
          bottomHelpMessage: '数据通过代理服务器发送，http或socks5代理。',
          component: 'Input',
        },
        {
            field: 'debug',
            label: '调试信息',
            bottomHelpMessage: '将输出更多调试信息，如果不希望控制台刷屏的话，可以关闭。',
            component: 'Switch',
        },
        {
            label: '以下为服务超时配置。',
            component: 'Divider',
        },
        {
            field: 'defaultTimeoutMs',
            label: '默认超时时间',
            helpMessage: '单位：毫秒',
            bottomHelpMessage: '各个地方的默认超时时间。',
            component: 'InputNumber',
            componentProps: {
              min: 0,
            },
        },
        {
            field: 'bingTimeoutMs',
            label: 'Bing超时时间',
            helpMessage: '单位：毫秒',
            bottomHelpMessage: 'bing默认超时时间，bing太慢了有的时候。',
            component: 'InputNumber',
            componentProps: {
              min: 0,
            },
        },
        {
            field: 'chromeTimeoutMS',
            label: '浏览器超时时间',
            helpMessage: '单位：毫秒',
            bottomHelpMessage: '浏览器默认超时，浏览器可能需要更高的超时时间。',
            component: 'InputNumber',
            componentProps: {
              min: 0,
            },
        },
        {
          label: '以下为API方式(默认)的配置',
          component: 'Divider',
        },
        {
          field: 'apiKey',
          label: 'OpenAI API Key',
          bottomHelpMessage: 'OpenAI的ApiKey，用于访问OpenAI的API接口。',
          component: 'InputPassword',
        },
        {
          field: 'model',
          label: '模型',
          bottomHelpMessage: '模型名称，如无特殊需求保持默认即可，会使用chatgpt-api库提供的当前可用的最适合的默认值。保底可用的是 text-davinci-003。当发现新的可用的chatGPT模型会更新这里的值。',
          component: 'Input',
        },
        {
          label: '以下为API2方式的配置',
          component: 'Divider',
        },
        {
            field: 'plus',
            label: 'ChatGPT Plus',
            bottomHelpMessage: 'ChatGPT Plus访问，如果购买了ChatGPT Plus请开启，响应更快。',
            component: 'Switch',
        },
        {
          field: 'reverseProxy',
          label: '第三方API接口',
          bottomHelpMessage: '使用第三方API。github开源的有几个，没特别要求保持默认就好。',
          component: 'Input',
        },
        {
          label: '以下为API3方式的配置。',
          component: 'Divider',
        },
        {
          field: 'api',
          label: 'ChatGPT API反代服务器地址',
          bottomHelpMessage: 'ChatGPT的API反代服务器，用于绕过Cloudflare访问ChatGPT API',
          component: 'Input',
        },
        {
          field: 'apiBaseUrl',
          label: 'apiBaseUrl地址',
          bottomHelpMessage: 'apiBaseUrl地址',
          component: 'Input',
        },
        {
          label: '以下为浏览器方式的配置',
          component: 'Divider',
        },
        {
          field: 'username',
          label: '用户名',
          bottomHelpMessage: 'OpenAI用户名。',
          component: 'Input',
        },
        {
          field: 'password',
          label: '用户名',
          bottomHelpMessage: 'OpenAI密码。',
          component: 'InputPassword',
        },
        {
          field: 'UA',
          label: '浏览器UA',
          bottomHelpMessage: '模拟浏览器UA，无特殊需求保持默认即可。',
          component: 'Input',
        },
        {
            field: 'headless',
            label: '无头模式',
            bottomHelpMessage: '无界面的服务器可以开启，但遇到验证码时可能无法使用。(实测很容易卡住，几乎不可用)。',
            component: 'Switch',
        },
        {
          field: 'chromePath',
          label: 'Chrome路径',
          bottomHelpMessage: '为空使用默认puppeteer的chromium，也可以传递自己本机安装的Chrome可执行文件地址，提高通过率。windows可以是‘C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe’，linux通过which查找路径。',
          component: 'Input',
        },
        {
          field: '2captchaToken',
          label: '验证码平台Token',
          bottomHelpMessage: '可注册2captcha实现跳过验证码，收费服务但很便宜。否则可能会遇到验证码而卡住。',
          component: 'InputPassword',
        },
      ],
      // 获取配置数据方法（用于前端填充显示数据）
      getConfigData() {
        return Config
      },
      // 设置配置的方法（前端点确定后调用的方法）
      setConfigData(data, {Result}) {
        for (let [keyPath, value] of Object.entries(data)) {
            if (Config[keyPath] != value)
                Config[keyPath] = value
        }
        return Result.ok({}, '保存成功~')
      },
    },
  }
}