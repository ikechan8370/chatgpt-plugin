import { Config } from '../utils/config.js'
import random from 'random'
import common from '../../../lib/common/common.js'

let hasRecaptchaPlugin = !!Config['2captchaToken']

export async function getOpenAIAuth (opt) {
  let {
    email,
    password,
    browser,
    page,
    timeoutMs = Config.chromeTimeoutMS,
    isGoogleLogin = false,
    captchaToken = Config['2captchaToken'],
    executablePath = Config.chromePath
  } = opt
  const origBrowser = browser
  const origPage = page

  try {
    const userAgent = await browser.userAgent()
    if (!page) {
      page = (await browser.pages())[0] || (await browser.newPage())
      page.setDefaultTimeout(timeoutMs)
    }
    await page.goto('https://chat.openai.com/auth/login', {
      waitUntil: 'networkidle2'
    })
    logger.mark('chatgpt checkForChatGPTAtCapacity')

    await checkForChatGPTAtCapacity(page)

    // NOTE: this is where you may encounter a CAPTCHA
    if (hasRecaptchaPlugin) {
      logger.mark('RecaptchaPlugin key exists, try to solve recaptchas')
      await page.solveRecaptchas()
    }

    logger.mark('chatgpt checkForChatGPTAtCapacity again')
    await checkForChatGPTAtCapacity(page)

    // once we get to this point, the Cloudflare cookies should be available

    // login as well (optional)
    if (email && password) {
      let retry = 3
      while (retry > 0) {
        try {
          await waitForConditionOrAtCapacity(page, () =>
            page.waitForSelector('#__next .btn-primary', { timeout: timeoutMs / 3 })
          )
        } catch (e) {
          await checkForChatGPTAtCapacity(page)
        }
        retry--
      }
      await waitForConditionOrAtCapacity(page, () =>
        page.waitForSelector('#__next .btn-primary', { timeout: timeoutMs / 3 })
      )
      await common.sleep(500)

      // click login button and wait for navigation to finish
      do {
        await Promise.all([
          page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: timeoutMs
          }),
          page.click('#__next .btn-primary')
        ])
        await common.sleep(1000)
      } while (page.url().endsWith('/auth/login'))
      logger.mark('进入登录页面')
      await checkForChatGPTAtCapacity(page)

      let submitP

      if (isGoogleLogin) {
        await page.click('button[data-provider="google"]')
        await page.waitForSelector('input[type="email"]')
        await page.type('input[type="email"]', email, { delay: 10 })
        await Promise.all([
          page.waitForNavigation(),
          await page.keyboard.press('Enter')
        ])
        await page.waitForSelector('input[type="password"]', { visible: true })
        await page.type('input[type="password"]', password, { delay: 10 })
        submitP = () => page.keyboard.press('Enter')
      } else {
        await page.waitForSelector('#username')
        await page.type('#username', email, { delay: 20 })
        await common.sleep(100)

        if (hasRecaptchaPlugin) {
          // console.log('solveRecaptchas()')
          const res = await page.solveRecaptchas()
          // console.log('solveRecaptchas result', res)
        }

        await page.click('button[type="submit"]')
        await page.waitForSelector('#password', { timeout: timeoutMs })
        await page.type('#password', password, { delay: 10 })
        submitP = () => page.click('button[type="submit"]')
      }

      await Promise.all([
        waitForConditionOrAtCapacity(page, () =>
          page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: timeoutMs
          })
        ),
        submitP()
      ])
    } else {
      await common.sleep(2000)
      await checkForChatGPTAtCapacity(page)
    }

    const pageCookies = await page.cookies()
    await redis.set('CHATGPT:RAW_COOKIES', JSON.stringify(pageCookies))
    const cookies = pageCookies.reduce(
      (map, cookie) => ({ ...map, [cookie.name]: cookie }),
      {}
    )

    const authInfo = {
      userAgent,
      clearanceToken: cookies.cf_clearance?.value,
      sessionToken: cookies['__Secure-next-auth.session-token']?.value,
      cookies
    }
    logger.info('chatgpt登录成功')

    return authInfo
  } catch (err) {
    throw err
  } finally {
    await page.screenshot({
      type: 'png',
      path: './error.png'
    })
    if (origBrowser) {
      if (page && page !== origPage) {
        await page.close()
      }
    } else if (browser) {
      await browser.close()
    }

    page = null
    browser = null
  }
}

async function checkForChatGPTAtCapacity (page, opts = {}) {
  const {
    timeoutMs = Config.chromeTimeoutMS, // 2 minutes
    pollingIntervalMs = 3000,
    retries = 10
  } = opts

  // console.log('checkForChatGPTAtCapacity', page.url())
  let isAtCapacity = false
  let numTries = 0

  do {
    try {
      await solveSimpleCaptchas(page)

      const res = await page.$x("//div[contains(., 'ChatGPT is at capacity')]")
      isAtCapacity = !!res?.length

      if (isAtCapacity) {
        if (++numTries >= retries) {
          break
        }

        // try refreshing the page if chatgpt is at capacity
        await page.reload({
          waitUntil: 'networkidle2',
          timeout: timeoutMs
        })

        await common.sleep(pollingIntervalMs)
      }
    } catch (err) {
      // ignore errors likely due to navigation
      ++numTries
      break
    }
  } while (isAtCapacity)

  if (isAtCapacity) {
    const error = new Error('ChatGPT is at capacity')
    error.statusCode = 503
    throw error
  }
}

async function waitForConditionOrAtCapacity (
  page,
  condition,
  opts = {}
) {
  const { pollingIntervalMs = 500 } = opts

  return new Promise((resolve, reject) => {
    let resolved = false

    async function waitForCapacityText () {
      if (resolved) {
        return
      }

      try {
        await checkForChatGPTAtCapacity(page)

        if (!resolved) {
          setTimeout(waitForCapacityText, pollingIntervalMs)
        }
      } catch (err) {
        if (!resolved) {
          resolved = true
          return reject(err)
        }
      }
    }

    condition()
      .then(() => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      })
      .catch((err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })

    setTimeout(waitForCapacityText, pollingIntervalMs)
  })
}

async function solveSimpleCaptchas (page) {
  try {
    const verifyYouAreHuman = await page.$('text=Verify you are human')
    if (verifyYouAreHuman) {
      logger.mark('encounter cloudflare simple captcha "Verify you are human"')
      await common.sleep(2000)
      await verifyYouAreHuman.click({
        delay: random.int(5, 25)
      })
      await common.sleep(1000)
    }
    const verifyYouAreHumanCN = await page.$('text=确认您是真人')
    if (verifyYouAreHumanCN) {
      logger.mark('encounter cloudflare simple captcha "确认您是真人"')
      await common.sleep(2000)
      await verifyYouAreHumanCN.click({
        delay: random.int(5, 25)
      })
      await common.sleep(1000)
    }

    const cloudflareButton = await page.$('.hcaptcha-box')
    if (cloudflareButton) {
      await common.sleep(2000)
      await cloudflareButton.click({
        delay: random.int(5, 25)
      })
      await common.sleep(1000)
    }
  } catch (err) {
    // ignore errors
  }
}
