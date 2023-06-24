import fetch from 'node-fetch'
import { AbstractTool } from './AbstractTool.js'

export class SearchMusicTool extends AbstractTool {
  name = 'searchMusic'

  parameters = {
    properties: {
      keyword: {
        type: 'string',
        description: '音乐的标题或关键词'
      }
    },
    required: ['keyword']
  }

  func = async function (opts) {
    let { keyword } = opts
    try {
      let result = await searchMusic163(keyword)
      return `search result: ${result}`
    } catch (e) {
      return `music search failed: ${e}`
    }
  }

  description = 'Useful when you want to search music by keyword.'
}

export async function searchMusic163 (name) {
  let response = await fetch(`http://music.163.com/api/search/get/web?s=${name}&type=1&offset=0&total=true&limit=6`)
  let json = await response.json()
  if (json.result?.songCount > 0) {
    return json.result.songs.map(song => {
      return `id: ${song.id}, name: ${song.name}, artists: ${song.artists.map(a => a.name).join('&')}, alias: ${song.alias || 'none'}`
    }).join('\n')
  }
  return null
}
