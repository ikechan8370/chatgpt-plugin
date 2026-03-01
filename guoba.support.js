import Config from './config/config.js'
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
          field: 'testRender',
          label: '表格测试',
          component: 'Render',
          render: () => {
            `<span>你好</span>`
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
        return Result.ok({}, '保存成功~')
      }
    }
  }
}
