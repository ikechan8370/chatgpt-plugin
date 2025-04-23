import { AbstractTool } from './AbstractTool.js'
import {getMasterQQ} from '../common.js'
import {Config} from '../config.js'

export class SendPictureTool extends AbstractTool {
  name = 'sendPicture'

  // 解析 CQ 码的方法
  parseCQCode(message) {
    const cqRegex = /\[CQ:([^,]+)(?:,([^\]]+))?\]/g
    const result = []
    let match

    while ((match = cqRegex.exec(message)) !== null) {
      const type = match[1]
      const params = {}
      
      if (match[2]) {
        match[2].split(',').forEach(param => {
          const [key, ...values] = param.split('=')
          if (key && values.length) {
            params[key] = values.join('=')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
          }
        })
      }
      
      if (type === 'image') {
        result.push(params.url || params.file)
      }
    }
    
    return result
  }

  parameters = {
    properties: {
      urlOfPicture: {
        type: 'string',
        description: 'the url of the pictures, not text, split with space if more than one. can be left blank.'
      },
      targetGroupIdOrQQNumber: {
        type: 'string',
        description: 'Fill in the target user\'s qq number or groupId when you need to send picture to specific user or group, otherwise leave blank'
      }
    },
    required: ['urlOfPicture', 'targetGroupIdOrQQNumber']
  }

  func = async function (opt, e) {
    let { urlOfPicture, targetGroupIdOrQQNumber, sender } = opt
    
    // 处理数组格式的消息体
    if (typeof urlOfPicture === 'string') {
      try {
        // 尝试解析为 JSON
        const msgArray = JSON.parse(urlOfPicture)
        if (Array.isArray(msgArray)) {
          // 处理消息数组
          const messages = []
          for (const msg of msgArray) {
            if (typeof msg === 'string' && msg.startsWith('"') && msg.endsWith('"')) {
              // 处理字符串格式的CQ码
              const cqCode = msg.replace(/^"|"$/g, '')
              if (cqCode.includes('file=') && !cqCode.startsWith('[CQ:image')) {
                // 提取文件信息
                const fileMatch = cqCode.match(/file=([^,]+)/)
                const urlMatch = cqCode.match(/url=([^,]+)/)
                const summaryMatch = cqCode.match(/summary=([^,]+)/)
                
                if (fileMatch || urlMatch) {
                  const file = fileMatch?.[1] || urlMatch?.[1]
                  // 检查文件大小和格式
                  try {
                    const response = await fetch(file)
                    const contentType = response.headers.get('content-type')
                    const contentLength = response.headers.get('content-length')
                    
                    // 检查文件大小（最大10MB）
                    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
                      logger.warn(`图片文件过大: ${Math.floor(parseInt(contentLength)/1024/1024)}MB`)
                      continue
                    }
                    
                    // 检查文件格式
                    if (!contentType?.startsWith('image/')) {
                      logger.warn(`不支持的图片格式: ${contentType}`)
                      continue
                    }
                    
                    messages.push({
                      type: 'image',
                      data: {
                        file: file,
                        summary: summaryMatch?.[1]
                      }
                    })
                  } catch (err) {
                    logger.error(`检查图片文件失败: ${err.message}`)
                    continue
                  }
                }
              } else {
                messages.push(msg)
              }
            } else if (typeof msg === 'object' && msg.type === 'text' && msg.data?.text) {
              if (msg.data.text.includes('[CQ:image')) {
                // 提取 CQ 码中的参数
                const cqMatch = msg.data.text.match(/\[CQ:image,([^\]]+)\]/)
                if (cqMatch) {
                  const params = {}
                  cqMatch[1].split(',').forEach(param => {
                    const [key, ...values] = param.split('=')
                    if (key && values.length) {
                      params[key] = values.join('=')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                    }
                  })
                  // 创建正确的图片消息格式
                  messages.push({
                    type: 'image',
                    data: {
                      file: params.file || params.url,
                      summary: params.summary
                    }
                  })
                }
              } else {
                // 保留普通文本消息
                messages.push(msg)
              }
            } else {
              messages.push(msg)
            }
          }
          // 返回处理后的消息数组
          return messages
        }
      } catch (err) {
        // 如果不是JSON格式，尝试解析 CQ 码
        if (urlOfPicture.includes('[CQ:image')) {
          const cqMatch = urlOfPicture.match(/\[CQ:image,([^\]]+)\]/)
          if (cqMatch) {
            const params = {}
            cqMatch[1].split(',').forEach(param => {
              const [key, ...values] = param.split('=')
              if (key && values.length) {
                params[key] = values.join('=')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
              }
            })
            return [{
              type: 'image',
              data: {
                file: params.file || params.url,
                summary: params.summary
              }
            }]
          }
        }
      }
    } else if (typeof urlOfPicture === 'object') {
      if (Array.isArray(urlOfPicture)) {
        // 处理消息数组
        const messages = []
        for (const msg of urlOfPicture) {
          if (typeof msg === 'object' && msg.type === 'text' && msg.data?.text) {
            if (msg.data.text.includes('[CQ:image')) {
              // 提取 CQ 码中的参数
              const cqMatch = msg.data.text.match(/\[CQ:image,([^\]]+)\]/)
              if (cqMatch) {
                const params = {}
                cqMatch[1].split(',').forEach(param => {
                  const [key, ...values] = param.split('=')
                  if (key && values.length) {
                    params[key] = values.join('=')
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                  }
                })
                // 创建正确的图片消息格式
                messages.push({
                  type: 'image',
                  data: {
                    file: params.file || params.url,
                    summary: params.summary
                  }
                })
              }
            } else {
              // 保留普通文本消息
              messages.push(msg)
            }
          } else {
            messages.push(msg)
          }
        }
        return messages
      }
    }

    const defaultTarget = e.isGroup ? e.group_id : e.sender.user_id
    const target = isNaN(targetGroupIdOrQQNumber) || !targetGroupIdOrQQNumber
      ? defaultTarget
      : parseInt(targetGroupIdOrQQNumber) === e.bot.uin ? defaultTarget : parseInt(targetGroupIdOrQQNumber)

    // 处理错误url和picture留空的情况
    const urlRegex = /(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:((?:(?:[a-z0-9\u00a1-\u4dff\u9fd0-\uffff][a-z0-9\u00a1-\u4dff\u9fd0-\uffff_-]{0,62})?[a-z0-9\u00a1-\u4dff\u9fd0-\uffff]\.)+(?:[a-z\u00a1-\u4dff\u9fd0-\uffff]{2,}\.?))(?::\d{2,5})?)(?:\/[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*'(),%]+)*(?:\?(?:[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*(),%:@&=]|(?:[\[\]])|(?:[\u00a1-\u4dff\u9fd0-\uffff]))*)?(?:#(?:[\w\u00a1-\u4dff\u9fd0-\uffff$-_.+!*'(),;:@&=]|(?:[\[\]]))*)?\/?/i
    
    if (!urlOfPicture) {
      return 'No picture URL provided'
    }

    // 处理多个URL的情况
    let urls = urlOfPicture.split(/\s+/).filter(url => {
      return urlRegex.test(url)
    })

    if (urls.length === 0) {
      return 'No valid picture URLs found'
    }

    logger.mark('pictures to send: ', urls)
    let pictures = urls.map(img => {
      // 检测适配器类型
      const isICQQ = !!(e.bot?.adapter?.name === 'icqq')
      
      if (img.startsWith('http')) {
        if (isICQQ) {
          // ICQQ适配器使用segment
          return segment.image(img)
        } else {
          // OneBotv11适配器使用对象格式
          return {
            type: 'image',
            data: {
              file: img,
              cache: false,  // 禁用缓存
              proxy: false,  // 禁用代理
              timeout: 60000,  // 60秒超时
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
              }
            }
          }
        }
      }
      return segment.image(img)
    })

    let errs = []
    try {
      // 获取群列表
      let groupList = await e.bot?.getGroupList?.() || e.bot.gl || []
      
      // 发送到群
      if (target.toString().length >= 6) { // 群号一般大于6位
        let group = await e.bot.pickGroup(target)
        if (!group) {
          return `Failed to find group: ${target}`
        }
        
        for (let pic of pictures) {
          let retryCount = 0
          const maxRetries = 3
          let lastError = null
          
          while (retryCount < maxRetries) {
            try {
              // 根据适配器类型选择发送方式
              const isICQQ = !!(e.bot?.adapter?.name === 'icqq')
              const msgToSend = isICQQ ? pic : [pic]
              
              // 设置超时Promise
              const sendPromise = group.sendMsg(msgToSend)
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Send timeout')), 30000)
              })
              
              await Promise.race([sendPromise, timeoutPromise])
              logger.mark(`图片发送成功: ${typeof pic === 'string' ? pic : pic.data?.file}`)
              break
            } catch (err) {
              lastError = err
              retryCount++
              const isTimeout = err.message?.includes('ETIMEDOUT') || err.message?.includes('timeout')
              logger.error(`发送图片失败 (尝试 ${retryCount}/${maxRetries}): ${isTimeout ? '连接超时' : err.message}`)
              
              if (retryCount === maxRetries) {
                errs.push(typeof pic === 'string' ? pic : (pic.data?.file || pic.url || '未知图片'))
                logger.error('图片发送最终失败:', lastError.message || lastError)
              } else {
                // 根据错误类型调整等待时间
                const waitTime = isTimeout ? 5000 * retryCount : 3000 * retryCount
                await new Promise(resolve => setTimeout(resolve, waitTime))
              }
            }
          }
        }
        
        if (errs.length > 0) {
          return `部分图片发送失败 (${errs.length}/${pictures.length}): ${errs.join(', ')}`
        }
        return true
      } 
      // 发送到私聊
      else {
        let masters = await getMasterQQ()
        if (!Config.enableToolPrivateSend && !masters.includes(sender.toString())) {
          return 'You are not allowed to send private messages'
        }
        
        let user = e.bot.pickUser(target)
        for (let pic of pictures) {
          try {
            // 根据适配器类型选择发送方式
            const isICQQ = !!(e.bot?.adapter?.name === 'icqq')
            const msgToSend = isICQQ ? pic : [pic]
            
            await user.sendMsg(msgToSend)
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (err) {
            logger.error('发送图片失败:', err)
            errs.push(typeof pic === 'string' ? pic : (pic.data?.file || pic.url || '未知图片'))
          }
        }
        return `Pictures have been sent to user ${target}${errs.length > 0 ? `, but ${errs.length} pictures failed to send` : ''}`
      }
    } catch (err) {
      logger.error('发送图片过程出错:', err)
      return `Failed to send pictures: ${err.message || JSON.stringify(err)}`
    }
  }

  description = 'Useful when you want to send one or more pictures. If no extra description needed, just reply <EMPTY> at the next turn'
}
