const mcpServerClients = new Map()
const mcpToolRoutes = new Map()

/**
 * 注册 MCP 服务器客户端
 * @param {string} serverId
 * @param {{ client: any, transport: any }} payload
 */
export function registerMcpServerClient (serverId, payload) {
  mcpServerClients.set(serverId, payload)
}

/**
 * 注册 Chaite 工具名到 MCP 工具路由
 * @param {string} chaiteToolName
 * @param {{ serverId: string, mcpToolName: string }} route
 */
export function registerMcpToolRoute (chaiteToolName, route) {
  mcpToolRoutes.set(chaiteToolName, route)
}

/**
 * 清空所有工具路由
 */
export function clearMcpToolRoutes () {
  mcpToolRoutes.clear()
}

/**
 * 关闭并清空所有 MCP 客户端
 */
export async function disposeMcpRegistry () {
  const tasks = []
  for (const [serverId, payload] of mcpServerClients.entries()) {
    tasks.push((async () => {
      try {
        await payload?.transport?.close?.()
      } catch (err) {
        logger.warn(`[MCP] 关闭服务 ${serverId} 失败: ${err?.message || err}`)
      }
    })())
  }
  await Promise.allSettled(tasks)
  mcpServerClients.clear()
  mcpToolRoutes.clear()
}

function normalizeMcpCallResult (result) {
  if (!result) {
    return ''
  }

  const chunks = []
  if (Array.isArray(result.content)) {
    for (const item of result.content) {
      if (!item) {
        continue
      }
      if (item.type === 'text') {
        chunks.push(item.text || '')
        continue
      }
      if (item.type === 'image') {
        chunks.push(`[image] ${item.mimeType || ''}`.trim())
        continue
      }
      chunks.push(JSON.stringify(item))
    }
  }

  if (chunks.length === 0 && result.structuredContent !== undefined) {
    chunks.push(JSON.stringify(result.structuredContent, null, 2))
  }

  if (chunks.length === 0) {
    chunks.push(JSON.stringify(result, null, 2))
  }

  const text = chunks.join('\n').trim()
  if (result.isError) {
    return `MCP工具调用失败: ${text || 'unknown error'}`
  }
  return text
}

/**
 * 由桥接工具调用 MCP 服务
 * @param {string} chaiteToolName
 * @param {Record<string, any>} args
 */
export async function callMcpBridgeTool (chaiteToolName, args = {}) {
  const route = mcpToolRoutes.get(chaiteToolName)
  if (!route) {
    return `MCP路由不存在: ${chaiteToolName}`
  }

  const payload = mcpServerClients.get(route.serverId)
  if (!payload?.client) {
    return `MCP服务未连接: ${route.serverId}`
  }

  try {
    const result = await payload.client.callTool({
      name: route.mcpToolName,
      arguments: args || {}
    })
    return normalizeMcpCallResult(result)
  } catch (err) {
    logger.error(`[MCP] 调用工具失败 ${route.serverId}/${route.mcpToolName}:`, err)
    return `MCP工具调用异常: ${err?.message || String(err)}`
  }
}
