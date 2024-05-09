import { downloadFile } from '../utils/common.js'
import { SunoClient } from '../client/SunoClient.js'
import { Config } from '../utils/config.js'
import common from '../../../lib/common/common.js'
import fs from 'fs'
import crypto from 'crypto'
import fetch from 'node-fetch'

const Style = [
    { value: 'Dance', describe: '跳舞' },
    { value: 'Festive', describe: '节日' },
    { value: 'Groovy', describe: '槽的' },
    { value: 'Mid-Tempo', describe: '中速' },
    { value: 'Syncopated', describe: '切分音' },
    { value: 'Tipsy', describe: '醉' },
    { value: 'Dark', describe: '黑暗' },
    { value: 'Atmospheric', describe: '大气' },
    { value: 'Cold', describe: '冷' },
    { value: 'Dark', describe: '黑暗' },
    { value: 'Doom', describe: '厄运' },
    { value: 'Dramatic', describe: '戏剧性的' },
    { value: 'Sinister', describe: '险恶' },
    { value: 'Eclectic', describe: '折衷' },
    { value: 'Adjunct', describe: '兼职' },
    { value: 'Art', describe: '艺术' },
    { value: 'Capriccio', describe: '狂想曲' },
    { value: 'Mellifluous', describe: '美化' },
    { value: 'Nü', describe: 'Nü' },
    { value: 'Progressive', describe: '进步' },
    { value: 'Unusual', describe: '异常' },
    { value: 'Emotion', describe: '情感' },
    { value: 'Anthemic', describe: '国歌' },
    { value: 'Emotional', describe: '感情的' },
    { value: 'Happy', describe: '快乐' },
    { value: 'Jubilant', describe: '欢腾' },
    { value: 'Melancholy', describe: '忧郁' },
    { value: 'Sad', describe: 'Sad' },
    { value: 'Hard', describe: '硬' },
    { value: 'Aggressive', describe: '侵略性的' },
    { value: '积极', describe: '积极' },
    { value: 'Banger', describe: '爆竹' },
    { value: 'Power', describe: '权力' },
    { value: 'Stadium', describe: '体育场' },
    { value: 'Stomp', describe: '踩' },
    { value: 'Lyrical', describe: '抒情' },
    { value: 'Broadway', describe: '百老汇' },
    { value: 'Cabaret', describe: '酒店' },
    { value: 'Lounge', describe: '休息室' },
    { value: 'Operatic', describe: '歌剧' },
    { value: 'Storytelling', describe: '故事' },
    { value: 'Torch-Lounge', describe: '火炬酒廊' },
    { value: 'Theatrical', describe: '戏剧' },
    { value: 'Troubadour', describe: '吟游诗人' },
    { value: 'Vegas', describe: '维加斯' },
    { value: 'Magical', describe: '神奇' },
    { value: 'Ethereal', describe: '空灵' },
    { value: 'Majestic', describe: '雄伟' },
    { value: 'Mysterious', describe: '神秘' },
    { value: 'Minimal', describe: '极小' },
    { value: 'Ambient', describe: '氛围' },
    { value: 'Cinematic', describe: '电影' },
    { value: 'Heat', describe: '热' },
    { value: 'Minimal', describe: '极小' },
    { value: 'Slow', describe: '慢' },
    { value: 'Sparse', describe: '稀疏' },
    { value: 'Party', describe: '党' },
    { value: 'German Schlager', describe: '德国施拉格' },
    { value: 'Glam', describe: '格南' },
    { value: 'Glitter', describe: '闪光' },
    { value: 'Groovy', describe: '槽的' },
    { value: 'oft', describe: '软' },
    { value: 'Ambient', describe: '氛围' },
    { value: 'Bedroom', describe: '卧室' },
    { value: 'Chillwave', describe: '寒波' },
    { value: 'Ethereal', describe: '空灵' },
    { value: 'Intimate', describe: '亲密' },
    { value: 'Heat', describe: '热' },
    { value: 'Sadcore', describe: '悲伤' },
    { value: 'Weird', describe: '奇怪' },
    { value: 'Carnival', describe: '狂欢节' },
    { value: 'Distorted', describe: '扭曲' },
    { value: 'Glitchy', describe: '毛刺' },
    { value: 'Haunted', describe: '闹鬼的' },
    { value: 'Hollow', describe: '空心' },
    { value: 'Musicbox', describe: '音乐盒' },
    { value: 'Random', describe: '随机' },
    { value: 'World/Ethnic', describe: '世界/民族' },
    { value: 'Arabian', describe: '阿拉伯' },
    { value: 'Bangra', describe: '班格拉' },
    { value: 'Calypso', describe: '卡吕普索' },
    { value: 'Chalga', describe: '查尔加' },
    { value: 'Egyptian', describe: '埃及人' },
    { value: 'Hindustani', describe: '印度斯坦语' },
    { value: 'Jewish Music 犹太音乐' },
    { value: 'Klezmer 克莱兹默' },
    { value: 'Middle East', describe: '中东' },
    { value: 'Polka', describe: '波尔卡' },
    { value: 'Russian Navy Song', describe: '俄罗斯海军之歌' },
    { value: 'Suomipop', describe: 'Suomipop' },
    { value: 'Tribal', describe: '部落' }
]
const Genre = [
    { value: 'Country', describe: '乡村' },
    { value: 'Appalachian', describe: '阿巴拉契亚' },
    { value: 'Bluegrass', describe: '兰草' },
    { value: 'Country', describe: '乡村' },
    { value: 'Folk', describe: '民族' },
    { value: 'Freak Folk', describe: '怪胎民谣' },
    { value: 'Western', describe: '西方' },
    { value: 'Dance', describe: '跳舞' },
    { value: 'Afro-Cuban', describe: '非裔古巴人' },
    { value: 'Dance Pop', describe: '流行舞曲' },
    { value: 'Disco', describe: '迪斯科' },
    { value: 'Dubstep', describe: 'Dubstep的' },
    { value: 'Disco Funk', describe: '迪斯科放克' },
    { value: 'EDM', describe: 'EDM' },
    { value: 'Electro', describe: '电' },
    { value: 'High-NRG', describe: '高NRG' },
    { value: 'House', describe: '房子' },
    { value: 'Trance', describe: '恍惚' },
    { value: 'Downtempo', describe: '慢节奏' },
    { value: 'Ambient', describe: '氛围' },
    { value: 'Downtempo', describe: '慢节奏' },
    { value: 'Synthwave', describe: '合成波' },
    { value: 'Trap', describe: '陷阱' },
    { value: 'Electronic', describe: '电子的' },
    { value: 'Ambient', describe: '氛围' },
    { value: 'Cyberpunk', describe: '赛博朋克' },
    { value: 'Drum\'n\'bass Drum\'n\'bass', describe: '鼓与贝斯' },
    { value: 'Dubstep', describe: 'Dubstep的' },
    { value: 'Electronic', describe: '电子的' },
    { value: 'Hypnogogical', describe: '催眠' },
    { value: 'IDM', describe: 'IDM' },
    { value: 'Phonk', describe: '冯克' },
    { value: 'Synthpop', describe: '合成流行音乐' },
    { value: 'Techno', describe: '技术' },
    { value: 'Trap', describe: '陷阱' },
    { value: 'Jazz/Soul', describe: '爵士乐/灵魂乐' },
    { value: 'Bebop', describe: '贝波普' },
    { value: 'Gospel', describe: '福音' },
    { value: 'Electro', describe: '电' },
    { value: 'Frutiger Aero Frutiger', describe: '航空' },
    { value: 'Jazz', describe: '爵士乐' },
    { value: 'Latin Jazz', describe: '拉丁爵士乐' },
    { value: 'RnB', describe: 'RnB' },
    { value: 'Soul', describe: '灵魂' },
    { value: 'Latin', describe: '拉丁语' },
    { value: 'Bossa Nova', describe: '博萨诺瓦' },
    { value: 'Latin Jazz', describe: '拉丁爵士乐' },
    { value: 'Forró', describe: 'Forró' },
    { value: 'Mambo', describe: '曼波' },
    { value: 'Salsa', describe: '萨尔萨' },
    { value: 'Tango', describe: '探戈' },
    { value: 'Reggae', describe: '瑞格乐' },
    { value: 'Afrobeat', describe: '非洲节拍' },
    { value: 'Dancehall', describe: '舞厅' },
    { value: 'Dub', describe: 'Dub' },
    { value: 'Reggae', describe: '瑞格乐' },
    { value: 'Reggaeton', describe: '雷鬼' },
    { value: 'Metal', describe: '金属' },
    { value: 'Black Metal', describe: '黑色金属' },
    { value: 'Deathcore', describe: '死亡核心' },
    { value: 'Death Metal', describe: '死亡金属' },
    { value: 'Heavy Metal', describe: '重金属' },
    { value: 'Heavy Metal Trap', describe: '重金属捕集器' },
    { value: 'Metalcore', describe: '金属芯' },
    { value: 'Nu Metal', describe: 'Nu Metal（努金属）' },
    { value: 'Power Metal', describe: '动力金属' },
    { value: 'Popular', describe: '流行' },
    { value: 'Pop', describe: 'Pop' },
    { value: 'Dance Pop', describe: '流行舞曲' },
    { value: 'Pop Rock', describe: '流行摇滚' },
    { value: 'Kpop', describe: '韩流' },
    { value: 'Jpop', describe: '大通' },
    { value: 'Synthpop', describe: '合成流行音乐' },
    { value: 'Rock', describe: '摇滚' },
    { value: 'Classic Rock', describe: '经典摇滚' },
    { value: 'Blues Rock', describe: '蓝调摇滚' },
    { value: 'Emo', describe: 'Emo' },
    { value: 'Glam Rock', describe: '华丽摇滚' },
    { value: 'Hardcore Punk', describe: '硬核朋克' },
    { value: 'Indie', describe: '独立' },
    { value: 'Industrial Rock', describe: '工业摇滚' },
    { value: 'Punk', describe: '朋克' },
    { value: 'Rock', describe: '摇滚' },
    { value: 'Skate Rock', describe: '滑板摇滚' },
    { value: 'Skatecore', describe: '滑板芯' },
    { value: 'Suomipop', describe: 'Suomipop' },
    { value: 'Urban', describe: '都市的' },
    { value: 'Funk', describe: '恐惧' },
    { value: 'HipHop', describe: '嘻哈' },
    { value: 'Phonk', describe: '冯克' },
    { value: 'Rap', describe: 'Rap' },
    { value: 'Trap', describe: '陷阱' }
]
const Types = [
    { value: 'Background', describe: '背景' },
    { value: 'Elevator', describe: '电梯' },
    { value: 'Jingle', describe: '静乐县' },
    { value: 'Muzak', describe: '穆扎克' },
    { value: 'Call to Prayer', describe: '祷告的呼召' },
    { value: 'Adan', describe: '阿丹' },
    { value: 'Adjan', describe: '阿让' },
    { value: 'Call to Prayer', describe: '祷告的呼召' },
    { value: 'Gregorian Chant', describe: '格里高利圣歌' },
    { value: 'Character', describe: '字符' },
    { value: 'I Want Song', describe: '我想要歌' },
    { value: 'Hero Theme', describe: '英雄主题' },
    { value: 'Strut', describe: '支柱' },
    { value: 'March', describe: '三月' },
    { value: 'Military', describe: '军事' },
    { value: 'Villain Theme', describe: '反派主题' },
    { value: 'Children', describe: '孩子' },
    { value: 'Lullaby', describe: '催眠曲' },
    { value: 'Nursery Rhyme', describe: '童谣' },
    { value: 'Sing-along', describe: '跟唱' },
    { value: 'Toddler', describe: '幼儿' },
    { value: 'Composer', describe: '作曲家' },
    { value: 'Adagio', describe: '阿德吉奥' },
    { value: 'Adjunct', describe: '兼职' },
    { value: 'Andante', describe: '行板' },
    { value: 'Allegro', describe: '快板' },
    { value: 'Capriccio', describe: '狂想曲' },
    { value: 'Instruments', describe: '仪器' },
    { value: 'Acoustic Guitar', describe: '木吉他' },
    { value: 'Bass', describe: '低音' },
    { value: 'Doublebass', describe: '低音提琴' },
    { value: 'Electricbass', describe: '电贝司' },
    { value: 'Electric Guitar', describe: '电吉他' },
    { value: 'Fingerstyle Guitar', describe: '指弹吉他' },
    { value: 'Percussion', describe: '击发' },
    { value: 'Noise', describe: '噪声' },
    { value: 'Chaotic', describe: '混沌' },
    { value: 'Distorted', describe: '扭曲' },
    { value: 'Glitch', describe: '故障' },
    { value: 'Noise', describe: '噪声' },
    { value: 'Random', describe: '随机' },
    { value: 'Stuttering', describe: '口吃' },
    { value: 'Orchestral', describe: '管弦乐' },
    { value: 'glissando', describe: 'trombone 长号' },
    { value: 'legato cello', describe: '大提琴连奏' },
    { value: 'Orchestral', describe: '管弦乐' },
    { value: 'spiccato violins', describe: '斯皮卡托小提琴' },
    { value: 'staccato viola', describe: '断奏中提琴' },
    { value: 'Symphonic', describe: '交响' },
    { value: 'Retro', describe: '复古' },
    { value: '1960s', describe: '1960年代' },
    { value: 'Barbershop', describe: '理发店' },
    { value: 'Big Band', describe: '大乐队' },
    { value: 'Classic', describe: '经典' },
    { value: 'Doo Wop', describe: '嘟' },
    { value: 'Girl Group', describe: '女团' },
    { value: 'Mambo', describe: '曼波' },
    { value: 'Salooncore', describe: '沙龙核心' },
    { value: 'Swing', describe: '摆动' },
    { value: 'Traditional', describe: '传统的' },
    { value: 'Suffix', describe: '后缀' },
    { value: '…core', describe: '...核心' },
    { value: '…jam', describe: '...果酱' },
    { value: '…out', describe: '...外' },
    { value: '…wave', describe: '...浪' },
    { value: 'Traditional', describe: '传统的' },
    { value: 'Americana', describe: '美洲' },
    { value: 'Barbershop', describe: '理发店' },
    { value: 'Christmas Carol', describe: '圣诞颂歌' },
    { value: 'Traditional', describe: '传统的' },
    { value: 'Voice', describe: '声音' },
    { value: 'A Cappella', describe: '无伴奏合唱' },
    { value: 'Arabian Ornamental', describe: '阿拉伯观赏' },
    { value: 'Dispassionate', describe: '冷静的' },
    { value: 'Emotional', describe: '感情的' },
    { value: 'Ethereal', describe: '空灵' },
    { value: 'Gregorian chant', describe: '格里高利圣歌' },
    { value: 'Hindustani', describe: '印度斯坦语' },
    { value: 'Lounge Singer', describe: '休息室歌手' },
    { value: 'Melismatic', describe: '旋律' },
    { value: 'Monotone', describe: '单调' },
    { value: 'Narration', describe: '叙事' },
    { value: 'Resonant', describe: '谐振' },
    { value: 'Spoken Word', describe: '口语' },
    { value: 'Sprechgesang', describe: 'Sprechgesang' },
    { value: 'Sultry', describe: '闷热' },
    { value: 'Scream', describe: '尖叫' },
    { value: 'Torchy', describe: '火炬' },
    { value: 'Vocaloid', describe: '声乐' },
]

export default class BingSunoClient {
    constructor(opts) {
        this.opts = opts
    }

    async replyMsg(song, e) {
        let messages = []
        messages.push(`歌名：${song.title}\n风格: ${song.musicalStyle}\n歌词：\n${song.prompt}\n`)
        messages.push(`音频链接：${song.audioURL}\n视频链接：${song.videoURL}\n封面链接：${song.imageURL}\n`)
        messages.push(segment.image(song.imageURL))
        await e.reply(await common.makeForwardMsg(e, messages, '音乐合成结果'))
        let retry = 10
        let videoPath
        while (!videoPath && retry >= 0) {
            try {
                videoPath = await downloadFile(song.videoURL, `suno/${song.title}.mp4`, false, false, {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
                })
            } catch (err) {
                retry--
                await common.sleep(3000)
            }
        }
        if (videoPath) {
            const data = fs.readFileSync(videoPath)
            await e.reply(segment.video(`base64://${data.toString('base64')}`))
            // 60秒后删除文件避免占用体积
            setTimeout(() => {
                fs.unlinkSync(videoPath)
            }, 60000)
        } else {
            logger.warn(`${song.title}下载视频失败`)
            await this.reply(`${song.title}下载视频失败`)
        }
    }

    async getSuno(prompt, e) {
        if (prompt.cookie) {
            this.opts.cookies = prompt.cookie
        }
        const sunoResult = await this.getSunoResult(prompt.songtId)
        if (sunoResult) {
            const {
                duration,
                title,
                musicalStyle,
                requestId,
            } = sunoResult
            const generateURL = id => `https://th.bing.com/th?&id=${id}`
            const audioURL = generateURL(`OIG.a_${requestId}`)
            const imageURL = generateURL(`OIG.i_${requestId}`)
            const videoURL = generateURL(`OIG.v_${requestId}`)
            const sunoURL = `https://cdn1.suno.ai/${requestId}.mp4`
            const sunoDisplayResult = {
                title,
                duration,
                musicalStyle,
                audioURL,
                imageURL,
                videoURL,
                sunoURL,
                prompt: prompt.songPrompt
            }
            await e.reply('Suno 生成中，请稍后')
            this.replyMsg(sunoDisplayResult, e)
        } else {
            await e.reply('Suno 数据获取失败')
            redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
        }
        redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
    }

    async getLocalSuno(prompt, e) {
        if (!Config.sunoClientToken || !Config.sunoSessToken) {
            await e.reply('未配置Suno Token')
            redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
            return true
        }
        let description = prompt.songPrompt || prompt.lyrics
        await e.reply('正在生成，请稍后')
        try {
            let sessTokens = Config.sunoSessToken.split(',')
            let clientTokens = Config.sunoClientToken.split(',')
            let tried = 0
            while (tried < sessTokens.length) {
                let index = tried
                let sess = sessTokens[index]
                let clientToken = clientTokens[index]
                let client = new SunoClient({ sessToken: sess, clientToken })
                let { credit, email } = await client.queryCredit()
                logger.info({ credit, email })
                if (credit < 10) {
                    tried++
                    logger.info(`账户${email}余额不足，尝试下一个账户`)
                    continue
                }

                let songs = await client.createSong(description)
                if (!songs || songs.length === 0) {
                    e.reply('生成失败，可能是提示词太长或者违规，请检查日志')
                    redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
                    return
                }
                let messages = ['提示词：' + description]
                for (let song of songs) {
                    messages.push(`歌名：${song.title}\n风格: ${song.metadata.tags}\n歌词：\n${song.metadata.prompt}\n`)
                    messages.push(`音频链接：${song.audio_url}\n视频链接：${song.video_url}\n封面链接：${song.image_url}\n`)
                    messages.push(segment.image(song.image_url))
                    let retry = 3
                    let videoPath
                    while (!videoPath && retry >= 0) {
                        try {
                            videoPath = await downloadFile(song.video_url, `suno/${song.title}.mp4`, false, false, {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
                            })
                        } catch (err) {
                            retry--
                            await common.sleep(1000)
                        }
                    }
                    if (videoPath) {
                        const data = fs.readFileSync(videoPath)
                        messages.push(segment.video(`base64://${data.toString('base64')}`))
                        // 60秒后删除文件避免占用体积
                        setTimeout(() => {
                            fs.unlinkSync(videoPath)
                        }, 60000)
                    } else {
                        logger.warn(`${song.title}下载视频失败，仅发送视频链接`)
                    }
                }
                await e.reply(await common.makeForwardMsg(e, messages, '音乐合成结果'))
                redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
                return true
            }
            await e.reply('所有账户余额不足')
            redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
        } catch (err) {
            console.error(err)
            await e.reply('生成失败,请查看日志')
            redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
        }
    }

    async getApiSuno(prompt, e) {
        if (!Config.bingSunoApi) {
            await e.reply('未配置 Suno API')
            return
        }
        const responseId = await fetch(`${Config.bingSunoApi}/api/custom_generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "prompt": prompt.songPrompt || prompt.lyrics,
                "tags": prompt.tags || "pop",
                "title": prompt.title || e.sender.card || e.sender.nickname,
                "make_instrumental": false,
                "wait_audio": false
            })
        })
        const sunoId = await responseId.json()
        if (sunoId[0]?.id) {
            await e.reply('Suno 生成中，请稍后')
            let timeoutTimes = Config.sunoApiTimeout
            let timer = setInterval(async () => {
                const response = await fetch(`${Config.bingSunoApi}/api/get?ids=${sunoId[0]?.id}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                if (!response.ok) {
                    await e.reply('Suno 数据获取失败')
                    logger.error(response.error.message)
                    redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
                    clearInterval(timer)
                    timer = null
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const result = await response.json()
                if (result[0].status == 'complete') {
                    const sunoResult = result[0]
                    const title = sunoResult.title
                    const audioURL = sunoResult.audio_url
                    const imageURL = sunoResult.image_url
                    const videoURL = sunoResult.video_url
                    const musicalStyle = sunoResult.tags
                    const prompt = sunoResult.lyric
                    const sunoURL = `https://cdn1.suno.ai/${sunoResult.id}.mp4`
                    const sunoDisplayResult = {
                        title,
                        musicalStyle,
                        audioURL,
                        imageURL,
                        videoURL,
                        sunoURL,
                        prompt
                    }
                    this.replyMsg(sunoDisplayResult, e)
                    clearInterval(timer)
                } else if (timeoutTimes === 0) {
                    await e.reply('❌Suno 生成超时', true)
                    clearInterval(timer)
                    timer = null
                } else {
                    logger.info('等待Suno生成中: ' + timeoutTimes)
                    timeoutTimes--
                }
            }, 3000)
        }
    }

    async getSunoResult(requestId) {
        const skey = await this.#getSunoMetadata(requestId)
        if (skey) {
            const sunoMedia = await this.#getSunoMedia(requestId, skey)
            return sunoMedia
        }
        return null
    }

    async #getSunoMetadata(requestId) {
        const fetchURL = new URL('https://www.bing.com/videos/music')
        const searchParams = new URLSearchParams({
            vdpp: 'suno',
            kseed: '7500',
            SFX: '2',
            q: '',
            iframeid: crypto.randomUUID(),
            requestId,
        })
        fetchURL.search = searchParams.toString()
        const response = await fetch(fetchURL, {
            headers: {
                accept: 'text/html',
                cookie: this.opts.cookies,
            },
            method: 'GET',
        })
        if (response.status === 200) {
            const document = await response.text()

            const patternSkey = /(?<=skey=)[^&]+/
            const matchSkey = document.match(patternSkey)
            const skey = matchSkey ? matchSkey[0] : null

            const patternIG = /(?<=IG:"|IG:\s")[0-9A-F]{32}(?=")/
            const matchIG = document.match(patternIG)
            const ig = matchIG ? matchIG[0] : null

            return { skey, ig }
        } else {
            console.error(`HTTP error! Error: ${response.error}, Status: ${response.status}`)
            return null
        }
    }

    async #getSunoMedia(requestId, sunoMetadata) {
        let sfx = 1
        const maxTries = 30
        const { skey, ig } = sunoMetadata

        let rawResponse
        const result = await new Promise((resolve, reject) => {
            const intervalId = setInterval(async () => {
                const fetchURL = new URL('https://www.bing.com/videos/api/custom/music')
                const searchParams = new URLSearchParams({
                    skey,
                    safesearch: 'Moderate',
                    vdpp: 'suno',
                    requestId,
                    ig,
                    iid: 'vsn',
                    sfx: sfx.toString(),
                })
                fetchURL.search = searchParams.toString()
                const response = await fetch(fetchURL, {
                    headers: {
                        accept: '*/*',
                        cookie: this.opts.cookies,
                    },
                    method: 'GET',
                })
                try {
                    const body = await response.json()
                    rawResponse = JSON.parse(body.RawResponse)
                    const { status } = rawResponse
                    const done = status === 'complete'

                    if (done) {
                        clearInterval(intervalId)
                        resolve()
                    } else {
                        sfx++
                        if (sfx === maxTries) {
                            reject(new Error('Maximum number of tries exceeded'))
                        }
                    }
                } catch (error) {
                    console.log(`获取音乐失败 ${response.status}`)
                    reject(new Error(error))
                }

            }, 2000)
        })
            .then(() => {
                if (rawResponse?.status === 'complete') {
                    return {
                        duration: rawResponse.duration,
                        title: rawResponse.gptPrompt,
                        musicalStyle: rawResponse.musicalStyle,
                        requestId: rawResponse.id,
                    }
                } else {
                    throw Error('Suno response could not be completed.')
                }
            })
            .catch((err) => {
                console.error(err)
                return null
            })
        return result
    }

    extractLyrics(text) {
        // 定义分段关键词
        const sectionKeywords = ['Verse', 'Chorus', 'Bridge', 'Outro', 'End']
        // 初始化lyrics变量
        let lyrics = ''
        // 标记是否开始提取歌词
        let startExtracting = false
        // 将文本按行分割
        const lines = text.split('\n')

        lines.forEach(line => {
          // 检查每一行是否包含分段关键词
          const sectionFound = sectionKeywords.some(keyword => {
            const regex = new RegExp(`\\[${keyword} \\d+\\]|\\(${keyword} \\d+\\)|\\*\\*${keyword} \\d+\\*\\*`, 'i')
            return regex.test(line)
          })
          // 如果找到第一个分段关键词，开始提取歌词
          if (sectionFound && !startExtracting) {
            startExtracting = true
          }
          // 如果已经开始提取歌词，则添加到lyrics变量中
          if (startExtracting) {
            lyrics += line + '\n'
          }
        })
        return lyrics.trim() // 返回处理过的歌词
      }

    getRandomElements(arr, count) {
        const shuffled = arr.sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count)
    }

    generateRandomStyle() {
        const totalItems = 5
        const itemsPerArray = Math.floor(totalItems / 3)
        let remainingItems = totalItems % 3

        let selectedStyles = this.getRandomElements(Style, itemsPerArray)
        let selectedGenres = this.getRandomElements(Genre, itemsPerArray)
        let selectedTypes = this.getRandomElements(Types, itemsPerArray)

        if (remainingItems > 0) selectedStyles = selectedStyles.concat(this.getRandomElements(Style, 1)), remainingItems--
        if (remainingItems > 0) selectedGenres = selectedGenres.concat(this.getRandomElements(Genre, 1)), remainingItems--

        const allSelected = [...selectedStyles, ...selectedGenres, ...selectedTypes]
        return allSelected.map(item => item.value).join(', ')
    }
}
