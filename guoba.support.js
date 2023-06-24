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
          bottomHelpMessage: '只有在白名单内的QQ号或群组才能使用本插件进行对话。如果需要添加QQ号，请在号码前面加上^符号（例如：^123456），多个号码之间请用英文逗号(,)隔开。白名单优先级高于黑名单。',
          component: 'Input'
        },
        {
          field: 'blacklist',
          label: '对话黑名单',
          bottomHelpMessage: '名单内的群或QQ号将无法使用本插件进行对话。如果需要添加QQ号，请在QQ号前面加上^符号（例如：^123456），并用英文逗号（,）将各个号码分隔开。',
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
          field: 'cacheUrl',
          label: '渲染服务器地址',
          bottomHelpMessage: '用于缓存图片模式会话内容并渲染的服务器地址',
          component: 'Input'
        },
        {
          field: 'cacheEntry',
          label: '预制渲染服务器访问代码',
          bottomHelpMessage: '图片内容渲染服务器开启预制访问代码，当渲染服务器访问较慢时可以开启,但无法保证访问代码可以正常访问页面',
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
          bottomHelpMessage: 'gpt-4, gpt-4-0613, gpt-4-32k, gpt-4-32k-0613, gpt-3.5-turbo, gpt-3.5-turbo-0613, gpt-3.5-turbo-16k-0613。默认为gpt-3.5-turbo，gpt-4需账户支持',
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
          bottomHelpMessage: '微软必应官方的三种应答风格。默认为均衡，Sydney为实验风格，独立与三种风格之外；自设定为自定义AI的回答风格',
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
        // {
        //   field: 'cognitiveReinforcementTip',
        //   label: '加强主人认知的后台prompt',
        //   component: 'InputTextArea'
        // },
        {
          field: 'groupContextLength',
          label: '允许机器人读取近期的最多群聊聊天记录条数。',
          bottomHelpMessage: '允许机器人读取近期的最多群聊聊天记录条数。太多可能会超。默认50',
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
          bottomHelpMessage: '仅自设定模式下有效。你可以自己改写设定，让Sydney变成你希望的样子。可能存在不稳定的情况',
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
          label: 'sydney反代',
          bottomHelpMessage: '仅悉尼和自设定模式下有效，用于创建对话（默认不用于正式对话）。目前国内ip和部分境外IDC IP由于微软限制创建对话，如果有bing.com的反代可以填在此处，或者使用proxy',
          component: 'Input'
        },
        {
          field: 'sydneyForceUseReverse',
          label: '强制使用sydney反代',
          bottomHelpMessage: '即使配置了proxy，创建对话时依然使用sydney反代',
          component: 'Switch'
        },
        {
          field: 'sydneyWebsocketUseProxy',
          label: '对话使用sydney反代',
          bottomHelpMessage: '【一般情况无需也不建议开启】默认情况下仅创建对话走反代，对话时仍然直连微软。开启本选项将使对话过程也走反，需反代支持',
          component: 'Switch'
        },
        {
          field: 'sydneyMood',
          label: '情感显示',
          bottomHelpMessage: '开启Sydney的情感显示，仅在图片模式下生效',
          component: 'Switch'
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
          bottomHelpMessage: '模拟浏览器UA，无特殊需求保持默认即可',
          component: 'InputTextArea'
        },
        {
          field: 'headless',
          label: '无头模式',
          bottomHelpMessage: '无界面的服务器可以开启，但遇到验证码时可能无法使用。(实测很容易卡住，几乎不可用)',
          component: 'Switch'
        },
        {
          field: 'chromePath',
          label: 'Chrome路径',
          bottomHelpMessage: '为空使用默认puppeteer的chromium，也可以传递自己本机安装的Chrome可执行文件地址，提高通过率。windows可以是‘C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe’，linux通过which查找路径',
          component: 'Input'
        },
        {
          label: '以下为Slack Claude方式的配置',
          component: 'Divider'
        },
        {
          field: 'slackUserToken',
          label: 'Slack用户Token',
          bottomHelpMessage: 'slackUserToken，在OAuth&Permissions页面获取。需要具有channels:history, chat:write, groups:history, im:history, mpim:history 这几个scope',
          component: 'Input'
        },
        {
          field: 'slackBotUserToken',
          label: 'Slack Bot Token',
          bottomHelpMessage: 'slackBotUserToken，在OAuth&Permissions页面获取。需要channels:history，groups:history，im:history 这几个scope',
          component: 'Input'
        },
        {
          field: 'slackClaudeUserId',
          label: 'Slack成员id',
          bottomHelpMessage: '在Slack中点击Claude头像查看详情，其中的成员ID复制过来',
          component: 'Input'
        },
        {
          field: 'slackSigningSecret',
          label: 'Slack签名密钥',
          bottomHelpMessage: 'Signing Secret。在Basic Information页面获取',
          component: 'Input'
        },
        {
          field: 'slackClaudeSpecifiedChannel',
          label: 'Slack指定频道',
          bottomHelpMessage: '为空时，将为每个qq号建立私有频道。若填写了，对话将发生在本频道。和其他人公用workspace时建议用这个',
          component: 'Input'
        },
        {
          field: 'slackClaudeEnableGlobalPreset',
          label: 'Claude使用全局设定',
          bottomHelpMessage: '开启后，所有人每次发起新对话时，会先发送设定过去再开始对话，达到类似Bing自设定的效果。',
          component: 'Switch'
        },
        {
          field: 'slackClaudeGlobalPreset',
          label: 'Slack全局设定',
          bottomHelpMessage: '若启用全局设定，每个人都会默认使用这里的设定。',
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
          label: '以下为星火方式的配置',
          component: 'Divider'
        },
        {
          field: 'xinghuoToken',
          label: '星火Cookie',
          bottomHelpMessage: '获取对话页面的ssoSessionId cookie。不要带等号和分号',
          component: 'Input'
        },
        {
          label: '以下为杂七杂八的配置',
          component: 'Divider'
        },
        {
          field: '2captchaToken',
          label: '验证码平台Token',
          bottomHelpMessage: '可注册2captcha实现跳过验证码，收费服务但很便宜。否则可能会遇到验证码而卡住',
          component: 'InputPassword'
        },
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
          label: '以下为后台与渲染相关配置',
          component: 'Divider'
        },
        {
          field: 'oldview',
          label: '旧版本渲染',
          bottomHelpMessage: '开启预览版本',
          component: 'Switch'
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
          if (keyPath === 'blacklist' || keyPath === 'whitelist' || keyPath === 'blockWords' || keyPath === 'promptBlockWords' || keyPath === 'initiativeChatGroups') { value = value.toString().split(/[,，;；\|]/) }
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
