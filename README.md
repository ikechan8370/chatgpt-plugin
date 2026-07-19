# chatgpt-plugin

基于 Chaite 内核的 Yunzai 对话插件，支持多模型渠道、工具调用、记忆系统、伪人模式，以及标准 MCP 工具桥接（stdio / streamable-http）。

旧版说明文档已保留为 `readme_old.md`。

## 主要能力

- 多渠道与预设管理（可在面板或命令行操作）
- 群上下文注入与多轮会话管理
- 工具调用与推理过程回显
- 群记忆 / 用户记忆（可独立开关）
- BYM 伪人模式
- MCP 兼容桥接：
  - 本地 `stdio` MCP 服务
  - 远程 `streamable-http` MCP 服务
  - 动态生成 Chaite 工具并加入工具池

## 安装

```bash
cd plugins
git clone https://github.com/ikechan8370/chatgpt-plugin.git
cd chatgpt-plugin
pnpm install
```

然后重启 Yunzai。

## 关键配置

运行时配置文件：`plugins/chatgpt-plugin/data/config.json`

基础配置示例：

```json
{
  "basic": {
    "toggleMode": "at",
    "togglePrefix": "#chat",
    "commandPrefix": "#chatgpt"
  }
}
```

## MCP 配置示例

### 1) 本地 stdio（示例：AntV 图表）

```json
{
  "id": "antv_chart",
  "enable": true,
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@antv/mcp-server-chart"]
}
```

### 2) 远程 streamable-http（示例：阿里云代码解释器）

```json
{
  "id": "code_interpreter_mcp",
  "enable": true,
  "type": "streamableHttp",
  "transport": "streamable-http",
  "baseUrl": "https://dashscope.aliyuncs.com/api/v1/mcps/code_interpreter_mcp/mcp",
  "headers": {
    "Authorization": "Bearer ${DASHSCOPE_API_KEY}"
  }
}
```

环境变量建议放在：`config/pm2.yaml`

```yaml
env:
  app_type: pm2
  DASHSCOPE_API_KEY: "你的 DashScope Key"
```

## 常用命令

- `#chatgpt管理面板`
- `#chatgpt查看状态`
- `#结束对话`
- `#chatgpt开启思考转发`
- `#chatgpt关闭思考转发`

MCP 相关：

- `#chatgpt刷新MCP`
- `#chatgpt重载MCP工具`

这两个命令会重新连接已启用 MCP 服务并重建桥接工具，不必重启机器人。

## 故障排查

- 提示 `No API-key provided`：检查 `DASHSCOPE_API_KEY` 是否注入到 PM2 环境。
- 启动后无 MCP 工具：
  - 确认 `mcp.enable=true`
  - 确认服务项 `enable=true`
  - 发送 `#chatgpt刷新MCP` 强制重载
- `stdio` 服务连接失败：检查 `command/args` 是否可在当前机器执行。

## 目录说明

- `apps/`：命令与消息入口
- `models/`：Chaite 与存储实现
- `utils/mcp/`：MCP 注册与桥接管理
- `data/`：运行时配置与数据

