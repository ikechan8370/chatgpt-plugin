import { getMeiliClient, isMeiliConfigured } from '../models/meili/client.js'
import ChatGPTConfig from '../config/config.js'
import { Chaite, SendMessageOption } from 'chaite'
import common from '../../../lib/common/common.js'
import fs from 'node:fs'
import path from 'node:path'
import _ from 'lodash'
import { dataDir } from '../utils/common.js'

const RECEIVED_DIR = path.join(dataDir, 'received')

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatTime (ts) {
  const d = new Date(ts * 1000)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 构造转发消息
 */
async function makeForwardMsg (e, messages, title = '', useSender = false) {
  if (!Array.isArray(messages)) messages = [messages]

  let name = useSender ? (e.sender?.card || String(e.user_id)) : (Bot.nickname || 'Bot')
  let id = useSender ? e.user_id : (Bot.uin?.toString() || '10000')

  const forwardMsgs = []
  for (const msg of messages) {
    if (!msg) continue
    const userInfo = msg.userInfo || { user_id: id, nickname: name }
    if (msg.userInfo) delete msg.userInfo
    forwardMsgs.push({
      message: msg.msg || msg.message || msg,
      time: msg.time,
      user_id: userInfo.user_id,
      nickname: userInfo.nickname
    })
  }

  try {
    let result
    if (e?.group?.makeForwardMsg) {
      result = await e.group.makeForwardMsg(forwardMsgs)
    } else if (e?.friend?.makeForwardMsg) {
      result = await e.friend.makeForwardMsg(forwardMsgs)
    } else {
      return forwardMsgs.map(m => m.message).join('\n')
    }
    return result
  } catch {
    return forwardMsgs.map(m => m.message).join('\n')
  }
}

/**
 * 将搜索结果转换为可展示的消息
 */
async function handleHits (results) {
  const messages = []
  for (const msg of results.hits || []) {
    const elm = []
    for (const item of msg.message || []) {
      try {
        if (item.type === 'text') {
          elm.push(item.text)
        }
        if (item.type === 'image') {
          const file = item.file
          const absPath = path.join(RECEIVED_DIR, file)
          if (fs.existsSync(absPath)) {
            elm.push(segment.image(fs.readFileSync(absPath)))
          } else {
            elm.push(`[图片:${file}]`)
          }
        }
        if (item.type === 'face') {
          elm.push(segment.face(item.id))
        }
        if (item.type === 'at') {
          elm.push(segment.at(item.qq))
        }
        if (item.type === 'file') {
          elm.push(`[文件:${item.name || item.fid}]`)
        }
      } catch (err) {
        logger.warn('[MeiliSearch] 消息渲染失败:', err.message)
      }
    }
    if (elm.length > 0) {
      messages.push({
        msg: elm,
        time: msg.quotable?.time || 0,
        userInfo: {
          user_id: String(msg.sender?.user_id || ''),
          nickname: msg.sender?.card || msg.sender?.nickname || String(msg.sender?.user_id || '')
        }
      })
    }
  }
  return messages
}

// ==================== AI 调用（复用 chaite 渠道/预设） ====================

async function callAI (prompt, systemPrompt) {
  const presetId = ChatGPTConfig.meili?.aiPresetId
  if (!presetId) throw new Error('未配置 meili.aiPresetId')

  const chaite = Chaite.getInstance()
  if (!chaite) throw new Error('Chaite 未初始化')

  const preset = await chaite.getChatPresetManager().getInstance(presetId)
  if (!preset) throw new Error(`预设 ${presetId} 不存在`)

  const resp = await chaite.sendMessage({
    role: 'user',
    content: [{ type: 'text', text: prompt }]
  }, null, new SendMessageOption({
    disableHistoryRead: true,
    disableHistorySave: true,
    stream: false,
    systemOverride: systemPrompt
  }))

  return (resp.contents || [])
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n')
}

// ==================== Plugin ====================

export class Meilisearch extends plugin {
  constructor () {
    super({
      name: 'MeiliSearch',
      dsc: '群消息搜索、学舌、画像',
      event: 'message',
      priority: -5000,
      rule: [
        { reg: '^#(全部)?搜索(图片|表情包)', fnc: 'searchImage', priority: -1000000 },
        { reg: '^#(我|他|她|TA)的发言', fnc: 'getFy', priority: -1000000 },
        { reg: '^#搜索(我的)?(发言|消息)', fnc: 'searchText', priority: -1000000 },
        { reg: '^#总结(全部)?tag', fnc: 'tagsAggr', priority: -1000000 },
        { reg: '^#总结(全部)?发言', fnc: 'msgAggr', priority: -1000000 },
        { reg: '^#总结(全部)?表情包', fnc: 'bqbAggr', priority: -1000000 },
        { reg: '^#tag', fnc: 'tag' },
        { reg: '^#谁(艾特|at)(我|他|她)', fnc: 'whoAt' },
        { reg: '^#query', fnc: 'query', priority: -1000000, permission: 'master' },
        { reg: '^#(debug)?(随机)?学舌', fnc: 'repeat' },
        { reg: '^#(debug)?(随机)?画像', fnc: 'describeUser' },
        { reg: '^#群画像', fnc: 'describeGroup' }
      ]
    })
  }

  _checkConfig (e) {
    if (!isMeiliConfigured()) {
      e.reply('MeiliSearch 未配置，请在 config 中设置 meili 相关选项')
      return false
    }
    return true
  }

  // #搜索图片 / #搜索表情包
  async searchImage (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    let query = e.msg.replace(/#(全部)?搜索(图片|表情包)/, '').trim()
    const asface = e.msg.includes('表情包')
    const all = e.msg.includes('全部')
    const groupId = all ? null : String(e.group_id || e.group?.group_id || '')

    let filter = 'message.type = "image"'
    if (asface) filter += ' AND message.asface = true'
    if (groupId) filter += ` AND group.group_id = "${groupId}"`

    const results = await client.index('messages').search(query, {
      filter,
      limit: 30,
      sort: ['quotable.time:desc'],
      attributesToSearchOn: ['message.description', 'message.tags']
    })

    const images = new Set()
    for (const msg of results.hits || []) {
      const img = msg.message?.find(i => i.type === 'image')
      if (img?.file) images.add(img.file)
    }

    const elems = []
    for (const file of images) {
      try {
        const absPath = path.join(RECEIVED_DIR, file)
        if (fs.existsSync(absPath)) {
          elems.push(segment.image(fs.readFileSync(absPath)))
        }
      } catch (err) { logger.warn(err.message) }
    }

    if (elems.length === 0) {
      await e.reply('没有找到' + (asface ? '表情包' : '图片'))
      return
    }
    elems.push(`总数：${results.totalHits || results.estimatedTotalHits || 0}`)
    const fwd = await common.makeForwardMsg(e, elems)
    await e.reply(fwd)
  }

  // #我/他/她的发言
  async getFy (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    let qq
    if (e.msg.includes('我')) {
      qq = String(e.user_id)
    } else {
      qq = String(e.message?.find(i => i.type === 'at')?.qq || '')
      if (!qq) { await e.reply('请@一个人'); return }
    }

    const groupId = String(e.group_id || e.group?.group_id || '')
    let filter = `sender.user_id = "${qq}"`
    if (groupId) filter += ` AND group.group_id = "${groupId}"`

    const results = await client.index('messages').search('', {
      filter,
      limit: 70,
      sort: ['quotable.time:desc']
    })
    const messages = await handleHits(results)
    if (messages.length === 0) { await e.reply('没有找到发言'); return }

    const name = e.sender?.card || e.sender?.nickname || qq
    const fwd = await makeForwardMsg(e, messages, `${name}的发言`, true)
    await e.reply(fwd)
  }

  // #搜索发言/消息
  async searchText (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    let qq = null
    if (e.msg.includes('我的')) qq = String(e.user_id)

    const query = e.msg.replace(/#搜索(我的)?(发言|消息)/, '').trim()
    if (!query) { await e.reply('请输入搜索内容'); return }

    const groupId = String(e.group_id || e.group?.group_id || '')
    let filter = `group.group_id = "${groupId}"`
    if (qq) filter += ` AND sender.user_id = "${qq}"`

    const results = await client.index('messages').search(query, {
      filter,
      limit: 50,
      sort: ['quotable.time:desc'],
      attributesToSearchOn: ['message.text', 'message.description', 'message.tags'],
      matchingStrategy: 'all'
    })
    const messages = await handleHits(results)
    if (messages.length === 0) { await e.reply('没有找到发言'); return }

    const name = qq ? (e.sender?.card || e.sender?.nickname || qq) : '搜索结果'
    const fwd = await makeForwardMsg(e, messages, name, !!qq)
    await e.reply(fwd)
  }

  // #总结tag
  async tagsAggr (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const all = e.msg.includes('全部')
    const opt = { facetQuery: '', facetName: 'message.tags' }
    if (!all) opt.filter = `group.group_id = "${String(e.group_id)}"`
    const aggr = await client.index('messages').searchForFacetValues(opt)
    const values = (aggr.facetHits || []).map(h => `${h.value} (${h.count}次)`)
    if (values.length === 0) { await e.reply('暂无tag数据'); return }
    const fwd = await common.makeForwardMsg(e, [values.join('\n')], 'tag次数排行')
    await e.reply(fwd)
  }

  // #总结发言
  async msgAggr (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const all = e.msg.includes('全部')
    const opt = { facetQuery: '', facetName: 'sender.card' }
    if (!all) opt.filter = `group.group_id = "${String(e.group_id)}"`
    const aggr = await client.index('messages').searchForFacetValues(opt)
    const values = (aggr.facetHits || []).map(h => `${h.value} (${h.count}次)`)
    if (values.length === 0) { await e.reply('暂无发言数据'); return }
    const fwd = await common.makeForwardMsg(e, [values.join('\n')], '发言排行')
    await e.reply(fwd)
  }

  // #总结表情包
  async bqbAggr (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const all = e.msg.includes('全部')
    const groupId = String(e.group_id || '')
    let filter = 'message.asface = true'
    if (!all) filter += ` AND group.group_id = "${groupId}"`

    const aggr = await client.index('messages').searchForFacetValues({ facetQuery: '', facetName: 'message.file', filter })

    const values = await Promise.all((aggr.facetHits || []).slice(0, 20).map(async hit => {
      let imgElem
      try {
        const absPath = path.join(RECEIVED_DIR, hit.value)
        if (fs.existsSync(absPath)) {
          imgElem = segment.image(fs.readFileSync(absPath))
        } else {
          imgElem = `${hit.value} (图片丢失)`
        }
      } catch { imgElem = `${hit.value} (图片丢失)` }

      let senderFilter = `message.file = "${hit.value}"`
      if (!all) senderFilter += ` AND group.group_id = "${groupId}"`
      const senderAggr = await client.index('messages').searchForFacetValues({ facetQuery: '', facetName: 'sender.card', filter: senderFilter })
      const topSender = senderAggr.facetHits?.[0]?.value || '?'

      return [imgElem, `${hit.count}次 (最爱发的人: ${topSender})`]
    }))

    if (values.length === 0) { await e.reply('暂无表情包数据'); return }
    const fwd = await common.makeForwardMsg(e, values, '表情包排行')
    await e.reply(fwd)
  }

  // #tag
  async tag (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const tagStr = e.msg.replace(/^#tag/, '').trim()
    const tags = tagStr ? tagStr.split(/[,，]/).filter(Boolean) : []

    // 查找图片：先看引用回复，再看消息本身
    let image = null
    if (e.source) {
      const seq = e.isGroup ? e.source.seq : e.source.time
      const reply = e.isGroup
        ? (await e.group?.getChatHistory?.(seq, 1))?.pop()?.message
        : (await e.friend?.getChatHistory?.(seq, 1))?.pop()?.message
      if (reply) image = reply.find(i => i.type === 'image')
    } else {
      image = e.message?.find(i => i.type === 'image')
    }

    if (!image) {
      if (tags.length === 0) { await e.reply('未找到图片'); return }
      // 按 tag 搜索
      const filterParts = tags.map(t => `message.tags = "${t}"`)
      filterParts.push(`group.group_id = "${String(e.group_id)}"`)
      const results = await client.index('messages').search('', { filter: filterParts.join(' AND ') })
      const messages = await handleHits(results)
      if (messages.length === 0) { await e.reply('没有找到: ' + tags.join(', ')); return }
      const fwd = await makeForwardMsg(e, messages, 'tag搜索', true)
      await e.reply(fwd)
      return
    }

    const file = image.file
    const md5 = image.md5

    const records = await client.index('messages').search('', { filter: `message.md5 = "${md5}"` })

    // 没有 tag：显示已有 tag
    if (tags.length === 0) {
      const hit = records.hits?.find(h => h.message?.some(i => i.tags?.length))
      if (!hit) { await e.reply('暂无此图片的tag'); return }
      const imgData = hit.message?.find(i => i.tags)
      let msg = `Tags: ${(imgData.tags || []).join(', ')}`
      if (imgData.description) msg += `\n\n${imgData.description}`
      await e.reply(msg, true)
      return
    }

    // 添加 tag
    const toUpdate = []
    for (const hit of records.hits || []) {
      for (const item of hit.message || []) {
        if (item.file === file) {
          const existing = new Set(item.tags || [])
          tags.forEach(t => existing.add(t))
          item.tags = Array.from(existing)
        }
      }
      toUpdate.push(hit)
    }
    if (toUpdate.length > 0) {
      await client.index('messages').updateDocuments(toUpdate)
    }
    await e.reply('操作成功')
  }

  // #谁@我
  async whoAt (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    let num = 50
    const numStr = e.msg.replace(/^#谁(艾特|at)(我|他|她)/, '').trim()
    if (numStr) num = parseInt(numStr) || 50

    let qq
    if (e.msg.includes('我')) qq = String(e.user_id)
    else qq = String(e.message?.find(i => i.type === 'at')?.qq || '')

    const groupId = String(e.group_id || '')
    const filter = `group.group_id = "${groupId}" AND message.type = "at" AND message.qq = "${qq}"`
    const results = await client.index('messages').search('', { filter, hitsPerPage: num, sort: ['quotable.time:desc'] })
    const messages = await handleHits(results)
    if (messages.length === 0) { await e.reply('没有找到@记录'); return }
    const fwd = await makeForwardMsg(e, messages, '谁@我', true)
    await e.reply(fwd)
  }

  // #query (管理员专用)
  async query (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const queryStr = e.msg.replace(/#query/, '').trim()
    let [q = '', o = '{}'] = queryStr.split('/').map(s => s.trim())
    try {
      const opt = JSON.parse(o)
      const results = await client.index('messages').search(q, {
        limit: 100,
        sort: ['quotable.time:desc'],
        ...opt
      })
      const messages = await handleHits(results)
      if (messages.length === 0) { await e.reply('没有找到结果'); return }
      const fwd = await makeForwardMsg(e, messages, 'query结果', true)
      await e.reply(fwd)
    } catch (err) {
      await e.reply('查询失败: ' + err.message)
    }
  }

  // #学舌 / #随机学舌
  async repeat (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const debug = e.msg.includes('debug')
    const isRandom = e.msg.includes('随机')
    const qqStr = e.msg.replace(/^#(debug)?(随机)?学舌/, '').trim()

    let qq
    if (qqStr) qq = qqStr
    else qq = String(e.message?.find(i => i.type === 'at')?.qq || e.user_id)

    const groupId = String(e.group_id || '')

    if (isRandom) {
      const findUserRsp = await client.index('messages').search('', {
        facets: ['sender.user_id'],
        filter: `group.group_id = "${groupId}" AND message.type = "text"`,
        limit: 1
      })
      const hits = findUserRsp.facetDistribution?.['sender.user_id'] || {}
      const candidates = Object.entries(hits).filter(([, count]) => count > 5)
      if (candidates.length === 0) { await e.reply('消息数据不足，无法随机'); return }
      const [randomQq] = candidates[Math.floor(Math.random() * candidates.length)]
      qq = randomQq
      const user = e.bot?.gml?.get(groupId)?.get(qq)
      await e.reply(`注意了，我要模仿 @${user?.card || user?.nickname || qq} 说话了！`)
    }

    const bymRes = await client.index('messages').search('', {
      filter: `sender.user_id = "${qq}" AND message.type = "text" AND group.group_id = "${groupId}"`,
      limit: 500,
      sort: ['quotable.time:desc']
    })

    const validTexts = (bymRes.hits || [])
      .map(item => item.message?.find(i => i.text)?.text)
      .filter(t => t && t.length > 5)

    if (validTexts.length < 10) { await e.reply('该用户发言过少'); return }

    const shuffled = _.shuffle(validTexts)
    const bymTexts = shuffled.join('\n')
    const systemPrompt = '你需要模仿指定群友的说话风格说话。不要重复他的话，尽可能符合情境地说一句或一段话即可。要求给出三个候选项，用换行符隔开。要求重点学习常用口癖词汇、标点符号、语气词等。不要OOC。'
    const prompt = `以下是该群友近期在群内的发言，你要模仿他的说话风格说话。\n\n${bymTexts}\n\n以上就是他的说话记录了，现在给出一句适合发在群里且风格相似的话吧，直接回复内容，不要加任何其他格式或内容。要求给出三个候选项，用换行符隔开。`

    try {
      const resText = await callAI(prompt, systemPrompt)
      const candidates = resText.split('\n').filter(Boolean)
      for (const c of candidates.slice(0, 3)) {
        if (c.trim()) {
          await e.reply(c.trim())
          await sleep(500)
        }
      }
    } catch (err) {
      logger.error('[Meilisearch] 学舌失败:', err)
      await e.reply('学舌失败，请检查 AI 配置')
    }

    if (debug) {
      const msgs = validTexts.slice(0, 30).map(t => ({ type: 'text', text: t }))
      const fwd = await makeForwardMsg(e, msgs.map(m => ({ msg: [m], time: 0 })), '学舌依据', true)
      await e.reply(fwd)
    }
  }

  // #画像 / #随机画像
  async describeUser (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const isRandom = e.msg.includes('随机')
    const qqStr = e.msg.replace(/^#(debug)?(随机)?画像/, '').trim()

    let qq = qqStr || String(e.message?.find(i => i.type === 'at')?.qq || e.user_id)
    const groupId = String(e.group_id || '')

    if (isRandom) {
      const findUserRsp = await client.index('messages').search('', {
        facets: ['sender.user_id'],
        filter: `group.group_id = "${groupId}"`,
        limit: 1
      })
      const hits = findUserRsp.facetDistribution?.['sender.user_id'] || {}
      const candidates = Object.entries(hits).filter(([, count]) => count > 20)
      if (candidates.length === 0) { await e.reply('数据不足'); return }
      const [randomQq] = candidates[Math.floor(Math.random() * candidates.length)]
      qq = randomQq
      const user = e.bot?.gml?.get(groupId)?.get(qq)
      await e.reply(`以下是 @${user?.card || user?.nickname || qq} 的用户画像。`)
    }

    const bymRes = await client.index('messages').search('', {
      filter: `sender.user_id = "${qq}" AND group.group_id = "${groupId}"`,
      limit: 1000,
      sort: ['quotable.time:desc']
    })

    const validTexts = (bymRes.hits || [])
      .map(item => {
        const textElem = item.message?.find(i => i.text)
        const imgElem = item.message?.find(i => i.description)
        let line = formatTime(item.quotable?.time || 0) + ': '
        if (textElem) line += textElem.text
        if (imgElem) line += `\n[${imgElem.asface ? '表情包' : '图片'}: ${imgElem.description}]`
        return line
      })
      .filter(t => t.length > 5)

    if (validTexts.length < 20) { await e.reply('该用户发言过少'); return }

    const bymTexts = validTexts.join('\n')
    const card = e.bot?.gml?.get(groupId)?.get(qq)?.card || e.bot?.gml?.get(groupId)?.get(qq)?.nickname || qq
    const systemPrompt = `你要总结该群友，包括关键主题、说话风格、人物性格等，包含客观描述和主观推测。禁止使用Markdown。注意保护隐私。用户QQ: ${qq}, 群名片: ${card}`
    const prompt = `以下是该群友近期在群内的发言，你要对其进行总结，包括关键主题、说话风格、人物性格等，并在最后作诗一首总结这个人。\n\n${bymTexts}\n\n以上就是他的说话记录了，现在给出人物画像，直接给出结果，不要附带任何其他文本。禁止使用markdown。`

    try {
      const resText = await callAI(prompt, systemPrompt)
      const fwd = await e.group?.makeForwardMsg?.([{
        user_id: 10000,
        message: resText,
        nickname: '人物画像'
      }]) || resText
      await e.reply(fwd)
    } catch (err) {
      logger.error('[Meilisearch] 画像失败:', err)
      await e.reply('生成失败')
    }
  }

  // #群画像
  async describeGroup (e) {
    if (!this._checkConfig(e)) return
    const client = getMeiliClient()
    const groupId = String(e.group_id || '')
    let limit = parseInt(e.msg.replace(/^#群画像/, '').trim()) || 1000
    if (limit > 10000) limit = 10000

    const bymRes = await client.index('messages').search('', {
      filter: `group.group_id = "${groupId}"`,
      limit,
      sort: ['quotable.time:desc']
    })

    const validTexts = (bymRes.hits || [])
      .map(item => {
        const card = item.sender?.card || item.sender?.nickname || ''
        const textElem = item.message?.find(i => i.text)
        const imgElem = item.message?.find(i => i.description)
        let line = `${card} ${formatTime(item.quotable?.time || 0)}: `
        if (textElem) line += textElem.text
        if (imgElem) line += `\n[${imgElem.asface ? '表情包' : '图片'}: ${imgElem.description}]`
        return line
      })
      .filter(t => t.length > 5)

    if (validTexts.length < 50) { await e.reply('该群消息数据不足'); return }

    const bymTexts = validTexts.join('\n')
    const groupName = e.group_name || e.group?.name || groupId
    const systemPrompt = `你要总结这个群，包括关键主题、说话风格、氛围等。禁止使用Markdown。群名: ${groupName}`
    const prompt = `以下是该群近期的发言，你要对其进行总结，包括关键主题、说话风格、氛围等，并在最后作诗一首总结这个群。\n\n${bymTexts}\n\n以上就是本群的说话了，现在给出群画像，直接给出结果。禁止使用markdown。`

    try {
      const resText = await callAI(prompt, systemPrompt)
      const fwd = await e.group?.makeForwardMsg?.([{
        user_id: 10000,
        message: resText,
        nickname: '群聊画像'
      }]) || resText
      await e.reply(fwd)
    } catch (err) {
      logger.error('[Meilisearch] 群画像失败:', err)
      await e.reply('生成失败')
    }
  }
}
