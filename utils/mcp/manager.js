import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import ChatGPTConfig from '../../config/config.js'
import { md5 } from '../common.js'
import {
  clearMcpToolRoutes,
  disposeMcpRegistry,
  registerMcpServerClient,
  registerMcpToolRoute
} from './registry.js'

const BRIDGE_TOOL_ID_PREFIX = 'mcp_bridge_'

function resolveEnvPlaceholders (value) {
  if (typeof value !== 'string') {
    return value
  }
  return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_m, varName) => {
    const envVal = process.env[varName]
    return envVal == null ? '' : String(envVal)
  })
}

function normalizeTransportType (server) {
  const raw = String(server.transport || server.type || 'stdio').trim().toLowerCase()
  if (raw === 'streamablehttp' || raw === 'streamable-http' || raw === 'streamable_http') {
    return 'streamable-http'
  }
  if (raw === 'sse') {
    return 'sse'
  }
  return 'stdio'
}

function normalizeServerId (server) {
  return String(server.id || server.name || '').trim()
}

function normalizeServerEnabled (server) {
  if (typeof server.enable === 'boolean') {
    return server.enable
  }
  if (typeof server.isActive === 'boolean') {
    return server.isActive
  }
  return false
}

function sanitizeToolName (name = '') {
  return String(name).replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
}

function buildBridgeToolName (serverId, mcpToolName) {
  const prefix = sanitizeToolName(ChatGPTConfig.mcp?.toolNamePrefix || 'mcp') || 'mcp'
  const s = sanitizeToolName(serverId) || 'server'
  const t = sanitizeToolName(mcpToolName) || 'tool'
  return `${prefix}_${s}_${t}`
}

function normalizeSchemaTypeName (typeName) {
  if (typeof typeName !== 'string') {
    return typeName
  }

  const lowered = typeName.trim().toLowerCase()
  switch (lowered) {
    case 'bool':
      return 'boolean'
    case 'int':
      return 'integer'
    case 'float':
    case 'double':
      return 'number'
    default:
      return lowered
  }
}

function normalizeJsonSchema (schema) {
  if (Array.isArray(schema)) {
    return schema.map(normalizeJsonSchema)
  }

  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const out = {}
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type') {
      out[k] = Array.isArray(v)
        ? v.map(normalizeSchemaTypeName)
        : normalizeSchemaTypeName(v)
      continue
    }
    out[k] = normalizeJsonSchema(v)
  }

  return out
}

function buildBridgeToolCode (className, bridgeToolName, schema, description = '') {
  const normalizedSchema = normalizeJsonSchema(schema)
  const fnSchema = JSON.stringify({
    name: bridgeToolName,
    description: description || `MCP bridge tool: ${bridgeToolName}`,
    parameters: normalizedSchema && typeof normalizedSchema === 'object'
      ? normalizedSchema
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
  const serverId = normalizeServerId(server)
  if (!server.command || !String(server.command).trim()) {
    throw new Error(`MCP server ${serverId} 缺少 command 配置`)
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

async function createStreamableHttpTransport (server) {
  const serverId = normalizeServerId(server)
  const rawUrl = String(server.baseUrl || server.url || '').trim()
  if (!rawUrl) {
    throw new Error(`MCP server ${serverId} 缺少 baseUrl/url 配置`)
  }

  const rawHeaders = server.headers && typeof server.headers === 'object'
    ? server.headers
    : {}

  const headers = {}
  for (const [k, v] of Object.entries(rawHeaders)) {
    headers[String(k)] = resolveEnvPlaceholders(String(v || ''))
  }

  const auth = headers.Authorization || headers.authorization
  if (/\$\{[A-Z0-9_]+\}/i.test(String(rawHeaders.Authorization || rawHeaders.authorization || ''))) {
    const authValue = String(auth || '').trim()
    const hasToken = /^Bearer\s+\S+/i.test(authValue)
    if (!hasToken) {
      logger.warn(`[MCP] 服务 ${serverId} 的 Authorization 占位变量未设置，已跳过连接`)
      return null
    }
  }

  const requestInit = {}
  if (Object.keys(headers).length > 0) {
    requestInit.headers = headers
  }

  return new StreamableHTTPClientTransport(new URL(rawUrl), {
    requestInit
  })
}

async function connectServer (server) {
  const transportType = normalizeTransportType(server)
  const serverId = normalizeServerId(server)

  const client = new Client(
    {
      name: 'chatgpt-plugin-mcp-client',
      version: ChatGPTConfig.version || '3.0.0'
    },
    {
      capabilities: {}
    }
  )

  let transport
  if (transportType === 'stdio') {
    transport = await createStdioTransport(server)
  } else if (transportType === 'streamable-http') {
    transport = await createStreamableHttpTransport(server)
    if (!transport) {
      return null
    }
  } else {
    logger.warn(`[MCP] 暂不支持 transport=${transportType}，server=${serverId}`)
    return null
  }

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
    if (!normalizeServerEnabled(server)) {
      continue
    }
    const serverId = normalizeServerId(server)
    if (!serverId) {
      logger.warn('[MCP] 忽略一个未设置 id 的 server 配置')
      continue
    }

    try {
      const connected = await connectServer(server)
      if (!connected) {
        continue
      }

      registerMcpServerClient(serverId, connected)
      const toolList = await connected.client.listTools()
      const tools = Array.isArray(toolList?.tools) ? toolList.tools : []

      logger.info(`[MCP] 服务 ${serverId} 已连接，发现工具 ${tools.length} 个`)

      for (const tool of tools) {
        const mcpToolName = tool?.name
        if (!mcpToolName || !shouldIncludeTool(server, mcpToolName)) {
          continue
        }

        let bridgeToolName = buildBridgeToolName(serverId, mcpToolName)
        if (nameSet.has(bridgeToolName)) {
          bridgeToolName = `${bridgeToolName}_${md5(`${serverId}:${mcpToolName}`).slice(0, 6)}`
        }
        nameSet.add(bridgeToolName)

        registerMcpToolRoute(bridgeToolName, {
          serverId,
          mcpToolName
        })

        const className = `McpBridgeTool_${md5(`${serverId}:${mcpToolName}`).slice(0, 10)}`
        const toolCode = buildBridgeToolCode(
          className,
          bridgeToolName,
          tool.inputSchema,
          `[MCP:${serverId}] ${tool.description || mcpToolName}`
        )

        await toolsManager.addInstance({
          id: `${BRIDGE_TOOL_ID_PREFIX}${md5(`${serverId}:${mcpToolName}`)}`,
          name: bridgeToolName,
          description: `[MCP:${serverId}] ${tool.description || mcpToolName}`,
          code: toolCode,
          permission: 'private',
          status: 'enabled'
        })
      }
    } catch (err) {
      logger.error(`[MCP] 初始化 server=${serverId} 失败:`, err)
    }
  }
}

/**
 * 关闭 MCP 连接
 */
export async function disposeMcpCompatibility () {
  await disposeMcpRegistry()
}
