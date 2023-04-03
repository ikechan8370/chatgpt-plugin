import fetch from 'node-fetch'
import { makeForwardMsg } from './common.js'
export default class BingDrawClient {
  constructor (opts) {
    this.opts = opts
  }

  async getImages (prompt, e) {
    let urlEncodedPrompt = encodeURIComponent(prompt)
    let url = `${this.opts.baseUrl}/images/create?q=${urlEncodedPrompt}&rt=4&FORM=GENCRE`
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'content-type': 'application/x-www-form-urlencoded',
        referrer: 'https://www.bing.com/images/create/',
        origin: 'https://www.bing.com',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63',
        cookie: this.opts.cookies || `_U=${this.opts.userToken}`
      },
      redirect: 'manual'
    })
    let res = await response.text()
    if (res.toLowerCase().indexOf('this prompt has been blocked') > -1) {
      throw new Error('Your prompt has been blocked by Bing. Try to change any bad words and try again.')
    }
    if (response.status !== 302) {
      url = `${this.opts.baseUrl}/images/create?q=${urlEncodedPrompt}&rt=3&FORM=GENCRE`
      let response3 = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'max-age=0',
          'content-type': 'application/x-www-form-urlencoded',
          referrer: 'https://www.bing.com/images/create/',
          origin: 'https://www.bing.com',
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63',
          cookie: this.opts.cookies || `_U=${this.opts.userToken}`
        },
        redirect: 'manual'
      })
      if (response3.status !== 302) {
        throw new Error(await response3.text())
      }
      response = response3
    }
    let redirectUrl = response.headers.get('Location').replace('&nfy=1', '')
    let requestId = redirectUrl.split('id=')[1]
    // 模拟跳转
    await fetch(`${this.opts.baseUrl}${redirectUrl}`, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'content-type': 'application/x-www-form-urlencoded',
        referrer: 'https://www.bing.com/images/create/',
        origin: 'https://www.bing.com',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63',
        cookie: this.opts.cookies || `_U=${this.opts.userToken}`
      }
    })
    let pollingUrl = `${this.opts.baseUrl}/images/create/async/results/${requestId}?q=${urlEncodedPrompt}`
    logger.info({ pollingUrl })
    logger.info('waiting for bing draw results...')
    let timeoutTimes = 50
    let found = false
    let timer = setInterval(async () => {
      if (found) {
        return
      }
      let r = await fetch(pollingUrl, {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'max-age=0',
          'content-type': 'application/x-www-form-urlencoded',
          referrer: 'https://www.bing.com/images/create/',
          origin: 'https://www.bing.com',
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63',
          cookie: this.opts.cookies || `_U=${this.opts.userToken}`
        }
      })
      let rText = await r.text()
      if (rText) {
        // logger.info(rText)
        logger.info('got bing draw results!')
        found = true
        let regex = /src="([^"]+)"/g
        let imageLinks = rText.match(regex)
        if (!imageLinks || imageLinks.length === 0) {
          await e.reply('绘图失败：no images', true)
          logger.error(rText)
          throw new Error('no images')
        }
        imageLinks = imageLinks.map(link => link.split('?w=')[0]).map(link => link.replace('src="', ''))
        imageLinks = [...new Set(imageLinks)]
        const badImages = [
          'https://r.bing.com/rp/in-2zU3AJUdkgFe7ZKv19yPBHVs.png',
          'https://r.bing.com/rp/TX9QuO3WzcCJz1uaaSwQAz39Kb0.jpg'
        ]
        for (let imageLink of imageLinks) {
          if (badImages.indexOf(imageLink) > -1) {
            await e.reply('绘图失败：Bad images', true)
            logger.error(rText)
          }
        }
        logger.info(imageLinks)
        let images = imageLinks.map(link => segment.image(link))
        let msg = await makeForwardMsg(e, images, `bing绘图结果：${prompt}`)
        await e.reply(msg)
        clearInterval(timer)
      } else {
        if (timeoutTimes === 0) {
          await e.reply('绘图超时', true)
          clearInterval(timer)
        } else {
          logger.info('still waiting for bing draw results... times left: ' + timeoutTimes)
          timeoutTimes--
        }
      }
    }, 1500)
  }
}
