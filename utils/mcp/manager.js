import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import ChatGPTConfig from '../../config/config.js'
import { md5 } from '../common.js'
import {
  clearMcpToolRoutes,
  disposeMcpRegistry,
  registerMcpServerClient,
  registerMcpToolRoute
} from './registry.js'

const BRIDGE_TOOL_ID_PREFIX = 'mcp_bridge_'

function sanitizeToolName (name = '') {
  return String(name).replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
}

function buildBridgeToolName (serverId, mcpToolName) {
  const prefix = sanitizeToolName(ChatGPTConfig.mcp?.toolNamePrefix || 'mcp') || 'mcp'
  const s = sanitizeToolName(serverId) || 'server'
  const t = sanitizeToolName(mcpToolName) || 'tool'
  return `${prefix}_${s}_${t}`
}

function buildBridgeToolCode (className, bridgeToolName, schema, description = '') {
  const fnSchema = JSON.stringify({
    name: bridgeToolName,
    description: description || `MCP bridge tool: ${bridgeToolName}`,
    parameters: schema && typeof schema === 'object'
      ? schema
      : {
          type: 'object',
          properties: {},
          required: []
        }
  }, null, 2)

  return `import { CustomTool } from 'chaite'\nimport { callMcpBridgeTool } from '../mcp/registry.js'\n\nclass ${className} extends CustomTool {\n  name = '${bridgeToolName}'\n\n  function = ${fnSchema}\n\n  async run(args) {\n    return callMcpBridgeTool('${bridgeToolName}', args || {})\n  }\n}\n\nexport default new ${className}()\n`
}

function shouldIncludeTool (server, mcpToolName) {
  const includes = Array.isArray(server.includeTools) ? server.includeTools : []
  const excludes = Array.isArray(server.excludeTools) ? server.excludeTools : []

  if (includes.length > 0 && !includes.includes(mcpToolName)) {
    return false
  }
  if (excludes.includes(mcpToolName)) {
    return false
  }
  return true
}

async function clearOldBridgeTools (toolsManager) {
  const all = await toolsManager.listInstances()
  for (const t of all) {
    if (t?.id?.startsWith(BRIDGE_TOOL_ID_PREFIX)) {
      try {
        await toolsManager.deleteInstance(t.id)
      } catch (err) {
        logger.warn(`[MCP] 删除旧桥接工具失败 ${t.id}: ${err?.message || err}`)
      }
    }
  }
}

async function createStdioTransport (server) {
  if (!server.command || !String(server.command).trim()) {
    throw new Error(`MCP server ${server.id} 缺少 command 配置`)
  }

  const transport = new StdioClientTransport({
    command: String(server.command).trim(),
    args: Array.isArray(server.args) ? server.args.map(a => String(a)) : [],
    env: server.env && typeof server.env === 'object'
      ? Object.fromEntries(Object.entries(server.env).map(([k, v]) => [String(k), String(v)]))
      : undefined,
    cwd: server.cwd && String(server.cwd).trim()
      ? String(server.cwd).trim()
      : undefined,
    stderr: 'pipe'
  })

  if (transport.stderr) {
    transport.stderr.on('data', (buf) => {
      const line = String(buf || '').trim()
      if (line) {
        logger.debug(`[MCP:${server.id}:stderr] ${line}`)
      }
    })
  }

  return transport
}

async function connectServer (server) {
  if (server.transport !== 'stdio') {
    logger.warn(`[MCP] 暂不支持 transport=${server.transport}，当前仅实现 stdio`) 
    return null
  }

  const client = new Client(
    {
      name: 'chatgpt-plugin-mcp-client',
      version: ChatGPTConfig.version || '3.0.0'
    },
    {
      capabilities: {}
    }
  )

  const transport = await createStdioTransport(server)
  await client.connect(transport)
  return { client, transport }
}

/**
 * 初始化 MCP 兼容层：把 MCP tools 动态桥接成 Chaite CustomTool
 * @param {import('chaite').ToolManager} toolsManager
 */
export async function initMcpCompatibility (toolsManager) {
  const conf = ChatGPTConfig.mcp
  if (!conf?.enable) {
    return
  }

  const servers = Array.isArray(conf.servers) ? conf.servers : []
  if (servers.length === 0) {
    logger.warn('[MCP] 已开启但未配置 servers')
    return
  }

  await disposeMcpRegistry()
  clearMcpToolRoutes()

  if (conf.removeStaleBridgeToolsOnStart !== false) {
    await clearOldBridgeTools(toolsManager)
  }

  const nameSet = new Set()

  for (const server of servers) {
    if (!server?.enable) {
      continue
    }
    if (!server.id) {
      logger.warn('[MCP] 忽略一个未设置 id 的 server 配置')
      continue
    }

    try {
      const connected = await connectServer(server)
      if (!connected) {
        continue
      }

      registerMcpServerClient(server.id, connected)
      const toolList = await connected.client.listTools()
      const tools = Array.isArray(toolList?.tools) ? toolList.tools : []

      logger.info(`[MCP] 服务 ${server.id} 已连接，发现工具 ${tools.length} 个`)

      for (const tool of tools) {
        const mcpToolName = tool?.name
        if (!mcpToolName || !shouldIncludeTool(server, mcpToolName)) {
          continue
        }

        let bridgeToolName = buildBridgeToolName(server.id, mcpToolName)
        if (nameSet.has(bridgeToolName)) {
          bridgeToolName = `${bridgeToolName}_${md5(`${server.id}:${mcpToolName}`).slice(0, 6)}`
        }
        nameSet.add(bridgeToolName)

        registerMcpToolRoute(bridgeToolName, {
          serverId: server.id,
          mcpToolName
        })

        const className = `McpBridgeTool_${md5(`${server.id}:${mcpToolName}`).slice(0, 10)}`
        const toolCode = buildBridgeToolCode(
          className,
          bridgeToolName,
          tool.inputSchema,
          `[MCP:${server.id}] ${tool.description || mcpToolName}`
        )

        await toolsManager.addInstance({
          id: `${BRIDGE_TOOL_ID_PREFIX}${md5(`${server.id}:${mcpToolName}`)}`,
          name: bridgeToolName,
          description: `[MCP:${server.id}] ${tool.description || mcpToolName}`,
          code: toolCode,
          permission: 'private',
          status: 'enabled'
        })
      }
    } catch (err) {
      logger.error(`[MCP] 初始化 server=${server.id} 失败:`, err)
    }
  }
}

/**
 * 关闭 MCP 连接
 */
export async function disposeMcpCompatibility () {
  await disposeMcpRegistry()
}
