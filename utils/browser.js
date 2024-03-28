import lodash from 'lodash'
import { Config } from './config.js'
let puppeteer = {}

class Puppeteer {
  constructor () {
    let args = [
      '--exclude-switches',
      '--no-sandbox',
      '--remote-debugging-port=51777',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--ignore-certificate-errors',
      '--no-first-run',
      '--no-service-autorun',
      '--password-store=basic',
      '--system-developer-mode',
      '--mute-audio',
      '--disable-default-apps',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--disable-web-security'
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
    puppeteer = (await import('puppeteer')).default
    // const pluginStealth = StealthPlugin()
    // puppeteer.use(pluginStealth)
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

    logger.mark('chatgpt puppeteer 启动中...')
    const browserURL = 'http://127.0.0.1:51777'
    try {
      this.browser = await puppeteer.connect({ browserURL })
    } catch (e) {
      /** 初始化puppeteer */
      this.browser = await puppeteer.launch(this.config).catch((err) => {
        logger.error(err.toString())
        if (String(err).includes('correct Chromium')) {
          logger.error('没有正确安装Chromium，可以尝试执行安装命令：node ./node_modules/puppeteer/install.js')
        }
      })
    }
    this.lock = false

    if (!this.browser) {
      logger.error('chatgpt puppeteer 启动失败')
      return false
    }

    logger.mark('chatgpt puppeteer 启动成功')

    /** 监听Chromium实例是否断开 */
    this.browser.on('disconnected', (e) => {
      logger.info('Chromium实例关闭或崩溃！')
      this.browser = false
    })

    return this.browser
  }
}

export class ChatGPTPuppeteer extends Puppeteer {
  constructor (opts = {}) {
    super()
    const {
      debug = false
    } = opts

    this._debug = !!debug
  }

  async getBrowser () {
    if (this.browser) {
      return this.browser
    } else {
      return await this.browserInit()
    }
  }

  async close () {
    if (this.browser) {
      await this.browser.close()
    }
    this._page = null
    this.browser = null
  }
}

export default new ChatGPTPuppeteer()
