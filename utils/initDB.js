// initDB.js
// 插件初始化的基本数据库内容

import { BaseClientOptions, Chaite, Channel, ProcessorDTO, SendMessageOption, ToolDTO } from 'chaite'
import fs from 'fs'
import path from 'path'
import { md5 } from './common.js'

/**
 * 默认系统用户
 * @type {import('chaite').User}
 */
const systemUser = {
  username: 'system',
  user_id: '00000'
}

/**
 * Read bundled executable code from the tracked resources directory. Runtime
 * tool and processor directories are ignored because they contain user code.
 * @param {string} resourcesDir
 * @param {string} filename
 * @returns {string}
 */
function readEmbeddedCode (resourcesDir, filename) {
  const encoded = fs.readFileSync(path.resolve(resourcesDir, filename), 'utf-8')
  return Buffer.from(encoded.trim(), 'base64').toString('utf-8')
}

/**
 * 注入内置的处理器
 * @param {string} resourcesDir
 * @param {import('chaite').ProcessorsManager} processorsManager
 * @param {'pre' | 'post'} type
 * @param {string} name
 * @param {string} description
 * @returns {Promise<void>}
 */
async function addEmbeddedProcessor (resourcesDir, processorsManager, type, name, description) {
  const code = readEmbeddedCode(resourcesDir, name)
  await processorsManager.addInstance(new ProcessorDTO({
    id: md5(name),
    type,
    name,
    embedded: true,
    uploader: systemUser,
    description,
    code
  }))
}

const blackPreProcessorId = md5('BlackPreProcessor')
const blackPostProcessorId = md5('BlackPostProcessor')

/**
 * The original v3 bootstrap accidentally registered BlackPre/Post with
 * inverted DTO types. Keep this repair idempotent so existing installations
 * self-heal on upgrade without touching user-created processors.
 */
async function repairBlackProcessors (resourcesDir, processorsManager) {
  const definitions = [
    { id: blackPreProcessorId, name: 'BlackPreProcessor', type: 'pre', description: '内置用户消息屏蔽词前处理器' },
    { id: blackPostProcessorId, name: 'BlackPostProcessor', type: 'post', description: '内置机器人回复屏蔽词后处理器' }
  ]

  for (const definition of definitions) {
    const code = readEmbeddedCode(resourcesDir, definition.name)
    const existing = await processorsManager.getInstanceT(definition.id)
    if (!existing || existing.type !== definition.type || existing.code !== code || !existing.embedded) {
      await processorsManager.addInstance(new ProcessorDTO({
        ...existing,
        ...definition,
        code,
        embedded: true,
        uploader: existing?.uploader || systemUser
      }))
      logger.info(`修复内置处理器 ${definition.name} (${definition.type})`)
    }
  }
}

/** Move only the historical inverted Black IDs; never add filters to channels that never used them. */
async function repairBlackProcessorBindings (channelsManager) {
  const channels = await channelsManager.listInstances()
  let repaired = 0
  const unique = values => [...new Set(values)]

  for (const channel of channels) {
    const options = channel.options
    if (!options) continue
    const pre = [...(options.preProcessorIds || [])]
    const post = [...(options.postProcessorIds || [])]
    const hasInvertedPre = pre.includes(blackPostProcessorId)
    const hasInvertedPost = post.includes(blackPreProcessorId)
    if (!hasInvertedPre && !hasInvertedPost) continue

    options.preProcessorIds = unique([
      ...pre.filter(id => id !== blackPostProcessorId),
      ...(hasInvertedPost ? [blackPreProcessorId] : [])
    ])
    options.postProcessorIds = unique([
      ...post.filter(id => id !== blackPreProcessorId),
      ...(hasInvertedPre ? [blackPostProcessorId] : [])
    ])
    await channelsManager.upsertInstance(channel)
    repaired++
  }

  if (repaired) logger.info(`已修复 ${repaired} 个渠道的 Black 前后处理器挂载关系`)
}

export async function migrateDatabase () {
  logger.debug('检查数据库初始化...')
  const resourcesDir = path.resolve('./plugins/chatgpt-plugin', 'resources/embedded')
  // 1. 修复并设置内置处理器
  const processorsManager = Chaite.getInstance().getProcessorsManager()
  await repairBlackProcessors(resourcesDir, processorsManager)
  // 注册内置的图片引用预处理器
  const imageRefProcessorId = md5('ImageRefPreProcessor')
  const imageRefProcessorCode = readEmbeddedCode(resourcesDir, 'ImageRefPreProcessor')
  const storedImageRefProcessor = await processorsManager.getInstanceT(imageRefProcessorId)
  const loadedImageRefProcessor = await processorsManager.getInstance('ImageRefPreProcessor')
  if (!storedImageRefProcessor || storedImageRefProcessor.code !== imageRefProcessorCode || !loadedImageRefProcessor) {
    logger.info('初始化内置的图片引用预处理器')
    await processorsManager.addInstance(new ProcessorDTO({
      id: imageRefProcessorId,
      type: 'pre',
      name: 'ImageRefPreProcessor',
      embedded: true,
      uploader: systemUser,
      description: '自动处理图片：视觉模型保留原图进入主干对话，非视觉模型替换为引用文本，支持 ask_about_image 工具按需查询',
      code: imageRefProcessorCode
    }))
  }
  // 2. 设置默认渠道
  const channelsManager = Chaite.getInstance().getChannelsManager()
  await repairBlackProcessorBindings(channelsManager)
  try {
    await channelsManager.getChannelByModel('Qwen/Qwen2.5-7B-Instruct')
  } catch (err) {
    if (err.message === 'No available channels') {
      await channelsManager.addInstance(new Channel({
        id: 'free',
        name: 'free',
        models: ['Qwen/Qwen2.5-7B-Instruct'],
        adapterType: 'openai',
        type: 'openai',
        weight: 1,
        priority: 0,
        status: 'enabled',
        options: new BaseClientOptions({
          features: ['tool', 'chat'],
          baseUrl: 'https://oneapi.ikechan8370.com/v1',
          apiKey: 'sk-uIzofH2TIMVu6giK56BeCeD5E98b42EbBe695597B5FeAc68',
          preProcessorIds: [imageRefProcessorId, blackPreProcessorId],
          postProcessorIds: [blackPostProcessorId]
        }),
        uploader: systemUser
      }))
      logger.info('初始化内置的免费渠道')
    }
  }
  // 3. 设置默认预设
  let chatPresetManager = Chaite.getInstance().getChatPresetManager()
  if (!await chatPresetManager.getInstance('default_local')) {
    await chatPresetManager.addInstance({
      id: 'default_local',
      local: true,
      name: '默认预设',
      prefix: 'chaite',
      sendMessageOption: new SendMessageOption({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        temperature: 0.8,
        maxToken: 4096,
        systemOverride: '你是Chaite，一个在QQ群聊中活跃的AI助手。你可以与群友进行聊天，提供帮助和解答问题。'
      }),
      uploader: systemUser
    })
    logger.info('初始化内置的默认预设')
  }

  // 4. 设置默认工具组
  let toolGroupsManager = Chaite.getInstance().getToolsGroupManager()
  if (!await toolGroupsManager.getInstance('default_local')) {
    await toolGroupsManager.addInstance({
      id: 'default_local',
      name: '默认工具组',
      description: '默认工具组仅用于占位，包括全部非禁用的工具',
      toolIds: [],
      status: 'enabled',
      isDefault: true,
      uploader: systemUser
    })
  }

  // 5. 扫描同步工具
  const toolManager = Chaite.getInstance().getToolsManager()

  // 注册内置的 ask_about_image 工具
  const askAboutImageToolId = md5('ask_about_image')
  const askAboutImageToolCode = readEmbeddedCode(resourcesDir, 'AskAboutImage')
  const storedAskAboutImageTool = await toolManager.getInstanceT(askAboutImageToolId)
  const loadedAskAboutImageTool = await toolManager.getInstance('ask_about_image')
  if (!storedAskAboutImageTool || storedAskAboutImageTool.code !== askAboutImageToolCode || !loadedAskAboutImageTool) {
    logger.info('初始化内置的 ask_about_image 工具')
    await toolManager.addInstance(new ToolDTO({
      id: askAboutImageToolId,
      name: 'ask_about_image',
      embedded: true,
      status: 'enabled',
      permission: 'public',
      uploader: systemUser,
      description: '按引用ID查询图片内容，支持针对图片特定细节的定向提问（如颜色、文字、人物特征等）',
      code: askAboutImageToolCode
    }))
  }

  const resolveImageRefToolId = md5('resolve_image_ref')
  const resolveImageRefToolCode = readEmbeddedCode(resourcesDir, 'ResolveImageRef')
  const storedResolveImageRefTool = await toolManager.getInstanceT(resolveImageRefToolId)
  const loadedResolveImageRefTool = await toolManager.getInstance('resolve_image_ref')
  if (!storedResolveImageRefTool || storedResolveImageRefTool.code !== resolveImageRefToolCode || !loadedResolveImageRefTool) {
    logger.info('init embedded resolve_image_ref tool')
    await toolManager.addInstance(new ToolDTO({
      id: resolveImageRefToolId,
      name: 'resolve_image_ref',
      embedded: true,
      status: 'enabled',
      permission: 'public',
      uploader: systemUser,
      description: 'Resolve image ref to original image URL for image processing tools',
      code: resolveImageRefToolCode
    }))
  }

  // 将 ask_about_image 加入默认工具组
  if (await toolGroupsManager.getInstance('default_local')) {
    const defaultGroup = await toolGroupsManager.getInstance('default_local')
    if (defaultGroup && !defaultGroup.toolIds.includes(askAboutImageToolId)) {
      defaultGroup.toolIds.push(askAboutImageToolId)
      await toolGroupsManager.upsertInstance(defaultGroup)
    }
    if (defaultGroup && !defaultGroup.toolIds.includes(resolveImageRefToolId)) {
      defaultGroup.toolIds.push(resolveImageRefToolId)
      await toolGroupsManager.upsertInstance(defaultGroup)
    }
  }

  logger.info('初始化内置的工具组')
  logger.debug('数据库初始化完成')
}
