import lodash from 'lodash'
import cfg from '../../../lib/config/config.js'
import { Config } from '../config/index.js'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
let puppeteer = {}

class Puppeteer {
  constructor () {
    let args = [
      '--exclude-switches',
      '--no-sandbox',
      'enable-automation',
      // '--shm-size=1gb'
    ]
    if (Config.proxy) {
      args.push(`--proxy-server=${Config.proxy}`)
    }
    this.browser = false
    this.lock = false
    this.config = {
      headless: Config.headless,
      args
    }

    if (Config.chromePath) {
      this.config.executablePath = Config.chromePath
    }

    this.html = {}
  }

  async initPupp () {
    if (!lodash.isEmpty(puppeteer)) return puppeteer
    puppeteer = (await import('puppeteer-extra')).default
    const pluginStealth = StealthPlugin()
    puppeteer.use(pluginStealth)
    return puppeteer
  }

  /**
     * 初始化chromium
     */
  async browserInit () {
    await this.initPupp()
    if (this.browser) return this.browser
    if (this.lock) return false
    this.lock = true

    logger.mark('puppeteer Chromium 启动中...')

    /** 初始化puppeteer */
    this.browser = await puppeteer.launch(this.config).catch((err) => {
      logger.error(err.toString())
      if (String(err).includes('correct Chromium')) {
        logger.error('没有正确安装Chromium，可以尝试执行安装命令：node ./node_modules/puppeteer/install.js')
      }
    })

    this.lock = false

    if (!this.browser) {
      logger.error('puppeteer Chromium 启动失败')
      return false
    }

    logger.mark('puppeteer Chromium 启动成功')

    /** 监听Chromium实例是否断开 */
    this.browser.on('disconnected', (e) => {
      logger.error('Chromium实例关闭或崩溃！')
      this.browser = false
    })

    return this.browser
  }
}

class ChatGPTPuppeteer extends Puppeteer {
  async getBrowser () {
    if (this.browser) {
      return this.browser
    } else {
      return await this.browserInit()
    }
  }
}

export default new ChatGPTPuppeteer()
