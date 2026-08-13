![chatgpt-plugin](https://socialify.git.ci/ikechan8370/chatgpt-plugin/image?description=1&font=Jost&forks=1&issues=1&language=1&name=1&owner=1&pulls=1&stargazers=1&theme=Light)
<div align=center>

   <img src ="https://img.shields.io/github/issues/ikechan8370/chatgpt-plugin?logo=github"/>
<img src ="https://img.shields.io/github/license/ikechan8370/chatgpt-plugin"/>
<img src ="https://img.shields.io/github/v/tag/ikechan8370/chatgpt-plugin?label=latest%20version&logo=github"/>
<img src ="https://img.shields.io/github/languages/top/ikechan8370/chatgpt-plugin?logo=github"/>
</div>



![26224FE397F1E74104C1C007C1A32DDE](https://user-images.githubusercontent.com/21212372/227718994-4d33da74-6886-41d5-afd0-73986b086df0.gif)




> 插件v3大幅重构中，基本可用，持续完善中。遇到问题请提issue，欢迎PR。
> todo列表：
> - [x] 插件v3重构完成，插件基本功能可用，持续完善中。
> - [ ] RAG知识库
> - [ ] 预设更详细的配置
> - [x] 自定义触发器
> - [ ] 自定义插件
> - [ ] 兼容mcp


## 插件简介

ChatGPT-Plugin 以 Chaite 为内核，将多模型渠道、工具、处理器、触发器、RAG 和管控面板封装成一套适配 Miao-Yunzai / Yunzai-Bot 的插件方案。通过 Chaite 的 API 服务器与可插拔的存储层（默认 SQLite），插件可以在本地完成高并发对话、知识库检索、伪人陪聊以及记忆管理，亦可接入 Chaite Cloud 复用在线渠道与工具。

## 核心特性

- **多渠道与预设体系**：依托 Chaite 的 ChannelsManager 与 ChatPresetManager，支持为不同模型配置流量、负载均衡与个性化 prompt，群友也可在授权后自助切换预设。
- **高级消息适配**：前后文触发方式支持 `@Bot` 与前缀；自动处理引用、图片、语音等多模态输入，并在工具调用或推理阶段通过转发消息回显。
- **群上下文与伪人模式**：可按配置注入指定条数的群聊记录；BYM 伪人模式支持概率触发、关键词命中、预设覆盖及限时撤回，营造更拟人的陪聊体验。
- **记忆与 RAG**：内置 memoryService + vectra 向量索引，提供群记忆、私人记忆与外部知识库（RAGManager）注入能力，支持混合检索与手动管理。
- **可视化与指令双管控**：`#chatgpt管理面板` 一键获取面板 token，Web 端即可操作渠道、工具、触发器；同时保留完整的命令行 CRUD 指令。
- **自动更新与依赖管理**：`#chatgpt更新` / `#chatgpt强制更新` 调用 git 同步仓库并自动更新 chaite 依赖，减少手动维护成本。

## 快速安装

1. **克隆代码**
   ```bash
   cd plugins
   git clone https://github.com/ikechan8370/chatgpt-plugin.git
   ```
2. **安装依赖**（推荐 Node.js ≥ 18 + pnpm ≥ 8）
   ```bash
   cd chatgpt-plugin
   pnpm install
   ```
   本地记忆功能使用宿主环境常见的 `sqlite3` 驱动；`sqlite-vec` 仅用于向量检索增强，作为可选依赖处理。若 `sqlite-vec` 在当前平台不可用，记忆功能仍会保留基础存储、关键词检索与 LIKE 回退。
3. **在 Yunzai 中启用插件**
    - 重启机器人或运行 `node app` 让插件自动加载。
    - 首次启动会在 `plugins/chatgpt-plugin/config/` 下生成 `config.json / config.yaml`。
4. **保持更新**
    - 主人账号发送 `#chatgpt更新` 获取最新版本。
    - `#chatgpt强制更新` 会放弃本地修改后重新拉取，请谨慎使用。

## 配置指引

配置文件默认位于 `plugins/chatgpt-plugin/config/config.json`，也可改写为 YAML。常用字段示例：

```yaml
basic:
  toggleMode: at            # at / prefix
  togglePrefix: "#chat"     # prefix 模式下的触发词
  commandPrefix: "#chatgpt" # 管理指令前缀
llm:
  defaultModel: "gpt-4o-mini"
  defaultChatPresetId: "default"
  enableGroupContext: true
  groupContextLength: 20
bym:
  enable: false
  probability: 0.02
  defaultPreset: "bym_default"
chaite:
  cloudApiKey: ""           # 可选，接入 Chaite Cloud
  host: "0.0.0.0"
  port: 48370
  publicBaseUrl: ""         # 可选，自定义访问地址，如 https://example.com
memory:
  group:
    enable: false
    enabledGroups: ["123456"]
  user:
    enable: false
    whitelist: ["123456789"]
```

- **basic**：控制触发方式、调试与命令前缀。
- **llm**：定义默认模型、嵌入模型、群上下文等。`defaultChatPresetId` 需在面板或命令中提前创建。
- **chaite**：`storage` 默认 SQLite，会在 `plugins/chatgpt-plugin/data/data.db` 生成数据文件；如接入 Chaite Cloud，请填入 `cloudApiKey` 并开放 `host/port`。`publicBaseUrl` 会作为“自定义地址”单独发送；插件还会列出本机网卡内网地址，并通过 ip.sb / ip.me 尝试获取公网 IPv4 / IPv6。
- **bym**：配置伪人触发概率、关键词映射、撤回与思考内容开关。
- **memory**：为群记忆或私人记忆开启检索、模型与提示词，可按需启用 `extensions.simple` 以加载自定义词典。

修改后保存文件，插件会自动热加载；在 Chaite 面板修改配置时也会反向写回本地文件。

## 使用方式

### 基础对话

- `@Bot 你好` 或 `#chat 今天天气如何` 触发默认预设，插件会保持用户 `conversationId` 与 `messageId`，自动续写多轮对话。
- 回复图片/文本可作为上下文输入，模型返回的图片、语音与思考内容会自动转换为 QQ 消息或转发记录。
- `#结束对话` 仅清空自己的会话；`#结束全部对话` 需主人权限。

### 管理命令 & 面板

- `#chatgpt管理面板`：私聊发送一条转发消息，包含自定义地址、内网地址、外网地址三类一次性登录入口；公网、NAT 或反代场景请配置 `chaite.publicBaseUrl`。
- CRUD 命令示例（均支持 `列表 / 添加 / 查看 / 删除`）：
  ```
  #chatgpt渠道列表
  #chatgpt预设添加 角色扮演 {...}
  #chatgpt工具删除 web-search
  #chatgpt处理器查看 markdown
  ```
- `#chatgpt调试模式开关`、`#chatgpt伪人开关` 等指令可快速切换全局开关。

### 伪人（BYM）模式

1. 在配置中启用 `bym.enable` 并指定 `defaultPreset` 或 `presetMap`。
2. 伪人会在命中关键词或达到概率阈值时主动发言，可通过 `presetPrefix` 调整统一人设，`temperature/maxTokens` 控制语气与长度。
3. 支持为不同关键词配置 `recall` 秒数，实现“发完撤回”效果。

### 记忆系统

- **群记忆指令**
  ```
  #群记忆          #仅群聊
  #删除群记忆 1    #主人或群管
  #记忆列表        #主人查看全局开关
  ```
- **私人记忆指令**
  ```
  #记忆 / 我的记忆
  #他的记忆 @xxx   #群聊内查看他人（需其授权）
  #删除记忆 1
  ```
- 记忆抽取依赖配置中的 `memory.group` / `memory.user` 模型与预设，collector 会定期读取群聊历史，必要时可在 `enabledGroups` 中按群号白名单控制。

### 更新与维护

- `#chatgpt更新`：git pull 插件仓库并使用 pnpm/npm 更新 chaite 依赖。
- `#chatgpt强制更新`：在更新前执行 `git checkout .`，用于舍弃本地改动。
- 日志会通过转发消息发送最近 20 条 commit，方便追踪版本变化。


## 赞助

如果觉得本项目好玩或者对你有帮助，愿意的话可以赞助我一口快乐水：

https://afdian.net/a/ikechan8370

## 贡献者

感谢以下贡献者

<a href="https://github.com/ikechan8370/chatgpt-plugin/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ikechan8370/chatgpt-plugin" />
</a>


![Alt](https://repobeats.axiom.co/api/embed/076d597ede41432208435f233d18cb20052fb90a.svg "Repobeats analytics image")

## Star History

[![Star History Chart](https://api.star-history.dera.page/svg?repos=ikechan8370/chatgpt-plugin&type=Date)](https://star-history.dera.page/#ikechan8370/chatgpt-plugin&Date)

