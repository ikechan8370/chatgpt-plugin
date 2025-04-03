import { AbstractTool } from './AbstractTool.js'

export class SerpImageTool extends AbstractTool {
  name = 'searchImage'

  parameters = {
    properties: {
      q: {
        type: 'string',
        description: 'search keyword'
      },
      limit: {
        type: 'number',
        description: 'image number'
      },
      source: {
        type: 'string',
        description: 'search source, bing or yandex'
      }
    },
    required: ['q', 'source']
  }

  func = async function (opts) {
    let { q, limit = 2, source = 'bing' } = opts
    
    // 验证参数
    if (!q || typeof q !== 'string') {
      return {
        error: 'Invalid search query',
        data: []
      }
    }
    
    // 验证搜索源
    if (!['bing', 'yandex'].includes(source)) {
      return {
        error: 'Invalid search source. Must be either "bing" or "yandex"',
        data: []
      }
    }
    
    try {
      // 构建 URL
      const url = `https://serp.ikechan8370.com/image/${source}?q=${encodeURIComponent(q)}&limit=${limit}`
      console.log('Searching images with URL:', url)
      
      let serpRes = await fetch(url, {
        headers: {
          'X-From-Library': 'ikechan8370',
          'Accept': 'application/json'
        }
      })
      
      // 检查响应状态
      if (!serpRes.ok) {
        const errorText = await serpRes.text()
        console.error('API error response:', errorText)
        throw new Error(`HTTP error! status: ${serpRes.status}, response: ${errorText}`)
      }
      
      // 获取响应文本并解析 JSON
      const serpData = await serpRes.json()
      console.log('API response:', JSON.stringify(serpData, null, 2))
      
      // 验证响应格式
      if (!serpData || serpData.code !== 200 || !Array.isArray(serpData.data)) {
        console.error('Invalid response format:', serpData)
        throw new Error('Invalid response format from server')
      }

      // 确保返回的数据是数组
      const res = Array.isArray(serpData.data) ? serpData.data : []
      
      if (res.length === 0) {
        return {
          error: 'No images found',
          data: []
        }
      }

      // 验证每个图片 URL
      const validImages = res.filter(img => {
        if (!img || typeof img !== 'object') return false
        if (!img.murl || typeof img.murl !== 'string') return false
        if (!img.murl.startsWith('http')) return false
        return true
      })

      if (validImages.length === 0) {
        return {
          error: 'No valid image URLs found',
          data: []
        }
      }

      return `images search results in json format:\n${JSON.stringify(validImages)}. the murl field is actual picture url. You should use sendPicture to send them`
    } catch (error) {
      console.error('Search image error:', error)
      return {
        error: `Failed to search images: ${error.message}`,
        data: []
      }
    }
  }

  description = 'Useful when you want to search images from the Internet.'
}
