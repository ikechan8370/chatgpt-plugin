import { downloadFile } from '../utils/common.js'
import common from '../../../lib/common/common.js'
import fs from 'fs'
import crypto from 'crypto'
import fetch from 'node-fetch'

export default class BingSunoClient {
    constructor(opts) {
        this.opts = opts
    }

    async replyMsg(song, e) {
        let messages = []
        messages.push(`歌名：${song.title}\n风格: ${song.musicalStyle}\n长度: ${song.duration}秒\n歌词：\n${song.prompt}\n`)
        messages.push(`音频链接：${song.audioURL}\n视频链接：${song.videoURL}\n封面链接：${song.imageURL}\n`)
        messages.push(segment.image(song.imageURL))
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

        await e.reply(await common.makeForwardMsg(e, messages, '音乐合成结果'))
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
            await e.reply('Bing Suno 生成中，请稍后')
            replyMsg(sunoDisplayResult, e)
        } else {
            await e.reply('Bing Suno 数据获取失败')
            redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
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

}
