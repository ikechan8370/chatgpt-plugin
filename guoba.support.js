import { Config } from './utils/config.js'
import { speakers } from './utils/tts.js'
import { supportConfigurations as azureRoleList } from './utils/tts/microsoft-azure.js'
import { supportConfigurations as voxRoleList } from './utils/tts/voicevox.js'
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
          field: 'toggleMode',
          label: '触发方式',
          bottomHelpMessage: 'at模式下只有at机器人才会回复。#chat模式下不需要at，但需要添加前缀#chat',
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
          field: 'proxy',
          label: '代理服务器地址',
          bottomHelpMessage: '数据通过代理服务器发送，http或socks5代理。配置后需重启',
          component: 'Input'
        },
        {
          field: 'debug',
          label: '调试信息',
          bottomHelpMessage: '将输出更多调试信息，如果不希望控制台刷屏的话，可以关闭',
          component: 'Switch'
        },
        {
          field: 'enableToolbox',
          label: '开启工具箱',
          bottomHelpMessage: '独立的后台管理面板（默认3321端口），与锅巴类似。工具箱会有额外占用，启动速度稍慢，酌情开启。修改后需重启生效！！！',
          component: 'Switch'
        },
        {
          field: 'enableMd',
          label: 'QQ开启markdown',
          bottomHelpMessage: 'qq的第三方md，非QQBot。需要适配器实现segment.markdown和segment.button方可使用，否则不建议开启，会造成各种错误。默认关闭',
          component: 'Switch'
        },
        {
          field: 'translateSource',
          label: '翻译来源',
          bottomHelpMessage: '#gpt翻译使用的AI来源',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'OpenAI', value: 'openai' },
              { label: 'Gemini', value: 'gemini' },
              { label: '星火', value: 'xh' },
              { label: '通义千问', value: 'qwen' }
            ]
          }
        },
        {
          label: '以下为服务超时配置。',
          component: 'Divider'
        },
        {
          field: 'defaultTimeoutMs',
          label: '默认超时时间',
          helpMessage: '单位：毫秒',
          bottomHelpMessage: '各个地方的默认超时时间',
          component: 'InputNumber',
          componentProps: {
            min: 0
          }
        },
        {
          field: 'chromeTimeoutMS',
          label: '浏览器超时时间',
          helpMessage: '单位：毫秒',
          bottomHelpMessage: '浏览器默认超时，浏览器可能需要更高的超时时间',
          component: 'InputNumber',
          componentProps: {
            min: 0
          }
        },
        {
          field: 'sydneyFirstMessageTimeout',
          label: 'Sydney模式接受首条信息超时时间',
          helpMessage: '单位：毫秒',
          bottomHelpMessage: '超过该时间阈值未收到Bing的任何消息，则断开本次连接并重试（最多重试3次，失败后将返回timeout waiting for first message）',
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
          bottomHelpMessage: 'OpenAI的ApiKey，用于访问OpenAI的API接口',
          component: 'InputPassword'
        },
        {
          field: 'model',
          label: 'OpenAI 模型',
          bottomHelpMessage: 'gpt-4, gpt-4-0613, gpt-4-1106, gpt-4-32k, gpt-4-32k-0613, gpt-3.5-turbo, gpt-3.5-turbo-0613, gpt-3.5-turbo-1106, gpt-3.5-turbo-16k-0613。默认为gpt-3.5-turbo，gpt-4需账户支持',
          component: 'Input'
        },
        {
          field: 'smartMode',
          label: '智能模式',
          bottomHelpMessage: '仅建议gpt-4-32k和gpt-3.5-turbo-16k-0613开启，gpt-4-0613也可。开启后机器人可以群管、收发图片、发视频发音乐、联网搜索等。注意较费token。配合开启读取群聊上下文效果更佳',
          component: 'Switch'
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
          bottomHelpMessage: '你可以在这里写入你希望AI回答的风格，比如希望优先回答中文，回答长一点等',
          component: 'InputTextArea'
        },
        {
          field: 'assistantLabel',
          label: 'AI名字',
          bottomHelpMessage: 'AI认为的自己的名字，当你问他你是谁是他会回答这里的名字',
          component: 'Input'
        },
        {
          field: 'temperature',
          label: 'temperature',
          bottomHelpMessage: '用于控制回复内容的多样性，数值越大回复越加随机、多元化，数值越小回复越加保守',
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
          bottomHelpMessage: 'Copilot的应答风格。默认为创意，可切换为精准或均衡，均为GPT-turbo',
          component: 'Select',
          componentProps: {
            options: [
              { label: '创意', value: 'Creative' },
              { label: '均衡', value: 'Balanced' },
              { label: '精准', value: 'Precise' }
            ]
          }
        },
        {
          field: 'sydneyEnableSearch',
          label: '是否允许必应进行搜索',
          bottomHelpMessage: '关闭后必应将禁用搜索',
          component: 'Switch'
        },
        {
          field: 'enableSuggestedResponses',
          label: '是否开启建议回复',
          bottomHelpMessage: '开启了会像官网上一样，每个问题给出建议的用户问题',
          component: 'Switch'
        },
        {
          field: 'enableGroupContext',
          label: '是否允许机器人读取近期的群聊聊天记录',
          bottomHelpMessage: '开启后机器人可以知道群名、最近发言等信息',
          component: 'Switch'
        },
        {
          field: 'groupContextTip',
          label: '机器人读取聊天记录时的后台prompt',
          component: 'InputTextArea'
        },
        {
          field: 'enforceMaster',
          label: '加强主人认知',
          bottomHelpMessage: '加强主人认知。希望机器人认清主人，避免NTR可开启。开启后可能会与自设定的内容有部分冲突。sydney模式可以放心开启',
          component: 'Switch'
        },
        {
          field: 'enableGenerateContents',
          label: '允许生成图像等内容',
          bottomHelpMessage: '开启后类似网页版能够发图。但是此选项会占用大量token，自设定等模式下容易爆token',
          component: 'Switch'
        },
        {
          field: 'groupContextLength',
          label: '允许机器人读取近期的最多群聊聊天记录条数。',
          bottomHelpMessage: '允许机器人读取近期的最多群聊聊天记录条数。太多可能会超。默认50。同时影响所有模式，不止必应',
          component: 'InputNumber'
        },
        {
          field: 'enableRobotAt',
          label: '是否允许机器人真at',
          bottomHelpMessage: '开启后机器人的回复如果at群友会真的at',
          component: 'Switch'
        },
        {
          field: 'sydney',
          label: 'Custom的设定',
          bottomHelpMessage: '你可以自己改写设定，让Copilot变成你希望的样子。可能存在不稳定的情况',
          component: 'InputTextArea'
        },
        {
          field: 'sydneyApologyIgnored',
          label: 'Bing抱歉是否不计入聊天记录',
          bottomHelpMessage: '有时无限抱歉，就关掉这个再多问几次试试，可能有奇效',
          component: 'Switch'
        },
        {
          field: 'sydneyContext',
          label: 'Bing的扩展资料',
          bottomHelpMessage: 'AI将会从你提供的扩展资料中学习到一些知识，帮助它更好地回答你的问题。实际相当于使用edge侧边栏Bing时读取的你当前浏览网页的内容。如果太长可能容易到达GPT-4的8192token上限',
          component: 'InputTextArea'
        },
        {
          field: 'sydneyReverseProxy',
          label: '必应反代',
          bottomHelpMessage: '用于创建对话（默认不用于正式对话）。目前国内ip和部分境外IDC IP由于微软限制创建对话，如果有bing.com的反代可以填在此处，或者使用proxy',
          component: 'Input'
        },
        {
          field: 'sydneyForceUseReverse',
          label: '强制使用sydney反代',
          bottomHelpMessage: '即使配置了proxy，创建对话时依然使用必应反代',
          component: 'Switch'
        },
        {
          field: 'sydneyWebsocketUseProxy',
          label: '对话使用必应反代',
          bottomHelpMessage: '默认情况下仅创建对话走反代，对话时仍然直连微软。开启本选项将使对话过程也走反代，需反代支持。默认开启',
          component: 'Switch'
        },
        {
          field: 'bingCaptchaOneShotUrl',
          label: '必应验证码pass服务',
          bottomHelpMessage: '必应出验证码会自动用该服务绕过',
          component: 'Input'
        },
        {
          field: 'sydneyMood',
          label: '情感显示',
          bottomHelpMessage: '开启Sydney的情感显示，仅在图片模式下生效',
          component: 'Switch'
        },
        {
          field: 'sydneyImageRecognition',
          label: '图片识别',
          bottomHelpMessage: '开启Sydney的图片识别功能，建议和OCR只保留一个开启',
          component: 'Switch'
        },
        {
          field: 'chatExampleUser1',
          label: '前置对话第一轮（用户）',
          bottomHelpMessage: '会强行插入该轮对话，能有效抑制抱歉',
          component: 'InputTextArea'
        },
        {
          field: 'chatExampleBot1',
          label: '前置对话第一轮（AI）',
          bottomHelpMessage: '会强行插入该轮对话，能有效抑制抱歉',
          component: 'InputTextArea'
        },
        {
          field: 'chatExampleUser2',
          label: '前置对话第二轮（用户）',
          bottomHelpMessage: '会强行插入该轮对话，能有效抑制抱歉',
          component: 'InputTextArea'
        },
        {
          field: 'chatExampleBot2',
          label: '前置对话第二轮（AI）',
          bottomHelpMessage: '会强行插入该轮对话，能有效抑制抱歉',
          component: 'InputTextArea'
        },
        {
          field: 'chatExampleUser3',
          label: '前置对话第三轮（用户）',
          bottomHelpMessage: '会强行插入该轮对话，能有效抑制抱歉',
          component: 'InputTextArea'
        },
        {
          field: 'chatExampleBot3',
          label: '前置对话第三轮（AI）',
          bottomHelpMessage: '会强行插入该轮对话，能有效抑制抱歉',
          component: 'InputTextArea'
        },
        {
          label: '以下为API3方式的配置',
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
          label: '以下为智谱清言（ChatGLM）方式的配置。',
          component: 'Divider'
        },
        {
          field: 'chatglmRefreshToken',
          label: 'refresh token',
          bottomHelpMessage: 'chatglm_refresh_token 6个月有效期',
          component: 'Input'
        },
        {
          label: '以下为Claude API方式的配置',
          component: 'Divider'
        },
        {
          field: 'claudeApiKey',
          label: 'claude API Key',
          bottomHelpMessage: '前往 https://console.anthropic.com/settings/keys 注册和生成。可以填写多个，用英文逗号隔开',
          component: 'InputPassword'
        },
        {
          field: 'claudeApiModel',
          label: 'claude API 模型',
          bottomHelpMessage: '如 claude-3-sonnet-20240229 或 claude-3-opus-20240229',
          component: 'Input'
        },
        {
          field: 'claudeApiBaseUrl',
          label: 'claude API 反代',
          component: 'Input'
        },
        {
          field: 'claudeApiMaxToken',
          label: 'claude 最大回复token数',
          component: 'InputNumber'
        },
        {
          field: 'claudeApiTemperature',
          label: 'claude 温度',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1
          }
        },
        {
          field: 'claudeSystemPrompt',
          label: 'claude 设定',
          component: 'InputTextArea'
        },
        {
          label: '以下为Claude2方式的配置',
          component: 'Divider'
        },
        {
          field: 'claudeAIOrganizationId',
          label: 'claude2 OrganizationId',
          bottomHelpMessage: 'claude.ai的OrganizationId',
          component: 'Input'
        },
        {
          field: 'claudeAISessionKey',
          label: 'claude2 SessionKey',
          bottomHelpMessage: 'claude.ai Cookie中的SessionKey',
          component: 'Input'
        },
        {
          field: 'claudeAIReverseProxy',
          label: 'claude2 反代',
          bottomHelpMessage: 'claude.ai 的反代。或许可以参考https://github.com/ikechan8370/sydney-ws-proxy/tree/claude.ai搭建',
          component: 'Input'
        },
        {
          field: 'claudeAIJA3',
          label: 'claude2浏览器指纹',
          bottomHelpMessage: 'claude.ai使用的浏览器TLS指纹，去https://scrapfly.io/web-scraping-tools/ja3-fingerprint或https://ja3.zone/check查看。如果用了反代就不用管',
          component: 'Input'
        },
        {
          field: 'claudeAIUA',
          label: 'claude2浏览器UA',
          bottomHelpMessage: 'claude.ai使用的浏览器UA，https://scrapfly.io/web-scraping-tools/http2-fingerprint或https://ja3.zone/check查看。如果用了反代就不用管',
          component: 'Input'
        },
        {
          field: 'claudeAITimeout',
          label: 'claude2超时时间',
          bottomHelpMessage: '等待响应的超时时间，单位为秒，默认为120。如果不使用反代而是使用代理可以适当调低。',
          component: 'InputNumber'
        },
        {
          label: '以下为星火方式的配置',
          component: 'Divider'
        },
        {
          field: 'xhmode',
          label: '星火模式',
          bottomHelpMessage: '设置星火使用的对话模式',
          component: 'Select',
          componentProps: {
            options: [
              { label: '体验版', value: 'web' },
              { label: '讯飞星火认知大模型V1.5', value: 'api' },
              { label: '讯飞星火认知大模型V2.0', value: 'apiv2' },
              { label: '讯飞星火认知大模型V3.0', value: 'apiv3' },
              { label: '讯飞星火认知大模型V3.5', value: 'apiv3.5' },
              { label: '讯飞星火认知大模型V4.0', value: 'apiv4.0' },
              { label: '讯飞星火助手', value: 'assistants' }
            ]
          }
        },
        {
          field: 'xinghuoToken',
          label: '星火Cookie',
          bottomHelpMessage: '获取对话页面的ssoSessionId cookie。不要带等号和分号',
          component: 'InputPassword'
        },
        {
          field: 'xhAppId',
          label: 'AppId',
          bottomHelpMessage: '应用页面获取',
          component: 'Input'
        },
        {
          field: 'xhAPISecret',
          label: 'APISecret',
          bottomHelpMessage: '应用页面获取',
          component: 'InputPassword'
        },
        {
          field: 'xhAPIKey',
          label: '星火APIKey',
          bottomHelpMessage: '应用页面获取',
          component: 'InputPassword'
        },
        {
          field: 'xhAssistants',
          label: '助手接口',
          bottomHelpMessage: '助手页面获取',
          component: 'Input'
        },
        {
          field: 'xhTemperature',
          label: '核采样阈值',
          bottomHelpMessage: '核采样阈值。用于决定结果随机性，取值越高随机性越强即相同的问题得到的不同答案的可能性越高',
          component: 'InputNumber'
        },
        {
          field: 'xhMaxTokens',
          label: '最大Token',
          bottomHelpMessage: '模型回答的tokens的最大长度',
          component: 'InputNumber'
        },
        {
          field: 'xhPromptSerialize',
          label: '序列化设定',
          bottomHelpMessage: '是否将设定内容进行json序列化',
          component: 'Switch'
        },
        {
          field: 'xhPrompt',
          label: '设定',
          bottomHelpMessage: '若开启序列化，请传入json数据，例如[{ \"role\": \"user\", \"content\": \"现在是10点\" },{ \"role\": \"assistant\", \"content\": \"了解，现在10点了\" }]',
          component: 'InputTextArea'
        },
        {
          field: 'xhRetRegExp',
          label: '回复替换正则',
          bottomHelpMessage: '要替换文本的正则',
          component: 'Input'
        },
        {
          field: 'xhRetReplace',
          label: '回复内容替换',
          bottomHelpMessage: '替换回复内容中的文本',
          component: 'Input'
        },
        {
          label: '以下为通义千问API方式的配置',
          component: 'Divider'
        },
        {
          field: 'qwenApiKey',
          label: '通义千问API Key',
          component: 'InputPassword'
        },
        {
          field: 'qwenModel',
          label: '通义千问模型',
          bottomHelpMessage: '指明需要调用的模型，目前可选 qwen-turbo 和 qwen-plus',
          component: 'Input'
        },
        {
          field: 'qwenTopP',
          label: '通义千问topP',
          bottomHelpMessage: '生成时，核采样方法的概率阈值。例如，取值为0.8时，仅保留累计概率之和大于等于0.8的概率分布中的token，作为随机采样的候选集。取值范围为（0,1.0)，取值越大，生成的随机性越高；取值越低，生成的随机性越低。默认值 0.5。注意，取值不要大于等于1',
          component: 'InputNumber'
        },
        {
          field: 'qwenTopK',
          label: '通义千问topK',
          bottomHelpMessage: '生成时，采样候选集的大小。例如，取值为50时，仅将单次生成中得分最高的50个token组成随机采样的候选集。取值越大，生成的随机性越高；取值越小，生成的确定性越高。注意：如果top_k的值大于100，top_k将采用默认值0，表示不启用top_k策略，此时仅有top_p策略生效。',
          component: 'InputNumber'
        },
        {
          field: 'qwenSeed',
          label: '通义千问Seed',
          bottomHelpMessage: '生成时，随机数的种子，用于控制模型生成的随机性。如果使用相同的种子，每次运行生成的结果都将相同；当需要复现模型的生成结果时，可以使用相同的种子。seed参数支持无符号64位整数类型。默认值 0, 表示每次随机生成',
          component: 'InputNumber'
        },
        {
          field: 'qwenTemperature',
          label: '通义千问温度',
          bottomHelpMessage: '用于控制随机性和多样性的程度。具体来说，temperature值控制了生成文本时对每个候选词的概率分布进行平滑的程度。较高的temperature值会降低概率分布的峰值，使得更多的低概率词被选择，生成结果更加多样化；而较低的temperature值则会增强概率分布的峰值，使得高概率词更容易被选择，生成结果更加确定。\n' +
              '\n' +
              '取值范围： (0, 2),系统默认值1.0',
          component: 'InputNumber'
        },
        {
          field: 'qwenEnableSearch',
          label: '通义千问允许搜索',
          bottomHelpMessage: '生成时，是否参考夸克搜索的结果。注意：打开搜索并不意味着一定会使用搜索结果；如果打开搜索，模型会将搜索结果作为prompt，进而“自行判断”是否生成结合搜索结果的文本，默认为false',
          component: 'Switch'
        },
        {
          label: '以下为Gemini方式的配置',
          component: 'Divider'
        },
        {
          field: 'geminiKey',
          label: 'API密钥',
          bottomHelpMessage: '前往https://makersuite.google.com/app/apikey获取',
          component: 'InputPassword'
        },
        {
          field: 'geminiModel',
          label: '模型',
          bottomHelpMessage: '目前仅支持gemini-pro',
          component: 'Input'
        },
        {
          field: 'geminiPrompt',
          label: '设定',
          component: 'InputTextArea'
        },
        {
          field: 'geminiBaseUrl',
          label: 'Gemini反代',
          bottomHelpMessage: '对https://generativelanguage.googleapis.com的反代',
          component: 'Input'
        },
        {
          label: '以下为一些杂项配置。',
          component: 'Divider'
        },
        {
          field: 'blockWords',
          label: '输出黑名单',
          bottomHelpMessage: '检查输出结果中是否有违禁词，如果存在黑名单中的违禁词则不输出。英文逗号隔开',
          component: 'InputTextArea'
        },
        {
          field: 'promptBlockWords',
          label: '输入黑名单',
          bottomHelpMessage: '检查输入结果中是否有违禁词，如果存在黑名单中的违禁词则不输出。英文逗号隔开',
          component: 'InputTextArea'
        },
        {
          field: 'whitelist',
          label: '对话白名单',
          bottomHelpMessage: '默认设置为添加群号。优先级高于黑名单。\n' +
            '注意：需要添加QQ号时在前面添加^(例如：^123456)，此全局添加白名单，即除白名单以外的所有人都不能使用插件对话。\n' +
            '如果需要在某个群里独享moment，即群聊中只有白名单上的qq号能用，则使用（群号^qq）的格式(例如：123456^123456)。\n' +
            '白名单优先级：混合制 > qq > 群号。\n' +
            '黑名单优先级: 群号 > qq > 混合制。',
          component: 'Input'
        },
        {
          field: 'blacklist',
          label: '对话黑名单',
          bottomHelpMessage: '参考白名单设置规则。',
          component: 'Input'
        },
        {
          field: 'imgOcr',
          label: '图片识别',
          bottomHelpMessage: '是否识别消息中图片的文字内容，需要同时包含图片和消息才生效',
          component: 'Switch'
        },
        {
          field: 'enablePrivateChat',
          label: '是否允许私聊机器人',
          component: 'Switch'
        },
        {
          field: 'defaultUsePicture',
          label: '全局图片模式',
          bottomHelpMessage: '全局默认以图片形式回复',
          component: 'Switch'
        },
        {
          field: 'defaultUseTTS',
          label: '全局语音模式',
          bottomHelpMessage: '全局默认以语音形式回复，使用默认角色音色',
          component: 'Switch'
        },
        {
          field: 'ttsMode',
          label: '语音模式源',
          bottomHelpMessage: '语音模式下使用何种语音源进行文本->音频转换',
          component: 'Select',
          componentProps: {
            options: [
              {
                label: 'vits-uma-genshin-honkai',
                value: 'vits-uma-genshin-honkai'
              },
              {
                label: '微软Azure',
                value: 'azure'
              },
              {
                label: 'VoiceVox',
                value: 'voicevox'
              }
            ]
          }
        },
        {
          field: 'defaultTTSRole',
          label: 'vits默认角色',
          bottomHelpMessage: 'vits-uma-genshin-honkai语音模式下，未指定角色时使用的角色。若留空，将使用随机角色回复。若用户通过指令指定了角色，将忽略本设定',
          component: 'Select',
          componentProps: {
            options: [{
              label: '随机',
              value: '随机'
            }].concat(speakers.map(s => { return { label: s, value: s } }))
          }
        },
        {
          field: 'azureTTSSpeaker',
          label: 'Azure默认角色',
          bottomHelpMessage: '微软Azure语音模式下，未指定角色时使用的角色。若用户通过指令指定了角色，将忽略本设定',
          component: 'Select',
          componentProps: {
            options: [{
              label: '随机',
              value: '随机'
            },
            ...azureRoleList.flatMap(item => [
              item.roleInfo
            ]).map(s => ({
              label: s,
              value: s
            }))]
          }
        },
        {
          field: 'voicevoxTTSSpeaker',
          label: 'VoiceVox默认角色',
          bottomHelpMessage: 'VoiceVox语音模式下，未指定角色时使用的角色。若留空，将使用随机角色回复。若用户通过指令指定了角色，将忽略本设定',
          component: 'Select',
          componentProps: {
            options: [{
              label: '随机',
              value: '随机'
            },
            ...voxRoleList.flatMap(item => [
              ...item.styles.map(style => `${item.name}-${style.name}`),
              item.name
            ]).map(s => ({
              label: s,
              value: s
            }))]
          }
        },
        {
          field: 'ttsRegex',
          label: '语音过滤正则表达式',
          bottomHelpMessage: '语音模式下，配置此项以过滤不想被读出来的内容。表达式测试地址：https://www.runoob.com/regexp/regexp-syntax.html',
          component: 'Input'
        },
        {
          field: 'ttsAutoFallbackThreshold',
          label: '语音转文字阈值',
          helpMessage: '语音模式下，字数超过这个阈值就降级为文字',
          bottomHelpMessage: '语音转为文字的阈值',
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
          field: 'autoJapanese',
          label: 'vits模式日语输出',
          bottomHelpMessage: '使用vits语音时，将机器人的文字回复翻译成日文后获取语音。' +
            '若想使用插件的翻译功能，发送"#chatgpt翻译帮助"查看使用方法，支持图片翻译，引用翻译...',
          component: 'Switch'
        },
        {
          field: 'autoUsePicture',
          label: '长文本自动转图片',
          bottomHelpMessage: '字数大于阈值会自动用图片发送，即使是文本模式',
          component: 'Switch'
        },
        {
          field: 'autoUsePictureThreshold',
          label: '自动转图片阈值',
          helpMessage: '长文本自动转图片开启后才生效',
          bottomHelpMessage: '自动转图片的字数阈值',
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
          field: 'groupMerge',
          label: '群组消息合并',
          bottomHelpMessage: '开启后，群聊消息将被视为同一对话',
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
          bottomHelpMessage: '在图片模式中启用二维码。该对话内容将被发送至第三方服务器以进行渲染展示，如果不希望对话内容被上传到第三方服务器请关闭此功能',
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
          label: '以下为Suno音乐合成的配置。',
          component: 'Divider'
        },
        {
          field: 'sunoSessToken',
          label: 'sunoSessToken',
          bottomHelpMessage: 'suno的__sess token，需要与sunoClientToken一一对应数量相同，多个用逗号隔开',
          component: 'InputTextArea'
        },
        {
          field: 'sunoClientToken',
          label: 'sunoClientToken',
          bottomHelpMessage: 'suno的__client token，需要与sunoSessToken一一对应数量相同，多个用逗号隔开',
          component: 'InputTextArea'
        },
        {
          label: '以下为杂七杂八的配置',
          component: 'Divider'
        },
        // {
        //   field: '2captchaToken',
        //   label: '验证码平台Token',
        //   bottomHelpMessage: '可注册2captcha实现跳过验证码，收费服务但很便宜。否则可能会遇到验证码而卡住',
        //   component: 'InputPassword'
        // },
        {
          field: 'ttsSpace',
          label: 'vits-uma-genshin-honkai语音转换API地址',
          bottomHelpMessage: '前往duplicate空间https://huggingface.co/spaces/ikechan8370/vits-uma-genshin-honkai后查看api地址',
          component: 'Input'
        },
        {
          field: 'voicevoxSpace',
          label: 'voicevox语音转换API地址',
          bottomHelpMessage: '可使用https://2ndelement-voicevox.hf.space, 也可github搜索voicevox-engine自建',
          component: 'Input'
        },
        {
          field: 'azureTTSKey',
          label: 'Azure语音服务密钥',
          component: 'Input'
        },
        {
          field: 'azureTTSRegion',
          label: 'Azure语音服务区域',
          bottomHelpMessage: '例如japaneast',
          component: 'Input'
        },
        {
          field: 'azureTTSEmotion',
          label: 'Azure情绪多样化',
          bottomHelpMessage: '切换角色后使用"#chatgpt使用设定xxx"重新开始对话以更新不同角色的情绪配置。支持使用不同的说话风格回复，各个角色支持说话风格详情：https://speech.microsoft.com/portal/voicegallery',
          component: 'Switch'
        },
        {
          field: 'enhanceAzureTTSEmotion',
          label: 'Azure情绪纠正',
          bottomHelpMessage: '当机器人未使用或使用了不支持的说话风格时，将在对话中提醒机器人。注意：bing模式开启此项后有概率增大触发抱歉的机率，且不要单独开启此项。',
          component: 'Switch'
        },
        {
          field: 'huggingFaceReverseProxy',
          label: '语音转换huggingface反代',
          bottomHelpMessage: '没有就空着',
          component: 'Input'
        },
        {
          field: 'cloudTranscode',
          label: '云转码API地址',
          bottomHelpMessage: '目前只支持node-silk语音转码，可在本地node-silk无法使用时尝试使用云端资源转码',
          component: 'Input'
        },
        {
          field: 'cloudMode',
          label: '云转码API发送数据模式',
          bottomHelpMessage: '默认发送数据链接，如果你部署的是本地vits服务或使用的是微软azure，请改为文件',
          component: 'Select',
          componentProps: {
            options: [
              { label: '文件', value: 'file' },
              { label: '链接', value: 'url' }
              // { label: '数据', value: 'buffer' }
            ]
          }
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
          label: '打招呼prompt',
          bottomHelpMessage: '将会用这段文字询问ChatGPT，由ChatGPT给出随机的打招呼文字',
          component: 'Input'
        },
        {
          field: 'helloInterval',
          label: '打招呼间隔(小时)',
          component: 'InputNumber',
          componentProps: {
            min: 1,
            max: 24
          }
        },
        {
          field: 'helloProbability',
          label: '打招呼的触发概率(%)',
          bottomHelpMessage: '设置为100则每次经过间隔时间必定触发主动打招呼事件。',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 100
          }
        },
        {
          field: 'emojiBaseURL',
          label: '合成emoji的API地址，默认谷歌厨房',
          component: 'Input'
        },
        {
          label: '以下为Azure chatGPT的配置',
          component: 'Divider'
        },
        {
          field: 'azApiKey',
          label: 'Azure API Key',
          bottomHelpMessage: '管理密钥，用于访问Azure的API接口',
          component: 'InputPassword'
        },
        {
          field: 'azureUrl',
          label: '端点地址',
          bottomHelpMessage: 'https://xxxx.openai.azure.com/',
          component: 'Input'
        },
        {
          field: 'azureDeploymentName',
          label: '部署名称',
          bottomHelpMessage: '创建部署时输入的名称',
          component: 'Input'
        },
        {
          label: '以下为后台与渲染相关配置',
          component: 'Divider'
        },
        {
          field: 'serverPort',
          label: '系统Api服务端口',
          bottomHelpMessage: '系统Api服务开启的端口号，如需外网访问请将系统防火墙和服务器防火墙对应端口开放,修改后请重启',
          component: 'InputNumber'
        },
        {
          field: 'serverHost',
          label: '系统服务访问域名',
          bottomHelpMessage: '使用域名代替公网ip，适用于有服务器和域名的朋友避免暴露ip使用',
          component: 'Input'
        },
        {
          field: 'viewHost',
          label: '渲染服务器地址',
          bottomHelpMessage: '可选择第三方渲染服务器',
          component: 'Input'
        },
        {
          field: 'chatViewWidth',
          label: '图片渲染宽度',
          bottomHelpMessage: '聊天页面渲染窗口的宽度',
          component: 'InputNumber'
        },
        {
          field: 'cloudRender',
          label: '云渲染',
          bottomHelpMessage: '是否使用云资源进行图片渲染，需要开放服务器端口后才能使用，不支持旧版本渲染',
          component: 'Switch'
        },
        {
          field: 'chatViewBotName',
          label: 'Bot命名',
          bottomHelpMessage: '新渲染模式强制修改Bot命名',
          component: 'Input'
        },
        {
          field: 'groupAdminPage',
          label: '允许群获取后台地址',
          bottomHelpMessage: '是否允许群获取后台地址，关闭后将只能私聊获取',
          component: 'Switch'
        },
        {
          field: 'live2d',
          label: 'Live2D显示',
          bottomHelpMessage: '开启Live2D显示',
          component: 'Switch'
        },
        {
          field: 'live2dModel',
          label: 'Live2D模型',
          bottomHelpMessage: '选择Live2D使用的模型',
          component: 'Input'
        },
        {
          field: 'amapKey',
          label: '高德APIKey',
          bottomHelpMessage: '用于查询天气',
          component: 'Input'
        },
        {
          field: 'azSerpKey',
          label: 'Azure search key',
          bottomHelpMessage: 'https://www.microsoft.com/en-us/bing/apis/bing-web-search-api',
          component: 'Input'
        },
        {
          field: 'serpSource',
          label: '搜索来源，azure需填写key，ikechan8370为作者自备源',
          component: 'Select',
          componentProps: {
            options: [
              { label: 'Azure', value: 'azure' },
              { label: 'ikechan8370', value: 'ikechan8370' }
              // { label: '数据', value: 'buffer' }
            ]
          }
        },
        {
          field: 'extraUrl',
          label: '额外工具url',
          bottomHelpMessage: '（测试期间提供一个公益接口，一段时间后撤掉）参考搭建：https://github.com/ikechan8370/chatgpt-plugin-extras',
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
          if (keyPath === 'blacklist' || keyPath === 'whitelist') {
            // 6-10位数的群号或qq
            const regex = /^\^?[1-9]\d{5,9}(\^[1-9]\d{5,9})?$/
            const inputSet = new Set()
            value = value.toString().split(/[,，;；|\s]/).reduce((acc, item) => {
              item = item.trim()
              if (!inputSet.has(item) && regex.test(item)) {
                if (item.length <= 11 || (item.length <= 21 && item.length > 11 && !item.startsWith('^'))) {
                  inputSet.add(item)
                  acc.push(item)
                }
              }
              return acc
            }, [])
          }
          if (Config[keyPath] !== value) { Config[keyPath] = value }
        }
        // 正确储存azureRoleSelect结果
        const azureSpeaker = azureRoleList.find(config => {
          let i = config.roleInfo || config.code
          if (i === data.azureTTSSpeaker) {
            return config
          } else {
            return false
          }
        })
        if (typeof azureSpeaker === 'object' && azureSpeaker !== null) {
          Config.azureTTSSpeaker = azureSpeaker.code
        }
        return Result.ok({}, '保存成功~')
      }
    }
  }
}
